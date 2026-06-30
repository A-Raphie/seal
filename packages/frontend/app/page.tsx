"use client";

import Link from "next/link";
import { useReadContracts } from "wagmi";
import { Shell } from "@/components/Shell";
import {
  AlertIcon,
  LockIcon,
  ShieldIcon,
  SigmaIcon,
  KeyIcon,
  CheckIcon,
  XIcon,
} from "@/components/icons";
import { proofOfReservesABI } from "@/lib/abi";
import { PROOF_OF_RESERVES_ADDRESS, IS_UNDEPLOYED } from "@/lib/contract";

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

/**
 * Reads epoch 0's live state from Sepolia so the hero diagram reflects the real,
 * deployed contract — not hardcoded demo numbers. Falls back to illustrative
 * values only when the contract isn't deployed or the read is still loading.
 */
function useLiveEpoch0() {
  const { data, isLoading } = useReadContracts({
    contracts: [
      {
        address: PROOF_OF_RESERVES_ADDRESS,
        abi: proofOfReservesABI,
        functionName: "nextEpochId",
      },
      {
        address: PROOF_OF_RESERVES_ADDRESS,
        abi: proofOfReservesABI,
        functionName: "getEpoch",
        args: [0n],
      },
      {
        address: PROOF_OF_RESERVES_ADDRESS,
        abi: proofOfReservesABI,
        functionName: "isFraudulent",
        args: [0n],
      },
    ],
    query: { enabled: !IS_UNDEPLOYED },
  });

  const hasEpoch = (() => {
    const next = data?.[0].result;
    if (next === undefined) return false;
    return BigInt(next) > 0n;
  })();
  const epoch = (hasEpoch ? data?.[1].result : undefined) as EpochTuple | undefined;
  const fraudulent = hasEpoch ? (data?.[2].result as boolean | undefined) : undefined;

  return {
    isLoading: isLoading || (!IS_UNDEPLOYED && data === undefined),
    hasEpoch,
    liabilities: epoch?.[0],
    solvent: epoch?.[2],
    revealed: epoch?.[3],
    fulfilled: epoch?.[4],
    attestationCount: epoch?.[6],
    fraudulent,
  };
}

