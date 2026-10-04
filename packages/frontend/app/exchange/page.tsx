"use client";

import { useId, useState } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { Shell } from "@/components/Shell";
import { NetworkGuard } from "@/components/NetworkGuard";
import { TxLink } from "@/components/TxLink";
import { ErrorText } from "@/components/ErrorText";
import { CheckIcon, ShieldIcon } from "@/components/icons";
import { UndeployedBanner } from "@/components/UndeployedBanner";
import { proofOfReservesABI, auditorCredentialABI } from "@/lib/abi";
import {
  PROOF_OF_RESERVES_ADDRESS,
  AUDITOR_CREDENTIAL_ADDRESS,
  IS_UNDEPLOYED,
  SEPOLIA_TOKENS,
  type TokenInfo,
} from "@/lib/contract";
import { friendlyError } from "@/lib/errors";
import { isValidUint, parseTokenAmount } from "@/lib/parse";

export default function ExchangePage() {
  const { address, isConnected } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();
  const [liabilities, setLiabilities] = useState("");
  const [windowHours, setWindowHours] = useState("1");
  const [token, setToken] = useState<TokenInfo>(SEPOLIA_TOKENS[0]);
  const [auditorAddr, setAuditorAddr] = useState("");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [accreditTx, setAccreditTx] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const liabId = useId();
  const windowId = useId();
  const tokenId = useId();
  const auditorInputId = useId();

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

  // Composable-privacy registrar.
  const { data: registrar } = useReadContract({
    address: AUDITOR_CREDENTIAL_ADDRESS,
    abi: auditorCredentialABI,
    functionName: "registrar",
  });
  const isRegistrar = !!address && registrar === address;

  // Live validation.
  const liabValid = isValidUint(liabilities);
  const windowValid = isValidUint(windowHours);
  const windowSeconds = BigInt(windowHours) * 3600n;
  const canSubmit = liabValid && windowValid && !isPending;
  const auditorAddrValid = /^0x[a-fA-F0-9]{40}$/.test(auditorAddr);
  const canAccredit = auditorAddrValid && !isPending;

  async function handleCreate() {
    if (!liabValid || !windowValid) return;
    setError(null);
    setTxHash(null);
    try {
      const hash = await writeContractAsync({
        address: PROOF_OF_RESERVES_ADDRESS,
        abi: proofOfReservesABI,
        functionName: "createEpoch",
        args: [token.address, token.decimals, BigInt(liabilities), windowSeconds],
      });
      setTxHash(hash);
      setLiabilities("");
    } catch (e) {
      setError(friendlyError(e));
    }
  }

  async function handleAccredit() {
    if (!auditorAddrValid) return;
    setError(null);
    setAccreditTx(null);
    try {
      const hash = await writeContractAsync({
        address: AUDITOR_CREDENTIAL_ADDRESS,
        abi: auditorCredentialABI,
        functionName: "accredit",
        args: [auditorAddr as `0x${string}`],
      });
      setAccreditTx(hash);
      setAuditorAddr("");
    } catch (e) {
      setError(friendlyError(e));
    }
  }

  return (
    <Shell>
      <header className="mb-8">
        <h1 className="text-4xl font-bold">Exchange back-office</h1>
        <p className="mt-1.5 text-muted">
          Open an attestation epoch, publish the liabilities claim, and accredit
          auditors.
        </p>
      </header>

      {IS_UNDEPLOYED && <UndeployedBanner />}

      {/* Contract state — compact full-width bar */}
      <div className="card mb-5 flex flex-wrap items-center gap-6">
        <div>
          <div className="stat-label">Next epoch</div>
          <div className="stat text-xl">{nextEpochId !== undefined ? nextEpochId.toString() : <span className="skeleton-stat" aria-label="Loading" />}</div>
        </div>
        <div className="h-8 w-px bg-line" aria-hidden />
        <div>
          <div className="stat-label">Your role</div>
          <div className="mt-1">
            {isAdmin ? (
              <span className="badge border-success/30 bg-success/10 text-success">
                <CheckIcon aria-hidden /> admin
              </span>
            ) : (
              <span className="badge border-line text-muted-foreground">
                read-only
              </span>
            )}
          </div>
        </div>
        <div className="h-8 w-px bg-line" aria-hidden />
        <div className="min-w-0">
          <div className="stat-label">Contract</div>
          <div className="font-mono text-xs"><TxLink value={PROOF_OF_RESERVES_ADDRESS} type="address" /></div>
        </div>
        <div className="h-8 w-px bg-line" aria-hidden />
        <div className="min-w-0">
          <div className="stat-label">Admin</div>
          <div className="font-mono text-xs">{admin ? <TxLink value={admin} type="address" /> : "—"}</div>
        </div>
        <div className="h-8 w-px bg-line" aria-hidden />
        <div className="min-w-0">
          <div className="stat-label">Signer</div>
          <div className="font-mono text-xs">{signer ? <TxLink value={signer} type="address" /> : "—"}</div>
        </div>
      </div>

      {/* Open new epoch */}
      <div className="card">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Open new epoch
        </h2>
        <NetworkGuard>
          {!isConnected ? (
            <p className="text-sm text-muted">Connect your wallet first.</p>
          ) : !isAdmin ? (
            <p className="text-sm text-warning">
              Only the exchange admin can create epochs. Connect the admin
              wallet (the one set at deployment).
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="label" htmlFor={tokenId}>
                  Token
                </label>
                <select
                  id={tokenId}
                  className="input"
                  value={token.address}
                  onChange={(e) => {
                    const found = SEPOLIA_TOKENS.find((t) => t.address === e.target.value);
                    if (found) setToken(found);
                  }}
                >
                  {SEPOLIA_TOKENS.map((t) => (
                    <option key={t.address} value={t.address}>
                      {t.symbol}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor={liabId}>
                  Liabilities
                </label>
                <input
                  id={liabId}
                  className="input font-mono"
                  type="text"
                  inputMode="decimal"
                  placeholder="1000000"
                  value={liabilities}
                  onChange={(e) => setLiabilities(e.target.value)}
                  aria-invalid={liabilities.length > 0 && !liabValid}
                  aria-describedby={liabilities.length > 0 && !liabValid ? "liab-err" : undefined}
                />
                {liabilities.length > 0 && !liabValid && (
                  <p id="liab-err" className="mt-1.5 text-xs text-danger">
                    Whole non-negative number.
                  </p>
                )}
              </div>
              <div>
                <label className="label" htmlFor={windowId}>
                  Window
                </label>
                <select
                  id={windowId}
                  className="input"
                  value={windowHours}
                  onChange={(e) => setWindowHours(e.target.value)}
                >
                  <option value="1">1 hour</option>
                  <option value="6">6 hours</option>
                  <option value="24">24 hours</option>
                  <option value="168">7 days</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  className="btn-primary w-full"
                  disabled={!canSubmit}
                  onClick={handleCreate}
                >
                  {isPending ? "Opening…" : "Open epoch"}
                </button>
              </div>
            </div>
          )}
        </NetworkGuard>
        {txHash && (
          <p className="mt-3 text-xs text-success" aria-live="polite">
            Epoch opened: <TxLink value={txHash} type="tx" /> — see the
            Auditor tab.
          </p>
        )}
        <ErrorText error={error} />
      </div>

      {/* Composable-privacy registrar — violet-glow accent card */}
      <div className="mt-5 card border-accent/20 shadow-glow-accent">
        <div className="mb-1 flex items-center gap-2">
          <ShieldIcon className="text-lg text-accent" aria-hidden />
          <h2 className="font-semibold text-accent">Auditor accreditation</h2>
          <span className="badge border-accent/30 bg-accent/10 text-accent">
            composable-privacy gate
          </span>
        </div>
        <p className="mb-4 text-sm text-muted">
          The registrar accredits auditors with a soulbound ERC-721 credential.
          Only a credential holder can drive an epoch&rsquo;s reveal and decrypt
          the aggregate reserve total off-chain.
        </p>
        <NetworkGuard>
          {!isConnected ? (
            <p className="text-sm text-muted">Connect your wallet first.</p>
          ) : !isRegistrar ? (
            <p className="text-sm text-warning">
              Only the registrar ({registrar ? `${registrar.slice(0, 8)}…` : "—"})
              can accredit auditors. The registrar defaults to the exchange admin.
            </p>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="label" htmlFor={auditorInputId}>
                  Auditor address to accredit
                </label>
                <input
                  id={auditorInputId}
                  className="input font-mono"
                  type="text"
                  placeholder="0x…"
                  value={auditorAddr}
                  onChange={(e) => setAuditorAddr(e.target.value)}
                  aria-invalid={auditorAddr.length > 0 && !auditorAddrValid}
                />
                {auditorAddr.length > 0 && !auditorAddrValid && (
                  <p className="mt-1.5 text-xs text-danger">
                    Enter a valid 0x address.
                  </p>
                )}
              </div>
              <button
                className="btn-primary"
                disabled={!canAccredit}
                onClick={handleAccredit}
              >
                {isPending ? "Accrediting…" : "Accredit auditor"}
              </button>
              {accreditTx && (
                <p className="text-xs text-success" aria-live="polite">
                  Accredited: <TxLink value={accreditTx} type="tx" />
                </p>
              )}
            </div>
          )}
        </NetworkGuard>
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        Amounts are denominated in the selected token&rsquo;s smallest unit
        (e.g. micro-cUSDC for 6 decimals).
      </p>
    </Shell>
  );
}
