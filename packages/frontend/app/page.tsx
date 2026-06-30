import Link from "next/link";
import { Shell } from "@/components/Shell";
import { AlertIcon, LockIcon, ShieldIcon } from "@/components/icons";

export default function Home() {
  return (
    <Shell>
      {/* Testnet disclaimer */}
      <div
        className="mb-8 rounded-lg border border-warning/30 bg-warning/5 px-4 py-2 text-center text-sm text-warning"
        role="note"
      >
        🔒 Sepolia testnet demo — all balances and transactions here are simulated.
      </div>

      <section className="mb-12 text-center">
        <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight md:text-5xl">
          Prove solvency.{" "}
          <span className="text-accent">Without revealing a single balance.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-muted">
          A confidential Proof-of-Reserves built on the Zama Protocol. An exchange
          proves its reserves exceed its liabilities — homomorphically encrypted,
          trustlessly revealed on-chain — so no customer balance ever leaks.
        </p>

        {/* Single primary CTA */}
        <div className="mt-8">
          <Link href="/audit" className="btn-primary text-base">
            Explore the demo — Auditor view →
          </Link>
          <p className="mt-2 text-xs text-muted">
            No wallet needed to view epochs and solvency results.
          </p>
        </div>
      </section>

      {/* Explainer: the why */}
      <section className="mb-12 grid gap-4 md:grid-cols-3" aria-label="How it works">
        <div className="card">
          <AlertIcon className="mb-3 text-2xl text-danger" aria-hidden />
          <h2 className="mb-2 font-semibold text-accent">The problem</h2>
          <p className="text-sm text-muted">
            Post-FTX &ldquo;Proof-of-Reserves&rdquo; leak customer data — every
            balance is visible in Merkle leaves or signed statements.
          </p>
        </div>
        <div className="card">
          <LockIcon className="mb-3 text-2xl text-accent" aria-hidden />
          <h2 className="mb-2 font-semibold text-accent">The FHE solution</h2>
          <p className="text-sm text-muted">
            Each customer submits an encrypted, exchange-signed balance. The
            contract sums <em>ciphertexts</em>. Only the aggregate and a 1-bit
            solvency result are ever decrypted.
          </p>
        </div>
        <div className="card">
          <ShieldIcon className="mb-3 text-2xl text-success" aria-hidden />
          <h2 className="mb-2 font-semibold text-accent">Trustless</h2>
          <p className="text-sm text-muted">
            No operator in the trust path. The solvency bit is computed on-chain
            over ciphertexts; KMS threshold-decryption is verified on-chain. Plus
            a fraud challenge path.
          </p>
        </div>
      </section>

      {/* Role router — primary CTA + secondary, role-labeled */}
      <section aria-label="Choose your role">
        <h2 className="mb-4 text-lg font-semibold">Choose your role</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Link
            href="/exchange"
            className="card transition hover:border-accent/40"
            aria-label="Open the Exchange back-office"
          >
            <h3 className="font-semibold">Exchange</h3>
            <p className="mt-1 text-xs text-muted-foreground">for exchange operators</p>
            <p className="mt-2 text-sm text-muted">
              Open an attestation epoch and publish a liabilities claim.
            </p>
          </Link>
          <Link
            href="/customer"
            className="card transition hover:border-accent/40"
            aria-label="Open the Customer pane"
          >
            <h3 className="font-semibold">Customer</h3>
            <p className="mt-1 text-xs text-muted-foreground">for customers</p>
            <p className="mt-2 text-sm text-muted">
              Submit your encrypted balance, or challenge a conflicting attestation.
            </p>
          </Link>
          <Link
            href="/audit"
            className="card border-accent/40 transition hover:border-accent/60"
            aria-label="Open the Auditor view"
          >
            <h3 className="font-semibold text-accent">Auditor</h3>
            <p className="mt-1 text-xs text-muted-foreground">for anyone — start here</p>
            <p className="mt-2 text-sm text-muted">
              Trigger the public reveal and verify each epoch&rsquo;s solvency.
            </p>
          </Link>
        </div>
      </section>
    </Shell>
  );
}
