// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

/**
 * @title  AuditorCredential
 * @notice Non-transferable ERC-721 credential (soulbound) that accredits a
 *         Proof-of-Reserves auditor.
 *
 *         Holding a credential is the on-chain precondition for being allowed
 *         to user-decrypt an epoch's aggregate reserve total — the
 *         `ProofOfReserves` contract reads `balanceOf(auditor) > 0` before it
 *         calls `FHE.allow(encryptedTotal, auditor)`.
 *
 *         This is the "composable privacy" seam for Zama Season 3: the right
 *         to decrypt commercially-sensitive reserve data is composed from a
 *         token-gated identity primitive rather than left open to anyone.
 *
 *         Design choices:
 *           - Soulbound: `_update` blocks every transfer except mint and burn,
 *             so an accreditation cannot be sold or moved. An auditor who loses
 *             standing is `revoke()`d (burnt) by the registrar.
 *           - Single registrar (`registrar`), set at construction. The registrar
 *             is expected to be the same `exchangeAdmin` that opens epochs, but
 *             is kept as an independent role so a PoR can later delegate
 *             accreditation to a DAO or standards body.
 *           - Enumerable so the frontend and the PoR contract can iterate the
 *             accredited set if ever needed.
 */
contract AuditorCredential is ERC721Enumerable {
    /// @notice The only account that may mint or revoke credentials.
    address public immutable registrar;

    uint256 private _nextId = 1;

    error NotRegistrar();
    error Soulbound();
    error ZeroAuditor();
    error AlreadyAccredited();

    event AuditorAccredited(address indexed auditor, uint256 indexed tokenId);
    event AuditorRevoked(address indexed auditor, uint256 indexed tokenId);

    constructor(address _registrar) ERC721("PoR Auditor Credential", "PoRA") {
        if (_registrar == address(0)) revert ZeroAuditor();
        registrar = _registrar;
    }

    // -------------------------------------------------------------------------------------------
    // Accreditation lifecycle
    // -------------------------------------------------------------------------------------------

    /**
     * @notice Accredit a new auditor. One credential per address (reverts if
     *         the auditor already holds one).
     * @return tokenId The minted credential id.
     */
    function accredit(address auditor) external returns (uint256 tokenId) {
        if (msg.sender != registrar) revert NotRegistrar();
        if (auditor == address(0)) revert ZeroAuditor();
        if (balanceOf(auditor) > 0) revert AlreadyAccredited();

        tokenId = _nextId++;
        _mint(auditor, tokenId);
        emit AuditorAccredited(auditor, tokenId);
    }

    /**
     * @notice Revoke an auditor's credential (burn). Callable only by the registrar.
     *         The auditor immediately loses decryption rights on any future
     *         `ProofOfReserves.requestReveal`.
     */
    function revoke(address auditor) external {
        if (msg.sender != registrar) revert NotRegistrar();
        uint256 tokenId = tokenOfAuditor(auditor);
        _burn(tokenId);
        emit AuditorRevoked(auditor, tokenId);
    }

    // -------------------------------------------------------------------------------------------
    // Views
    // -------------------------------------------------------------------------------------------

    /// @notice Whether an address currently holds a valid auditor credential.
    function isAuditor(address account) external view returns (bool) {
        return balanceOf(account) > 0;
    }

    /// @notice The credential token id held by an auditor (reverts if none).
    function tokenOfAuditor(address auditor) public view returns (uint256) {
        return tokenOfOwnerByIndex(auditor, 0);
    }

    // -------------------------------------------------------------------------------------------
    // Soulbound enforcement
    // -------------------------------------------------------------------------------------------

    /**
     * @dev Block all transfers (including operator-assisted and approval flows).
     *      Only the initial mint (`from == 0`) and burns (`to == 0`) are allowed.
     *      This keeps an accreditation bound to the address that was vetted.
     */
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) revert Soulbound();
        return super._update(to, tokenId, auth);
    }
}
