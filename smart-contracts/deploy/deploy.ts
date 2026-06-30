import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ethers } from "ethers";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

/**
 * Persists the exchange signing keypair so the same key survives across
 * re-deploys. Lives under smart-contracts/ and is gitignored. This removes the
 * "generate a cold key out of band" step — the deploy invents and remembers it.
 */
const KEY_FILE = join(process.cwd(), ".deploy-exchange-key.json");

function loadOrGenerateExchangeKey(): { privateKey: string; address: string } {
  // 1. Operator-supplied key wins (env), for those who bring their own.
  if (process.env.EXCHANGE_SIGNER_PRIVATE_KEY) {
    const w = new ethers.Wallet(process.env.EXCHANGE_SIGNER_PRIVATE_KEY);
    return { privateKey: w.privateKey, address: w.address };
  }
  // 2. A previously-generated key on disk (idempotent re-deploys).
  if (existsSync(KEY_FILE)) {
    const parsed = JSON.parse(readFileSync(KEY_FILE, "utf8")) as {
      privateKey: string;
      address: string;
    };
    return parsed;
  }
  // 3. First run: generate a fresh cold key and persist it.
  const w = ethers.Wallet.createRandom();
  const record = { privateKey: w.privateKey, address: w.address };
  mkdirSync(dirname(KEY_FILE), { recursive: true });
  writeFileSync(KEY_FILE, JSON.stringify(record, null, 2) + "\n");
  console.log(`\n  🔑 Generated a new exchange signing key, saved to ${KEY_FILE}`);
  console.log(`     address: ${w.address}\n`);
  return record;
}

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  // One-key demo model: admin == signer. The deployer is the admin (it has the
  // gas to create epochs); the signer is the persisted exchange key. If you
  // need the secure two-key model, set EXCHANGE_ADMIN / EXCHANGE_SIGNER env.
  const exchangeAdmin = process.env.EXCHANGE_ADMIN ?? deployer;
  const exchangeSigner = process.env.EXCHANGE_SIGNER ?? loadOrGenerateExchangeKey().address;

  // Composable-privacy seam: the AuditorCredential (soulbound ERC-721) gates
  // who may drive requestReveal and decrypt an epoch's aggregate total. The
  // registrar defaults to the exchange admin (it accredits auditors).
  const credentialRegistrar = process.env.AUDITOR_REGISTRAR ?? exchangeAdmin;

  const credential = await deploy("AuditorCredential", {
    from: deployer,
    args: [credentialRegistrar],
    log: true,
    waitConfirmations: 5,
  });

  const deployed = await deploy("ProofOfReserves", {
    from: deployer,
    args: [exchangeAdmin, exchangeSigner, credential.address],
    log: true,
    // 5 confirmations so `verify:sepolia` succeeds on the first try — Etherscan
    // usually needs the bytecode indexed before it will accept verification.
    waitConfirmations: 5,
  });

  console.log(`AuditorCredential deployed at: ${credential.address}`);
  console.log(`  registrar    : ${credentialRegistrar}`);
  console.log(`ProofOfReserves deployed at: ${deployed.address}`);
  console.log(`  exchangeAdmin : ${exchangeAdmin}`);
  console.log(`  exchangeSigner: ${exchangeSigner}`);
  console.log(`  Etherscan     : https://sepolia.etherscan.io/address/${deployed.address}`);

  if (exchangeAdmin === exchangeSigner) {
    console.log(`  ⚠ admin == signer (single-key demo model).`);
  }
};

export default func;
func.id = "deploy_proofOfReserves";
func.tags = ["ProofOfReserves", "AuditorCredential"];
