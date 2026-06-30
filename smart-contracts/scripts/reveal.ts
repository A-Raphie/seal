/**
 * Reveals + fulfills the public VERDICT for epoch 0 of the deployed
 * ProofOfReserves. Use after the epoch window closes (the seed script prints
 * the deadline).
 *
 *   pnpm --filter smart-contracts hardhat run scripts/reveal.ts --network sepolia
 *
 * Composable-privacy flow (Zama Season 3):
 *   1. Ensures the running signer is an accredited auditor (the deployer is the
 *      registrar; it accredits itself here if not already).
 *   2. requestReveal(0) — the contract computes the solvency bit, marks the
 *      VERDICT publicly decryptable, and ACL-grants the auditor the aggregate
 *      TOTAL (off-chain EIP-712 user-decryption only).
 *   3. publicDecrypt + fulfillVerdict — stores the 1-bit verdict on-chain.
 *
 * The aggregate TOTAL is intentionally NOT revealed here: it is never settled as
 * plaintext on-chain. The auditor reads it off-chain via user-decryption in the
 * frontend.
 */

import { ethers, fhevm, network } from "hardhat";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { AuditorCredential__factory, ProofOfReserves__factory } from "../types";

const DEPLOY_DIR = join(process.cwd(), "deployments", network.name);
const POR_FILE = join(DEPLOY_DIR, "ProofOfReserves.json");
const CRED_FILE = join(DEPLOY_DIR, "AuditorCredential.json");
const EPOCH_ID = 0n;

function loadAddress(file: string, label: string): string {
  if (!existsSync(file)) {
    throw new Error(`Deployment artifact not found: ${file}. Deploy ${label} first.`);
  }
  return (JSON.parse(readFileSync(file, "utf8")) as { address: string }).address;
}

async function main() {
  const [signer] = await ethers.getSigners();
  const porAddr = loadAddress(POR_FILE, "ProofOfReserves");
  const credAddr = loadAddress(CRED_FILE, "AuditorCredential");
  const por = ProofOfReserves__factory.connect(porAddr, signer);
  const cred = AuditorCredential__factory.connect(credAddr, signer);

  console.log(`\n🔓 Revealing epoch ${EPOCH_ID} on ${network.name}\n`);

  // On live networks the fhevm plugin must be initialized before any
  // publicDecrypt call. (Tests auto-init via the mock.)
  console.log(`   initializing fhevm (connects to the Zama relayer)…`);
  await fhevm.initializeCLIApi();

  // Composable-privacy gate: the reveal-er must hold an auditor credential.
  const isAuditor = await cred.isAuditor(signer.address);
  if (!isAuditor) {
    console.log(`   accrediting ${signer.address} as auditor (registrar step)…`);
    const registrar = await cred.registrar();
    if (registrar.toLowerCase() !== signer.address.toLowerCase()) {
      throw new Error(
        `${signer.address} is not an auditor and is not the registrar (${registrar}). ` +
          `Have the registrar accredit this address first.`,
      );
    }
    const atx = await cred.accredit(signer.address);
    await atx.wait();
    console.log("   ✓ accredited.");
  }

  const epoch = await por.getEpoch(EPOCH_ID);
  if (epoch.revealed) {
    console.log("   already revealed — skipping requestReveal.");
  } else {
    console.log("   1/2 requestReveal() (computes solvency bit; grants auditor the total)…");
    const tx = await por.requestReveal(EPOCH_ID);
    await tx.wait();
    console.log("   ✓ revealed (verdict marked public; total ACL-granted to auditor).");
  }

  if (epoch.fulfilled) {
    console.log("   already fulfilled — nothing to do.");
    return;
  }

  // Verdict-only public decryption. The total handle is intentionally excluded:
  // it was never marked makePubliclyDecryptable.
  const solventHandle = await por.getEncryptedSolvent(EPOCH_ID);
  const solventRaw = ethers.dataSlice(solventHandle.toString(), 0, 32);

  console.log("   2/2 publicDecrypt + fulfillVerdict() (KMS, verdict only)…");
  const result = await fhevm.publicDecrypt([solventRaw as `0x${string}`]);
  const tx = await por.fulfillVerdict(
    EPOCH_ID,
    [solventRaw as `0x${string}`],
    result.abiEncodedClearValues,
    result.decryptionProof,
  );
  await tx.wait();

  const final = await por.getEpoch(EPOCH_ID);
  console.log(`\n✅ Verdict on-chain: solvent = ${final.solvent}`);
  console.log(`   (aggregate total is auditor-gated off-chain; not revealed on-chain.)\n`);
}

main().catch((e) => {
  console.error("\n❌ Reveal failed:", e?.shortMessage ?? e?.message ?? e);
  process.exit(1);
});
