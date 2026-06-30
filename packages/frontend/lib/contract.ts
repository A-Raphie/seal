export const SEPOLIA_CHAIN_ID = 11155111;

/**
 * Deployed ProofOfReserves address. Set NEXT_PUBLIC_POR_ADDRESS in env after
 * deploying to Sepolia. Falls back to a placeholder so the app compiles pre-deploy.
 */
export const PROOF_OF_RESERVES_ADDRESS = (process.env.NEXT_PUBLIC_POR_ADDRESS ??
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

/**
 * True when no contract has been deployed yet (the zero-address placeholder).
 * The panes use this to show an honest "not deployed" banner instead of
 * silently failing reads against a non-existent contract.
 */
export const IS_UNDEPLOYED =
  PROOF_OF_RESERVES_ADDRESS === "0x0000000000000000000000000000000000000000";

/** Public RPC used by wagmi's transport (client-side reads). */
export const SEPOLIA_RPC_URL =
  process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ?? "https://rpc.sepolia.org";
