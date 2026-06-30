#!/usr/bin/env bash
#
# One-command deploy + seed for FHE Proof-of-Reserves.
#
#   pnpm setup      # from the repo root
#
# What you need first (one-time, ~10 min):
#   1. A wallet with Sepolia ETH (faucet: https://sepoliafaucet.com or equivalent).
#   2. From inside smart-contracts/:
#        npx hardhat vars set MNEMONIC          # your funded wallet's 12-word mnemonic
#        npx hardhat vars set INFURA_API_KEY    # https://infura.io
#        npx hardhat vars set ETHERSCAN_API_KEY # https://etherscan.io/apis
#   3. Re-run this script.
#
# This script then: installs deps → deploys → verifies → wires frontend .env
# → seeds a demo epoch. Re-runnable (idempotent).

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SC="$ROOT/smart-contracts"
FE="$ROOT/packages/frontend"
cd "$ROOT"

log()  { printf "\n\033[1;36m▸ %s\033[0m\n" "$*"; }
ok()   { printf "\033[1;32m  ✓ %s\033[0m\n" "$*"; }
die()  { printf "\n\033[1;31m✗ %s\033[0m\n" "$*" >&2; exit 1; }

# ── Pre-flight: hardhat vars ─────────────────────────────────────────────────
log "Pre-flight checks"
cd "$SC"
for v in MNEMONIC INFURA_API_KEY ETHERSCAN_API_KEY; do
  if ! npx hardhat vars get "$v" >/dev/null 2>&1; then
    die "hardhat var '$v' is not set. Run this from $SC :
         npx hardhat vars set $v"
  fi
done
ok "hardhat vars present (MNEMONIC, INFURA_API_KEY, ETHERSCAN_API_KEY)"

