"use client";

import Link from "next/link";
import { useReadContracts } from "wagmi";
import { Shell } from "@/components/Shell";
import { CheckIcon, XIcon, KeyIcon, LockIcon } from "@/components/icons";
import { proofOfReservesABI, proofOfReservesFactoryABI } from "@/lib/abi";
import {
  PROOF_OF_RESERVES_ADDRESS,
  FACTORY_ADDRESS,
  IS_UNDEPLOYED,
  tokenInfo,
} from "@/lib/contract";

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
      {/* ── Brand strip (compact, not a pitch) ── */}
      <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
            <span className="text-gradient">Ciphra</span>
          </h1>
          <p className="mt-1 text-sm text-muted">
            Confidential Proof-of-Reserves. Exchanges prove solvency in real
            tokens — without revealing a single balance.
          </p>
        </div>
        <Link href="/onboard" className="btn-primary shrink-0">
          Onboard an exchange
          <span aria-hidden>→</span>
        </Link>
      </div>

      {/* ── The product: a live verdict board ── */}
      <VerdictBoard />

      {/* ── One-line how (not four cards) ── */}
      <section className="mt-12" aria-label="How it works">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-xl border border-accent/20 bg-accent/[0.04] px-4 py-3">
            <LockIcon className="shrink-0 text-lg text-accent" aria-hidden />
            <p className="text-sm text-muted">
              <span className="font-semibold text-foreground">Balances stay encrypted.</span>{" "}
              Summed under FHE, never decrypted by anyone.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-cyan/20 bg-cyan/[0.04] px-4 py-3">
            <CheckIcon className="shrink-0 text-lg text-cyan" aria-hidden />
            <p className="text-sm text-muted">
              <span className="font-semibold text-foreground">Verdict is public.</span>{" "}
              Solvent or not — anyone can verify on-chain.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-accent/20 bg-accent/[0.04] px-4 py-3">
            <KeyIcon className="shrink-0 text-lg text-accent" aria-hidden />
            <p className="text-sm text-muted">
              <span className="font-semibold text-foreground">Total is auditor-gated.</span>{" "}
              Only a credentialed auditor reads the number.
            </p>
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Built on the{" "}
          <a
            href="https://docs.zama.org/protocol"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-foreground"
          >
            Zama Protocol
          </a>{" "}
          · Sepolia testnet · composable privacy for Zama Season 3
        </p>
      </section>
    </Shell>
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

  // For each exchange, read epoch 0's solvency state.
  const porAddresses = (exchanges ?? [])
    .map((res) => {
      const ex = res.result as readonly [`0x${string}`, `0x${string}`, `0x${string}`, bigint] | undefined;
      return ex?.[1]; // the PoR address
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
    const ex = exchanges?.[i]?.result as readonly [`0x${string}`, `0x${string}`, `0x${string}`, bigint] | undefined;
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

      {rows.length === 0 ? (
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
                    liabilities {formatCompact(row.liabilities)} {tok.symbol}
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
