// SPDX-License-Identifier: MIT
pragma solidity 0.8.38;

import {EIP712Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";
import {SignatureChecker} from "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import {WilderCollectionUpgradeable} from "./WilderCollectionUpgradeable.sol";

/// @notice An authorized game attests current location/character eligibility; ownership alone is insufficient.
abstract contract AttestedUsageCollectionUpgradeable is WilderCollectionUpgradeable, EIP712Upgradeable {
    bytes32 public constant GAME_ATTESTOR_ROLE = keccak256("GAME_ATTESTOR_ROLE");
    bytes32 public constant USE_TYPEHASH = keccak256("Use(address owner,uint256 tokenId,bytes32 contextId,bytes32 eligibilityHash,uint256 nonce,uint256 ownershipVersion,uint64 deadline)");
    struct UsePermit {
        address owner;
        uint256 tokenId;
        bytes32 contextId;
        bytes32 eligibilityHash;
        uint256 nonce;
        uint256 ownershipVersion;
        uint64 deadline;
    }
    struct Usage { bytes32 contextId; bytes32 eligibilityHash; }
    mapping(uint256 => Usage) public usage;
    mapping(address => uint256) public usageNonces;
    // Prevent an old permit becoming valid again after a token leaves and returns to an owner.
    mapping(uint256 => uint256) public ownershipVersion;
    event UsageStarted(uint256 indexed tokenId, address indexed owner, bytes32 contextId, bytes32 eligibilityHash, uint256 nonce);
    event UsageEnded(uint256 indexed tokenId, address indexed owner, bytes32 contextId);
    error InvalidAttestation();

    function __AttestedUsageCollection_init(string memory name_, string memory symbol_, address admin, address registry, address governor) internal onlyInitializing {
        __WilderCollection_init(name_, symbol_, admin, registry, governor);
        __EIP712_init(name_, "1");
    }

    function _startUse(UsePermit calldata permit, address attestor, bytes calldata signature) internal {
        if (permit.owner != msg.sender || ownerOf(permit.tokenId) != msg.sender) revert OwnerRequired();
        if (usage[permit.tokenId].contextId != bytes32(0)) revert TokenInUse();
        if (permit.contextId == bytes32(0) || permit.eligibilityHash == bytes32(0) || permit.deadline < block.timestamp ||
            permit.nonce != usageNonces[msg.sender] || permit.ownershipVersion != ownershipVersion[permit.tokenId] || !hasRole(GAME_ATTESTOR_ROLE, attestor)) revert InvalidAttestation();
        bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(USE_TYPEHASH, permit.owner, permit.tokenId, permit.contextId,
            permit.eligibilityHash, permit.nonce, permit.ownershipVersion, permit.deadline)));
        if (!SignatureChecker.isValidSignatureNow(attestor, digest, signature)) revert InvalidAttestation();
        ++usageNonces[msg.sender];
        usage[permit.tokenId] = Usage(permit.contextId, permit.eligibilityHash);
        emit UsageStarted(permit.tokenId, msg.sender, permit.contextId, permit.eligibilityHash, permit.nonce);
    }

    function _endUse(uint256 tokenId) internal {
        if (ownerOf(tokenId) != msg.sender) revert OwnerRequired();
        bytes32 contextId = usage[tokenId].contextId;
        if (contextId == bytes32(0)) revert InvalidConfiguration();
        delete usage[tokenId];
        emit UsageEnded(tokenId, msg.sender, contextId);
    }

    // Owners can invalidate outstanding permits without interacting with a game service.
    function invalidateUsePermits(uint256 newNonce) external {
        if (newNonce <= usageNonces[msg.sender]) revert InvalidAttestation();
        usageNonces[msg.sender] = newNonce;
    }

    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        if (_ownerOf(tokenId) != address(0) && usage[tokenId].contextId != bytes32(0)) revert TokenInUse();
        address from = super._update(to, tokenId, auth);
        ++ownershipVersion[tokenId];
        return from;
    }
    // Append new storage only by consuming this reserved gap in the same inheritance layer.
    uint256[40] private __gap;
}
