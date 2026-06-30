/**
 * Seeds a demo epoch on the deployed ProofOfReserves so the dApp shows live
 * data on first load instead of an empty Auditor page.
 *
 * Run via the hardhat environment (gives it `ethers` + `fhevm` + the deployment
 * artifact):
 *
 *   pnpm --filter smart-contracts hardhat run scripts/seed.ts --network sepolia
 *
 * What it does (idempotent — safe to re-run):
 *   1. Reads the deployed address from deployments/sepolia/ProofOfReserves.json.
 *   2. Reads the exchange signing key from .deploy-exchange-key.json.
 *   3. Opens an epoch: liabilities 1,000,000, window 3,600s (1h).
 *   4. Submits 3 encrypted, exchange-signed customer attestations
 *      (400k + 350k + 300k = 1.05M >= 1M → solvent).
 *
 * What it does NOT do:
 *   - It cannot time-travel on public Sepolia, so the reveal is a deliberate
 *     manual step. After the 1h window closes, open the Auditor pane and click
 *     "1. Reveal" then "2. Decrypt & verify" (the setup script prints this).
 *
 * Honest caveat: each attestation is a real FHE encryption + on-chain tx routed
 * through the Zama KMS coprocessor. It typically takes 10–40s each on Sepolia.
 */

import { ethers, fhevm, network } from "hardhat";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { ProofOfReserves__factory } from "../types";

const LIABILITIES = 1_000_000n;
const WINDOW_SECONDS = 3600n;
const KEY_FILE = join(process.cwd(), ".deploy-exchange-key.json");
const DEPLOY_FILE = join(process.cwd(), "deployments", network.name, "ProofOfReserves.json");

// Sample customers (random throwaway wallets — they only need to submit txs,
// so they need Sepolia ETH; the deployer funds them here).
const SAMPLE = [
  { label: "customer-1", balance: 400_000n },
  { label: "customer-2", balance: 350_000n },
  { label: "customer-3", balance: 300_000n },
];

function loadExchangeKey(): { privateKey: string; address: string } {
  if (!existsSync(KEY_FILE)) {
    throw new Error(
      `Exchange key file not found at ${KEY_FILE}.\n` +
        `Run the deploy first (pnpm setup) — it generates this file.`,
    );
  }
  return JSON.parse(readFileSync(KEY_FILE, "utf8"));
}

function loadDeployedAddress(): string {
  if (!existsSync(DEPLOY_FILE)) {
    throw new Error(
      `Deployment artifact not found at ${DEPLOY_FILE}.\n` +
        `Deploy to ${network.name} first: pnpm --filter smart-contracts deploy:${network.name}`,
    );
  }
  return (JSON.parse(readFileSync(DEPLOY_FILE, "utf8")) as { address: string }).address;
}

