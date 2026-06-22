"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";

const links = [
  { href: "/", label: "Overview" },
  { href: "/exchange", label: "Exchange" },
  { href: "/customer", label: "Customer" },
  { href: "/audit", label: "Auditor" },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight">
            <span className="text-[#FFD700]">FHE</span> Proof-of-Reserves
          </span>
        </Link>
        <nav className="flex flex-wrap items-center gap-1">
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-lg px-3 py-1.5 text-sm transition ${
                  active ? "bg-white/10 text-white" : "text-white/60 hover:text-white"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <ConnectButton showBalance={false} />
      </header>
      <main>{children}</main>
      <footer className="mt-16 border-t border-white/10 pt-4 text-center text-xs text-white/30">
        Built on the Zama Protocol · Confidential solvency proofs ·{" "}
        <a
          className="underline hover:text-white/60"
          href="https://docs.zama.org/protocol"
          target="_blank"
          rel="noreferrer"
        >
          docs
        </a>
      </footer>
    </div>
  );
}
