"use client";

import { useState } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { parseEther } from "viem";
import { Shell } from "@/components/Shell";
import { proofOfReservesABI } from "@/lib/abi";
import { PROOF_OF_RESERVES_ADDRESS } from "@/lib/contract";

export default function ExchangePage() {
  const { address, isConnected } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();
  const [liabilities, setLiabilities] = useState("");
  const [windowSeconds, setWindowSeconds] = useState("3600");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: nextEpochId } = useReadContract({
    address: PROOF_OF_RESERVES_ADDRESS,
    abi: proofOfReservesABI,
    functionName: "nextEpochId",
  });

  const { data: admin } = useReadContract({
    address: PROOF_OF_RESERVES_ADDRESS,
    abi: proofOfReservesABI,
    functionName: "exchangeAdmin",
  });

  const { data: signer } = useReadContract({
    address: PROOF_OF_RESERVES_ADDRESS,
    abi: proofOfReservesABI,
    functionName: "exchangeSigner",
  });

  const isAdmin = !!address && admin === address;

  async function handleCreate() {
    setError(null);
    setTxHash(null);
    try {
      const liab = BigInt(liabilities);
      const window = BigInt(windowSeconds);
      const hash = await writeContractAsync({
        address: PROOF_OF_RESERVES_ADDRESS,
        abi: proofOfReservesABI,
        functionName: "createEpoch",
        args: [liab, window],
      });
      setTxHash(hash);
      setLiabilities("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <Shell>
      <h1 className="mb-1 text-2xl font-bold">Exchange back-office</h1>
      <p className="mb-6 text-white/50">
        Open an attestation epoch and publish the liabilities claim.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <h2 className="mb-3 font-semibold">Contract state</h2>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-white/50">Next epoch id</dt>
              <dd className="font-mono">{nextEpochId?.toString() ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-white/50">Exchange admin</dt>
              <dd className="font-mono text-xs">{admin ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-white/50">Exchange signer</dt>
              <dd className="font-mono text-xs">{signer ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-white/50">Your role</dt>
              <dd>{isAdmin ? "✅ admin" : "read-only"}</dd>
            </div>
          </dl>
        </div>

        <div className="card">
          <h2 className="mb-3 font-semibold">Open new epoch</h2>
          {!isConnected ? (
            <p className="text-sm text-white/50">Connect your wallet first.</p>
          ) : !isAdmin ? (
            <p className="text-sm text-amber-300/80">
              Only the exchange admin can create epochs. Connect the admin wallet
              (the one set at deployment).
            </p>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="label">Claimed liabilities (units)</label>
                <input
                  className="input"
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g. 1000000"
                  value={liabilities}
                  onChange={(e) => setLiabilities(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Attestation window (seconds)</label>
                <input
                  className="input"
                  type="text"
                  inputMode="numeric"
                  placeholder="3600"
                  value={windowSeconds}
                  onChange={(e) => setWindowSeconds(e.target.value)}
                />
              </div>
              <button
                className="btn-primary w-full"
                disabled={isPending || !liabilities}
                onClick={handleCreate}
              >
                {isPending ? "Opening…" : "Open epoch"}
              </button>
              {txHash && (
                <p className="text-xs text-emerald-300/80">
                  Epoch opened: {txHash.slice(0, 10)}… — see the Auditor tab.
                </p>
              )}
              {error && <p className="text-xs text-red-400">{error}</p>}
            </div>
          )}
        </div>
      </div>

      <p className="mt-6 text-xs text-white/30">
        Note: &ldquo;liabilities&rdquo; here is denominated in plain balance
        units (analogous to {parseEther("0")} used only to keep the example
        integer-clean). In production this would be a token amount.
      </p>
    </Shell>
  );
}
