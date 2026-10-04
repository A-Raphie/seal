"use client";

import Link from "next/link";
import { useReadContracts } from "wagmi";
import { Shell } from "@/components/Shell";
import { Reveal } from "@/components/Reveal";
import { CheckIcon, XIcon, KeyIcon, LockIcon, SigmaIcon, ExternalLinkIcon } from "@/components/icons";
import { proofOfReservesABI, proofOfReservesFactoryABI } from "@/lib/abi";
import {
  PROOF_OF_RESERVES_ADDRESS,
  AUDITOR_CREDENTIAL_ADDRESS,
  FACTORY_ADDRESS,
  IS_UNDEPLOYED,
  tokenInfo,
} from "@/lib/contract";
import { formatTokenAmount } from "@/lib/parse";

const SEPOLIA_BASE = "https://sepolia.etherscan.io/address";

// getEpoch returns: (token, decimals, liabilities, deadline, solvent, revealed, fulfilled, auditor, attCount)
type EpochTuple = readonly [
  `0x${string}`, // token
  number, // decimals
  bigint, // claimedLiabilities
  bigint, // deadline
  boolean, // solvent
  boolean, // revealed
  boolean, // fulfilled
  `0x${string}`, // auditor
  bigint, // attestationCount
];

export default function Home() {
  return (
    <Shell>
      {/* ── Hero: what it is, then why it matters ── */}
      <Reveal className="mb-10">
        <div className="badge mb-5 border-accent/30 bg-accent/10 text-accent">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
          Composable Privacy · Zama Season 3
        </div>
        <h1 className="max-w-3xl text-hero font-bold">
          A confidential Proof-of-Reserves protocol.
          <br />
          Balances stay encrypted.
          <br />
          <span className="text-gradient">The 1-bit verdict goes public.</span>
        </h1>
        <p className="mt-5 max-w-xl text-base text-muted">
          Exchanges prove solvency in real tokens — without revealing a single
          balance. Every customer balance is FHE-encrypted client-side, summed
          homomorphically on-chain, and only the aggregate total + a 1-bit
          solvency verdict is ever decrypted.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link href="/onboard" className="btn-primary">
            Onboard an exchange
            <span aria-hidden>→</span>
          </Link>
          <Link href="/audit" className="btn-ghost">
            View live verdicts
          </Link>
        </div>
      </Reveal>

      {/* ── The product: a live verdict board ── */}
      <Reveal delay={50}>
        <VerdictBoard />
      </Reveal>

      {/* ── Deployment proof + integration snippet side-by-side ── */}
      <Reveal delay={100}>
        <div className="mt-14 grid gap-5 lg:grid-cols-2">
          <LiveSepoliaSection />
          <CodeSnippetSection />
        </div>
      </Reveal>

      {/* ── Bento grid: how it works (asymmetric, animated widget) ── */}
      <Reveal delay={150}>
        <section className="mt-14" aria-label="How it works">
          <h2 className="mb-5 text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            How it works
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {/* Hero card: spans 2 cols, has the animated widget */}
            <div className="card card-hover md:col-span-2">
              <div className="mb-3 flex items-center gap-2 text-accent">
                <LockIcon className="text-lg" aria-hidden />
                <span className="badge border-accent/30 bg-accent/10 text-accent">
                  never readable
                </span>
              </div>
              <p className="mb-4 text-sm text-muted">
                Each customer&rsquo;s balance gets{" "}
                <code className="font-mono text-xs text-muted-foreground">
                  FHE.allowThis
                </code>{" "}
                only — permanently undecryptable. The contract sums ciphertexts
                homomorphically. No plaintext ever touched.
              </p>
              {/* Mini animated flow widget */}
              <MiniFlowWidget />
            </div>

            {/* Card 2: verdict is public */}
            <div className="card card-hover rail-cyan">
              <div className="mb-3 flex items-center gap-2 text-cyan">
                <CheckIcon className="text-lg" aria-hidden />
                <span className="badge border-cyan/30 bg-cyan/10 text-cyan">
                  public
                </span>
              </div>
              <p className="stat mb-1 text-cyan">1-bit verdict</p>
              <p className="text-sm text-muted">
                &ldquo;Is the exchange solvent?&rdquo; — a public good. Anyone
                can verify on-chain.
              </p>
            </div>

            {/* Card 3: total is auditor-gated */}
            <div className="card card-hover md:col-span-3">
              <div className="mb-3 flex items-center gap-2 text-accent">
                <KeyIcon className="text-lg" aria-hidden />
                <span className="badge border-accent/30 bg-accent/10 text-accent">
                  auditor-gated
                </span>
              </div>
              <p className="stat mb-1">aggregate total</p>
              <p className="text-sm text-muted">
                The actual reserve number is commercially sensitive. Only a
                soulbound ERC-721 credential holder can decrypt it, off-chain via
                EIP-712. Revoke the credential → the auditor loses all future
                access instantly.
              </p>
            </div>
          </div>
        </section>
      </Reveal>
    </Shell>
  );
}

