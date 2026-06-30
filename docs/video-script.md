# 3-minute pitch — script outline

> Rules require a **real-person** pitch (no AI voice/video). This is the outline
> you record against. Target 2:45–3:00. The structure lands the hook, the
> "why FHE is *required*" argument, the live demo, and the trustless differentiator.

## 0:00–0:15 — Hook
- "After FTX, every exchange publishes a Proof-of-Reserves. But every single one
  leaks customer balances — Merkle leaves, signed statements, the works."
- Hold up / show a redacted exchange balance table. "What if we could prove
  solvency without revealing any of these?"
- **Alt one-liner (pick one):** "Proof-of-Reserves where the exchange can't
  lie, and customers can't be doxxed."

## 0:15–0:40 — The idea (one sentence)
- "I built FHE Proof-of-Reserves on the Zama Protocol: an exchange proves its
  reserves exceed its liabilities while every customer balance stays fully
  encrypted on-chain."
- One-line on FHE: "the contract can add and compare ciphertexts without ever
  decrypting them."

## 0:40–1:35 — Live demo (screen recording, 3 panes)
1. **Exchange pane** — "First the exchange opens an epoch and publishes its
   liabilities claim — say, 1,000,000."
2. **Customer pane** — "A customer enters their balance. It's encrypted in their
   browser — this number never leaves their machine in plaintext. The exchange
   signs the ciphertext; the customer submits it."
   - Show 2 customers submitting. "The contract sums *ciphertexts*. Nobody —
     not even the contract deployer — can read any individual balance."
3. **Auditor pane** — "The window closes. Anyone can trigger the reveal. The
   contract computes solvency on-chain via `FHE.ge`, and the result is verified
   by threshold KMS signatures. Solvent: true. Revealed total: 1,050,000. Not a
   single individual balance was ever revealed."
4. **Fraud challenge** *(~20s — the most viscerally-FHE beat)* — "Now the
   exchange gets caught. It signed *two different* ciphertexts for the same
   customer — an inflated one and the real one. The customer submits both
   signed attestations. The contract computes `FHE.ne` under encryption: do
   they differ? The result decrypts to a single bit — `true` — and the epoch is
   flagged fraudulent. **Neither balance was ever revealed**, not even during
   the fraud proof."

## 1:35–2:15 — The trustless differentiator (the key slide)
- "Here's the part I care about most. The contract decides solvency itself,
  over ciphertexts. There is **no operator** in the trust path."
- Show the README's ACL audit table. "Every privacy claim maps to a line of
  Solidity. Each balance gets `allowThis` only — never `allow(operator)`."
- "And there's a fraud path: if the exchange signs two different balances for
  the same customer, the customer proves it on-chain via `FHE.ne` — revealing
  only a 1-bit 'they differ' flag. To be clear: this is a **safety net against
  attestation tampering** — it catches an exchange sloppy enough to double-sign
  conflicting balances, not a determined adversary who simply refuses to issue
  the second signature. Strictly better than not having it; I won't oversell
  it as more."

## 2:15–2:50 — Why this is *only* possible with FHE
- "Commit-reveal leaks at reveal. Merkle-sum leaks the tree. A trusted third
  party… isn't trustless. Only fully homomorphic encryption lets you prove a
  property of encrypted data without ever decrypting it."
- **The ZK objection, answered:** "You might ask — why not zero-knowledge proofs?
  Because ZK proves whatever the *prover* claims; the exchange picks the witness
  and could craft a false one. FHE *computes* the truth over ciphertexts the
  exchange already committed to and can't change. Trustless, not trust-the-prover."

## 2:50–3:00 — Close
- "FHE Proof-of-Reserves. Open source, on Sepolia, 18 contract tests. Built for
  the Zama Developer Program. Link below — thanks."

---

## Recording checklist
- [ ] 1080p screen capture, ~30fps, system audio off
- [ ] Pre-seed Sepolia: deploy contract, open 1 epoch, fund 3 customer wallets
- [ ] Practice the Auditor-pane reveal once before recording (the public-decrypt
      + `fulfillPublicDecryption` callback can take ~10–40s on Sepolia)
- [ ] Real face/to-camera for the hook and close; screen recording for the demo
- [ ] No AI voiceover (would be disqualified)
