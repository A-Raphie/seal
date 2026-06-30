"use client";

import { useMemo, useState } from "react";
import { useAccount, useReadContracts, useWriteContract } from "wagmi";
import { useDecryptPublicValues } from "@zama-fhe/react-sdk";
import { Shell } from "@/components/Shell";
import { NetworkGuard } from "@/components/NetworkGuard";
import { ErrorText } from "@/components/ErrorText";
import { UndeployedBanner } from "@/components/UndeployedBanner";
import { CheckIcon, XIcon, AlertIcon, KeyIcon } from "@/components/icons";
import { proofOfReservesABI, auditorCredentialABI } from "@/lib/abi";
import {
  PROOF_OF_RESERVES_ADDRESS,
  AUDITOR_CREDENTIAL_ADDRESS,
  IS_UNDEPLOYED,
} from "@/lib/contract";
import { friendlyError } from "@/lib/errors";

// getEpoch returns: (liabilities, deadline, solvent, revealed, fulfilled, auditor, attCount)
type EpochTuple = readonly [
  bigint, // claimedLiabilities
  bigint, // deadline
  boolean, // solvent
  boolean, // revealed
  boolean, // fulfilled
  `0x${string}`, // auditor
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
  const { address } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();
  const { mutateAsync: decryptPublic } = useDecryptPublicValues();
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Composable-privacy gate: is the connected wallet an accredited auditor?
  const { data: auditorStatus } = useReadContracts({
    contracts: [
      {
        address: AUDITOR_CREDENTIAL_ADDRESS,
        abi: auditorCredentialABI,
        functionName: "isAuditor",
        args: [address ?? "0x0000000000000000000000000000000000000000"],
      },
    ],
    query: { enabled: !!address && !IS_UNDEPLOYED },
  });
  const isAuditor = Boolean(auditorStatus?.[0].result);

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

  const ids = useMemo(() => Array.from({ length: count }, (_, i) => BigInt(i)), [count]);
  const { data: rows, refetch } = useReadContracts({
    contracts: ids.map(epochRow),
    query: { enabled: count > 0 },
  });

  // Fraud flags + the encrypted VERDICT handle per epoch.
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
      const solventHandle = extra?.[id * 2 + 1].result as unknown as `0x${string}` | undefined;
      if (!solventHandle) throw new Error("Verdict handle not loaded");

      const result = await decryptPublic([solventHandle]);
      await writeContractAsync({
        address: PROOF_OF_RESERVES_ADDRESS,
        abi: proofOfReservesABI,
        functionName: "fulfillVerdict",
        args: [BigInt(id), [solventHandle], result.abiEncodedClearValues, result.decryptionProof],
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
      <header className="mb-6">
        <h1 className="text-3xl font-bold">Auditor</h1>
        <p className="mt-1.5 max-w-2xl text-muted">
          Verify each epoch&rsquo;s solvency without seeing any individual
          balance. The 1-bit verdict is public; the aggregate total is
          decryptable only by an accredited auditor.
        </p>
      </header>

      {IS_UNDEPLOYED && <UndeployedBanner />}

      {/* Auditor accreditation status — the credential gate. */}
      <div
        className={`mb-5 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm ${
          isAuditor
            ? "border-accent/30 bg-accent/5 shadow-glow-accent"
            : "border-line bg-surface/60"
        }`}
      >
        <KeyIcon className={`text-lg ${isAuditor ? "text-accent" : "text-muted"}`} aria-hidden />
        {address ? (
          isAuditor ? (
            <span className="text-accent">
              You are an <strong>accredited auditor</strong> — you may reveal
              epochs and decrypt the aggregate total.
            </span>
          ) : (
            <span className="text-muted">
              You are not accredited. Only an accredited auditor can drive the
              reveal. The 1-bit verdict is still public once revealed.
            </span>
          )
        ) : (
          <span className="text-muted">Connect a wallet to check auditor accreditation.</span>
        )}
      </div>

      <NetworkGuard>
        {count === 0 ? (
          <div className="card text-sm text-muted">
            <p className="font-semibold text-foreground">No epochs yet.</p>
            <p className="mt-1">
              An exchange admin needs to open the first attestation epoch. If
              you&rsquo;re running the demo, this happens automatically via{" "}
              <code className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-xs">
                pnpm setup
              </code>
              . See the README.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {ids.map((idBig, i) => {
              const e = rows?.[i].result as EpochTuple | undefined;
              if (!e) return null;
              const [liabilities, deadline, solvent, revealed, fulfilled, auditor, attCount] = e;
              const fraudulent = extra?.[i * 2].result as boolean | undefined;
              const solventHandle = extra?.[i * 2 + 1].result as unknown as `0x${string}` | undefined;
              const now = Math.floor(Date.now() / 1000);
              const closed = deadline !== 0n && BigInt(now) >= deadline;
              // Accent rail: red if fraudulent, cyan if verdict public, violet otherwise.
              const rail = fraudulent ? "rail-danger" : fulfilled ? "rail-cyan" : "rail-accent";

              return (
                <div key={i} className={`card ${rail}`}>
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    {/* Left: epoch identity + status */}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-display text-lg font-semibold">Epoch #{i}</span>
                        {fraudulent && (
                          <span className="tag bg-danger/15 text-danger">
                            <AlertIcon aria-hidden /> fraudulent
                          </span>
                        )}
                        {fulfilled && !fraudulent && (
                          <span
                            className={`tag ${
                              solvent ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
                            }`}
                          >
                            {solvent ? (
                              <>
                                <CheckIcon aria-hidden /> solvent
                              </>
                            ) : (
                              <>
                                <XIcon aria-hidden /> insolvent
                              </>
                            )}
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted">
                        <span>
                          <span className="text-muted-foreground">liabilities </span>
                          <span className="font-mono text-foreground">{liabilities.toString()}</span>
                        </span>
                        <span>
                          <span className="text-muted-foreground">attestations </span>
                          <span className="font-mono text-foreground">{attCount.toString()}</span>
                        </span>
                        <span>
                          <span className="text-muted-foreground">deadline </span>
                          {deadline === 0n
                            ? "—"
                            : new Date(Number(deadline) * 1000).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Right: actions / verdict */}
                    <div className="flex items-center gap-3">
                      {!closed && deadline !== 0n && (
                        <span className="text-xs text-muted">window open</span>
                      )}
                      {closed && !revealed && (
                        <button
                          className="btn-ghost text-sm"
                          disabled={busy === i || isPending || !isAuditor}
                          title={isAuditor ? undefined : "Only an accredited auditor can reveal"}
                          onClick={() => reveal(i)}
                        >
                          {busy === i ? "…" : "1. Reveal"}
                          <span className="text-muted-foreground">· auditor</span>
                        </button>
                      )}
                      {revealed && !fulfilled && solventHandle && (
                        <button
                          className="btn-cyan text-sm"
                          disabled={busy === i || isPending}
                          onClick={() => fulfill(i)}
                        >
                          {busy === i ? "…" : "2. Decrypt verdict"}
                        </button>
                      )}
                      {fulfilled && (
                        <div className="text-right">
                          <div className="stat-label">verdict</div>
                          <div
                            className={`font-mono text-xl font-bold ${
                              solvent ? "text-success" : "text-warning"
                            }`}
                          >
                            {solvent ? "SOLVENT" : "INSOLVENT"}
                          </div>
                          <div className="mt-0.5 text-[11px] text-muted-foreground">
                            total: auditor-gated
                            {auditor !== "0x0000000000000000000000000000000000000000" && (
                              <>
                                {" "}
                                · {auditor.slice(0, 8)}…
                              </>
                            )}
                          </div>
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