export default function Home() {
  const live = useLiveEpoch0();

  return (
    <Shell>
      {/* ── Hero: split layout — pitch left, live flow diagram right ── */}
      <section className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        {/* Left: pitch */}
        <div>
          <div className="badge mb-5 border-accent/30 bg-accent/10 text-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
            Composable Privacy · Zama Season 3
          </div>
          <h1 className="text-hero font-bold">
            Prove solvency.
            <br />
            <span className="text-gradient">Without revealing a balance.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base text-muted">
            A confidential Proof-of-Reserves on the Zama Protocol. An exchange
            proves its reserves exceed its liabilities — homomorphically summed,
            trustlessly revealed. The 1-bit verdict is public; the total is
            decryptable only by a credentialed auditor.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/audit" className="btn-primary">
              Explore the demo — Auditor view
              <span aria-hidden>→</span>
            </Link>
            <Link href="/exchange" className="btn-ghost">
              Exchange back-office
            </Link>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            No wallet needed to view epochs and solvency results.
          </p>
        </div>

        {/* Right: the composition, visualized — reading LIVE epoch 0 */}
        <FlowDiagram live={live} />
      </section>

      {/* ── The composable split — color-coded by the two-accent system ── */}
      <section className="mt-20" aria-label="The composable-privacy split">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Who can decrypt what</h2>
            <p className="mt-1 text-sm text-muted">
              Decryption rights are composed from an on-chain credential — not
              left open to anyone.
            </p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="card rail-accent">
            <div className="mb-3 flex items-center gap-2 text-accent">
              <LockIcon className="text-xl" aria-hidden />
              <span className="badge border-accent/30 bg-accent/10 text-accent">
                never readable
              </span>
            </div>
            <p className="stat mb-1">🔒 per balance</p>
            <p className="text-sm text-muted">
              Each customer&rsquo;s balance gets{" "}
              <code className="font-mono text-xs text-muted-foreground">FHE.allowThis</code>{" "}
              only — permanently undecryptable, by anyone. Summed under
              encryption, never read.
            </p>
          </div>

          <div className="card rail-cyan">
            <div className="mb-3 flex items-center gap-2 text-cyan">
              <CheckIcon className="text-xl" aria-hidden />
              <span className="badge border-cyan/30 bg-cyan/10 text-cyan">
                public
              </span>
            </div>
            <p className="stat mb-1 text-cyan">1-bit verdict</p>
            <p className="text-sm text-muted">
              &ldquo;Is the exchange solvent?&rdquo; — a public good. Anyone can
              learn the answer once an auditor drives the reveal.
            </p>
          </div>

          <div className="card rail-accent">
            <div className="mb-3 flex items-center gap-2 text-accent">
              <KeyIcon className="text-xl" aria-hidden />
              <span className="badge border-accent/30 bg-accent/10 text-accent">
                auditor-gated
              </span>
            </div>
            <p className="stat mb-1">aggregate total</p>
            <p className="text-sm text-muted">
              The actual reserve number is commercially sensitive. Only a
              soulbound ERC-721 credential holder can decrypt it, off-chain via
              EIP-712.
            </p>
          </div>
        </div>
      </section>

      {/* ── The problem / solution / trustless row ── */}
      <section className="mt-16" aria-label="How it works">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="card">
            <AlertIcon className="mb-3 text-xl text-danger" aria-hidden />
            <h3 className="mb-1.5 font-semibold">The problem</h3>
            <p className="text-sm text-muted">
              Post-FTX &ldquo;Proof-of-Reserves&rdquo; leak customer data — every
              balance visible in Merkle leaves or signed statements.
            </p>
          </div>
          <div className="card">
            <LockIcon className="mb-3 text-xl text-accent" aria-hidden />
            <h3 className="mb-1.5 font-semibold">The FHE solution</h3>
            <p className="text-sm text-muted">
              Each customer submits an encrypted, exchange-signed balance. The
              contract sums <em>ciphertexts</em>. No plaintext ever touched.
            </p>
          </div>
          <div className="card">
            <ShieldIcon className="mb-3 text-xl text-success" aria-hidden />
            <h3 className="mb-1.5 font-semibold">Trustless</h3>
            <p className="text-sm text-muted">
              No operator in the trust path. The verdict is computed on-chain
              over ciphertexts; KMS decryption is verified on-chain. Plus a
              fraud-challenge path.
            </p>
          </div>
        </div>
      </section>

      {/* ── Role router ── */}
      <section className="mt-16" aria-label="Choose your role">
        <h2 className="mb-5 text-xl font-bold">Choose your role</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Link
            href="/exchange"
            className="card transition hover:border-accent/40 hover:shadow-glow-accent"
            aria-label="Open the Exchange back-office"
          >
            <h3 className="font-semibold">Exchange</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">for operators</p>
            <p className="mt-2.5 text-sm text-muted">
              Open an attestation epoch, publish a liabilities claim, accredit
              auditors.
            </p>
          </Link>
          <Link
            href="/customer"
            className="card transition hover:border-accent/40 hover:shadow-glow-accent"
            aria-label="Open the Customer pane"
          >
            <h3 className="font-semibold">Customer</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">for customers</p>
            <p className="mt-2.5 text-sm text-muted">
              Submit your encrypted balance, or challenge a conflicting
              attestation.
            </p>
          </Link>
          <Link
            href="/audit"
            className="card border-cyan/30 transition hover:border-cyan/60 hover:shadow-glow-cyan"
            aria-label="Open the Auditor view"
          >
            <h3 className="font-semibold text-cyan">Auditor</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">start here</p>
            <p className="mt-2.5 text-sm text-muted">
              Drive the reveal and verify each epoch&rsquo;s solvency verdict.
            </p>
          </Link>
        </div>
      </section>
    </Shell>
  );
}

type LiveEpoch = ReturnType<typeof useLiveEpoch0>;

/**
 * The composition, visualized as an animated flow — now reading LIVE epoch 0.
 *   N encrypted balances → Σ (homomorphic sum) → verdict (live: pending/SOLVENT/INSOLVENT)
 *   the TOTAL sits behind an auditor gate (violet, shimmer)
 * Reduced-motion: the @media rule in globals.css neutralizes the animations.
 *
 * When still loading or undeployed, shows illustrative placeholders so the
 * diagram is never empty. Once live data arrives, every number reflects the
 * real on-chain state.
 */
