# AGENTS.md — FHE Proof-of-Reserves

## Project
**Private Proof-of-Reserves on Zama Protocol.** An exchange proves solvency
without doxxing customer balances. Each customer submits an encrypted balance
attestation (signed by the exchange off-chain); the contract sums ciphertexts
homomorphically; only the aggregate is ever decrypted — and only after the
attestation window closes. Built for the Zama Developer Program Mainnet
Season 3 — Builder Track (deadline July 7, AOE).

**Scoped trust assumption (state explicitly in all external docs):** the
contract proves `sum(exchange-signed attestations) >= claimedLiabilities`.
`claimedLiabilities` is the exchange's own asserted off-chain number — PoR
cannot prove it without off-chain oracles, and we do not pretend otherwise.
What FHE *does* guarantee: the reserves side cannot be inflated with fake
balances, because every reserve entry is exchange-signed, replay-bound
(`attestationUsed`), and fraud-challengeable via `FHE.ne`. Frame the liability
figure as the irreducible PoR limitation, and the ciphertext-summed reserves
as the part FHE makes trustless.

## Non-negotiable design rules
These exist because the predecessor project (SealedBid) lost primarily by
violating them. Do NOT violate them without an explicit, documented exception.

1. **No operator in the trust path.** The contract computes the public result.
   There is no `onlyOwner` function that accepts plaintext values derived from
   server-side decryption.
2. **ACL discipline.** Individual customer balances get `FHE.allowThis` ONLY
   (so the contract can `FHE.add` them). Never `FHE.allow(operator)`. Only the
   epoch aggregate total + the 1-bit solvency result get public ACL — and only
   inside `requestReveal()`, which reverts until the window has closed.
3. **New SDK only.** Use `@zama-fhe/sdk` + `@zama-fhe/react-sdk` with
   `ZamaProvider`. Zero `@zama-fhe/relayer-sdk`. No `window.relayerSDK` CDN
   loader.
4. **"Why FHE?" table audit is mandatory before ship.** Every claim in the
   README's "Why FHE?" table must be verified against the actual ACL graph in
   the deployed contract. The audit is a README section.
5. **No agentic wallet / server-side decrypt** of any value that should stay
   private. The relayer route is purely for the new SDK's transport; it never
   decrypts customer data.

## Architecture
- **Customer** (browser): imports signed attestation JSON → encrypts balance
  client-side via `@zama-fhe/react-sdk` → submits ciphertext + signature
  on-chain.
- **Exchange** (off-chain CLI): signs EIP-712 attestations binding
  `(epochId, customerId, balance, deadline)` for each customer.
- **Contract**: verifies exchange signature, `FHE.add`s the ciphertext to the
  epoch's running total, marks attestation hash used. After the deadline,
  `requestReveal(epochId)` computes the solvency bit **under encryption** via
  `FHE.ge(encryptedTotal, claimedLiabilities)` and marks the total + bit
  publicly decryptable. Separately, `fulfillPublicDecryption(epochId, ...)`
  verifies the KMS threshold signatures (`FHE.checkSignatures`) over the
  decrypted cleartexts and stores the plaintext total + solvency bit. There is
  no operator-supplied plaintext result.
- **Auditor / public**: reads historical epoch timeline; verifies each epoch's
  solvency boolean without ever seeing individual balances.
- **Challenge path**: a customer who catches the exchange signing an inflated
  balance for a (possibly fake) account submits a conflicting signed
  attestation → contract flags fraud on-chain.

## Contract sketch (canonical — mirrors `ProofOfReserves.sol`)
```solidity
contract ProofOfReserves is ZamaEthereumConfig {
    struct Epoch {
        uint64 claimedLiabilities;
        uint64 deadline;
        euint64 encryptedTotal;
        ebool encryptedSolvent;     // FHE.ge(total, liabilities), computed under FHE
        uint64 revealedTotal;       // plaintext, set by fulfillPublicDecryption
        bool solvent;               // plaintext, set by fulfillPublicDecryption
        bool revealed;              // requestReveal() called
        bool fulfilled;             // public decryption result stored
        uint256 attestationCount;
    }
    struct FraudChallenge {
        address challenger;
        address customer;
        ebool encryptedDiffer;      // FHE.ne(encA, encB)
        bool fulfilled;
        bool fraudProven;
    }
    mapping(uint256 => Epoch) private _epochs;
    mapping(bytes32 => bool) public attestationUsed;
    mapping(bytes32 => FraudChallenge) private _challenges;
    mapping(uint256 => bool) public epochFraudulent;
    address public immutable exchangeAdmin;   // hot key, creates epochs
    address public immutable exchangeSigner;  // cold key, signs attestations

    function createEpoch(uint64 liabilities, uint64 windowSeconds) external onlyExchangeAdmin returns (uint256);
    function registerAttestation(uint256 epochId, externalEuint64 enc, bytes proof, bytes sig) external;
    function requestReveal(uint256 epochId) external;                       // FHE.ge + makePubliclyDecryptable
    function fulfillPublicDecryption(uint256 epochId, bytes32[] handles, bytes cleartexts, bytes proof) external;
    function challengeConflictingAttestation(uint256 epochId, externalEuint64 ctA, bytes prA, bytes sigA, externalEuint64 ctB, bytes prB, bytes sigB) external;
    function fulfillChallenge(uint256 epochId, address customer, bytes32[] handles, bytes cleartexts, bytes proof) external;
    function isSolvent(uint256 epochId) external view returns (bool);
    function isFraudulent(uint256 epochId) external view returns (bool);
}
```
NOTE: this sketch must stay in lock-step with `ProofOfReserves.sol`. The
previous version of this section described a `revealTotal()` design that
computed `solvent = revealedTotal >= claimedLiabilities` as a **plaintext
comparison after decrypt** — which would itself violate design rule #1. The
live contract instead computes the solvency bit under encryption in
`requestReveal()`; do not regress.

