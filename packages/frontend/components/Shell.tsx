"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { MobileNav } from "./MobileNav";
import { Logo } from "./icons";

const links = [
  { href: "/", label: "Overview" },
  { href: "/exchange", label: "Exchange" },
  { href: "/customer", label: "Customer" },
  { href: "/audit", label: "Auditor" },
];

const REPO_URL = "https://github.com/A-Raphie/fhe-proof-of-reserves";

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {/* Skip link — first focusable element for keyboard users. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-foreground"
      >
        Skip to content
      </a>

      <header className="relative mb-8 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2" aria-label="FHE Proof-of-Reserves home">
          <Logo size={28} />
          <span className="font-display text-xl font-bold tracking-tight">
            <span className="text-accent">FHE</span> Proof-of-Reserves
          </span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex" aria-label="Primary">
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-lg px-3 py-1.5 text-sm transition ${
                  active ? "bg-white/10 text-foreground" : "text-muted hover:text-foreground"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden sm:block">
            <ConnectButton showBalance={false} />
          </div>
          <MobileNav />
        </div>
      </header>

      <main id="main">{children}</main>

      <footer className="mt-16 border-t border-line pt-4 text-center text-xs text-muted">
        <p>
          🔒 <strong>Sepolia testnet demo</strong> — values shown are not real
          assets. Built on the{" "}
          <a
            className="underline hover:text-foreground"
            href="https://docs.zama.org/protocol"
            target="_blank"
            rel="noreferrer"
          >
            Zama Protocol
          </a>{" "}
          ·{" "}
          <a
            className="underline hover:text-foreground"
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
          >
            Source code
          </a>{" "}
          ·{" "}
          <a
            className="underline hover:text-foreground"
            href="https://docs.zama.org/protocol"
            target="_blank"
            rel="noreferrer"
          >
            Docs
          </a>
        </p>
      </footer>
    </div>
  );
}
