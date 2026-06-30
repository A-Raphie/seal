import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ProofOfReserves, ProofOfReserves__factory } from "../types";

type Signers = {
  admin: HardhatEthersSigner; // exchange admin (creates epochs)
  exchangeSigner: HardhatEthersSigner; // off-chain attestation signer
  customer1: HardhatEthersSigner;
  customer2: HardhatEthersSigner;
  customer3: HardhatEthersSigner;
  nobody: HardhatEthersSigner;
};

const EPOCH_WINDOW = 3600; // 1 hour

/**
 * Reproduces the contract's `_hashAttestation` + EIP-191 signing exactly, so the
 * exchange CLI and the test share the same signature scheme.
 */
async function signAttestation(
  signer: HardhatEthersSigner,
  epochId: bigint,
  customer: string,
  handleBytes32: string | Uint8Array,
  deadline: bigint,
): Promise<string> {
  const handle = ethers.hexlify(handleBytes32);
  const packed = ethers.solidityPacked(
    ["uint256", "address", "bytes32", "uint64"],
    [epochId, customer, handle, deadline],
  );
  const rawHash = ethers.keccak256(packed);
  return signer.signMessage(ethers.getBytes(rawHash));
}

describe("ProofOfReserves", function () {
  let s: Signers;
  let por: ProofOfReserves;
  let porAddr: string;

  before(async () => {
    const all = await ethers.getSigners();
    s = {
      admin: all[0],
      exchangeSigner: all[1],
      customer1: all[2],
      customer2: all[3],
      customer3: all[4],
      nobody: all[5],
    };
  });

  async function deployFixture() {
    const f = (await ethers.getContractFactory("ProofOfReserves")) as ProofOfReserves__factory;
    por = await f.deploy(s.admin.address, s.exchangeSigner.address);
    await por.waitForDeployment();
    porAddr = await por.getAddress();
    return { por, porAddr };
  }

  async function createEpoch(
    liabilities: bigint,
    window = EPOCH_WINDOW,
  ): Promise<{ epochId: bigint; deadline: bigint }> {
    const tx = await por.connect(s.admin).createEpoch(liabilities, window);
    const receipt = await tx.wait();
    const event = receipt!.logs.map((l) => por.interface.parseLog(l)).find((p) => p && p.name === "EpochCreated");
    const epochId = event!.args.epochId;
    const deadline = event!.args.deadline;
    return { epochId, deadline };
  }

  /**
   * Encrypts `balance`, signs the attestation as the exchange, and submits on-chain
   * as `submitter` (usually the customer themselves).
   */
  async function submitAttestation(epochId: bigint, deadline: bigint, customer: HardhatEthersSigner, balance: bigint) {
    const enc = await fhevm.createEncryptedInput(porAddr, customer.address).add64(balance).encrypt();
    const handleBytes32 = enc.handles[0];
    const signature = await signAttestation(s.exchangeSigner, epochId, customer.address, handleBytes32, deadline);
    const tx = await por
      .connect(customer)
      .registerAttestation(epochId, handleBytes32, ethers.hexlify(enc.inputProof), signature);
    await tx.wait();
    return { handleBytes32, signature };
  }

  describe("deployment & access control", () => {
    beforeEach(async () => {
      await deployFixture();
    });

    it("records admin and signer", async () => {
      expect(await por.exchangeAdmin()).to.eq(s.admin.address);
      expect(await por.exchangeSigner()).to.eq(s.exchangeSigner.address);
    });

    it("rejects zero addresses", async () => {
      const f = (await ethers.getContractFactory("ProofOfReserves")) as ProofOfReserves__factory;
      await expect(f.deploy(ethers.ZeroAddress, s.exchangeSigner.address)).to.be.revertedWithCustomError(
        por,
        "ZeroAddress",
      );
    });

    it("non-admin cannot create an epoch", async () => {
      await expect(por.connect(s.nobody).createEpoch(1000, EPOCH_WINDOW)).to.be.revertedWithCustomError(
        por,
        "NotExchangeAdmin",
      );
    });
  });

  describe("single-epoch happy path (solvent)", () => {
    beforeEach(async () => {
      await deployFixture();
    });

    it("registers 3 attestations, reveals, and proves solvent=true", async () => {
      // Liabilities 1,000; real customer balances 400 + 350 + 300 = 1,050 >= 1,000
      const { epochId, deadline } = await createEpoch(1000n);
      await submitAttestation(epochId, deadline, s.customer1, 400n);
      await submitAttestation(epochId, deadline, s.customer2, 350n);
      await submitAttestation(epochId, deadline, s.customer3, 300n);

      const info = await por.getEpoch(epochId);
      expect(info.attestationCount).to.eq(3n);
      expect(info.revealed).to.eq(false);

      // Close the window.
      await time.increaseTo(Number(deadline) + 1);

      // Anyone requests reveal — computes encrypted solvent bit, marks public.
      await expect(por.connect(s.nobody).requestReveal(epochId))
        .to.emit(por, "RevealRequested")
        .withArgs(epochId, s.nobody.address);

      // Public decryption: total + solvent bit.
      const totalHandle = ethers.hexlify(await por.getEncryptedTotal(epochId));
      const solventHandle = ethers.hexlify(await por.getEncryptedSolvent(epochId));
      const result = await fhevm.publicDecrypt([totalHandle, solventHandle]);

      // Drive the on-chain callback — verifies KMS sigs, stores plaintext result.
      await expect(
        por
          .connect(s.nobody)
          .fulfillPublicDecryption(
            epochId,
            [totalHandle, solventHandle],
            result.abiEncodedClearValues,
            result.decryptionProof,
          ),
      ).to.emit(por, "PublicDecryptionFulfilled");

      const final = await por.getEpoch(epochId);
      expect(final.fulfilled).to.eq(true);
      expect(final.revealedTotal).to.eq(1050n); // 400 + 350 + 300
      expect(final.solvent).to.eq(true); // 1,050 >= 1,000
      expect(await por.isSolvent(epochId)).to.eq(true);
    });
  });

  describe("insolvent scenario", () => {
    beforeEach(async () => {
      await deployFixture();
    });

    it("proves solvent=false when total < liabilities", async () => {
      // Liabilities 10,000; balances 100 + 200 = 300 < 10,000
      const { epochId, deadline } = await createEpoch(10_000n);
      await submitAttestation(epochId, deadline, s.customer1, 100n);
      await submitAttestation(epochId, deadline, s.customer2, 200n);

      await time.increaseTo(Number(deadline) + 1);
      await por.requestReveal(epochId);

      const totalHandle = ethers.hexlify(await por.getEncryptedTotal(epochId));
      const solventHandle = ethers.hexlify(await por.getEncryptedSolvent(epochId));
      const result = await fhevm.publicDecrypt([totalHandle, solventHandle]);

      await por.fulfillPublicDecryption(
        epochId,
        [totalHandle, solventHandle],
        result.abiEncodedClearValues,
        result.decryptionProof,
      );

      expect((await por.getEpoch(epochId)).revealedTotal).to.eq(300n);
      expect(await por.isSolvent(epochId)).to.eq(false);
    });
  });

  describe("security: signature & replay", () => {
    beforeEach(async () => {
      await deployFixture();
    });

    it("rejects an attestation signed by a non-exchange key", async () => {
      const { epochId, deadline } = await createEpoch(1000n);
      const enc = await fhevm.createEncryptedInput(porAddr, s.customer1.address).add64(500n).encrypt();
      // Wrong signer (customer2 signs instead of the exchange).
      const badSig = await signAttestation(s.customer2, epochId, s.customer1.address, enc.handles[0], deadline);
      await expect(
        por.connect(s.customer1).registerAttestation(epochId, enc.handles[0], ethers.hexlify(enc.inputProof), badSig),
      ).to.be.revertedWithCustomError(por, "InvalidSignature");
    });

    it("rejects a replayed attestation (same ciphertext submitted twice)", async () => {
      const { epochId, deadline } = await createEpoch(1000n);
      const enc = await fhevm.createEncryptedInput(porAddr, s.customer1.address).add64(500n).encrypt();
      const sig = await signAttestation(s.exchangeSigner, epochId, s.customer1.address, enc.handles[0], deadline);
      await por.connect(s.customer1).registerAttestation(epochId, enc.handles[0], ethers.hexlify(enc.inputProof), sig);
      await expect(
        por.connect(s.customer1).registerAttestation(epochId, enc.handles[0], ethers.hexlify(enc.inputProof), sig),
      ).to.be.revertedWithCustomError(por, "AttestationAlreadyUsed");
    });

    it("rejects attestation submission after the window closes", async () => {
      const { epochId, deadline } = await createEpoch(1000n);
      await time.increaseTo(Number(deadline) + 1);
      const enc = await fhevm.createEncryptedInput(porAddr, s.customer1.address).add64(500n).encrypt();
      const sig = await signAttestation(s.exchangeSigner, epochId, s.customer1.address, enc.handles[0], deadline);
      await expect(
        por.connect(s.customer1).registerAttestation(epochId, enc.handles[0], ethers.hexlify(enc.inputProof), sig),
      ).to.be.revertedWithCustomError(por, "EpochNotOpen");
    });
  });

  describe("reveal guardrails", () => {
    beforeEach(async () => {
      await deployFixture();
    });

    it("cannot reveal before the window closes", async () => {
      const { epochId } = await createEpoch(1000n);
      await expect(por.requestReveal(epochId)).to.be.revertedWithCustomError(por, "EpochNotClosed");
    });

    it("cannot fulfill before requestReveal", async () => {
      const { epochId, deadline } = await createEpoch(1000n);
      await submitAttestation(epochId, deadline, s.customer1, 500n);
      await time.increaseTo(Number(deadline) + 1);
      await expect(
        por.fulfillPublicDecryption(epochId, [ethers.ZeroHash, ethers.ZeroHash], "0x", "0x"),
      ).to.be.revertedWithCustomError(por, "NotRevealed");
    });

    it("cannot fulfill twice", async () => {
      const { epochId, deadline } = await createEpoch(1000n);
      await submitAttestation(epochId, deadline, s.customer1, 500n);
      await time.increaseTo(Number(deadline) + 1);
      await por.requestReveal(epochId);

      const totalHandle = ethers.hexlify(await por.getEncryptedTotal(epochId));
      const solventHandle = ethers.hexlify(await por.getEncryptedSolvent(epochId));
      const result = await fhevm.publicDecrypt([totalHandle, solventHandle]);

      await por.fulfillPublicDecryption(
        epochId,
        [totalHandle, solventHandle],
        result.abiEncodedClearValues,
        result.decryptionProof,
      );
      await expect(
        por.fulfillPublicDecryption(
          epochId,
          [totalHandle, solventHandle],
          result.abiEncodedClearValues,
          result.decryptionProof,
        ),
      ).to.be.revertedWithCustomError(por, "AlreadyFulfilled");
    });

    it("rejects fulfill with mismatched handles", async () => {
      const { epochId, deadline } = await createEpoch(1000n);
      await submitAttestation(epochId, deadline, s.customer1, 500n);
      await time.increaseTo(Number(deadline) + 1);
      await por.requestReveal(epochId);

      const totalHandle = ethers.hexlify(await por.getEncryptedTotal(epochId));
      await expect(
        por.fulfillPublicDecryption(epochId, [totalHandle, ethers.ZeroHash], "0x", "0x"),
      ).to.be.revertedWithCustomError(por, "HandleMismatch");
    });
  });

  describe("multi-epoch isolation", () => {
    beforeEach(async () => {
      await deployFixture();
    });

    it("epochs are independent", async () => {
      const a = await createEpoch(1000n);
      const b = await createEpoch(500n);
      expect(a.epochId).to.eq(0n);
      expect(b.epochId).to.eq(1n);
      await submitAttestation(a.epochId, a.deadline, s.customer1, 1000n);
      await submitAttestation(b.epochId, b.deadline, s.customer2, 600n);
      expect((await por.getEpoch(a.epochId)).attestationCount).to.eq(1n);
      expect((await por.getEpoch(b.epochId)).attestationCount).to.eq(1n);
    });
  });

  describe("fraud challenge path", () => {
    beforeEach(async () => {
      await deployFixture();
    });

    // Build an attestation payload (ciphertext + proof + exchange signature) without submitting.
    async function makePayload(customer: HardhatEthersSigner, balance: bigint, epochId: bigint, deadline: bigint) {
      const enc = await fhevm.createEncryptedInput(porAddr, customer.address).add64(balance).encrypt();
      const signature = await signAttestation(s.exchangeSigner, epochId, customer.address, enc.handles[0], deadline);
      return {
        handle: ethers.hexlify(enc.handles[0]),
        inputProof: ethers.hexlify(enc.inputProof),
        signature,
      };
    }

    it("proves fraud when the exchange signs two DIFFERENT balances for one customer", async () => {
      const { epochId, deadline } = await createEpoch(1000n);
      const a = await makePayload(s.customer1, 100n, epochId, deadline);
      const b = await makePayload(s.customer1, 999n, epochId, deadline); // conflicting balance

      await expect(
        por
          .connect(s.customer1)
          .challengeConflictingAttestation(
            epochId,
            a.handle,
            a.inputProof,
            a.signature,
            b.handle,
            b.inputProof,
            b.signature,
          ),
      )
        .to.emit(por, "ChallengeSubmitted")
        .withArgs(epochId, s.customer1.address, s.customer1.address);

      // Public-decrypt the 1-bit "differ" result.
      const differHandle = ethers.hexlify(await por.getChallengeDifferHandle(epochId, s.customer1.address));
      const result = await fhevm.publicDecrypt([differHandle]);

      await expect(
        por
          .connect(s.nobody)
          .fulfillChallenge(
            epochId,
            s.customer1.address,
            [differHandle],
            result.abiEncodedClearValues,
            result.decryptionProof,
          ),
      )
        .to.emit(por, "FraudProven")
        .withArgs(epochId, s.customer1.address, s.customer1.address);

      const ch = await por.getChallenge(epochId, s.customer1.address);
      expect(ch.fraudProven).to.eq(true);
      expect(ch.fulfilled).to.eq(true);
      expect(await por.isFraudulent(epochId)).to.eq(true);
    });

    it("rejects the challenge when both ciphertexts encrypt the SAME value (re-encryption)", async () => {
      const { epochId, deadline } = await createEpoch(1000n);
      // Same balance, two independent encryptions -> distinct ciphertexts, same plaintext.
      const a = await makePayload(s.customer1, 500n, epochId, deadline);
      const b = await makePayload(s.customer1, 500n, epochId, deadline);
      expect(a.handle).to.not.eq(b.handle, "sanity: ciphertexts should differ");

      await por
        .connect(s.customer1)
        .challengeConflictingAttestation(
          epochId,
          a.handle,
          a.inputProof,
          a.signature,
          b.handle,
          b.inputProof,
          b.signature,
        );

      const differHandle = ethers.hexlify(await por.getChallengeDifferHandle(epochId, s.customer1.address));
      const result = await fhevm.publicDecrypt([differHandle]);

      await expect(
        por.fulfillChallenge(
          epochId,
          s.customer1.address,
          [differHandle],
          result.abiEncodedClearValues,
          result.decryptionProof,
        ),
      )
        .to.emit(por, "ChallengeRejected")
        .withArgs(epochId, s.customer1.address);

      const ch = await por.getChallenge(epochId, s.customer1.address);
      expect(ch.fraudProven).to.eq(false);
      expect(ch.fulfilled).to.eq(true);
      expect(await por.isFraudulent(epochId)).to.eq(false);
    });

    it("rejects a challenge with a non-exchange signature", async () => {
      const { epochId, deadline } = await createEpoch(1000n);
      const a = await makePayload(s.customer1, 100n, epochId, deadline);
      // Forge a second payload signed by the wrong key.
      const enc = await fhevm.createEncryptedInput(porAddr, s.customer1.address).add64(200n).encrypt();
      const badSig = await signAttestation(s.customer2, epochId, s.customer1.address, enc.handles[0], deadline);

      await expect(
        por
          .connect(s.customer1)
          .challengeConflictingAttestation(
            epochId,
            a.handle,
            a.inputProof,
            a.signature,
            ethers.hexlify(enc.handles[0]),
            ethers.hexlify(enc.inputProof),
            badSig,
          ),
      ).to.be.revertedWithCustomError(por, "InvalidSignature");
    });

    it("cannot challenge the same (epoch, customer) twice", async () => {
      const { epochId, deadline } = await createEpoch(1000n);
      const a = await makePayload(s.customer1, 100n, epochId, deadline);
      const b = await makePayload(s.customer1, 200n, epochId, deadline);

      await por
        .connect(s.customer1)
        .challengeConflictingAttestation(
          epochId,
          a.handle,
          a.inputProof,
          a.signature,
          b.handle,
          b.inputProof,
          b.signature,
        );

      await expect(
        por
          .connect(s.customer1)
          .challengeConflictingAttestation(
            epochId,
            a.handle,
            a.inputProof,
            a.signature,
            b.handle,
            b.inputProof,
            b.signature,
          ),
      ).to.be.revertedWithCustomError(por, "AlreadyChallenged");
    });
  });

  // ---------------------------------------------------------------------------
  // End-to-end validation of the one-key demo model that `scripts/setup.sh`
  // deploys (admin == signer == deployer). Proves the seed/reveal flow the
  // setup script runs is sound. Kept here (not a standalone script) because the
  // FHEVM mock coprocessor initializes within the mocha runner.
  // ---------------------------------------------------------------------------
  describe("one-key demo flow (setup.sh model)", () => {
    it("deploys admin==signer, seeds an epoch, reveals, and proves solvent", async () => {
      const f = (await ethers.getContractFactory("ProofOfReserves")) as ProofOfReserves__factory;
      // admin == exchangeSigner == deployer (the one-key model).
      por = await f.deploy(s.admin.address, s.admin.address);
      await por.waitForDeployment();
      porAddr = await por.getAddress();

      expect(await por.exchangeAdmin()).to.eq(s.admin.address);
      expect(await por.exchangeSigner()).to.eq(s.admin.address);

      const { epochId, deadline } = await createEpoch(1_000_000n);
      // In the one-key model the exchangeSigner IS admin, so sign with admin
      // (the shared submitAttestation helper hardcodes s.exchangeSigner).
      for (const [customer, balance] of [
        [s.customer1, 400_000n],
        [s.customer2, 350_000n],
        [s.customer3, 300_000n],
      ] as const) {
        const enc = await fhevm.createEncryptedInput(porAddr, customer.address).add64(balance).encrypt();
        const handle = enc.handles[0];
        const signature = await signAttestation(s.admin, epochId, customer.address, handle, deadline);
        const tx = await por
          .connect(customer)
          .registerAttestation(epochId, handle, ethers.hexlify(enc.inputProof), signature);
        await tx.wait();
      }

      await time.increaseTo(Number(deadline) + 1);
      await por.requestReveal(epochId);

      const totalHandle = await por.getEncryptedTotal(epochId);
      const solventHandle = await por.getEncryptedSolvent(epochId);
      const result = await fhevm.publicDecrypt([totalHandle, solventHandle]);
      await por.fulfillPublicDecryption(
        epochId,
        [totalHandle, solventHandle],
        result.abiEncodedClearValues,
        result.decryptionProof,
      );

      const info = await por.getEpoch(epochId);
      expect(info.attestationCount).to.eq(3n);
      expect(info.revealedTotal).to.eq(1_050_000n);
      expect(info.solvent).to.eq(true); // 1.05M >= 1M liabilities
    });
  });
});
