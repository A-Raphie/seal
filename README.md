# FHE Proof-of-Reserves — Composable confidential solvency on Zama Protocol

> An exchange proves its reserves exceed its liabilities — **without revealing a
> single customer balance** — and composes *who may decrypt what* from on-chain
> primitives: a soulbound ERC-721 auditor credential gates access to the
> aggregate reserve total, while the 1-bit solvency verdict stays public. Built
> on the Zama Protocol (fhEVM).

Built for the [Zama Developer Program — Mainnet Season 3, Builder Track](https://forms.zama.org/developer-program-mainnet-season3-builder-track) — theme: *"Composable Privacy Is the Key."*

## Demo

- **Live site:** _TODO — Vercel URL_
- **3-min pitch:** _TODO — video URL (real-person pitch, no AI voice)_
- **X thread:** _TODO_
- **ProofOfReserves (Sepolia):** [0xF95799D4E3D634Ce42107ff7496F3D48371b35cc](https://sepolia.etherscan.io/address/0xF95799D4E3D634Ce42107ff7496F3D48371b35cc)
- **AuditorCredential (Sepolia):** [0xd3a4350a4E3a4b9BE4e1Ef5f7AFB267b8B7A8BfA](https://sepolia.etherscan.io/address/0xd3a4350a4E3a4b9BE4e1Ef5f7AFB267b8B7A8BfA)

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

## The FHE solution — and the composable-privacy split

Every customer submits an **encrypted, exchange-signed** balance attestation. The
contract **sums ciphertexts homomorphically** — it never sees a plaintext. After
the attestation window, an **accredited auditor** drives the reveal.

This is where the Season-3 composition lives: decryption rights are **split and
gated by an on-chain credential**, not left open to anyone:

| Ciphertext | Who can decrypt it | Mechanism |
|------------|--------------------|-----------|
| Each customer's balance | **no one, ever** | `FHE.allowThis` only — summed, never read |
| The 1-bit solvency verdict | **everyone** (public good) | `FHE.makePubliclyDecryptable` + KMS `fulfillVerdict` |
| The aggregate reserve total | **accredited auditors only** | `FHE.allow(total, auditor)` — composed from an `AuditorCredential` ERC-721; off-chain EIP-712 `userDecrypt` |

The verdict ("is the exchange solvent?") is a public good. The *number* behind
it (the actual reserve total) is commercially sensitive — so only a vetted,
on-chain-credentialed auditor can read it, and only off-chain via EIP-712
user-decryption. **The total is never settled as plaintext on-chain.**

```
 customer              exchange (off-chain)          contract                      auditor (ERC-721 holder)        public
   │ encrypts balance       │                          │                                │                             │
   │ (euint64)              │ signs the handle         │                                │                             │
   │───────────────────────>│                          │                                │                             │
   │<───────────────────────│                          │                                │                             │
   │ registerAttestation(handle, proof, sig) ─────────>│ FHE.add(total, enc)            │                             │
   │                        │                          │ (ACL: allowThis only)          │                             │
   │                        │            window closes │                                │                             │
   │                        │      ┌──────────────────>│ requestReveal()  ◀── requires balanceOf(auditor) > 0        │
   │                        │      │                   │ FHE.ge(total, liab)            │                             │
   │                        │      │                   │ makePubliclyDecryptable(verdict)                             │
   │                        │      │                   │ FHE.allow(total, auditor) ◀── composed from credential       │
   │                        │      │                   │                                │ off-chain userDecrypt(total) │
   │                        │      │  public decrypt   │<───────────────────────────────│                             │
   │                        │      │  (verdict only)   │ fulfillVerdict() ◀──────────────┼─────────────────────────────│
   │                        │      │                   │ FHE.checkSignatures(KMS)       │      → solvent: true/false  │
```

### Composable privacy — the seam

`requestReveal` checks `auditorCredential.balanceOf(msg.sender) > 0` *before* any
FHE work, then calls `FHE.allow(encryptedTotal, msg.sender)`. That single line is
the composition: the right to decrypt sensitive reserve data is derived from an
on-chain, soulbound identity primitive (ERC-721), not hardcoded to an address or
left public. Revoke the credential and the auditor instantly loses all future
decryption rights. (Note: the correct FHE primitive for scoping a specific EOA's
user-decryption of a contract-held ciphertext is `FHE.allow(handle, account)` —
not `delegateUserDecryption`, which is for account-abstraction delegation and
structurally requires a second, distinct contract address.)

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
| No individual customer balance is ever decryptable by anyone | `registerAttestation` calls only `FHE.allowThis(enc)` — never `FHE.allow(operator)`. `:205` |
| Individual balances can only be summed, never read | the per-attestation ciphertext is a local that gets `FHE.add`-ed into the total and is never stored or ACL'd elsewhere. `:207` |
| The aggregate is computed on-chain over ciphertexts | `e.encryptedTotal = FHE.add(e.encryptedTotal, enc)` per attestation. `:207-208` |
| Solvency is decided on-chain — no operator supplies a plaintext result | `FHE.ge(e.encryptedTotal, FHE.asEuint64(e.claimedLiabilities))`. `:235` |
| Reveal is gated by an on-chain auditor credential (composable privacy) | `requestReveal` reverts with `NotAnAuditor` unless `auditorCredential.balanceOf(msg.sender) > 0`. `:233` |
| Only the 1-bit verdict is ever publicly decryptable | `FHE.makePubliclyDecryptable(e.encryptedSolvent)` is the *only* public-decrypt call in the reveal path, inside `requestReveal`, post-deadline. `:238` |
| The aggregate total is decryptable ONLY by the accredited auditor, off-chain | `FHE.allow(e.encryptedTotal, msg.sender)` — the single `FHE.allow` in the codebase, scoped to the auditor from line `:233`. The total is never `makePubliclyDecryptable` and never written as plaintext on-chain. `:243` |
| The public verdict is verified on-chain via threshold KMS signatures | `FHE.checkSignatures(handlesList, abiEncodedCleartexts, decryptionProof)` reverts on a bad proof. `:280` |
| A fraud challenge reveals only a 1-bit inequality, never either balance | `FHE.ne(encA, encB)` → `makePubliclyDecryptable(differ)`; both challenge ciphertexts get `allowThis` only. `:337-343` |
| Zero operator-settled plaintexts | there is **no** `onlyOwner`-style function that accepts a plaintext. The only writer of `solvent` is `fulfillVerdict`, gated by `checkSignatures`; `revealedTotal` no longer exists on-chain at all. `:280` |

**ACL audit checklist (re-run before every deploy):**
- [ ] No customer-balance ciphertext has any `FHE.allow` other than `allowThis`.
- [ ] The **only** `FHE.allow` in the codebase is `FHE.allow(encryptedTotal, msg.sender)` inside the auditor-gated `requestReveal`. There is no `FHE.allow(<fixed operator address>)`.
- [ ] Only `encryptedSolvent` (the verdict) is `makePubliclyDecryptable`; `encryptedTotal` never is.
- [ ] `requestReveal` reverts before any FHE work if the caller holds no `AuditorCredential`.
- [ ] `challengeConflictingAttestation`'s ciphertexts are `allowThis`-only; only the `differ` bit is public.

---

## Architecture

```
fhe-proof-of-reserves/
├── smart-contracts/        Solidity 0.8.27 + @fhevm/solidity (Hardhat)
│   ├── contracts/ProofOfReserves.sol           core: encrypted attestations + auditor-gated reveal
│   ├── contracts/AuditorCredential.sol         soulbound ERC-721 (composable-privacy gate)
│   └── test/ProofOfReserves.test.ts            (26 tests, all green)
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
| Exchange | sign attestations off-chain; open epochs; accredit/revoke auditors | settle a plaintext result; decrypt individual balances (only `allowThis`) |
| Accredited auditor | drive `requestReveal`; decrypt the aggregate total **off-chain** via EIP-712 `userDecrypt` | read any individual balance; forge the verdict (KMS signatures required); decrypt after revocation |
| Public | read the on-chain 1-bit solvency verdict | read the aggregate total; see any individual balance |

---

## Smart contracts — `ProofOfReserves` + `AuditorCredential`

Solidity 0.8.27, `evmVersion: cancun`, `viaIR: true`. Both inherit / use `ZamaEthereumConfig`.

### `ProofOfReserves`

| Function | Purpose |
|----------|---------|
| `createEpoch(liabilities, window)` | exchange admin publishes a liabilities claim + opens the attestation window |
| `registerAttestation(epochId, enc, proof, sig)` | customer submits their exchange-signed encrypted balance; contract verifies sig, `FHE.add`s into the epoch total |
| `requestReveal(epochId)` | **accredited auditor only**: computes `FHE.ge(total, liabilities)`, marks the verdict public, `FHE.allow`s the total to the auditor |
| `fulfillVerdict(epochId, handles, cleartexts, proof)` | verifies KMS signatures (`FHE.checkSignatures`), stores the 1-bit solvency verdict on-chain |
| `challengeConflictingAttestation(...)` | customer proves the exchange signed two ciphertexts encrypting *different* values via `FHE.ne`; epoch flagged fraudulent if proven |
| `isSolvent(epochId)` / `isFraudulent(epochId)` / `getAuditor(epochId)` | public views |

### `AuditorCredential` (composable-privacy primitive)

A soulbound (non-transferable) ERC-721. Holding a credential is the on-chain
precondition to drive `requestReveal` and decrypt an epoch's aggregate total
off-chain. The registrar accredits (`accredit`) and can revoke (`revoke`);
`_update` blocks all transfers so an accreditation is bound to the vetted address.

| Function | Purpose |
|----------|---------|
| `accredit(auditor)` | registrar mints a credential (one per address) |
| `revoke(auditor)` | registrar burns the credential — auditor loses all decryption rights |
| `isAuditor(account)` / `balanceOf(account)` | the gate `requestReveal` checks |

Verified on Sepolia: [ProofOfReserves](https://sepolia.etherscan.io/address/0xF95799D4E3D634Ce42107ff7496F3D48371b35cc#code) · [AuditorCredential](https://sepolia.etherscan.io/address/0xd3a4350a4E3a4b9BE4e1Ef5f7AFB267b8B7A8BfA#code)

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
pnpm --filter smart-contracts test     # 26 tests, ~600ms
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
> already recorded the constructor args — `ProofOfReserves(exchangeAdmin,
> exchangeSigner, auditorCredentialAddress)` and `AuditorCredential(registrar)`
> — so no `--constructor-args` flag is needed.

### 4. Run the frontend
```bash
pnpm dev      # http://localhost:3000
```
`setup.sh` already wrote `packages/frontend/.env.local`
(`NEXT_PUBLIC_POR_ADDRESS` + `NEXT_PUBLIC_AUDITOR_CREDENTIAL_ADDRESS` +
`EXCHANGE_SIGNER_PRIVATE_KEY`). You only need to add
`NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` if you want QR-code wallet connections
(MetaMask works without it).

### 5. (Optional) Exchange CLI
```bash
cd packages/exchange-cli
POR_ADDRESS=0x… EXCHANGE_PRIVATE_KEY=0x… pnpm start create-epoch 1000000 3600
POR_ADDRESS=0x… EXCHANGE_PRIVATE_KEY=0x… pnpm start sign <epochId> <customer> <handle> <deadline>
```

### 6. (After the epoch window) Reveal the seeded epoch
The seed script can't time-travel on public Sepolia, so once the 1h window
closes, run the reveal. It accredits the running signer as an auditor (if not
already), drives `requestReveal`, and fulfills the 1-bit verdict on-chain:
```bash
pnpm --filter smart-contracts hardhat run scripts/reveal.ts --network sepolia
```
The aggregate total is intentionally **not** revealed by this script — it is
auditor-gated and read off-chain via EIP-712 `userDecrypt` in the frontend.

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