# Check the deployer is funded.
DEPLOYER_BALANCE=$(node -e "
  const { ethers } = require('ethers');
  (async () => {
    const mnemonic = require('child_process').execSync('npx hardhat vars get MNEMONIC', {encoding:'utf8'}).trim();
    const infura   = require('child_process').execSync('npx hardhat vars get INFURA_API_KEY', {encoding:'utf8'}).trim();
    const p = new ethers.JsonRpcProvider('https://sepolia.infura.io/v3/' + infura);
    const a = ethers.HDNodeWallet.fromMnemonic(ethers.Mnemonic.fromPhrase(mnemonic), \"m/44'/60'/0'/0/0\");
    const b = await p.getBalance(a.address);
    console.log(ethers.formatEther(b));
  })();
" 2>/dev/null || echo "0")
if [[ "$(echo "$DEPLOYER_BALANCE" | awk '{print ($1+0)}')" == "0" ]]; then
  die "Deployer wallet has 0 Sepolia ETH. Fund it from a faucet (e.g. https://sepoliafaucet.com) then re-run."
fi
ok "deployer funded ($DEPLOYER_BALANCE ETH)"
cd "$ROOT"

# ── Install ──────────────────────────────────────────────────────────────────
if [[ ! -d "$ROOT/node_modules" ]]; then
  log "Installing dependencies"
  pnpm install
  ok "dependencies installed"
else
  ok "node_modules present — skipping install"
fi

# ── Deploy ───────────────────────────────────────────────────────────────────
log "Deploying ProofOfReserves to Sepolia"
pnpm --filter smart-contracts deploy:sepolia
ok "deployed"

# ── Read address + key back ─────────────────────────────────────────────────
ADDR_FILE="$SC/deployments/sepolia/ProofOfReserves.json"
CRED_FILE="$SC/deployments/sepolia/AuditorCredential.json"
KEY_FILE="$SC/.deploy-exchange-key.json"
[[ -f "$ADDR_FILE" ]] || die "Deployment artifact not found: $ADDR_FILE"
[[ -f "$CRED_FILE" ]] || die "AuditorCredential artifact not found: $CRED_FILE"
[[ -f "$KEY_FILE"  ]] || die "Exchange key file not found: $KEY_FILE (deploy should have created it)"

POR_ADDR=$(node -e "console.log(require('$ADDR_FILE').address)")
CRED_ADDR=$(node -e "console.log(require('$CRED_FILE').address)")
EXCH_KEY=$(node -e "console.log(require('$KEY_FILE').privateKey)")
ok "ProofOfReserves: $POR_ADDR"
ok "AuditorCredential: $CRED_ADDR"
ok "exchange key: loaded"

# ── Verify on Etherscan ─────────────────────────────────────────────────────
log "Verifying on Etherscan"
if pnpm --filter smart-contracts verify:sepolia "$POR_ADDR" 2>&1; then
  ok "verified (or already verified)"
else
  printf "\033[33m  ⚠ verify step failed (non-fatal) — you can retry:
           pnpm --filter smart-contracts verify:sepolia $POR_ADDR\033[0m\n"
fi

# ── Wire frontend .env.local ────────────────────────────────────────────────
log "Writing packages/frontend/.env.local"
ENV_LOCAL="$FE/.env.local"
if [[ -f "$ENV_LOCAL" ]]; then
  # Update existing keys in place, preserve the rest (e.g. WalletConnect id).
  node -e "
    const fs = require('fs');
    const path = '$ENV_LOCAL';
    let t = fs.readFileSync(path, 'utf8');
    const set = (k, v) => {
      const re = new RegExp('^' + k + '=.*\$', 'm');
      if (re.test(t)) t = t.replace(re, k + '=' + v);
      else t += (t.endsWith('\n') ? '' : '\n') + k + '=' + v + '\n';
    };
    set('NEXT_PUBLIC_POR_ADDRESS', '$POR_ADDR');
    set('NEXT_PUBLIC_AUDITOR_CREDENTIAL_ADDRESS', '$CRED_ADDR');
    set('EXCHANGE_SIGNER_PRIVATE_KEY', '$EXCH_KEY');
    fs.writeFileSync(path, t);
  "
else
  cp "$FE/.env.example" "$ENV_LOCAL"
  # Ensure the address + key are set, then re-run the in-place updater.
  node -e "
    const fs = require('fs');
    const path = '$ENV_LOCAL';
    let t = fs.readFileSync(path, 'utf8');
    t = t.replace(/NEXT_PUBLIC_POR_ADDRESS=.*/, 'NEXT_PUBLIC_POR_ADDRESS=$POR_ADDR');
    t = t.replace(/NEXT_PUBLIC_AUDITOR_CREDENTIAL_ADDRESS=.*/, 'NEXT_PUBLIC_AUDITOR_CREDENTIAL_ADDRESS=$CRED_ADDR');
    t = t.replace(/EXCHANGE_SIGNER_PRIVATE_KEY=.*/, 'EXCHANGE_SIGNER_PRIVATE_KEY=$EXCH_KEY');
    fs.writeFileSync(path, t);
  "
fi
ok "frontend env wired (NEXT_PUBLIC_POR_ADDRESS, NEXT_PUBLIC_AUDITOR_CREDENTIAL_ADDRESS, EXCHANGE_SIGNER_PRIVATE_KEY)"

# ── Seed ─────────────────────────────────────────────────────────────────────
log "Seeding a demo epoch (1 epoch, 3 attestations)"
if pnpm --filter smart-contracts hardhat run scripts/seed.ts --network sepolia 2>&1; then
  ok "seeded"
else
  printf "\033[33m  ⚠ seed step failed (non-fatal) — KMS may be slow/unreachable.
           Retry: pnpm --filter smart-contracts hardhat run scripts/seed.ts --network sepolia\033[0m\n"
fi

# ── Done ─────────────────────────────────────────────────────────────────────
log "Done 🎉"
cat <<EOF

  Contract:   https://sepolia.etherscan.io/address/$POR_ADDR
  Run the dApp:   pnpm dev   →   http://localhost:3000

  NEXT (manual — can't time-travel on a public testnet):
    After the seeded epoch's 1h window closes, open the Auditor pane and click
    "1. Reveal" then "2. Decrypt & verify". Or:
      pnpm --filter smart-contracts hardhat run scripts/reveal.ts --network sepolia

EOF
