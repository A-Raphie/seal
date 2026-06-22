import { http as wagmiHttp } from "wagmi";
import { sepolia } from "wagmi/chains";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { createPublicClient, createWalletClient, custom, http } from "viem";
import { sepolia as sepoliaViem } from "viem/chains";

// Core SDK config (viem adapter). We deliberately use the core viem createConfig
// rather than `@zama-fhe/react-sdk/wagmi`, whose wagmi adapter is incompatible
// with the public wagmi v2 + RainbowKit. Encryption (useEncrypt) and public
// decryption (useDecryptPublicValues) do NOT require a wallet signature, so we
// can run the SDK in read-only mode (publicClient only). All signed contract
// writes go through wagmi's useWriteContract, which uses the connected wallet.
import { web } from "@zama-fhe/sdk/web";
import { createConfig as createZamaConfig } from "@zama-fhe/sdk/viem";
import { sepolia as sepoliaFhe, type FheChain } from "@zama-fhe/sdk/chains";
import { SEPOLIA_CHAIN_ID, SEPOLIA_RPC_URL } from "@/lib/contract";

/** Minimal EIP-1193 provider shape (what `window.ethereum` exposes). */
type EIP1193Provider = {
  request: (args: { method: string; params?: readonly unknown[] }) => Promise<unknown>;
};

/**
 * wagmi config — wallet UI (RainbowKit), reads, and signed contract writes.
 *
 * `projectId` is required by RainbowKit for WalletConnect (QR) connections.
 * Get one from https://cloud.walletconnect.com and set
 * NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID. The fallback below is a non-empty
 * placeholder so the production build doesn't crash at prerender; injected
 * wallets (MetaMask) work without it, WalletConnect QR needs a real id.
 */
export const wagmiConfig = getDefaultConfig({
  appName: "FHE Proof-of-Reserves",
  projectId:
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "f6bb9afdd3de0d5a13f4c92e1538505e",
  chains: [sepolia],
  ssr: true,
  transports: {
    [sepolia.id]: wagmiHttp(SEPOLIA_RPC_URL),
  },
});

function relayerUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/api/relayer/${SEPOLIA_CHAIN_ID}`;
}

/** Zama SDK config — FHE encryption + public decryption (read-only signer). */
const publicClient = createPublicClient({
  chain: sepoliaViem,
  transport: http(SEPOLIA_RPC_URL),
});

// The SDK only encrypts and does public decryption here — neither signs with the
// wallet — so the walletClient is effectively unused. We still must supply one
// (viem adapter requires it). Use the injected provider on the client; fall back
// to a plain http client during SSR (no signing happens server-side).
const injected = (
  typeof window !== "undefined"
    ? (window as unknown as { ethereum?: EIP1193Provider }).ethereum
    : undefined
);
const walletClient = createWalletClient({
  chain: sepoliaViem,
  transport: injected ? custom(injected) : http(SEPOLIA_RPC_URL),
});

export const fheSepolia = {
  ...sepoliaFhe,
  relayerUrl: relayerUrl(),
  network: SEPOLIA_RPC_URL,
} as const satisfies FheChain;

export const zamaConfig = createZamaConfig({
  chains: [fheSepolia],
  publicClient,
  walletClient,
  relayers: {
    [fheSepolia.id]: web(),
  },
});

export { sepolia };
