import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "FHE Proof-of-Reserves — confidential solvency on Zama Protocol",
  description:
    "Confidential solvency proofs on Zama Protocol — an exchange proves its reserves exceed its liabilities without revealing a single customer balance.",
  applicationName: "FHE Proof-of-Reserves",
  themeColor: "#0A0E27",
  openGraph: {
    title: "FHE Proof-of-Reserves",
    description:
      "Prove solvency without revealing a single customer balance. Confidential Proof-of-Reserves on the Zama Protocol.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/*
          Fonts loaded by the browser at runtime (not by the bundler), so they
          never block the Next.js compile. preconnect + display=swap means the
          system stack paints instantly and swaps in once the font arrives.
          The CSS vars (--font-sans / --font-display) are consumed by
          globals.css and tailwind.config.ts.
        */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