/**
 * Live on Sepolia — clickable contract addresses with explorer links.
 * (Pattern from neurodegen.xyz / routedock.xyz: show real deployments.)
 */
function LiveSepoliaSection() {
  const contracts = [
    { label: "ProofOfReservesFactory", address: FACTORY_ADDRESS, desc: "Multi-exchange onboarding" },
    { label: "ProofOfReserves (Exchange #0)", address: PROOF_OF_RESERVES_ADDRESS, desc: "cUSDC-denominated epoch" },
    { label: "AuditorCredential", address: AUDITOR_CREDENTIAL_ADDRESS, desc: "Soulbound ERC-721 access gate" },
  ];

  return (
    <section aria-label="Live on Sepolia">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        Live on Sepolia
      </h2>
      <div className="grid gap-3">
        {contracts.map((c) => (
          <a
            key={c.address}
            href={`${SEPOLIA_BASE}/${c.address}`}
            target="_blank"
            rel="noreferrer"
            className="card group flex flex-col gap-2 transition hover:border-accent/40"
          >
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-foreground">{c.label}</span>
              <ExternalLinkIcon className="ml-auto h-3.5 w-3.5 text-muted opacity-0 transition group-hover:opacity-100" aria-hidden />
            </div>
            <span className="font-mono text-[10px] text-muted break-all">{c.address}</span>
            <span className="text-xs text-muted-foreground">{c.desc}</span>
          </a>
        ))}
      </div>
    </section>
  );
}

/**
 * Code snippet — shows the integration pattern. (Pattern from routedock.xyz.)
 */
function CodeSnippetSection() {
  const lines = [
    { indent: 0, parts: [{ cls: "text-accent", text: "// 1. Customer encrypts balance client-side" }] },
    { indent: 2, parts: [
      { cls: "text-muted-foreground", text: "const " },
      { cls: "text-foreground", text: "{ encryptedValues, inputProof }" },
      { cls: "text-muted-foreground", text: " = await " },
      { cls: "text-cyan", text: "encrypt" },
      { cls: "text-foreground", text: "({ values: [{ value: 4200n, type: 'euint64' }] })" },
    ]},
    { indent: 0, parts: [{ cls: "text-muted-foreground", text: "" }] },
    { indent: 0, parts: [{ cls: "text-accent", text: "// 2. Exchange signs the attestation off-chain" }] },
    { indent: 2, parts: [
      { cls: "text-muted-foreground", text: "const " },
      { cls: "text-foreground", text: "{ signature }" },
      { cls: "text-muted-foreground", text: " = await " },
      { cls: "text-cyan", text: "signAttestation" },
      { cls: "text-foreground", text: "(key, epochId, token, customer, handle, deadline)" },
    ]},
    { indent: 0, parts: [{ cls: "text-muted-foreground", text: "" }] },
    { indent: 0, parts: [{ cls: "text-accent", text: "// 3. Contract sums ciphertexts homomorphically" }] },
    { indent: 2, parts: [
      { cls: "text-muted-foreground", text: "await " },
      { cls: "text-foreground", text: "por" },
      { cls: "text-muted-foreground", text: "." },
      { cls: "text-cyan", text: "registerAttestation" },
      { cls: "text-foreground", text: "(epochId, handle, proof, signature)" },
    ]},
    { indent: 0, parts: [{ cls: "text-muted-foreground", text: "" }] },
    { indent: 0, parts: [{ cls: "text-accent", text: "// 4. Only the 1-bit verdict is ever public" }] },
    { indent: 2, parts: [
      { cls: "text-muted-foreground", text: "const " },
      { cls: "text-foreground", text: "solvent" },
      { cls: "text-muted-foreground", text: " = await " },
      { cls: "text-foreground", text: "por" },
      { cls: "text-muted-foreground", text: "." },
      { cls: "text-cyan", text: "isSolvent" },
      { cls: "text-foreground", text: "(epochId)" },
      { cls: "text-accent", text: "  // -> boolean" },
    ]},
  ];

  return (
    <section aria-label="Integration">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        Integration
      </h2>
      <div className="card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-line px-4 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-danger/60" aria-hidden />
          <span className="h-2.5 w-2.5 rounded-full bg-warning/60" aria-hidden />
          <span className="h-2.5 w-2.5 rounded-full bg-success/60" aria-hidden />
          <span className="ml-2 font-mono text-[10px] text-muted">seal-flow.ts</span>
        </div>
        <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed">
          <code className="font-mono">
            {lines.map((line, i) => (
              <span key={i}>
                {line.indent > 0 && "  ".repeat(line.indent)}
                {line.parts.map((p, j) => (
                  <span key={j} className={p.cls}>{p.text}</span>
                ))}
                {"\n"}
              </span>
            ))}
          </code>
        </pre>
      </div>
    </section>
  );
}

