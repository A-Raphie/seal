"use client";

import { useState } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { useEncrypt } from "@zama-fhe/react-sdk";
import { Shell } from "@/components/Shell";
import { proofOfReservesABI } from "@/lib/abi";
import { PROOF_OF_RESERVES_ADDRESS } from "@/lib/contract";

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

  async function handleSubmit() {
    setError(null);
    setStatus(null);
    if (!address) return;
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
      setStatus(`Submitted ✓ — ${tx.slice(0, 10)}…`);
      setBalance("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus(null);
    }
  }

  return (
    <Shell>
      <h1 className="mb-1 text-2xl font-bold">Customer</h1>
      <p className="mb-6 text-white/50">
        Submit your encrypted balance attestation. Your balance is encrypted in
        your browser and is <strong>never</strong> decryptable by anyone — it is
        only homomorphically summed.
      </p>

      <div className="card max-w-xl">
        {!isConnected ? (
          <p className="text-sm text-white/50">Connect your wallet to continue.</p>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="label">Epoch id</label>
              <input
                className="input"
                type="text"
                inputMode="numeric"
                value={epochId}
                onChange={(e) => setEpochId(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-4 text-xs text-white/40">
              <span>
                deadline:{" "}
                <span className="font-mono">
                  {deadline === 0n ? "—" : new Date(Number(deadline) * 1000).toLocaleString()}
                </span>
              </span>
              <span>
                status:{" "}
                {deadline === 0n ? (
                  "no epoch"
                ) : open ? (
                  <span className="text-emerald-300">open</span>
                ) : (
                  <span className="text-amber-300">closed</span>
                )}
              </span>
            </div>
            <div>
              <label className="label">Your balance (units)</label>
              <input
                className="input"
                type="text"
                inputMode="numeric"
                placeholder="e.g. 4200"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
              />
            </div>
            <button
              className="btn-primary w-full"
              disabled={isPending || isEncrypting || !balance || !open}
              onClick={handleSubmit}
            >
              {isEncrypting ? "Encrypting…" : isPending ? "Submitting…" : "Submit attestation"}
            </button>
            {status && <p className="text-xs text-emerald-300/80">{status}</p>}
            {error && <p className="text-xs text-red-400">{error}</p>}
          </div>
        )}
      </div>

      <div className="card mt-6 max-w-xl">
        <h2 className="mb-2 font-semibold">Fraud challenge</h2>
        <p className="text-sm text-white/50">
          If the exchange signed two ciphertexts that encrypt{" "}
          <em>different</em> values for you in one epoch, submit both as a
          challenge. The contract proves the conflict under FHE (
          <code>FHE.ne</code>) without revealing either balance. See the{" "}
          <a className="underline" href="https://github.com/A-Raphie/fhe-proof-of-reserves">
            CLI
          </a>{" "}
          for producing challenge payloads.
        </p>
      </div>
    </Shell>
  );
}
