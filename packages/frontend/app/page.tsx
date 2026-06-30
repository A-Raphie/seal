import Link from "next/link";
import { Shell } from "@/components/Shell";
import {
  AlertIcon,
  LockIcon,
  ShieldIcon,
  SigmaIcon,
  KeyIcon,
  CheckIcon,
} from "@/components/icons";

export default function Home() {
  return (
    <Shell>
      {/* ── Hero: split layout — pitch left, animated flow diagram right ── */}
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

        {/* Right: the composition, visualized */}
        <FlowDiagram />
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
          {/* Per-balance: violet (encrypted, never readable) */}
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

          {/* Verdict: cyan (public) */}
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

          {/* Total: violet (auditor-gated) */}
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

/**
 * The composition, visualized as an animated flow — pure CSS/SVG, no deps.
 *   3 encrypted balances → Σ (homomorphic sum) → SOLVENT verdict (cyan, pulses)
 *   the TOTAL sits behind an auditor gate (violet, shimmer)
 * Reduced-motion: the @media rule in globals.css neutralizes the animations.
 */
function FlowDiagram() {
  const balances = [
    { label: "400k", delay: "0s" },
    { label: "350k", delay: "0.8s" },
    { label: "300k", delay: "1.6s" },
  ];
  return (
    <div
      className="relative mx-auto w-full max-w-md"
      role="img"
      aria-label="Flow diagram: three encrypted balances sum into a solvent verdict (public), while the aggregate total is locked behind an auditor gate."
    >
      <div className="card overflow-visible p-6">
        {/* Encrypted balances column */}
        <div className="space-y-2.5">
          {balances.map((b) => (
            <div key={b.label} className="relative flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-accent/30 bg-accent/10 text-accent">
                <LockIcon aria-hidden />
              </span>
              <span className="flex-1 rounded-lg border border-line bg-black/30 px-3 py-2 font-mono text-sm text-muted">
                encrypted · {b.label}
              </span>
              {/* traveling dot */}
              <span
                className="absolute right-10 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-accent animate-flow-dot"
                style={{ animationDelay: b.delay }}
                aria-hidden
              />
            </div>
          ))}
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
              FHE.add → 1.05M
            </span>
          </div>
        </div>

        {/* Two outputs: verdict (cyan, public) + total (violet, gated) */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-cyan/40 bg-cyan/5 p-3 text-center">
            <div className="mb-1 text-[11px] uppercase tracking-wide text-cyan/80">
              verdict · public
            </div>
            <div className="flex items-center justify-center gap-1.5 font-mono text-sm font-semibold text-cyan">
              <CheckIcon aria-hidden /> SOLVENT
            </div>
            <div
              className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-cyan/40 animate-verdict-pulse"
              aria-hidden
            />
          </div>
          <div className="relative rounded-xl border border-accent/40 bg-accent/5 p-3 text-center">
            <div className="mb-1 text-[11px] uppercase tracking-wide text-accent/80">
              total · gated
            </div>
            <div className="flex items-center justify-center gap-1.5 font-mono text-sm font-semibold text-accent">
              <KeyIcon className="animate-gate-shimmer" aria-hidden /> 1.05M
            </div>
            <div className="mt-2 text-[10px] text-muted-foreground">
              auditor ERC-721 only
            </div>
          </div>
        </div>
      </div>

      {/* Caption */}
      <p className="mt-3 text-center text-xs text-muted-foreground">
        The aggregate is real — proven on-chain. The individual balances never
        decrypt.
      </p>
    </div>
  );
}
