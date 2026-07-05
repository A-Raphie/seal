"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { MobileNav } from "./MobileNav";
import { Logo } from "./icons";

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
                className={`relative rounded-lg px-3 py-1.5 text-sm transition ${
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
        <div className="flex items-center justify-center gap-2 border-t border-line pt-6 text-center text-xs text-muted">
          <span>
            Built on{" "}
            <a
              className="text-muted-foreground transition hover:text-foreground"
              href="https://docs.zama.org/protocol"
              target="_blank"
              rel="noreferrer"
            >
              Zama FHEVM
            </a>{" "}
            by{" "}
            <a
              className="text-muted-foreground transition hover:text-foreground"
              href="https://x.com/A_raphie"
              target="_blank"
              rel="noreferrer"
            >
              A_Raphie
            </a>{" "}
            · Sepolia testnet
          </span>
        </div>
      </footer>
    </div>
  );
}
