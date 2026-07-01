import { ethers } from "ethers";

/**
 * Mirrors `ProofOfReserves._hashAttestation` EXACTLY. The exchange CLI and the
 * `/api/exchange/sign` route both use this so signatures recover to
 * `exchangeSigner` on-chain.
 *
 * Bindings: epochId (replay scope), token (denomination — a cUSDC attestation
 * cannot be replayed as a cUSDT one), customer (who may submit), ciphertext
 * handle (prevents swapping in an inflated balance), deadline (window scope).
 *
 * ⚠ This is ONE OF THREE copies of this packing. The others are:
 *   - smart-contracts/contracts/ProofOfReserves.sol (_hashAttestation)
 *   - smart-contracts/test/ProofOfReserves.test.ts (signAttestation)
 * A cross-copy sync test guards against drift. Keep them identical.
 */
export function hashAttestation(
  epochId: bigint,
  token: string,
  customer: string,
  handleBytes32: string,
  deadline: bigint,
): string {
  const packed = ethers.solidityPacked(
    ["uint256", "address", "address", "bytes32", "uint64"],
    [epochId, token, customer, handleBytes32, deadline],
  );
  return ethers.keccak256(packed);
}

/**
 * Sign an attestation with the exchange's off-chain key. Applies the EIP-191
 * prefix to match the contract's `MessageHashUtils.toEthSignedMessageHash`.
 */
export async function signAttestation(
  privateKey: string,
  epochId: bigint,
  token: string,
  customer: string,
  handleBytes32: string,
  deadline: bigint,
): Promise<string> {
  const wallet = new ethers.Wallet(privateKey);
  const rawHash = hashAttestation(epochId, token, customer, handleBytes32, deadline);
  return wallet.signMessage(ethers.getBytes(rawHash));
}
