// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, euint64, ebool, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {AuditorCredential} from "./AuditorCredential.sol";

/**
 * @title  ProofOfReserves
 * @notice Confidential solvency proofs on Zama Protocol.
 *
 *         An exchange proves `sum(customerBalances) >= claimedLiabilities`
 *         WITHOUT revealing any individual customer balance:
 *
 *           1. Exchange off-chain signs + encrypts each customer's balance
 *              (the encrypted ciphertext + a signature over it).
 *           2. Customers submit (ciphertext, proof, signature) on-chain. The
 *              contract verifies the exchange's signature and homomorphically
 *              adds the ciphertext to a running encrypted total.
 *           3. After the attestation window closes, an ACCREDITED auditor calls
 *              `requestReveal()`. The contract computes the encrypted solvency
 *              bit `ge(total, claimedLiabilities)`, marks the 1-bit verdict as
 *              PUBLICLY decryptable, and grants THAT auditor alone handle-access
 *              to the aggregate total via `FHE.allow(total, auditor)`.
 *           4. The verdict is threshold-decrypted publicly and verified on-chain
 *              in `fulfillVerdict()`. The aggregate total is NEVER revealed
 *              on-chain: the auditor reads it off-chain via the EIP-712
 *              user-decryption flow (`userDecrypt`).
 *
 *         COMPOSABLE PRIVACY (Zama Season 3 theme). Decryption rights are split:
 *           - The 1-bit solvency VERDICT is a public good — anyone can learn
 *             whether the exchange is solvent.
 *           - The aggregate reserve TOTAL is commercially sensitive — only an
 *             auditor holding an `AuditorCredential` (ERC-721, soulbound) may
 *             decrypt it, and only off-chain via EIP-712 user-decryption. The
 *             grant is composed from the credential: `requestReveal` checks
 *             `auditorCredential.balanceOf(msg.sender) > 0` before calling
 *             `FHE.allow(encryptedTotal, msg.sender)`.
 *
 *         TRUST MODEL — no operator is ever in the trust path:
 *           - Individual customer balances are NEVER decryptable by anyone
 *             (ACL: `allowThis` only). They are only ever homomorphically summed.
 *           - The aggregate total is decryptable ONLY by an accredited auditor,
 *             off-chain; it is never settled as plaintext on-chain.
 *           - The solvency VERDICT is the only plaintext ever written on-chain,
 *             and it is computed on-chain over ciphertexts (`FHE.ge`); the
 *             operator cannot influence it. This is the difference vs. the
 *             predecessor "SealedBid" design which settled with operator-
 *             supplied plaintexts.
 */