## Tech stack (locked)
- Solidity ^0.8.24, `@fhevm/solidity`, `ZamaEthereumConfig`
- Hardhat via `zama-ai/fhevm-hardhat-template`, `@fhevm/hardhat-plugin`
- Frontend: Next.js 15 (App Router), React 19, TypeScript, Tailwind
- Wallet: wagmi v2 + RainbowKit
- FHE SDK: `@zama-fhe/sdk` + `@zama-fhe/react-sdk` (NOT relayer-sdk)
- Network: Sepolia testnet

## Repo layout (target)
```
fhe-proof-of-reserves/
├── AGENTS.md
├── README.md
├── package.json                     # pnpm workspace root
├── pnpm-workspace.yaml
├── smart-contracts/
│   ├── contracts/ProofOfReserves.sol
│   ├── test/ProofOfReserves.test.ts
│   ├── deploy/deploy.ts
│   └── hardhat.config.ts
├── packages/
│   ├── frontend/                    # Next.js app
│   │   ├── app/
│   │   │   ├── (customer)/submit/page.tsx
│   │   │   ├── (exchange)/page.tsx
│   │   │   ├── (audit)/page.tsx     # epoch timeline
│   │   │   ├── api/relayer/[chainId]/route.ts
│   │   │   └── layout.tsx           # ZamaProvider + wagmi
│   │   ├── hooks/
│   │   ├── lib/
│   │   └── contracts/               # ABIs + addresses
└── packages/exchange-cli/           # Node CLI: signs EIP-712 attestations
    ├── src/sign.ts
    └── fixtures/customers.json
```

## Commands (fill in once scaffolded)
- Install: `pnpm install`
- Test contracts: `pnpm --filter smart-contracts test`
- Typecheck frontend: `pnpm --filter frontend typecheck`
- Lint: `pnpm lint`
- Deploy (Sepolia): `pnpm --filter smart-contracts deploy:sepolia`
- Dev frontend: `pnpm --filter frontend dev`

## Build phases (14 days to July 7)
0. **Setup (1d)** — scaffold, hello-world deploy, verify ZamaProvider + relayer
1. **Contract single-epoch (2d)** — registerAttestation, requestReveal,
   fulfillPublicDecryption, isSolvent
2. **Multi-epoch + challenge path (2d)** — parameterize by epochId, fraud proof
3. **Exchange signer CLI (1.5d)** — EIP-712 signing + sample fixtures
4. **Frontend 3-pane + timeline (4d)** — customer/exchange/auditor + epoch history
5. **Relayer + deploy (1d)** — self-host route, Sepolia, Vercel
6. **Video + X thread (2.5d)** — pitch + ACL audit README section

## Anti-patterns (forbidden — from SealedBid autopsy)
- ❌ `settle*(address winner, uint64 value) external onlyCreator` — passing
  plaintext derived from server-side decrypt.
- ❌ `FHE.allow(ciphertext, operatorAddress)` on individual user values.
- ❌ `@zama-fhe/relayer-sdk` or any `window.relayerSDK` CDN loader.
- ❌ Claims in README not backed by the ACL graph.
- ❌ Agentic HDNodeWallet that decrypts user values server-side.
- ❌ Product breadth (templates, auto-replenish, splash screens) at the expense
  of FHE depth.

## ACL audit checklist (run before each deploy)
- [ ] No individual customer balance ciphertext has any `FHE.allow` other than
      `allowThis`.
- [ ] Only `encryptedTotal` + `encryptedSolvent` get public ACL, only inside
      `requestReveal()`, only after `block.timestamp >= deadline`.
- [ ] `challengeConflictingAttestation`'s two ciphertexts are `allowThis`-only;
      only the 1-bit `differ` result (`FHE.ne`) is marked publicly decryptable.
      Neither balance is ever revealed — not to the challenger, not to anyone.
- [ ] The "Why FHE?" table has a one-to-one mapping to lines of code in
      `ProofOfReserves.sol`.
