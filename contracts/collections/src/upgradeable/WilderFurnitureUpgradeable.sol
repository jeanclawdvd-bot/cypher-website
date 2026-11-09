// SPDX-License-Identifier: MIT
pragma solidity 0.8.38;

import {AttestedUsageCollectionUpgradeable} from "./AttestedUsageCollectionUpgradeable.sol";

/// @notice Complete placed objects only. Location access must be verified by the authorized game attestor.
contract WilderFurnitureUpgradeable is AttestedUsageCollectionUpgradeable {
    function initialize(address admin, address registry, address governor) external initializer { __AttestedUsageCollection_init("Wilder: Furniture", "WFURN", admin, registry, governor); }
    function place(UsePermit calldata permit, address attestor, bytes calldata signature) external nonReentrant { _startUse(permit, attestor, signature); }
    function pickup(uint256 tokenId) external { _endUse(tokenId); }
    function _supportsKind(ItemKind kind) internal pure override returns (bool) { return kind == ItemKind.Furniture; }
    function upgradeFamily() public pure override returns (bytes32) { return keccak256("WilderFurniture"); }
    // Append new storage only by consuming this reserved gap in the same inheritance layer.
    uint256[40] private __gap;
}
