// SPDX-License-Identifier: MIT
pragma solidity 0.8.38;

import {WilderCollectionUpgradeable} from "./WilderCollectionUpgradeable.sol";

/// @notice One collection for complete vehicles and complete rim sets (not individual wheel parts).
contract WilderVehiclesUpgradeable is WilderCollectionUpgradeable {
    mapping(bytes32 => mapping(bytes32 => bool)) public approvedFitment;
    mapping(uint256 => uint256) public installedRims;
    mapping(uint256 => uint256) public installedOnVehicle;

    event FitmentApproved(bytes32 indexed vehicleProduct, bytes32 indexed rimSetProduct);
    event RimsInstalled(uint256 indexed vehicleTokenId, uint256 indexed rimSetTokenId, address indexed owner);
    event RimsRemoved(uint256 indexed vehicleTokenId, uint256 indexed rimSetTokenId, address indexed owner);

    function initialize(address admin, address registry, address governor) external initializer { __WilderCollection_init("Wilder: Vehicles", "WVEH", admin, registry, governor); }

    function approveFitment(bytes32 vehicleProduct, bytes32 rimSetProduct) external onlyRole(CONFIG_ROLE) {
        if (products[vehicleProduct].kind != ItemKind.Vehicle || products[rimSetProduct].kind != ItemKind.RimSet) revert InvalidConfiguration();
        if (approvedFitment[vehicleProduct][rimSetProduct]) revert AlreadyConfigured();
        approvedFitment[vehicleProduct][rimSetProduct] = true;
        emit FitmentApproved(vehicleProduct, rimSetProduct);
    }

    function installRims(uint256 vehicleTokenId, uint256 rimSetTokenId) external {
        if (ownerOf(vehicleTokenId) != msg.sender || ownerOf(rimSetTokenId) != msg.sender) revert OwnerRequired();
        if (tokenKind(vehicleTokenId) != ItemKind.Vehicle || tokenKind(rimSetTokenId) != ItemKind.RimSet ||
            !approvedFitment[tokenProduct(vehicleTokenId)][tokenProduct(rimSetTokenId)]) revert InvalidConfiguration();
        if (installedRims[vehicleTokenId] != 0 || installedOnVehicle[rimSetTokenId] != 0) revert TokenInUse();
        installedRims[vehicleTokenId] = rimSetTokenId;
        installedOnVehicle[rimSetTokenId] = vehicleTokenId;
        emit RimsInstalled(vehicleTokenId, rimSetTokenId, msg.sender);
    }

    // The current vehicle owner can always release an attachment; no server signature or admin is needed.
    function uninstallRims(uint256 vehicleTokenId) external {
        if (ownerOf(vehicleTokenId) != msg.sender) revert OwnerRequired();
        uint256 rimSetTokenId = installedRims[vehicleTokenId];
        if (rimSetTokenId == 0) revert InvalidConfiguration();
        delete installedRims[vehicleTokenId];
        delete installedOnVehicle[rimSetTokenId];
        emit RimsRemoved(vehicleTokenId, rimSetTokenId, msg.sender);
    }

    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        if (_ownerOf(tokenId) != address(0) && (installedRims[tokenId] != 0 || installedOnVehicle[tokenId] != 0)) revert TokenInUse();
        return super._update(to, tokenId, auth);
    }
    function _supportsKind(ItemKind kind) internal pure override returns (bool) { return kind == ItemKind.Vehicle || kind == ItemKind.RimSet; }
    function upgradeFamily() public pure override returns (bytes32) { return keccak256("WilderVehicles"); }
    // Append new storage only by consuming this reserved gap in the same inheritance layer.
    uint256[40] private __gap;
}