/**
 * Mini animated flow widget — embedded in the bento card.
 * Encrypted balances → Σ (homomorphic sum) → the sum stays sealed.
 * Pure CSS, respects reduced-motion.
 */
function MiniFlowWidget() {
  const balances = [{ d: "0s" }, { d: "0.8s" }, { d: "1.6s" }];
  return (
    <div className="flex items-center gap-3 rounded-lg border border-line bg-black/20 p-3">
      {/* Encrypted balance chips */}
      <div className="flex flex-col gap-1.5">
        {balances.map((b, i) => (
          <div key={i} className="relative flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded border border-accent/30 bg-accent/10 text-[10px] text-accent">
              <LockIcon aria-hidden />
            </span>
            <span className="font-mono text-[10px] text-muted">enc #{i + 1}</span>
            <span
              className="absolute left-6 top-1/2 h-1 w-1 -translate-y-1/2 rounded-full bg-accent animate-flow-dot"
              style={{ animationDelay: b.d }}
              aria-hidden
            />
          </div>
        ))}
      </div>

      {/* Arrow */}
      <div className="h-px w-6 bg-gradient-to-r from-accent/60 to-line" aria-hidden />

      {/* Σ node */}
      <div className="flex items-center gap-2 rounded-lg border border-line-strong bg-surface-2 px-3 py-2 shadow-glow-accent">
        <SigmaIcon className="text-sm text-accent" aria-hidden />
        <span className="font-mono text-xs font-medium text-foreground">FHE.add</span>
      </div>

      {/* Arrow */}
      <div className="h-px w-6 bg-gradient-to-r from-line to-accent/60" aria-hidden />

      {/* Sealed total */}
      <div className="flex items-center gap-2 rounded-lg border border-accent/40 bg-accent/5 px-3 py-2">
        <KeyIcon className="animate-gate-shimmer text-sm text-accent" aria-hidden />
        <span className="font-mono text-xs font-medium text-accent">sealed</span>
      </div>
    </div>
  );
}

/**
 * The verdict board — the actual product. Reads all factory-registered exchanges
 * + their epoch-0 solvency state live from Sepolia. This is what a visitor sees
 * first: real exchanges, real tokens, real verdicts. Not a diagram.
 */
