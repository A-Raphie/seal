"use client";

import { useMemo, useState } from "react";
import { useReadContracts, useWriteContract } from "wagmi";
import { useDecryptPublicValues } from "@zama-fhe/react-sdk";
import { Shell } from "@/components/Shell";
import { NetworkGuard } from "@/components/NetworkGuard";
import { ErrorText } from "@/components/ErrorText";
import { UndeployedBanner } from "@/components/UndeployedBanner";
import { CheckIcon, XIcon, AlertIcon } from "@/components/icons";
import { proofOfReservesABI } from "@/lib/abi";
import { PROOF_OF_RESERVES_ADDRESS, IS_UNDEPLOYED } from "@/lib/contract";
import { friendlyError } from "@/lib/errors";

type EpochTuple = readonly [
  bigint, // claimedLiabilities
  bigint, // deadline
  bigint, // revealedTotal
  boolean, // solvent
  boolean, // revealed
  boolean, // fulfilled
  bigint, // attestationCount
];

function epochRow(epochId: bigint) {
  return {
    address: PROOF_OF_RESERVES_ADDRESS,
    abi: proofOfReservesABI,
    functionName: "getEpoch" as const,
    args: [epochId] as const,
  };
}

export default function AuditPage() {
  const { writeContractAsync, isPending } = useWriteContract();
  const { mutateAsync: decryptPublic } = useDecryptPublicValues();
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // First read how many epochs exist.
  const { data: nextEpochId } = useReadContracts({
    contracts: [
      {
        address: PROOF_OF_RESERVES_ADDRESS,
        abi: proofOfReservesABI,
        functionName: "nextEpochId",
      },
    ],
  });
  const count = nextEpochId?.[0].result ? Number(nextEpochId[0].result) : 0;

  // Then batch-read every epoch in one multicall.
  const ids = useMemo(() => Array.from({ length: count }, (_, i) => BigInt(i)), [count]);
  const { data: rows, refetch } = useReadContracts({
    contracts: ids.map(epochRow),
    query: { enabled: count > 0 },
  });

  // Read fraud flags + encrypted handles per epoch (for reveal/fulfill).
  const { data: extra } = useReadContracts({
    contracts: ids.flatMap((id) => [
      {
        address: PROOF_OF_RESERVES_ADDRESS,
        abi: proofOfReservesABI,
        functionName: "isFraudulent" as const,
        args: [id] as const,
      },
      {
        address: PROOF_OF_RESERVES_ADDRESS,
        abi: proofOfReservesABI,
        functionName: "getEncryptedTotal" as const,
        args: [id] as const,
      },
      {
        address: PROOF_OF_RESERVES_ADDRESS,
        abi: proofOfReservesABI,
        functionName: "getEncryptedSolvent" as const,
        args: [id] as const,
      },
    ]),
    query: { enabled: count > 0 },
  });

  async function reveal(id: number) {
    setError(null);
    setBusy(id);
    try {
      await writeContractAsync({
        address: PROOF_OF_RESERVES_ADDRESS,
        abi: proofOfReservesABI,
        functionName: "requestReveal",
        args: [BigInt(id)],
      });
      await refetch();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(null);
    }
  }

  async function fulfill(id: number) {
    setError(null);
    setBusy(id);
    try {
      const totalHandle = extra?.[id * 3 + 1].result as unknown as `0x${string}` | undefined;
      const solventHandle = extra?.[id * 3 + 2].result as unknown as `0x${string}` | undefined;
      if (!totalHandle || !solventHandle) throw new Error("Handles not loaded");

      const result = await decryptPublic([totalHandle, solventHandle]);
      await writeContractAsync({
        address: PROOF_OF_RESERVES_ADDRESS,
        abi: proofOfReservesABI,
        functionName: "fulfillPublicDecryption",
        args: [BigInt(id), [totalHandle, solventHandle], result.abiEncodedClearValues, result.decryptionProof],
      });
      await refetch();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Shell>
      <h1 className="mb-1 text-2xl font-bold">Auditor</h1>
      <p className="mb-6 text-muted">
        Publicly verify each epoch&rsquo;s solvency — without seeing any
        individual balance. Anyone can drive the trustless reveal.
      </p>

      {IS_UNDEPLOYED && <UndeployedBanner />}

      <NetworkGuard>
        {count === 0 ? (
          <div className="card text-sm text-muted">
            <p className="font-semibold text-foreground">No epochs yet.</p>
            <p className="mt-1">
              An exchange admin needs to open the first attestation epoch. If
              you&rsquo;re running the demo, this happens automatically via{" "}
              <code className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-xs">
                pnpm setup
              </code>{" "}
              (which deploys and seeds an epoch). See the README.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {ids.map((idBig, i) => {
              const e = rows?.[i].result as EpochTuple | undefined;
              if (!e) return null;
              const [liabilities, deadline, revealedTotal, solvent, revealed, fulfilled, attCount] = e;
              const fraudulent = extra?.[i * 3].result as boolean | undefined;
              const now = Math.floor(Date.now() / 1000);
              const closed = deadline !== 0n && BigInt(now) >= deadline;
              const totalHandle = extra?.[i * 3 + 1].result as unknown as `0x${string}` | undefined;
              const solventHandle = extra?.[i * 3 + 2].result as unknown as `0x${string}` | undefined;

              return (
                <div key={i} className="card">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Epoch #{i}</span>
                        {fraudulent && (
                          <span className="tag inline-flex items-center gap-1 bg-danger/20 text-danger">
                            <AlertIcon aria-label="Fraudulent" /> fraudulent
                          </span>
                        )}
                        {fulfilled && !fraudulent && (
                          <span
                            className={`tag inline-flex items-center gap-1 ${
                              solvent
                                ? "bg-success/20 text-success"
                                : "bg-warning/20 text-warning"
                            }`}
                          >
                            {solvent ? (
                              <>
                                <CheckIcon aria-label="Solvent" /> solvent
                              </>
                            ) : (
                              <>
                                <XIcon aria-label="Insolvent" /> insolvent
                              </>
                            )}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-muted">
                        liabilities: {liabilities.toString()} · attestations:{" "}
                        {attCount.toString()} · deadline:{" "}
                        {deadline === 0n
                          ? "—"
                          : new Date(Number(deadline) * 1000).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {!closed && deadline !== 0n && (
                        <span className="text-xs text-muted">window open</span>
                      )}
                      {closed && !revealed && (
                        <button
                          className="btn-ghost text-sm"
                          disabled={busy === i || isPending}
                          onClick={() => reveal(i)}
                        >
                          {busy === i ? "…" : "1. Reveal"}
                        </button>
                      )}
                      {revealed && !fulfilled && totalHandle && solventHandle && (
                        <button
                          className="btn-primary text-sm"
                          disabled={busy === i || isPending}
                          onClick={() => fulfill(i)}
                        >
                          {busy === i ? "…" : "2. Decrypt & verify"}
                        </button>
                      )}
                      {fulfilled && (
                        <div className="text-right text-sm">
                          <div className="text-muted">revealed total</div>
                          <div className="font-mono text-lg">{revealedTotal.toString()}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="mt-4">
          <ErrorText error={error} />
        </div>
      </NetworkGuard>
    </Shell>
  );
}
