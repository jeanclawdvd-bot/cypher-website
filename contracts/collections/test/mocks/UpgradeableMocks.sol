// SPDX-License-Identifier: MIT
pragma solidity 0.8.38;

// Test-only proxy and timelock fixtures. No production authority or delay is selected here.
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {TimelockController} from "@openzeppelin/contracts/governance/TimelockController.sol";
import {WilderVehiclesUpgradeable} from "../../src/upgradeable/WilderVehiclesUpgradeable.sol";
import {WilderClothingUpgradeable} from "../../src/upgradeable/WilderClothingUpgradeable.sol";
import {WilderFurnitureUpgradeable} from "../../src/upgradeable/WilderFurnitureUpgradeable.sol";
import {SettlementRegistryUpgradeable} from "../../src/upgradeable/SettlementRegistryUpgradeable.sol";
import {ProductionSettlementUpgradeable} from "../../src/upgradeable/ProductionSettlementUpgradeable.sol";

contract LocalVehiclesV2 is WilderVehiclesUpgradeable { function version() external pure returns (uint256) { return 2; } }
contract LocalClothingV2 is WilderClothingUpgradeable { function version() external pure returns (uint256) { return 2; } }
contract LocalFurnitureV2 is WilderFurnitureUpgradeable { function version() external pure returns (uint256) { return 2; } }
contract LocalRegistryV2 is SettlementRegistryUpgradeable { function version() external pure returns (uint256) { return 2; } }
contract LocalProductionV2 is ProductionSettlementUpgradeable { function version() external pure returns (uint256) { return 2; } }
