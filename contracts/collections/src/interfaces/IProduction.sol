// SPDX-License-Identifier: MIT
pragma solidity 0.8.38;

/// @dev Adapters must be explicitly granted PRODUCTION_ROLE in a target collection.
interface ICollectionSettlement {
    function editionProduct(bytes32 editionId) external view returns (bytes32);
    function settleProduction(bytes32 settlementId, bytes32 editionId, address recipient) external returns (uint256);
}

/// @dev Interface checks guard wiring mistakes. Governance must still verify the adapter implementation.
interface IValidatedProduction {
    function productionPolicy() external view returns (address blueprintApproval, address editionRights);
}

/// @dev Approval is a recipe authorization, NOT an edition or legacy mint license.
interface IBlueprintApproval {
    function isRecipeApproved(bytes32 recipeId, bytes32 recipeHash) external view returns (bool);
}

/// @dev Independent collection-specific edition rights. Must consume exactly one right atomically.
interface IEditionRights {
    function consumeProductionRight(address owner, address collection, bytes32 editionId, bytes32 recipeHash) external;
}

/// @dev Only whole-unit ERC20 resources registered by CONFIG_ROLE are supported.
interface IResourceInput {
    function decimals() external view returns (uint8);
    function burnFrom(address owner, uint256 amount) external;
}

/// @dev Components are burned as complete ERC1155 instances; their constituent resources are not burned again.
interface IComponentInput {
    function burn(address owner, uint256 id, uint256 amount) external;
}
