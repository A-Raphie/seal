"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { MobileNav } from "./MobileNav";
import { Logo } from "./icons";
import { FACTORY_ADDRESS, PROOF_OF_RESERVES_ADDRESS, AUDITOR_CREDENTIAL_ADDRESS } from "@/lib/contract";

const links = [
  { href: "/", label: "Overview" },
  { href: "/onboard", label: "Onboard" },
  { href: "/exchange", label: "Exchange" },
  { href: "/customer", label: "Customer" },
  { href: "/audit", label: "Auditor" },
];

const REPO_URL = "https://github.com/A-Raphie/seal";

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="relative flex min-h-screen flex-col">
      {/* Floating glass nav pill (winsznx pattern). */}
      <nav className="nav-pill" aria-label="Primary">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Seal home">
          <Logo size={26} />
          <span className="font-display text-lg font-bold tracking-tight">
            <span className="text-gradient">Seal</span>
          </span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`relative rounded-lg px-3 py-1.5 text-xs transition ${
                  active ? "text-foreground" : "text-muted hover:text-foreground"
                }`}
              >
                {l.label}
                {active && (
                  <span className="absolute inset-x-3 -bottom-px h-px bg-gradient-to-r from-transparent via-accent to-transparent" />
                )}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:block">
            <ConnectButton showBalance={false} />
          </div>
          <MobileNav />
        </div>
      </nav>

      {/* Spacer for the fixed nav pill. */}
      <div className="h-20" aria-hidden />

      {/* Skip link — first focusable element for keyboard users. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-20 focus:z-[100] focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-foreground"
      >
        Skip to content
      </a>

      <main id="main" className="flex-1 px-6 pt-12 md:px-10 md:pt-16">
        {children}
      </main>

      {/* Giant footer wordmark (winsznx pattern). */}
      <div className="footer-wordmark" aria-hidden>
        SEAL
      </div>

      <footer className="mt-auto px-6 pb-8 pt-4 md:px-10">
        <div className="border-t border-line pt-6">
          {/* Live contracts row */}
          <div className="mb-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] text-muted">
            <a
              href={`https://sepolia.etherscan.io/address/${FACTORY_ADDRESS}`}
              target="_blank"
              rel="noreferrer"
              className="font-mono transition hover:text-foreground"
            >
              Factory
            </a>
            <a
              href={`https://sepolia.etherscan.io/address/${PROOF_OF_RESERVES_ADDRESS}`}
              target="_blank"
              rel="noreferrer"
              className="font-mono transition hover:text-foreground"
            >
              PoR
            </a>
            <a
              href={`https://sepolia.etherscan.io/address/${AUDITOR_CREDENTIAL_ADDRESS}`}
              target="_blank"
              rel="noreferrer"
              className="font-mono transition hover:text-foreground"
            >
              AuditorCredential
            </a>
          </div>
          {/* Main footer row */}
          <div className="flex flex-wrap items-center justify-center gap-3 text-center text-xs text-muted">
            <span>
              Built on{" "}
              <a
                className="text-muted-foreground transition hover:text-foreground"
                href="https://docs.zama.org/protocol"
                target="_blank"
                rel="noreferrer"
              >
                Zama FHEVM
              </a>
            </span>
            <span aria-hidden>·</span>
            <a
              className="text-muted-foreground transition hover:text-foreground"
              href="https://x.com/A_raphie"
              target="_blank"
              rel="noreferrer"
            >
              @A_Raphie
            </a>
            <span aria-hidden>·</span>
            <a
              className="text-muted-foreground transition hover:text-foreground"
              href="https://github.com/A-Raphie/seal"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
            <span aria-hidden>·</span>
            <span className="text-muted-foreground">Sepolia testnet</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