function VerdictBoard() {
  // How many exchanges are registered?
  const { data: countData, isLoading: countLoading } = useReadContracts({
    contracts: [
      {
        address: FACTORY_ADDRESS,
        abi: proofOfReservesFactoryABI,
        functionName: "exchangeCount",
      },
    ],
    query: { enabled: !IS_UNDEPLOYED },
  });
  const count = countData?.[0].result ? Number(countData[0].result) : 0;

  // Read each exchange's deployed PoR address.
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

  // getExchange returns a struct (named fields), not a positional array.
  type ExchangeStruct = {
    admin: `0x${string}`;
    por: `0x${string}`;
    auditorCredential: `0x${string}`;
    registeredAt: bigint;
  };

  // For each exchange, read epoch 0's solvency state.
  const porAddresses = (exchanges ?? [])
    .map((res) => {
      const ex = res.result as ExchangeStruct | undefined;
      return ex?.por;
    })
    .filter((a): a is `0x${string}` => !!a);

  const { data: epochs } = useReadContracts({
    contracts: porAddresses.map((addr) => ({
      address: addr,
      abi: proofOfReservesABI,
      functionName: "getEpoch" as const,
      args: [0n] as const,
    })),
    query: { enabled: porAddresses.length > 0 },
  });

  // Also read the standalone bootstrap PoR (the pre-factory demo exchange) as
  // exchange "-1" so the board is never empty even before the factory is used.
  const { data: bootstrapEpoch } = useReadContracts({
    contracts: [
      {
        address: PROOF_OF_RESERVES_ADDRESS,
        abi: proofOfReservesABI,
        functionName: "getEpoch",
        args: [0n],
      },
    ],
    query: { enabled: !IS_UNDEPLOYED },
  });

  type BoardRow = {
    key: string;
    name: string;
    token: `0x${string}`;
    liabilities: bigint;
    solvent: boolean;
    fulfilled: boolean;
    revealed: boolean;
    attestationCount: bigint;
  };

  const rows: BoardRow[] = [];

  // Bootstrap exchange (the seeded demo).
  if (bootstrapEpoch?.[0].result) {
    const e = bootstrapEpoch[0].result as EpochTuple;
    if (e[2] > 0n) {
      rows.push({
        key: "bootstrap",
        name: "Demo Exchange",
        token: e[0],
        liabilities: e[2],
        solvent: e[4],
        fulfilled: e[6],
        revealed: e[5],
        attestationCount: e[8],
      });
    }
  }

  // Factory exchanges.
  for (let i = 0; i < porAddresses.length; i++) {
    const ep = epochs?.[i]?.result as EpochTuple | undefined;
    const ex = exchanges?.[i]?.result as ExchangeStruct | undefined;
    if (!ep || !ex) continue;
    if (ep[2] === 0n) continue; // no epoch yet
    rows.push({
      key: `factory-${i}`,
      name: `Exchange #${i}`,
      token: ep[0],
      liabilities: ep[2],
      solvent: ep[4],
      fulfilled: ep[6],
      revealed: ep[5],
      attestationCount: ep[8],
    });
  }

  return (
    <section aria-label="Live solvency verdicts" aria-live="polite">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Live verdicts
        </h2>
        <span className="badge border-line bg-black/30">
          <span
            className={`h-1.5 w-1.5 rounded-full ${countLoading ? "bg-muted animate-pulse" : "bg-success"}`}
            aria-hidden
          />
          {countLoading ? "reading Sepolia…" : "live on Sepolia"}
        </span>
      </div>

      {countLoading ? (
        <div className="space-y-3">
          <div className="skeleton-row" />
          <div className="skeleton-row" />
        </div>
      ) : rows.length === 0 ? (
        <div className="card text-center">
          <p className="text-sm text-muted">No exchanges with epochs yet.</p>
          <Link href="/onboard" className="btn-primary mt-3">
            Onboard the first exchange
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => {
            const tok = tokenInfo(row.token);
            return (
              <Link
                key={row.key}
                href="/audit"
                className={`card flex flex-col gap-3 transition hover:border-line-strong sm:flex-row sm:items-center sm:justify-between ${
                  row.fulfilled
                    ? row.solvent
                      ? "rail-cyan"
                      : "rail-danger"
                    : "rail-accent"
                }`}
              >
                {/* Left: identity */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-lg font-semibold">{row.name}</span>
                    <span className="badge border-line bg-black/30 font-mono normal-case">
                      {tok.symbol}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-muted">
                    {row.attestationCount.toString()} encrypted attestations ·
                    liabilities {formatTokenAmount(row.liabilities, tokenInfo(row.token).decimals)} {tok.symbol}
                  </div>
                </div>

                {/* Right: the verdict */}
                <div className="flex shrink-0 items-center gap-3">
                  {row.fulfilled ? (
                    <div className="flex items-center gap-2">
                      {row.solvent ? (
                        <span className="tag bg-success/15 text-success">
                          <CheckIcon aria-hidden /> SOLVENT
                        </span>
                      ) : (
                        <span className="tag bg-danger/15 text-danger">
                          <XIcon aria-hidden /> INSOLVENT
                        </span>
                      )}
                    </div>
                  ) : row.revealed ? (
                    <span className="tag bg-warning/15 text-warning">verdict pending</span>
                  ) : (
                    <span className="tag border-line text-muted">awaiting reveal</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

/** Compact integer formatting (1000000 -> 1M). */
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
