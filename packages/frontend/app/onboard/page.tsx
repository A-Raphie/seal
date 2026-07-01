"use client";

import { useState } from "react";
import Link from "next/link";
import { useAccount, useReadContracts, useWriteContract } from "wagmi";
import { Shell } from "@/components/Shell";
import { NetworkGuard } from "@/components/NetworkGuard";
import { TxLink } from "@/components/TxLink";
import { ErrorText } from "@/components/ErrorText";
import { UndeployedBanner } from "@/components/UndeployedBanner";
import { CheckIcon, KeyIcon } from "@/components/icons";
import { proofOfReservesFactoryABI } from "@/lib/abi";
import { FACTORY_ADDRESS, IS_UNDEPLOYED } from "@/lib/contract";
import { friendlyError } from "@/lib/errors";

export default function OnboardPage() {
  const { address, isConnected } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();
  const [signerAddr, setSignerAddr] = useState("");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const signerValid = /^0x[a-fA-F0-9]{40}$/.test(signerAddr);
  // Admin defaults to the connected wallet; must differ from signer.
  const adminAddr = address ?? "";
  const adminValid = /^0x[a-fA-F0-9]{40}$/.test(adminAddr);
  const distinct = adminValid && signerValid && adminAddr.toLowerCase() !== signerAddr.toLowerCase();
  const canRegister = adminValid && signerValid && distinct && !isPending;

  // How many exchanges are registered?
  const { data: countData } = useReadContracts({
    contracts: [
      {
        address: FACTORY_ADDRESS,
        abi: proofOfReservesFactoryABI,
        functionName: "exchangeCount",
      },
    ],
  });
  const count = countData?.[0].result ? Number(countData[0].result) : 0;

  // Batch-read all registered exchanges for the directory.
  const ids = Array.from({ length: count }, (_, i) => BigInt(i));
  const { data: exchanges } = useReadContracts({
    contracts: ids.map((id) => ({
      address: FACTORY_ADDRESS,
      abi: proofOfReservesFactoryABI,
      functionName: "getExchange" as const,
      args: [id] as const,
    })),
    query: { enabled: count > 0 },
  });

  async function handleRegister() {
    if (!canRegister) return;
    setError(null);
    setTxHash(null);
    try {
      const hash = await writeContractAsync({
        address: FACTORY_ADDRESS,
        abi: proofOfReservesFactoryABI,
        functionName: "registerExchange",
        args: [adminAddr as `0x${string}`, signerAddr as `0x${string}`],
      });
      setTxHash(hash);
      setSignerAddr("");
    } catch (e) {
      setError(friendlyError(e));
    }
  }

  return (
    <Shell>
      <header className="mb-6">
        <h1 className="text-3xl font-bold">Onboard an exchange</h1>
        <p className="mt-1.5 max-w-2xl text-muted">
          Register a new exchange to get its own isolated{" "}
          <code className="font-mono text-xs text-muted-foreground">
            (AuditorCredential, ProofOfReserves)
          </code>{" "}
          pair. Each exchange runs its own epochs, accredits its own auditors,
          and chooses its reserve token.
        </p>
      </header>

      {IS_UNDEPLOYED && <UndeployedBanner />}

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Registration form */}
        <div className="card">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Register
          </h2>
          <NetworkGuard>
            {!isConnected ? (
              <p className="text-sm text-muted">Connect your wallet first.</p>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="label">Exchange admin (your wallet)</label>
                  <input
                    className="input font-mono"
                    type="text"
                    value={adminAddr}
                    disabled
                    aria-describedby="admin-help"
                  />
                  <p id="admin-help" className="mt-1.5 text-xs text-muted-foreground">
                    The admin opens epochs and accredits auditors. Defaults to your
                    connected wallet.
                  </p>
                </div>
                <div>
                  <label className="label" htmlFor="signer-input">
                    Exchange signer (cold key)
                  </label>
                  <input
                    id="signer-input"
                    className="input font-mono"
                    type="text"
                    placeholder="0x…"
                    value={signerAddr}
                    onChange={(e) => setSignerAddr(e.target.value)}
                    aria-invalid={signerAddr.length > 0 && (!signerValid || !distinct)}
                  />
                  {signerAddr.length > 0 && !signerValid && (
                    <p className="mt-1.5 text-xs text-danger">Enter a valid 0x address.</p>
                  )}
                  {signerValid && !distinct && (
                    <p className="mt-1.5 text-xs text-danger">
                      The signer MUST differ from the admin (a hot-key compromise
                      must not be able to forge attestations).
                    </p>
                  )}
                </div>
                <button
                  className="btn-primary w-full"
                  disabled={!canRegister}
                  onClick={handleRegister}
                >
                  {isPending ? "Deploying…" : "Register exchange"}
                </button>
                {txHash && (
                  <p className="text-xs text-success" aria-live="polite">
                    Registered: <TxLink value={txHash} type="tx" /> — your
                    exchange&rsquo;s contracts are live. Open the Exchange tab to
                    create your first epoch.
                  </p>
                )}
                <ErrorText error={error} />
              </div>
            )}
          </NetworkGuard>
        </div>

        {/* Exchange directory */}
        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Registered exchanges
            </h2>
            <span className="badge border-line bg-black/30">
              {count} onboarded
            </span>
          </div>
          {count === 0 ? (
            <p className="text-sm text-muted">
              No exchanges registered yet via the factory. Be the first.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {exchanges?.map((res, i) => {
                const ex = res.result as
                  | readonly [`0x${string}`, `0x${string}`, `0x${string}`, bigint]
                  | undefined;
                if (!ex) return null;
                const [exAdmin, exPor, exCred] = ex;
                return (
                  <li key={i} className="rounded-lg border border-line bg-black/20 p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-display font-semibold">Exchange #{i}</span>
                      <span className="badge border-accent/30 bg-accent/10 text-accent">
                        <KeyIcon aria-hidden /> isolated
                      </span>
                    </div>
                    <dl className="mt-2 space-y-1 text-xs">
                      <div className="flex justify-between gap-2">
                        <dt className="text-muted">admin</dt>
                        <dd className="font-mono">
                          <TxLink value={exAdmin} type="address" />
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-muted">PoR</dt>
                        <dd className="font-mono">
                          <TxLink value={exPor} type="address" />
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-muted">credential</dt>
                        <dd className="font-mono">
                          <TxLink value={exCred} type="address" />
                        </dd>
                      </div>
                    </dl>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-6 flex items-center gap-2 rounded-xl border border-cyan/20 bg-cyan/5 px-4 py-3 text-sm">
        <CheckIcon className="text-lg text-cyan" aria-hidden />
        <span className="text-muted">
          Once registered, head to the{" "}
          <Link href="/exchange" className="text-cyan underline">
            Exchange back-office
          </Link>{" "}
          to open your first epoch (choose your reserve token), or the{" "}
          <Link href="/audit" className="text-cyan underline">
            Auditor view
          </Link>{" "}
          to verify solvency.
        </span>
      </div>
    </Shell>
  );
}
