import { ethers } from "ethers";

/**
 * Mirrors `ProofOfReserves._hashAttestation` EXACTLY. The exchange CLI and the
 * `/api/exchange/sign` route both use this so signatures recover to
 * `exchangeSigner` on-chain.
 *
 * Bindings: epochId (replay scope), customer (who may submit), ciphertext handle
 * (prevents swapping in an inflated balance), deadline (window scope).
 */
export function hashAttestation(
  epochId: bigint,
  customer: string,
  handleBytes32: string,
  deadline: bigint,
): string {
  const packed = ethers.solidityPacked(
    ["uint256", "address", "bytes32", "uint64"],
    [epochId, customer, handleBytes32, deadline],
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
  customer: string,
  handleBytes32: string,
  deadline: bigint,
): Promise<string> {
  const wallet = new ethers.Wallet(privateKey);
  const rawHash = hashAttestation(epochId, customer, handleBytes32, deadline);
  return wallet.signMessage(ethers.getBytes(rawHash));
}
