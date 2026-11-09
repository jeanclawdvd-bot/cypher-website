// SPDX-License-Identifier: MIT
pragma solidity 0.8.38;

import {AttestedUsageCollectionUpgradeable} from "./AttestedUsageCollectionUpgradeable.sol";

/// @notice Clothing and Totems are web sections within this same contract.
contract WilderClothingUpgradeable is AttestedUsageCollectionUpgradeable {
    function initialize(address admin, address registry, address governor) external initializer { __AttestedUsageCollection_init("Wilder: Clothing", "WCLTH", admin, registry, governor); }
    function equip(UsePermit calldata permit, address attestor, bytes calldata signature) external nonReentrant { _startUse(permit, attestor, signature); }
    function unequip(uint256 tokenId) external { _endUse(tokenId); }
    function _supportsKind(ItemKind kind) internal pure override returns (bool) { return kind == ItemKind.Clothing || kind == ItemKind.Totem; }
    function upgradeFamily() public pure override returns (bytes32) { return keccak256("WilderClothing"); }
    // Append new storage only by consuming this reserved gap in the same inheritance layer.
    uint256[40] private __gap;
}
