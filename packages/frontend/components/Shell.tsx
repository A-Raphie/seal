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

const REPO_URL = "https://github.com/A-Raphie/ciphra";

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="relative min-h-screen">
      {/* Sticky frosted header — full-bleed bar, wide inner content */}
      <header className="sticky top-0 z-50 border-b border-line bg-bg/70 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4 px-6 py-3.5 lg:px-10">
          <Link
            href="/"
            className="flex items-center gap-2.5"
            aria-label="Ciphra home"
          >
            <Logo size={28} />
            <span className="font-display text-lg font-bold tracking-tight">
              <span className="text-gradient">Ciphra</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
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
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <ConnectButton showBalance={false} />
            </div>
            <MobileNav />
          </div>
        </div>
      </header>

      {/* Skip link — first focusable element for keyboard users. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-20 focus:z-[100] focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-foreground"
      >
        Skip to content
      </a>

      <main id="main" className="px-6 py-10 lg:px-10">
        {children}
      </main>

      <footer className="px-6 pb-10 pt-8 lg:px-10">
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5 text-xs text-muted">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-warning" aria-hidden />
            <span>Sepolia testnet</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              className="text-muted-foreground transition hover:text-foreground"
              href="https://docs.zama.org/protocol"
              target="_blank"
              rel="noreferrer"
            >
              Zama Protocol
            </a>
            <a
              className="text-muted-foreground transition hover:text-foreground"
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
            >
              Source
            </a>
          </div>
        </div>
        </div>
      </footer>
    </div>
  );
}
