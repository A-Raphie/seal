import { SEPOLIA_CHAIN_ID } from "@/lib/contract";

const ETHERSCAN_BASE = `https://sepolia.etherscan.io`;

/**
 * Renders a transaction hash or address as a link to Sepolia Etherscan,
 * truncated to `0x1234…abcd`. Falls back to the full value (non-hex strings,
 * e.g. the pre-deploy zero address) without a link.
 */
export function TxLink({
  value,
  type,
  label,
}: {
  value: string;
  type: "tx" | "address";
  label?: string;
}) {
  const isHash = /^0x[a-fA-F0-9]{40,}$/.test(value);
  if (!isHash) return <span className="font-mono">{value || "—"}</span>;

  const href = `${ETHERSCAN_BASE}/${type}/${value}`;
  const display = label ?? `${value.slice(0, 6)}…${value.slice(-4)}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="font-mono underline decoration-line underline-offset-2 hover:text-accent"
    >
      {display}
    </a>
  );
}

/** Convenience: the chain's block explorer base (used elsewhere for "view on" links). */
export const EXPLORER_BASE = ETHERSCAN_BASE;
export const CHAIN_ID = SEPOLIA_CHAIN_ID;
