"use client";

import { useId, useState } from "react";
import dynamic from "next/dynamic";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { useEncrypt } from "@zama-fhe/react-sdk";
import { Shell } from "@/components/Shell";
import { NetworkGuard } from "@/components/NetworkGuard";
import { TxLink } from "@/components/TxLink";
import { ErrorText } from "@/components/ErrorText";
import { UndeployedBanner } from "@/components/UndeployedBanner";
import { proofOfReservesABI } from "@/lib/abi";
import { PROOF_OF_RESERVES_ADDRESS, IS_UNDEPLOYED } from "@/lib/contract";
import { friendlyError } from "@/lib/errors";
import { isValidUint } from "@/lib/parse";

// The fraud-challenge flow pulls useDecryptPublicValues (a heavy SDK path).
// Lazy-load it so it only ships when a user opens the challenge card — keeps
// the initial Customer page bundle leaner.
const ChallengeForm = dynamic(
  () => import("@/components/ChallengeForm").then((m) => m.ChallengeForm),
  { ssr: false, loading: () => <p className="text-sm text-muted">Loading…</p> },
);

type EpochInfo = readonly [
  bigint, // claimedLiabilities
  bigint, // deadline
  bigint, // revealedTotal
  boolean, // solvent
  boolean, // revealed
  boolean, // fulfilled
  bigint, // attestationCount
];

export default function CustomerPage() {
  const { address, isConnected } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();
  const { mutateAsync: encrypt, isPending: isEncrypting } = useEncrypt();

  const [epochId, setEpochId] = useState("0");
  const [balance, setBalance] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const epochIdInput = useId();
  const balanceInput = useId();

  const { data: rawEpoch } = useReadContract({
    address: PROOF_OF_RESERVES_ADDRESS,
    abi: proofOfReservesABI,
    functionName: "getEpoch",
    args: [BigInt(epochId || "0")],
    query: { enabled: isConnected },
  });
  const epoch = rawEpoch as EpochInfo | undefined;
  const deadline = epoch?.[1] ?? 0n;
  const now = Math.floor(Date.now() / 1000);
  const open = deadline !== 0n && BigInt(now) < deadline;

  const balanceValid = isValidUint(balance);
  const canSubmit = balanceValid && open && !isPending && !isEncrypting;

  async function handleSubmit() {
    if (!address || !balanceValid) return;
    setError(null);
    setStatus(null);
    try {
      if (!open) throw new Error("Epoch is not open for attestations.");
      setStatus("Encrypting your balance client-side…");
      const { encryptedValues, inputProof } = await encrypt({
        values: [{ value: BigInt(balance), type: "euint64" }],
        contractAddress: PROOF_OF_RESERVES_ADDRESS,
        userAddress: address,
      });
      const handle = encryptedValues[0];

      setStatus("Requesting exchange signature…");
      const res = await fetch("/api/exchange/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          epochId,
          customer: address,
          handle,
          deadline: deadline.toString(),
        }),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(`Signing failed: ${msg}`);
      }
      const { signature } = (await res.json()) as { signature: `0x${string}` };

      setStatus("Submitting attestation on-chain…");
      const tx = await writeContractAsync({
        address: PROOF_OF_RESERVES_ADDRESS,
        abi: proofOfReservesABI,
        functionName: "registerAttestation",
        args: [BigInt(epochId), handle, inputProof, signature],
      });
      setStatus(tx); // rendered via TxLink below
      setBalance("");
    } catch (e) {
      setError(friendlyError(e));
      setStatus(null);
    }
  }

  return (
    <Shell>
      <h1 className="mb-1 text-2xl font-bold">Customer</h1>
      <p className="mb-6 text-muted">
        Submit your encrypted balance attestation. Your balance is encrypted in
        your browser and is <strong>never</strong> decryptable by anyone — it is
        only homomorphically summed.
      </p>

      {IS_UNDEPLOYED && <UndeployedBanner />}

      <div className="card max-w-xl">
        <NetworkGuard>
          {!isConnected ? (
            <p className="text-sm text-muted">Connect your wallet to continue.</p>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="label" htmlFor={epochIdInput}>
                  Epoch id
                </label>
                <input
                  id={epochIdInput}
                  className="input"
                  type="text"
                  inputMode="numeric"
                  value={epochId}
                  onChange={(e) => setEpochId(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-4 text-xs text-muted" aria-live="polite">
                <span>
                  deadline:{" "}
                  <span className="font-mono">
                    {deadline === 0n
                      ? "—"
                      : new Date(Number(deadline) * 1000).toLocaleString()}
                  </span>
                </span>
                <span>
                  status:{" "}
                  {deadline === 0n ? (
                    "no epoch"
                  ) : open ? (
                    <span className="text-success">open</span>
                  ) : (
                    <span className="text-warning">closed</span>
                  )}
                </span>
              </div>
              <div>
                <label className="label" htmlFor={balanceInput}>
                  Your balance (units)
                </label>
                <input
                  id={balanceInput}
                  className="input"
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g. 4200"
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                  aria-invalid={balance.length > 0 && !balanceValid}
                />
                {balance.length > 0 && !balanceValid && (
                  <p className="mt-1 text-xs text-danger">
                    Enter a whole, non-negative number.
                  </p>
                )}
              </div>
              <button className="btn-primary w-full" disabled={!canSubmit} onClick={handleSubmit}>
                {isEncrypting ? "Encrypting…" : isPending ? "Submitting…" : "Submit attestation"}
              </button>
              {status && (
                <p className="text-xs text-success" aria-live="polite">
                  Submitted ✓ <TxLink value={status} type="tx" />
                </p>
              )}
              <ErrorText error={error} />
            </div>
          )}
        </NetworkGuard>
      </div>

      <div className="card mt-6 max-w-xl">
        <h2 className="mb-3 font-semibold">Fraud challenge</h2>
        <NetworkGuard>
          {isConnected ? (
            <ChallengeForm epochId={epochId} deadline={deadline} />
          ) : (
            <p className="text-sm text-muted">Connect your wallet to file a challenge.</p>
          )}
        </NetworkGuard>
      </div>
    </Shell>
  );
}
