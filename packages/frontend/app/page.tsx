import { Shell } from "@/components/Shell";

export default function Home() {
  return (
    <Shell>
      <section className="mb-10 text-center">
        <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight md:text-5xl">
          Prove solvency.{" "}
          <span className="text-[#FFD700]">Without revealing a single balance.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-white/60">
          A confidential Proof-of-Reserves built on the Zama Protocol. An exchange
          proves its reserves exceed its liabilities — homomorphically encrypted,
          trustlessly revealed on-chain — so no customer balance ever leaks.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="card">
          <h3 className="mb-2 font-semibold text-[#FFD700]">The problem</h3>
          <p className="text-sm text-white/60">
            Post-FTX &ldquo;Proof-of-Reserves&rdquo; leak customer data — every
            balance is visible in Merkle leaves or signed statements.
          </p>
        </div>
        <div className="card">
          <h3 className="mb-2 font-semibold text-[#FFD700]">The FHE solution</h3>
          <p className="text-sm text-white/60">
            Each customer submits an encrypted, exchange-signed balance. The
            contract sums <em>ciphertexts</em>. Only the aggregate and a 1-bit
            solvency result are ever decrypted.
          </p>
        </div>
        <div className="card">
          <h3 className="mb-2 font-semibold text-[#FFD700]">Trustless</h3>
          <p className="text-sm text-white/60">
            No operator in the trust path. The solvency bit is computed on-chain
            over ciphertexts via <code>FHE.ge</code>; KMS threshold-decryption is
            verified on-chain. Plus a fraud challenge path via{" "}
            <code>FHE.ne</code>.
          </p>
        </div>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <a href="/exchange" className="card transition hover:border-[#FFD700]/40">
          <h3 className="font-semibold">→ Exchange</h3>
          <p className="mt-1 text-sm text-white/50">
            Open an attestation epoch and publish a liabilities claim.
          </p>
        </a>
        <a href="/customer" className="card transition hover:border-[#FFD700]/40">
          <h3 className="font-semibold">→ Customer</h3>
          <p className="mt-1 text-sm text-white/50">
            Submit your encrypted balance, or challenge a conflicting attestation.
          </p>
        </a>
        <a href="/audit" className="card transition hover:border-[#FFD700]/40">
          <h3 className="font-semibold">→ Auditor</h3>
          <p className="mt-1 text-sm text-white/50">
            Trigger the public reveal and verify each epoch&rsquo;s solvency.
          </p>
        </a>
      </section>
    </Shell>
  );
}
