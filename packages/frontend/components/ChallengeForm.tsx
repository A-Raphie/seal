"use client";

import { useId, useState } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { useEncrypt, useDecryptPublicValues } from "@zama-fhe/react-sdk";
import { ErrorText } from "@/components/ErrorText";
import { TxLink } from "@/components/TxLink";
import { proofOfReservesABI } from "@/lib/abi";
import { PROOF_OF_RESERVES_ADDRESS } from "@/lib/contract";
import { friendlyError } from "@/lib/errors";
import { isValidUint } from "@/lib/parse";

/**
 * Fraud-challenge form. A customer who holds TWO exchange-signed attestations
 * encrypting DIFFERENT balances for them in one epoch can prove the conflict
 * on-chain. The contract compares the two under FHE (`FHE.ne`) and reveals only
 * a 1-bit verdict — neither balance leaks.
 *
 * Flow mirrors the Customer submit flow, twice:
 *   1. Encrypt balance A and balance B client-side.
 *   2. Obtain an exchange signature for each (server-side demo signer).
 *   3. `challengeConflictingAttestation(epochId, ctA, prA, sigA, ctB, prB, sigB)`.
 *   4. After confirmation, decrypt the 1-bit `differ` verdict via
 *      `useDecryptPublicValues` + `fulfillChallenge`.
 */
export function ChallengeForm({ epochId, deadline }: { epochId: string; deadline: bigint }) {
  const { address } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();
  const { mutateAsync: encrypt, isPending: isEncrypting } = useEncrypt();
  const { mutateAsync: decryptPublic } = useDecryptPublicValues();

  const [balanceA, setBalanceA] = useState("");
  const [balanceB, setBalanceB] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<"fraud" | "no-conflict" | null>(null);
  const [challenged, setChallenged] = useState(false);

  const aId = useId();
  const bId = useId();

  const { data: differHandleRaw } = useReadContract({
    address: PROOF_OF_RESERVES_ADDRESS,
    abi: proofOfReservesABI,
    functionName: "getChallengeDifferHandle",
    args: [BigInt(epochId || "0"), address ?? "0x0000000000000000000000000000000000000000"],
    query: { enabled: !!address && challenged },
  });
  const differHandle = differHandleRaw as unknown as `0x${string}` | undefined;

  const bothValid = isValidUint(balanceA) && isValidUint(balanceB) && balanceA !== balanceB;
  const canSubmit = bothValid && !isPending && !isEncrypting && !!address;

  async function signOne(balance: string) {
    if (!address) throw new Error("Wallet not connected.");
    const { encryptedValues, inputProof } = await encrypt({
      values: [{ value: BigInt(balance), type: "euint64" }],
      contractAddress: PROOF_OF_RESERVES_ADDRESS,
      userAddress: address,
    });
    const handle = encryptedValues[0];
    const res = await fetch("/api/exchange/sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ epochId, customer: address, handle, deadline: deadline.toString() }),
    });
    if (!res.ok) throw new Error(`Signing failed: ${await res.text()}`);
    const { signature } = (await res.json()) as { signature: `0x${string}` };
    return { handle, inputProof, signature };
  }

  async function handleChallenge() {
    if (!address || !bothValid) return;
    setError(null);
    setStatus(null);
    setVerdict(null);
    try {
      setStatus("Encrypting both balances client-side…");
      const [a, b] = await Promise.all([signOne(balanceA), signOne(balanceB)]);

      setStatus("Submitting fraud challenge on-chain…");
      await writeContractAsync({
        address: PROOF_OF_RESERVES_ADDRESS,
        abi: proofOfReservesABI,
        functionName: "challengeConflictingAttestation",
        args: [
          BigInt(epochId),
          a.handle, a.inputProof, a.signature,
          b.handle, b.inputProof, b.signature,
        ],
      });
      setChallenged(true);
      setStatus("Challenge submitted. Decrypting the 1-bit verdict…");
    } catch (e) {
      setError(friendlyError(e));
      setStatus(null);
    }
  }

  async function handleVerdict() {
    setError(null);
    setStatus("Decrypting verdict…");
    try {
      if (!differHandle) throw new Error("Verdict handle not loaded.");
      const result = await decryptPublic([differHandle]);
      const tx = await writeContractAsync({
        address: PROOF_OF_RESERVES_ADDRESS,
        abi: proofOfReservesABI,
        functionName: "fulfillChallenge",
        args: [
          BigInt(epochId),
          address as `0x${string}`,
          [differHandle],
          result.abiEncodedClearValues,
          result.decryptionProof,
        ],
      });
      // The cleartext is a single bool; decode it from the abi-encoded payload.
      const differ = decodeBool(result.abiEncodedClearValues);
      setVerdict(differ ? "fraud" : "no-conflict");
      setStatus(tx);
    } catch (e) {
      setError(friendlyError(e));
      setStatus(null);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        Enter two <strong>different</strong> balances the exchange signed for you
        in this epoch. The contract compares them under FHE and reveals only
        whether they differ — a 1-bit verdict. Neither balance leaks.
      </p>
      <div>
        <label className="label" htmlFor={aId}>
          Balance A (units) — e.g. the real balance
        </label>
        <input
          id={aId}
          className="input"
          type="text"
          inputMode="numeric"
          placeholder="e.g. 4200"
          value={balanceA}
          onChange={(e) => setBalanceA(e.target.value)}
          aria-invalid={balanceA.length > 0 && !isValidUint(balanceA)}
        />
      </div>
      <div>
        <label className="label" htmlFor={bId}>
          Balance B (units) — the conflicting, signed balance
        </label>
        <input
          id={bId}
          className="input"
          type="text"
          inputMode="numeric"
          placeholder="e.g. 999999"
          value={balanceB}
          onChange={(e) => setBalanceB(e.target.value)}
          aria-invalid={balanceB.length > 0 && !isValidUint(balanceB)}
        />
        {balanceA.length > 0 && balanceB.length > 0 && balanceA === balanceB && (
          <p className="mt-1 text-xs text-warning">
            The two balances must differ for a challenge to mean anything.
          </p>
        )}
      </div>

      {!challenged ? (
        <button className="btn-primary w-full" disabled={!canSubmit} onClick={handleChallenge}>
          {isEncrypting ? "Encrypting…" : isPending ? "Submitting…" : "Submit fraud challenge"}
        </button>
      ) : (
        <button
          className="btn-primary w-full"
          disabled={!differHandle || isPending}
          onClick={handleVerdict}
        >
          {isPending ? "Decrypting…" : "Decrypt verdict"}
        </button>
      )}

      {status && (
        <p className="text-xs text-success" aria-live="polite">
          {verdict ? null : "Submitted ✓ "}
          {/^0x[a-fA-F0-9]{40,}$/.test(status) ? <TxLink value={status} type="tx" /> : status}
        </p>
      )}

      {verdict && (
        <p
          className={`text-sm font-semibold ${verdict === "fraud" ? "text-danger" : "text-success"}`}
          role="status"
        >
          {verdict === "fraud"
            ? "⚠ Fraud proven — the exchange signed two different balances. Epoch flagged fraudulent."
            : "✓ No conflict — the two ciphertexts encrypt the same value."}
        </p>
      )}

      <ErrorText error={error} />
    </div>
  );
}

/** Decode a single bool from an abi-encoded payload (last 32 bytes). */
function decodeBool(abiEncoded: `0x${string}`): boolean {
  const hex = abiEncoded.slice(2);
  const lastWord = hex.slice(-64);
  return BigInt("0x" + lastWord) === 1n;
}