// Mirrors ProofOfReserves._hashAttestation exactly (see lib/attestation.ts).
function hashAttestation(epochId: bigint, customer: string, handle: string, deadline: bigint): string {
  const packed = ethers.solidityPacked(
    ["uint256", "address", "bytes32", "uint64"],
    [epochId, customer, handle, deadline],
  );
  return ethers.keccak256(packed);
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const porAddr = loadDeployedAddress();
  const por = ProofOfReserves__factory.connect(porAddr, deployer);
  const exchangeKey = loadExchangeKey();
  const exchangeWallet = new ethers.Wallet(exchangeKey.privateKey, deployer.provider);

  console.log(`\n🌾 Seeding ${network.name}`);
  console.log(`   contract:      ${porAddr}`);
  console.log(`   exchangeSigner:${exchangeWallet.address}\n`);

  // On live networks the fhevm plugin must be initialized before any
  // createEncryptedInput / publicDecrypt call. (Tests auto-init via the mock.)
  console.log(`   initializing fhevm (connects to the Zama relayer)…`);
  await fhevm.initializeCLIApi();

  // Verify key match — the #1 foot-gun.
  const onChainSigner = await por.exchangeSigner();
  if (onChainSigner.toLowerCase() !== exchangeWallet.address.toLowerCase()) {
    throw new Error(
      `Key mismatch! On-chain exchangeSigner is ${onChainSigner} but the key ` +
        `in ${KEY_FILE} derives to ${exchangeWallet.address}. Re-deploy or fix the key file.`,
    );
  }

  // Idempotency: skip epoch creation if epoch 0 already exists.
  let epochId: bigint;
  const next = await por.nextEpochId();
  if (next > 0n) {
    epochId = 0n;
    console.log(`   epoch 0 already exists — skipping creation.\n`);
  } else {
    console.log(`   creating epoch (liabilities ${LIABILITIES}, window ${WINDOW_SECONDS}s)…`);
    const tx = await por.createEpoch(LIABILITIES, WINDOW_SECONDS);
    const receipt = await tx.wait();
    const event = receipt?.logs
      .map((l) => {
        try {
          return por.interface.parseLog(l);
        } catch {
          return null;
        }
      })
      .find((p) => p?.name === "EpochCreated");
    epochId = (event?.args.epochId as bigint) ?? 0n;
    console.log(`   ✓ epoch ${epochId} created in block ${receipt?.blockNumber}\n`);
  }

  const epoch = await por.getEpoch(epochId);
  const deadline = epoch.deadline;
  const now = BigInt(Math.floor(Date.now() / 1000));
  if (now >= deadline) {
    console.log(`   ⚠ epoch window already closed — skipping attestation seeding.\n`);
    return;
  }

  // Fund sample customers from the deployer so they can submit.
  const customers: { signer: ethers.HardhatEthersSigner | Awaited<ReturnType<typeof ethers.Wallet.createRandom>>; balance: bigint; address: string }[] = [];
  for (const s of SAMPLE) {
    // Use hardhat signers (accounts 1..3) when on a local network with funded
    // accounts; on Sepolia we can't invent funded accounts, so we submit each
    // attestation FROM the customer using a transient random wallet that the
    // deployer funds first.
    const w = ethers.Wallet.createRandom().connect(deployer.provider);
    console.log(`   funding sample ${s.label} (${w.address})…`);
    const fund = await deployer.sendTransaction({
      to: w.address,
      value: ethers.parseEther("0.005"), // enough for one attestation tx
    });
    await fund.wait();
    customers.push({ signer: w, balance: s.balance, address: w.address });
  }
  console.log("");

  for (const c of customers) {
    console.log(`   attesting ${c.address.slice(0, 10)}… balance ${c.balance}…`);
    // Encrypt client-side via fhevm, bound to (contract, customer).
    const enc = await fhevm
      .createEncryptedInput(porAddr, c.address)
      .add64(c.balance)
      .encrypt();
    const handle = enc.handles[0] as string;
    // Sign as the exchange.
    const sig = await exchangeWallet.signMessage(
      ethers.getBytes(hashAttestation(epochId, c.address, handle, deadline)),
    );
    // Submit as the customer.
    const porAsCustomer = por.connect(c.signer as unknown as typeof deployer);
    const tx = await porAsCustomer.registerAttestation(
      epochId,
      handle,
      ethers.hexlify(enc.inputProof),
      sig,
    );
    const r = await tx.wait();
    console.log(`   ✓ attested in block ${r?.blockNumber}`);
  }

  console.log(`\n✅ Seeded epoch ${epochId} with ${customers.length} attestations.`);
  console.log(`   total reserves ≈ 1,050,000 (solvent vs liabilities 1,000,000)`);
  console.log(`\nNEXT (manual — can't time-travel on public testnet):`);
  console.log(`   Wait until the epoch window closes (${new Date(Number(deadline) * 1000).toLocaleString()}),`);
  console.log(`   then open the Auditor pane and click "1. Reveal" → "2. Decrypt & verify".`);
  console.log(`   Or run: pnpm --filter smart-contracts hardhat run scripts/reveal.ts --network ${network.name}\n`);
}

main().catch((e) => {
  console.error("\n❌ Seed failed:", e?.shortMessage ?? e?.message ?? e);
  process.exit(1);
});