function FlowDiagram({ live }: { live: LiveEpoch }) {
  const { isLoading, hasEpoch, attestationCount, liabilities, revealed, fulfilled, solvent, fraudulent } = live;

  // Render N balance chips based on the real attestation count (cap at 4 for layout).
  const chipCount = hasEpoch && attestationCount !== undefined
    ? Math.min(Number(attestationCount), 4)
    : 3; // illustrative fallback
  const chips = Array.from({ length: chipCount }, (_, i) => ({
    delay: `${i * 0.8}s`,
  }));

  // Live verdict state.
  const verdictLabel = !hasEpoch || !fulfilled
    ? "pending"
    : fraudulent
      ? "FRAUD"
      : solvent
        ? "SOLVENT"
        : "INSOLVENT";
  const verdictTone = !fulfilled
    ? "muted"
    : fraudulent
      ? "danger"
      : solvent
        ? "cyan"
        : "warning";

  const reservesLabel = hasEpoch && liabilities !== undefined
    ? `Σ ≥ ${formatCompact(liabilities)}`
    : "Σ = ?";

  return (
    <div
      className="relative mx-auto w-full max-w-md"
      role="img"
      aria-label={`Flow diagram reading live Sepolia state: ${chipCount} encrypted attestations sum into a reserve total, with a ${verdictLabel} verdict.`}
    >
      <div className="card overflow-visible p-6">
        {/* Live-status pill */}
        <div className="mb-4 flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
            epoch 0
          </span>
          <span className="badge border-line bg-black/30">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isLoading ? "bg-muted animate-pulse" : hasEpoch ? "bg-success" : "bg-muted"
              }`}
              aria-hidden
            />
            {isLoading ? "reading Sepolia…" : hasEpoch ? "live on Sepolia" : "not deployed"}
          </span>
        </div>

        {/* Encrypted balances column */}
        <div className="space-y-2.5">
          {chips.map((c, i) => (
            <div key={i} className="relative flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-accent/30 bg-accent/10 text-accent">
                <LockIcon aria-hidden />
              </span>
              <span className="flex-1 rounded-lg border border-line bg-black/30 px-3 py-2 font-mono text-sm text-muted">
                encrypted balance #{i + 1}
              </span>
              <span
                className="absolute right-10 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-accent animate-flow-dot"
                style={{ animationDelay: c.delay }}
                aria-hidden
              />
            </div>
          ))}
          {hasEpoch && attestationCount !== undefined && Number(attestationCount) > 4 && (
            <p className="pl-12 text-xs text-muted-foreground">
              +{Number(attestationCount) - 4} more attestations
            </p>
          )}
        </div>

        {/* Connector down to Σ */}
        <div className="my-3 flex justify-center" aria-hidden>
          <div className="h-6 w-px bg-gradient-to-b from-accent/60 to-line" />
        </div>

        {/* Σ homomorphic-sum node */}
        <div className="mb-3 flex justify-center">
          <div className="flex items-center gap-2 rounded-xl border border-line-strong bg-surface-2 px-5 py-2.5 shadow-glow-accent">
            <SigmaIcon className="text-lg text-accent" aria-hidden />
            <span className="font-mono text-sm font-medium text-foreground">
              FHE.add · {reservesLabel}
            </span>
          </div>
        </div>

        {/* Two outputs: verdict (live) + total (violet, gated) */}
        <div className="grid grid-cols-2 gap-3">
          <div
            className={`rounded-xl border p-3 text-center transition ${
              verdictTone === "cyan"
                ? "border-cyan/40 bg-cyan/5"
                : verdictTone === "warning"
                  ? "border-warning/40 bg-warning/5"
                  : verdictTone === "danger"
                    ? "border-danger/40 bg-danger/5"
                    : "border-line bg-black/20"
            }`}
          >
            <div
              className={`mb-1 text-[11px] uppercase tracking-wide ${
                verdictTone === "cyan"
                  ? "text-cyan/80"
                  : verdictTone === "warning"
                    ? "text-warning/80"
                    : verdictTone === "danger"
                      ? "text-danger/80"
                      : "text-muted-foreground"
              }`}
            >
              verdict · {!fulfilled ? "pending reveal" : "public"}
            </div>
            <div
              className={`flex items-center justify-center gap-1.5 font-mono text-sm font-semibold ${
                verdictTone === "cyan"
                  ? "text-cyan"
                  : verdictTone === "warning"
                    ? "text-warning"
                    : verdictTone === "danger"
                      ? "text-danger"
                      : "text-muted"
              }`}
            >
              {fulfilled && solvent && !fraudulent && <CheckIcon aria-hidden />}
              {fulfilled && !solvent && !fraudulent && <XIcon aria-hidden />}
              {verdictLabel}
            </div>
            {verdictTone === "cyan" && (
              <div
                className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-cyan/40 animate-verdict-pulse"
                aria-hidden
              />
            )}
          </div>

          <div className="relative rounded-xl border border-accent/40 bg-accent/5 p-3 text-center">
            <div className="mb-1 text-[11px] uppercase tracking-wide text-accent/80">
              total · {!revealed ? "encrypted" : "gated"}
            </div>
            <div className="flex items-center justify-center gap-1.5 font-mono text-sm font-semibold text-accent">
              <KeyIcon className="animate-gate-shimmer" aria-hidden /> auditor-only
            </div>
            <div className="mt-2 text-[10px] text-muted-foreground">
              {hasEpoch && liabilities !== undefined
                ? `≥ ${formatCompact(liabilities)}`
                : "ERC-721 gated"}
            </div>
          </div>
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-muted-foreground">
        {hasEpoch
          ? "Reading live on-chain state — the aggregate is real, individual balances never decrypt."
          : "Illustrative diagram — deploys live once the contract is seeded."}
      </p>
    </div>
  );
}

/** Compact integer formatting for big numbers (1000000 -> 1M, 1050000 -> 1.05M). */
function formatCompact(n: bigint): string {
  const num = Number(n);
  if (num >= 1_000_000) {
    const m = num / 1_000_000;
    return `${Number.isInteger(m) ? m : m.toFixed(2)}M`;
  }
  if (num >= 1_000) {
    const k = num / 1_000;
    return `${Number.isInteger(k) ? k : k.toFixed(1)}k`;
  }
  return num.toString();
}
