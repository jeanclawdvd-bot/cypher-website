// SPDX-License-Identifier: MIT
pragma solidity 0.8.38;

import {AttestedUsageCollection} from "./AttestedUsageCollection.sol";

/// @notice Complete placed objects only. Location access must be verified by the authorized game attestor.
contract WilderFurniture is AttestedUsageCollection {
    constructor(address admin, address registry) AttestedUsageCollection("Wilder: Furniture", "WFURN", admin, registry) {}
    function place(UsePermit calldata permit, address attestor, bytes calldata signature) external nonReentrant { _startUse(permit, attestor, signature); }
    function pickup(uint256 tokenId) external { _endUse(tokenId); }
    function _supportsKind(ItemKind kind) internal pure override returns (bool) { return kind == ItemKind.Furniture; }
}
