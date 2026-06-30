"use client";

import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { SEPOLIA_CHAIN_ID } from "@/lib/contract";

/**
 * Renders children only when the connected wallet is on Sepolia. Otherwise shows
 * a friendly "wrong network" card with a one-click switch button. When no wallet
 * is connected at all, renders children (each pane has its own connect gate).
 */
export function NetworkGuard({ children }: { children: React.ReactNode }) {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();

  // Don't gate until connected — panes handle their own "connect first" state.
  const wrongNetwork = isConnected && chainId !== SEPOLIA_CHAIN_ID;

  if (!wrongNetwork) return <>{children}</>;

  return (
    <div
      className="card border-warning/30 bg-warning/5"
      role="alert"
      aria-live="assertive"
    >
      <h2 className="mb-1 font-semibold text-warning">Wrong network</h2>
      <p className="mb-4 text-sm text-muted">
        This dApp runs on Sepolia. Your wallet is connected to a different network.
      </p>
      <button
        className="btn-primary"
        onClick={() => switchChain({ chainId: SEPOLIA_CHAIN_ID })}
        disabled={isPending}
      >
        {isPending ? "Switching…" : "Switch to Sepolia"}
      </button>
    </div>
  );
}
