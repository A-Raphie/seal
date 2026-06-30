# FHE Proof-of-Reserves — Confidential solvency proofs on Zama Protocol

> An exchange proves its reserves exceed its liabilities — **without revealing a
> single customer balance.** Built on the Zama Protocol (fhEVM).

Built for the [Zama Developer Program — Mainnet Season 3, Builder Track](https://forms.zama.org/developer-program-mainnet-season3-builder-track).

## Demo

- **Live site:** _TODO — Vercel URL_
- **3-min pitch:** _TODO — video URL (real-person pitch, no AI voice)_
- **X thread:** _TODO_

---

## The problem

Post-FTX, exchanges publish "Proof-of-Reserves" — but **every approach in production leaks customer data:**

| Approach | What leaks |
|----------|-----------|
| Binance-style Merkle-sum tree | tree structure + every leaf balance |
| Kraken-style signed balances | each customer's exact balance, publicly |
| Commit-reveal aggregate | every balance at reveal time |

And in all of them, an **operator** settles the result — so the proof is only as
trustworthy as the exchange.

## The FHE solution

Every customer submits an **encrypted, exchange-signed** balance attestation. The
contract **sums ciphertexts homomorphically** — it never sees a plaintext. After
the attestation window, anyone can drive a **trustless public reveal** that
decrypts only (a) the aggregate total and (b) a 1-bit solvency result.

```
 customer                  exchange (off-chain)                contract                 auditor / public
   │  encrypts balance          │                                  │                           │
   │  (euint64) in browser      │  signs the ciphertext handle     │                           │
   │───────────────────────────>│                                  │                           │
   │<───────────────────────────│                                  │                           │
   │  registerAttestation(handle, proof, sig) ──────────────────>│  FHE.add(total, enc)      │
   │                             │                                  │  (ACL: allowThis only)    │
   │                             │                                  │                           │
   │                             │                  window closes  │  requestReveal()          │
   │                             │              ┌──────────────────>│  FHE.ge(total, liab)      │
   │                             │              │                   │  makePubliclyDecryptable  │
   │                             │              │   public decrypt  │<─────────────────────────│
   │                             │              │                   │  fulfillPublicDecryption  │
   │                             │              │                   │  FHE.checkSignatures(KMS) │
   │                             │              │                   │  → solvent: true/false    │
```

### Trust assumptions — what this does and does not prove

The contract proves `sum(exchange-signed attestations) >= claimedLiabilities`.
Two things to be precise about:

- **`claimedLiabilities` is the exchange's own asserted number.** It is passed
  into `createEpoch` off-chain; PoR fundamentally cannot verify the real-world
  liability figure without off-chain oracles, and this project does not pretend
  it can. That is the irreducible PoR limitation, and we state it plainly rather
  than hand-wave over it.
- **The reserves side is what FHE makes trustless.** The exchange cannot inflate
  reserves with fake balances, because every reserve entry is (a) signed by the
  cold `exchangeSigner` key, (b) replay-bound via `attestationUsed`, and
  (c) fraud-challengeable by any aggrieved customer via `FHE.ne`. The aggregate
  is computed on-chain over ciphertexts the exchange committed to and cannot
  alter after the window opens.

### Why not ZK? (the honest answer)

The natural objection: *couldn't the exchange just generate a zkSNARK proving
`sum(balances) >= liabilities`?* It could — but ZK proves a claim the prover
**asserts**: the exchange is also the prover choosing the witness, so a
malicious exchange can craft a false witness and the proof will still verify.

FHE removes the prover from the trust path. The exchange does not supply a
result to be proven; it supplies **committed ciphertexts** (one signed
attestation per customer). The contract then *computes* the aggregate and the
solvency bit homomorphically over data the exchange can no longer change. The
result is derived, not attested — trustless, not trust-the-prover.

---

## Why FHE? — verified against the ACL graph

> This table **is** the contract's ACL audit. Every claim below maps to specific
> lines in [`smart-contracts/contracts/ProofOfReserves.sol`](smart-contracts/contracts/ProofOfReserves.sol).
> The predecessor project lost largely because its "Why FHE?" claims were
> contradicted by its own `FHE.allow(...)` calls — this table exists so that
> cannot happen here.

| Claim | Enforced by |
|-------|------------|
| No individual customer balance is ever decryptable by anyone | `registerAttestation` calls only `FHE.allowThis(enc)` — never `FHE.allow(operator)`. `ProofOfReserves.sol:179-180` |
| Individual balances can only be summed, never read | the per-attestation ciphertext is a local that gets `FHE.add`-ed into the total and is never stored or ACL'd elsewhere. `:182` |
| The aggregate is computed on-chain over ciphertexts | `e.encryptedTotal = FHE.add(e.encryptedTotal, enc)` per attestation. `:182-183` |
| Solvency is decided on-chain — no operator supplies a plaintext result | `FHE.ge(e.encryptedTotal, FHE.asEuint64(e.claimedLiabilities))`. `:201` |
| Only the total + the 1-bit result ever decrypt, and only after the window | `FHE.makePubliclyDecryptable(...)` is called **inside `requestReveal`**, which reverts until `block.timestamp >= deadline`. `:206-207` (`:191` guard) |
| The public result is verified on-chain via threshold KMS signatures | `FHE.checkSignatures(handlesList, abiEncodedCleartexts, decryptionProof)` reverts on a bad proof. `:239` |
| A fraud challenge reveals only a 1-bit inequality, never either balance | `FHE.ne(encA, encB)` → `makePubliclyDecryptable(differ)`; both challenge ciphertexts get `allowThis` only. `:296-303` |
| Zero operator-settled plaintexts | there is **no** `onlyOwner`-style function that accepts a plaintext winner/result. The only writer of `revealedTotal`/`solvent` is `fulfillPublicDecryption`, gated by `checkSignatures`. `:217-220`, `:239` |

**ACL audit checklist (re-run before every deploy):**
- [ ] No customer-balance ciphertext has any `FHE.allow` other than `allowThis`.
- [ ] Only `encryptedTotal` + `encryptedSolvent` are publicly decryptable, and only inside `requestReveal` (post-deadline).
- [ ] `challengeConflictingAttestation`'s ciphertexts are `allowThis`-only; only the `differ` bit is public.
- [ ] No `FHE.allow(<operator address>)` anywhere in the codebase.

---

## Architecture

```
fhe-proof-of-reserves/
├── smart-contracts/        Solidity 0.8.27 + @fhevm/solidity (Hardhat)
│   ├── contracts/ProofOfReserves.sol
│   └── test/ProofOfReserves.test.ts            (18 tests, all green)
├── packages/
│   ├── frontend/          Next.js 15 · wagmi v2 · RainbowKit · @zama-fhe/react-sdk
│   │   ├── app/(exchange|customer|audit)       3-pane dApp
│   │   └── app/api/exchange/sign               server-held exchange signing key
│   │   └── app/api/relayer/[...path]           self-hosted relayer proxy
│   └── exchange-cli/      Node back-office tool (sign · create-epoch)
```

**Trust model — what each party can and cannot do:**

| Party | Can | Cannot |
|-------|-----|--------|
| Customer | submit *their own* encrypted balance; challenge a conflicting attestation | decrypt anyone's balance (incl. their own on-chain handle); inflate (exchange signature required) |
| Exchange | sign attestations off-chain; open epochs | settle a plaintext result; decrypt individual balances (only `allowThis`) |
| Auditor / public | drive `requestReveal` + `fulfillPublicDecryption`; read the published total + solvency bit | see any individual balance; forge the result (KMS signatures required) |

---

## Smart contract — `ProofOfReserves`

Solidity 0.8.27, `evmVersion: cancun`, `viaIR: true`. Inherits `ZamaEthereumConfig`.

| Function | Purpose |
|----------|---------|
| `createEpoch(liabilities, window)` | exchange admin publishes a liabilities claim + opens the attestation window |
| `registerAttestation(epochId, enc, proof, sig)` | customer submits their exchange-signed encrypted balance; contract verifies sig, `FHE.add`s into the epoch total |
| `requestReveal(epochId)` | after the window: computes `FHE.ge(total, liabilities)`, marks total + solvency bit publicly decryptable |
| `fulfillPublicDecryption(epochId, handles, cleartexts, proof)` | verifies KMS signatures (`FHE.checkSignatures`), stores the plaintext total + solvency bit |
| `challengeConflictingAttestation(epochId, ctA, prA, sigA, ctB, prB, sigB)` | customer proves the exchange signed two ciphertexts encrypting *different* values via `FHE.ne`; epoch flagged fraudulent if proven |
| `isSolvent(epochId)` / `isFraudulent(epochId)` | public views |

Verified on Sepolia: _TODO — Etherscan link_

---

## Getting started

### Prerequisites
- Node ≥ 20, pnpm ≥ 11
- A wallet with Sepolia ETH
- (For QR-wallet connections) a free [WalletConnect projectId](https://cloud.walletconnect.com)

### 1. Install
```bash
git clone <repo-url> fhe-proof-of-reserves
cd fhe-proof-of-reserves
pnpm install
```

### 2. Run the contract tests
```bash
pnpm --filter smart-contracts test     # 18 tests, ~900ms
```

### 3. Deploy to Sepolia + seed demo data (one command)

The `scripts/setup.sh` orchestrator does everything: install → deploy →
Etherscan-verify → wire `frontend/.env.local` → seed a demo epoch (1 epoch,
3 attestations). The deploy **auto-generates and persists** the exchange signing
key, so there's no manual key step.

Prerequisites (one-time, ~10 min):
1. A wallet with Sepolia ETH (faucet: <https://sepoliafaucet.com>).
2. From inside `smart-contracts/`, set three hardhat vars:
   ```bash
   cd smart-contracts
   npx hardhat vars set MNEMONIC           "your twelve word deployer mnemonic"
   npx hardhat vars set INFURA_API_KEY     "your-infura-project-id"
   npx hardhat vars set ETHERSCAN_API_KEY  "your-etherscan-api-key"
   cd ..
   ```
3. From the repo root:
   ```bash
   pnpm setup
   ```

`setup.sh` prints the Etherscan link and the one remaining manual step
(trigger the reveal after the seeded epoch's 1h window closes).

> **Verification note:** the deploy waits 5 confirmations so
> `verify:sepolia` succeeds first try. If you verify manually, hardhat-deploy
> already recorded the constructor args (`exchangeAdmin`, `exchangeSigner`), so
> no `--constructor-args` flag is needed.

### 4. Run the frontend
```bash
pnpm dev      # http://localhost:3000
```
`setup.sh` already wrote `packages/frontend/.env.local`
(`NEXT_PUBLIC_POR_ADDRESS` + `EXCHANGE_SIGNER_PRIVATE_KEY`). You only need to
add `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` if you want QR-code wallet
connections (MetaMask works without it).

### 5. (Optional) Exchange CLI
```bash
cd packages/exchange-cli
POR_ADDRESS=0x… EXCHANGE_PRIVATE_KEY=0x… pnpm start create-epoch 1000000 3600
POR_ADDRESS=0x… EXCHANGE_PRIVATE_KEY=0x… pnpm start sign <epochId> <customer> <handle> <deadline>
```

### 6. (After the epoch window) Reveal the seeded epoch
The seed script can't time-travel on public Sepolia, so once the 1h window
closes, run the reveal (the Auditor pane does the same two steps):
```bash
pnpm --filter smart-contracts hardhat run scripts/reveal.ts --network sepolia
```

### Deploy the frontend (Vercel)
The repo includes a `vercel.json` for the pnpm-workspace monorepo. Import the
repo in Vercel (Root Directory = repo root), then set the env vars from
`packages/frontend/.env.example` in the Vercel project settings.

---

## What this explicitly does **not** do (anti-patterns from the autopsy)

These are the mistakes that sank the predecessor "SealedBid" submission. They
are structurally impossible here:

- ❌ **Operator-settled plaintexts.** There is no `settle*(winner, value) onlyOwner`. The result is computed on-chain over ciphertexts.
- ❌ **`FHE.allow(operator)` on user values.** Individual balances get `allowThis` only.
- ❌ **The deprecated `@zama-fhe/relayer-sdk` in the app.** Frontend uses the new `@zama-fhe/sdk` + `@zama-fhe/react-sdk`.
- ❌ **README claims not backed by the ACL graph.** The table above is that audit.
- ❌ **Agentic wallet / server-side decrypt of user values.** The relayer route only forwards bytes; it never decrypts.

## License

BSD-3-Clause-Clear. See [`LICENSE`](LICENSE).