contract ProofOfReserves is ZamaEthereumConfig {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    struct Epoch {
        uint64 claimedLiabilities;
        uint64 deadline;
        address token; // the confidential token (e.g. cUSDC) this epoch is denominated in
        uint8 decimals; // token decimals, for off-chain display only
        euint64 encryptedTotal;
        ebool encryptedSolvent;
        bool solvent;
        bool revealed; // requestReveal() called by an accredited auditor
        bool fulfilled; // public verdict decryption stored
        address auditor; // the auditor who drove requestReveal (may decrypt total off-chain)
        uint256 attestationCount;
    }

    /**
     * @notice A fraud challenge: a whistleblower asserts the exchange signed two
     *         ciphertexts that encrypt DIFFERENT values for the same customer in
     *         the same epoch. The "differ" bit is computed under FHE so neither
     *         balance is revealed; only the 1-bit inequality result is public.
     */
    struct FraudChallenge {
        address challenger;
        address customer;
        ebool encryptedDiffer; // FHE.ne(encA, encB)
        bool fulfilled; // public decryption callback completed
        bool fraudProven; // fulfilled AND differ == true
    }

    /// @notice On-chain admin that creates epochs (hot wallet).
    address public immutable exchangeAdmin;
    /// @notice Off-chain key that signs each balance attestation (cold key).
    address public immutable exchangeSigner;
    /// @notice Soulbound ERC-721 credential. Only its holders may drive
    ///         `requestReveal` and decrypt an epoch's aggregate total.
    AuditorCredential public immutable auditorCredential;

    uint256 public nextEpochId;

    mapping(uint256 => Epoch) private _epochs;
    /// @notice Prevents the same (epoch, customer, ciphertext) from being submitted twice.
    mapping(bytes32 => bool) public attestationUsed;

    /// @notice Open fraud challenges, keyed by keccak256(abi.encodePacked(epochId, customer)).
    mapping(bytes32 => FraudChallenge) private _challenges;

    /// @notice An epoch flagged fraudulent via a successful challenge. Its solvency
    ///         result is then considered invalid.
    mapping(uint256 => bool) public epochFraudulent;

    event EpochCreated(
        uint256 indexed epochId,
        address indexed token,
        uint64 claimedLiabilities,
        uint64 deadline,
        uint8 decimals
    );
    event AttestationRegistered(uint256 indexed epochId, address indexed customer, bytes32 indexed attHash);
    event RevealRequested(uint256 indexed epochId, address indexed auditor);
    /// @notice The aggregate total handle was ACL-granted to an auditor for off-chain
    ///         EIP-712 user-decryption. The plaintext is never written on-chain.
    event TotalAccessGranted(uint256 indexed epochId, address indexed auditor);
    /// @notice The 1-bit solvency verdict was publicly decrypted and stored.
    event VerdictFulfilled(uint256 indexed epochId, bool solvent);
    event ChallengeSubmitted(uint256 indexed epochId, address indexed customer, address indexed challenger);
    event FraudProven(uint256 indexed epochId, address indexed customer, address indexed challenger);
    event ChallengeRejected(uint256 indexed epochId, address indexed customer);

    error EpochNotFound();
    error EpochNotOpen();
    error EpochNotClosed();
    error NotRevealed();
    error NotFulfilled();
    error AlreadyFulfilled();
    error AlreadyChallenged();
    error AttestationAlreadyUsed();
    error InvalidSignature();
    error NotExchangeAdmin();
    error NotAnAuditor();
    error HandleMismatch();
    error ZeroAddress();
    error ZeroToken(); // createEpoch requires a non-zero token denomination

    modifier onlyExchangeAdmin() {
        if (msg.sender != exchangeAdmin) revert NotExchangeAdmin();
        _;
    }

    constructor(address _exchangeAdmin, address _exchangeSigner, address _auditorCredential) {
        if (_exchangeAdmin == address(0) || _exchangeSigner == address(0) || _auditorCredential == address(0)) {
            revert ZeroAddress();
        }
        exchangeAdmin = _exchangeAdmin;
        exchangeSigner = _exchangeSigner;
        auditorCredential = AuditorCredential(_auditorCredential);
    }

    // -------------------------------------------------------------------------------------------
    // Epoch lifecycle
    // -------------------------------------------------------------------------------------------

    /**
     * @notice Publish a new attestation window. Only the exchange admin may do this,
     *         since `claimedLiabilities` is the exchange's own solvency claim.
     * @param token           The confidential token (e.g. cUSDC) this epoch is
     *                        denominated in. Bound into the attestation hash so a
     *                        cUSDC attestation cannot be replayed as a cUSDT one.
     * @param decimals        Token decimals (display-only; the contract arithmetic
     *                        is unit-agnostic).
     */
    function createEpoch(
        address token,
        uint8 decimals,
        uint64 claimedLiabilities,
        uint64 windowSeconds
    ) external onlyExchangeAdmin returns (uint256 epochId) {
        if (token == address(0)) revert ZeroToken();
        unchecked {
            epochId = nextEpochId;
            ++nextEpochId;
        }
        Epoch storage e = _epochs[epochId];
        e.token = token;
        e.decimals = decimals;
        e.claimedLiabilities = claimedLiabilities;
        e.deadline = uint64(block.timestamp) + windowSeconds;

        // Initialize the encrypted running total to an encrypted zero.
        euint64 zero = FHE.asEuint64(0);
        FHE.allowThis(zero);
        e.encryptedTotal = zero;

        emit EpochCreated(epochId, token, claimedLiabilities, e.deadline, decimals);
    }

    /**
     * @notice Submit an exchange-signed encrypted balance attestation.
     *
     * @param encryptedBalance Client-encrypted balance (produced by the exchange CLI).
     * @param inputProof       FHEVM proof tying the ciphertext to a known plaintext.
     * @param signature        exchangeSigner's EIP-191 signature over the attestation hash.
     *
     * @dev ACL discipline (anti-pattern from SealedBid autopsy): the individual
     *      balance ciphertext receives `allowThis` ONLY — never `allow(operator)`.
     *      It is therefore permanently undecryptable by anyone; it can only be
     *      homomorphically added into the aggregate.
     */
    function registerAttestation(
        uint256 epochId,
        externalEuint64 encryptedBalance,
        bytes calldata inputProof,
        bytes calldata signature
    ) external {
        Epoch storage e = _epochs[epochId];
        if (e.deadline == 0) revert EpochNotFound();
        if (block.timestamp >= e.deadline) revert EpochNotOpen();

        // The exchange commits to the exact ciphertext + customer + epoch + token off-chain.
        bytes32 attHash = _hashAttestation(epochId, e.token, msg.sender, encryptedBalance, e.deadline);
        if (attestationUsed[attHash]) revert AttestationAlreadyUsed();

        bytes32 ethSigned = MessageHashUtils.toEthSignedMessageHash(attHash);
        if (ethSigned.recover(signature) != exchangeSigner) revert InvalidSignature();

        attestationUsed[attHash] = true;
        ++e.attestationCount;

        euint64 enc = FHE.fromExternal(encryptedBalance, inputProof);
        FHE.allowThis(enc); // contract-only ACL — individual balance stays private forever

        e.encryptedTotal = FHE.add(e.encryptedTotal, enc);
        FHE.allowThis(e.encryptedTotal);

        emit AttestationRegistered(epochId, msg.sender, attHash);
    }

    /**
     * @notice After the window closes, an ACCREDITED auditor computes the
     *         encrypted solvency bit on-chain. The 1-bit VERDICT is marked
     *         publicly decryptable; the aggregate TOTAL is ACL-granted to that
     *         auditor alone (off-chain EIP-712 user-decryption).
     *
     *         Composable privacy: decryption rights are composed from the
     *         caller's `AuditorCredential` (ERC-721). A non-accredited caller
     *         is rejected before any FHE work happens.
     *
     *         This is the trustless core: the contract decides solvency over
     *         ciphertexts; no operator supplies a plaintext result.
     */
    function requestReveal(uint256 epochId) external {
        Epoch storage e = _epochs[epochId];
        if (e.deadline == 0) revert EpochNotFound();
        if (block.timestamp < e.deadline) revert EpochNotClosed();
        if (e.revealed) revert AlreadyFulfilled();

        // Composition gate: only an accredited auditor may drive the reveal.
        if (auditorCredential.balanceOf(msg.sender) == 0) revert NotAnAuditor();

        e.encryptedSolvent = FHE.ge(e.encryptedTotal, FHE.asEuint64(e.claimedLiabilities));

        // The 1-bit verdict is a public good — anyone may learn solvency.
        FHE.makePubliclyDecryptable(e.encryptedSolvent);

        // The aggregate total is commercially sensitive — grant THIS auditor
        // alone handle-access for off-chain EIP-712 user-decryption. The total
        // is never settled as plaintext on-chain.
        FHE.allow(e.encryptedTotal, msg.sender);

        e.auditor = msg.sender;
        e.revealed = true;
        emit RevealRequested(epochId, msg.sender);
        emit TotalAccessGranted(epochId, msg.sender);
    }

    /**
     * @notice Public-decryption callback for the 1-bit solvency VERDICT. Verifies
     *         the KMS threshold signature and stores the boolean on-chain.
     *         Callable by anyone (a keeper, the auditor UI, etc.).
     *
     *         Note: only the verdict (1 bit) is decrypted here. The aggregate
     *         total stays encrypted on-chain forever; the auditor reads it
     *         off-chain via EIP-712 user-decryption.
     *
     * @param handlesList         [encryptedSolvent] single handle.
     * @param abiEncodedCleartexts abi.encode(bool solvent).
     * @param decryptionProof     KMS public-decryption proof.
     */
    function fulfillVerdict(
        uint256 epochId,
        bytes32[] calldata handlesList,
        bytes calldata abiEncodedCleartexts,
        bytes calldata decryptionProof
    ) external {
        Epoch storage e = _epochs[epochId];
        if (!e.revealed) revert NotRevealed();
        if (e.fulfilled) revert AlreadyFulfilled();

        bytes32 solventHandle = ebool.unwrap(e.encryptedSolvent);
        if (handlesList.length != 1 || handlesList[0] != solventHandle) {
            revert HandleMismatch();
        }

        // Reverts if KMS signatures are invalid.
        FHE.checkSignatures(handlesList, abiEncodedCleartexts, decryptionProof);

        bool solvent = abi.decode(abiEncodedCleartexts, (bool));
        e.solvent = solvent;
        e.fulfilled = true;

        emit VerdictFulfilled(epochId, solvent);
    }

    // -------------------------------------------------------------------------------------------
    // Fraud challenges (conflicting-attestation proof)
    // -------------------------------------------------------------------------------------------

    /**
     * @notice Submit a fraud challenge: the customer asserts the exchange signed
     *         two ciphertexts encrypting DIFFERENT values for them in one epoch.
     *
     *         The contract verifies BOTH exchange signatures, materializes both
     *         ciphertexts on-chain (the FHEVM input proof is bound to
     *         `msg.sender`, so only the aggrieved customer can do this — a
     *         privacy feature), and computes the encrypted inequality bit
     *         `differ = FHE.ne(encA, encB)`. That bit is marked publicly
     *         decryptable; `fulfillChallenge()` reveals whether the values truly
     *         differ (fraud) or coincide (re-encryption, not fraud).
     *
     * @dev ACL discipline (AGENTS.md rule 2): the two challenge ciphertexts receive
     *      `allowThis` ONLY — never decryptable. Only the 1-bit `differ` result is
     *      ever revealed. Neither balance leaks, even during a challenge.
     */
    function challengeConflictingAttestation(
        uint256 epochId,
        externalEuint64 ciphertextA,
        bytes calldata proofA,
        bytes calldata signatureA,
        externalEuint64 ciphertextB,
        bytes calldata proofB,
        bytes calldata signatureB
    ) external {
        Epoch storage e = _epochs[epochId];
        if (e.deadline == 0) revert EpochNotFound();
        address customer = msg.sender;

        bytes32 key = keccak256(abi.encodePacked(epochId, customer));
        if (_challenges[key].challenger != address(0)) revert AlreadyChallenged();

        // Verify both signatures bind (epochId, token, customer, ciphertext, deadline).
        bytes32 ethA = MessageHashUtils.toEthSignedMessageHash(
            _hashAttestation(epochId, e.token, customer, ciphertextA, e.deadline)
        );
        bytes32 ethB = MessageHashUtils.toEthSignedMessageHash(
            _hashAttestation(epochId, e.token, customer, ciphertextB, e.deadline)
        );
        if (ethA.recover(signatureA) != exchangeSigner) revert InvalidSignature();
        if (ethB.recover(signatureB) != exchangeSigner) revert InvalidSignature();

        // Materialize both ciphertexts on-chain (contract-only ACL).
        euint64 encA = FHE.fromExternal(ciphertextA, proofA);
        FHE.allowThis(encA);
        euint64 encB = FHE.fromExternal(ciphertextB, proofB);
        FHE.allowThis(encB);

        // Encrypted inequality. Same value (re-encryption) -> false. Different -> true (fraud).
        ebool differ = FHE.ne(encA, encB);
        FHE.makePubliclyDecryptable(differ);

        _challenges[key] = FraudChallenge({
            challenger: msg.sender,
            customer: customer,
            encryptedDiffer: differ,
            fulfilled: false,
            fraudProven: false
        });

        emit ChallengeSubmitted(epochId, customer, msg.sender);
    }

    /**
     * @notice Public-decryption callback for a challenge: reveals the `differ` bit.
     *         If true, the exchange signed two distinct balances for one customer
     *         in one epoch → the epoch is flagged fraudulent on-chain.
     */
    function fulfillChallenge(
        uint256 epochId,
        address customer,
        bytes32[] calldata handlesList,
        bytes calldata abiEncodedCleartexts,
        bytes calldata decryptionProof
    ) external {
        bytes32 key = keccak256(abi.encodePacked(epochId, customer));
        FraudChallenge storage c = _challenges[key];
        if (c.challenger == address(0)) revert EpochNotFound();
        if (c.fulfilled) revert AlreadyFulfilled();

        bytes32 differHandle = ebool.unwrap(c.encryptedDiffer);
        if (handlesList.length != 1 || handlesList[0] != differHandle) revert HandleMismatch();

        FHE.checkSignatures(handlesList, abiEncodedCleartexts, decryptionProof);
        bool differ = abi.decode(abiEncodedCleartexts, (bool));

        c.fulfilled = true;
        if (differ) {
            c.fraudProven = true;
            epochFraudulent[epochId] = true;
            emit FraudProven(epochId, customer, c.challenger);
        } else {
            emit ChallengeRejected(epochId, customer);
        }
    }

    // -------------------------------------------------------------------------------------------
    // Views
    // -------------------------------------------------------------------------------------------

    function getEpoch(
        uint256 epochId
    )
        external
        view
        returns (
            address token,
            uint8 decimals,
            uint64 claimedLiabilities,
            uint64 deadline,
            bool solvent,
            bool revealed,
            bool fulfilled,
            address auditor,
            uint256 attestationCount
        )
    {
        Epoch storage e = _epochs[epochId];
        return (
            e.token,
            e.decimals,
            e.claimedLiabilities,
            e.deadline,
            e.solvent,
            e.revealed,
            e.fulfilled,
            e.auditor,
            e.attestationCount
        );
    }

    /// @notice The auditor who drove `requestReveal` for an epoch (address(0) if
    ///         not yet revealed). Only this address holds the EIP-712
    ///         user-decryption grant for the aggregate total.
    function getAuditor(uint256 epochId) external view returns (address) {
        return _epochs[epochId].auditor;
    }

    function getEncryptedTotal(uint256 epochId) external view returns (euint64) {
        return _epochs[epochId].encryptedTotal;
    }

    function getEncryptedSolvent(uint256 epochId) external view returns (ebool) {
        return _epochs[epochId].encryptedSolvent;
    }

    function isSolvent(uint256 epochId) external view returns (bool) {
        if (!_epochs[epochId].fulfilled) revert NotFulfilled();
        return _epochs[epochId].solvent;
    }

    function isFraudulent(uint256 epochId) external view returns (bool) {
        return epochFraudulent[epochId];
    }

    function getChallenge(
        uint256 epochId,
        address customer
    ) external view returns (address challenger, bool fulfilled, bool fraudProven) {
        FraudChallenge storage c = _challenges[keccak256(abi.encodePacked(epochId, customer))];
        return (c.challenger, c.fulfilled, c.fraudProven);
    }

    function getChallengeDifferHandle(uint256 epochId, address customer) external view returns (ebool) {
        return _challenges[keccak256(abi.encodePacked(epochId, customer))].encryptedDiffer;
    }

    // -------------------------------------------------------------------------------------------
    // Internals
    // -------------------------------------------------------------------------------------------

    /**
     * @dev Attestation hash. The exchange CLI / frontend MUST reproduce this exactly
     *      when signing. Bindings: epochId (replay scope), token (denomination — a
     *      cUSDC attestation cannot be replayed as a cUSDT one), customer (who may
     *      submit), the ciphertext handle (prevents swapping in an inflated balance),
     *      and the deadline (window scope).
     *
     *      ⚠ There are TWO off-chain copies of this packing that MUST stay in sync:
     *        - packages/frontend/lib/attestation.ts (hashAttestation)
     *        - smart-contracts/test/ProofOfReserves.test.ts (signAttestation)
     *      A cross-copy sync test guards against drift.
     */
    function _hashAttestation(
        uint256 epochId,
        address token,
        address customer,
        externalEuint64 encryptedBalance,
        uint64 deadline
    ) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(epochId, token, customer, externalEuint64.unwrap(encryptedBalance), deadline)
            );
    }
}
