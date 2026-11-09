// SPDX-License-Identifier: MIT
pragma solidity 0.8.38;

import {GovernedUpgrade} from "./GovernedUpgrade.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {ICollectionSettlement} from "../interfaces/IProduction.sol";

/// @notice A single merchant settlement namespace across all three collections and both mint routes.
contract SettlementRegistryUpgradeable is GovernedUpgrade {
    bytes32 public constant COLLECTION_ROLE = keccak256("COLLECTION_ROLE");
    mapping(bytes32 => address) public consumedBy;
    error InvalidCollection();
    error InvalidSettlement();
    event SettlementConsumed(bytes32 indexed settlementId, address indexed collection);

    function initialize(address admin, address governor) external initializer {
        __GovernedUpgrade_init(admin, governor);
        if (admin == address(0)) revert InvalidCollection();
    }
    function grantRole(bytes32 role, address account) public override {
        if (role == COLLECTION_ROLE && (account.code.length == 0 || !IERC165(account).supportsInterface(type(ICollectionSettlement).interfaceId))) revert InvalidCollection();
        super.grantRole(role, account);
    }
    function consume(bytes32 settlementId) external onlyRole(COLLECTION_ROLE) {
        if (settlementId == bytes32(0) || consumedBy[settlementId] != address(0)) revert InvalidSettlement();
        consumedBy[settlementId] = msg.sender;
        emit SettlementConsumed(settlementId, msg.sender);
    }
    function upgradeFamily() public pure override returns (bytes32) { return keccak256("SettlementRegistry"); }
    // Append new storage only by consuming this reserved gap in the same inheritance layer.
    uint256[40] private __gap;
}
