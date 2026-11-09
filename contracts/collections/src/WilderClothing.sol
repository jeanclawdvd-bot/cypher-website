// SPDX-License-Identifier: MIT
pragma solidity 0.8.38;

import {AttestedUsageCollection} from "./AttestedUsageCollection.sol";

/// @notice Clothing and Totems are web sections within this same contract.
contract WilderClothing is AttestedUsageCollection {
    constructor(address admin, address registry) AttestedUsageCollection("Wilder: Clothing", "WCLTH", admin, registry) {}
    function equip(UsePermit calldata permit, address attestor, bytes calldata signature) external nonReentrant { _startUse(permit, attestor, signature); }
    function unequip(uint256 tokenId) external { _endUse(tokenId); }
    function _supportsKind(ItemKind kind) internal pure override returns (bool) { return kind == ItemKind.Clothing || kind == ItemKind.Totem; }
}
