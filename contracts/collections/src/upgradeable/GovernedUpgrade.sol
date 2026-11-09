// SPDX-License-Identifier: MIT
pragma solidity 0.8.38;

import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";

/// @notice Governance-controlled UUPS boundary. Operational admins cannot grant themselves upgrade authority.
/// @dev The supplied governor must be a reviewed timelock/multisig contract. Code presence alone is not a governance audit.
abstract contract GovernedUpgrade is AccessControlUpgradeable, UUPSUpgradeable {
    bytes32 public constant UPGRADE_ROLE = keccak256("UPGRADE_ROLE");
    error InvalidGovernance();
    error IncompatibleUpgradeFamily();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function __GovernedUpgrade_init(address admin, address governor) internal onlyInitializing {
        if (admin == address(0) || governor == admin || governor.code.length == 0) revert InvalidGovernance();
        __AccessControl_init();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _setRoleAdmin(UPGRADE_ROLE, UPGRADE_ROLE);
        _grantRole(UPGRADE_ROLE, governor);
    }

    function upgradeFamily() public pure virtual returns (bytes32);

    function grantRole(bytes32 role, address account) public virtual override {
        if (role == UPGRADE_ROLE && account.code.length == 0) revert InvalidGovernance();
        super.grantRole(role, account);
    }

    function _authorizeUpgrade(address implementation) internal override onlyRole(UPGRADE_ROLE) {
        (bool success, bytes memory result) = implementation.staticcall(abi.encodeWithSignature("upgradeFamily()"));
        if (!success || result.length != 32 || abi.decode(result, (bytes32)) != upgradeFamily()) revert IncompatibleUpgradeFamily();
    }
}
