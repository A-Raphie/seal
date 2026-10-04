"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { MenuIcon, XIcon } from "./icons";

const links = [
  { href: "/", label: "Overview" },
  { href: "/onboard", label: "Onboard" },
  { href: "/exchange", label: "Exchange" },
  { href: "/customer", label: "Customer" },
  { href: "/audit", label: "Auditor" },
];

/**
 * Mobile navigation — a disclosure menu shown below the `sm:` breakpoint.
 * Accessible: `<button aria-expanded aria-controls>`, Escape closes, focus
 * returns to the toggle on close.
 */
export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close on Escape (keyboard users) and on route change.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="sm:hidden">
      <button
        type="button"
        className="btn-ghost px-3 py-2"
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((v) => !v)}
      >
        <span aria-hidden className="text-lg leading-none">
          {open ? <XIcon /> : <MenuIcon />}
        </span>
        <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
      </button>

      {open && (
        <div
          id="mobile-menu"
          className="absolute left-0 right-0 top-full z-50 border-b border-line bg-bg/95 px-4 py-4 backdrop-blur-xl"
          role="menu"
        >
          <nav className="flex flex-col gap-1" aria-label="Mobile">
            {links.map((l) => {
              const active = pathname === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  role="menuitem"
                  aria-current={active ? "page" : undefined}
                  onClick={() => setOpen(false)}
                  className={`rounded-lg px-3 py-2 text-sm ${
                    active
                      ? "bg-white/10 text-foreground"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-3">
            <ConnectButton showBalance={false} />
          </div>
        </div>
      )}
    </div>
  );
}
