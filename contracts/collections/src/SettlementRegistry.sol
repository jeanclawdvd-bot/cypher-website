// SPDX-License-Identifier: MIT
pragma solidity 0.8.38;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {ICollectionSettlement} from "./interfaces/IProduction.sol";

/// @notice A single merchant settlement namespace across all three collections and both mint routes.
contract SettlementRegistry is AccessControl {
    bytes32 public constant COLLECTION_ROLE = keccak256("COLLECTION_ROLE");
    mapping(bytes32 => address) public consumedBy;
    error InvalidCollection();
    error InvalidSettlement();
    event SettlementConsumed(bytes32 indexed settlementId, address indexed collection);

    constructor(address admin) {
        if (admin == address(0)) revert InvalidCollection();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
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
}
