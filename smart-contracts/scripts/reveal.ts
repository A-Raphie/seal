/**
 * Reveals + fulfills the public decryption for epoch 0 of the deployed
 * ProofOfReserves. Use after the epoch window closes (the seed script prints
 * the deadline).
 *
 *   pnpm --filter smart-contracts hardhat run scripts/reveal.ts --network sepolia
 *
 * Computes the solvency bit on-chain (requestReveal) then drives the KMS public
 * decryption (fulfillPublicDecryption). Same two steps the Auditor pane does.
 */

import { ethers, fhevm, network } from "hardhat";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { ProofOfReserves__factory } from "../types";

const DEPLOY_FILE = join(process.cwd(), "deployments", network.name, "ProofOfReserves.json");
const EPOCH_ID = 0n;

function loadDeployedAddress(): string {
  if (!existsSync(DEPLOY_FILE)) {
    throw new Error(`Deployment artifact not found: ${DEPLOY_FILE}. Deploy first.`);
  }
  return (JSON.parse(readFileSync(DEPLOY_FILE, "utf8")) as { address: string }).address;
}

async function main() {
  const [signer] = await ethers.getSigners();
  const por = ProofOfReserves__factory.connect(loadDeployedAddress(), signer);

  console.log(`\n🔓 Revealing epoch ${EPOCH_ID} on ${network.name}\n`);

  const epoch = await por.getEpoch(EPOCH_ID);
  if (epoch.revealed) {
    console.log("   already revealed — skipping requestReveal.");
  } else {
    console.log("   1/2 requestReveal() (computes solvency bit on-chain)…");
    const tx = await por.requestReveal(EPOCH_ID);
    await tx.wait();
    console.log("   ✓ revealed.");
  }

  if (epoch.fulfilled) {
    console.log("   already fulfilled — nothing to do.");
    return;
  }

  const totalHandle = await por.getEncryptedTotal(EPOCH_ID);
  const solventHandle = await por.getEncryptedSolvent(EPOCH_ID);
  const totalRaw = ethers.dataSlice(totalHandle.toString(), 0, 32);
  const solventRaw = ethers.dataSlice(solventHandle.toString(), 0, 32);

  console.log("   2/2 publicDecrypt + fulfillPublicDecryption() (KMS)…");
  const result = await fhevm.publicDecrypt([totalRaw as `0x${string}`, solventRaw as `0x${string}`]);
  const tx = await por.fulfillPublicDecryption(
    EPOCH_ID,
    [totalRaw as `0x${string}`, solventRaw as `0x${string}`],
    result.abiEncodedClearValues,
    result.decryptionProof,
  );
  await tx.wait();

  const final = await por.getEpoch(EPOCH_ID);
  console.log(`\n✅ Decrypted: total reserves = ${final.revealedTotal}, solvent = ${final.solvent}\n`);
}

main().catch((e) => {
  console.error("\n❌ Reveal failed:", e?.shortMessage ?? e?.message ?? e);
  process.exit(1);
});
