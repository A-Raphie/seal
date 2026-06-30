import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "FHE Proof-of-Reserves — composable confidential solvency on Zama",
  description:
    "An exchange proves its reserves exceed its liabilities without revealing a single customer balance. Composable privacy on the Zama Protocol: a public solvency verdict, an auditor-gated total.",
  applicationName: "FHE Proof-of-Reserves",
  openGraph: {
    title: "FHE Proof-of-Reserves",
    description:
      "Prove solvency without revealing a single balance. Composable confidential Proof-of-Reserves on the Zama Protocol.",
    type: "website",
  },
};

// themeColor must live in a viewport export (Next 15 deprecated it in metadata).
export const viewport: Viewport = {
  themeColor: "#07080F",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/*
          Fonts loaded by the browser at runtime (not by the bundler), so they
          never block the Next.js compile. preconnect + display=swap means the
          system stack paints instantly and swaps in once the font arrives.
          The CSS vars (--font-sans / --font-display / --font-mono) are consumed
          by globals.css and tailwind.config.ts.
        */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Space+Grotesk:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
