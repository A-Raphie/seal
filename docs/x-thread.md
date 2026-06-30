# X thread — draft

> Post as a reply-chain (1/ → n/). Replace `<URL>` placeholders before posting.
> Tone: builder, concrete, no hype words. Lead with the hook.

---

1/ After FTX, every exchange publishes "Proof-of-Reserves." But every approach in production today — Merkle-sum trees, signed balances, commit-reveal — leaks customer balances to the world.

What if an exchange could prove solvency without doxxing a single customer? Proof-of-Reserves where the exchange can't lie, and customers can't be doxxed. 🧵

2/ Introducing **FHE Proof-of-Reserves** — confidential solvency proofs on the @zama_fhe Protocol.

An exchange proves `reserves ≥ liabilities` while every customer balance stays encrypted on-chain. Only a 1-bit result + the aggregate ever decrypt.

<URL>

3/ How it works:

1️⃣ Each customer's balance is encrypted in their browser (euint64)
2️⃣ The exchange signs the ciphertext off-chain
3️⃣ The contract sums **ciphertexts** with `FHE.add` — it never sees a plaintext
4️⃣ After the window, `FHE.ge(total, liabilities)` decides solvency on-chain

4/ The key word is **trustless**. The solvency bit is computed on-chain over ciphertexts — no operator supplies a plaintext result. The public reveal is verified by KMS threshold-signatures (`FHE.checkSignatures`). Anyone can run it.

5/ ACL discipline is the whole game. Every customer balance gets `FHE.allowThis` only — it is permanently undecryptable, by anyone, including the contract deployer. Only the aggregate total + the 1-bit solvency flag are ever marked publicly decryptable, and only after the window closes.

6/ Why FHE and not ZK? ZK proves whatever the *prover* claims — the exchange picks the witness and could craft a false one. FHE *computes* the result over ciphertexts the exchange committed to and can't change. Trustless, not trust-the-prover.

7/ Plus a **fraud challenge path**: if the exchange ever signs two ciphertexts that encrypt *different* values for one customer, the customer proves it on-chain with `FHE.ne` — revealing only a 1-bit "they differ" flag. Neither balance leaks, even during the challenge. Honest caveat: it's a safety net against attestation tampering, not a catch for a determined adversary who simply never issues the second signature.

8/ Why this matters: the predecessor version of this idea lost because its "Why FHE?" claims were contradicted by its own code (`FHE.allow(operator)` on every bid, an `onlyOwner` settle with plaintexts). So this README ships an **ACL audit table** — every privacy claim mapped to a line of Solidity.

9/ Open source, 18 contract tests green, live on Sepolia, 3-pane demo (exchange / customer / auditor).

Built for the Zama Developer Program Builder Track.

🔗 Demo: <URL>
📦 Code: <github>
🎥 3-min pitch: <video>

---

# Hashtags / mentions to consider
@zama_fhe · #FHE · #FHVM · #Ethereum · #Privacy · #ProofOfReserves
