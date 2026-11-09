// SPDX-License-Identifier: MIT
pragma solidity 0.8.38;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import {ICollectionSettlement, IBlueprintApproval, IEditionRights, IResourceInput, IComponentInput, IValidatedProduction} from "./interfaces/IProduction.sol";

/// @notice Settlement only: no payment, timing oracle, legacy mint permission or automatic recipe publishing.
contract ProductionSettlement is AccessControl, ReentrancyGuard, IValidatedProduction {
    bytes32 public constant CONFIG_ROLE = keccak256("CONFIG_ROLE");
    bytes32 public constant SETTLER_ROLE = keccak256("SETTLER_ROLE");
    uint256 public constant MAX_INPUTS = 16;
    bytes32 public constant JOB_DOMAIN = keccak256("WILDER_PRODUCTION_JOB_V1");
    enum InputKind { None, Resource, Component }
    enum JobState { None, Authorized, Completed, Cancelled }
    struct Input { address token; uint256 id; uint256 amount; InputKind kind; }
    struct Recipe { address collection; bytes32 editionId; bytes32 recipeHash; bool exists; }
    struct Job { address owner; bytes32 recipeId; uint64 deadline; JobState state; }

    IBlueprintApproval public immutable blueprintApproval;
    IEditionRights public immutable editionRights;
    mapping(address => InputKind) public approvedInputs;
    mapping(bytes32 => Recipe) public recipes;
    mapping(bytes32 => Input[]) private _inputs;
    mapping(bytes32 => Job) public jobs;
    mapping(bytes32 => bool) public usedSettlements;

    error InvalidConfiguration();
    error AlreadyConfigured();
    error UnapprovedRecipe();
    error InvalidJob();
    event InputApproved(address indexed token, InputKind kind);
    event RecipeConfigured(bytes32 indexed recipeId, bytes32 indexed recipeHash, address collection, bytes32 editionId);
    event JobAuthorized(bytes32 indexed jobId, address indexed owner, bytes32 indexed recipeId, uint64 deadline);
    event JobCancelled(bytes32 indexed jobId);
    event ProductionCompleted(bytes32 indexed jobId, address indexed owner, address indexed collection, bytes32 editionId, uint256 tokenId);

    constructor(address admin, address blueprintApproval_, address editionRights_) {
        if (admin == address(0) || blueprintApproval_.code.length == 0 || editionRights_.code.length == 0 || blueprintApproval_ == editionRights_) revert InvalidConfiguration();
        blueprintApproval = IBlueprintApproval(blueprintApproval_);
        editionRights = IEditionRights(editionRights_);
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(CONFIG_ROLE, admin);
    }

    function productionPolicy() external view returns (address, address) { return (address(blueprintApproval), address(editionRights)); }
    function supportsInterface(bytes4 interfaceId) public view override returns (bool) {
        return interfaceId == type(IValidatedProduction).interfaceId || super.supportsInterface(interfaceId);
    }

    function approveInput(address token, InputKind kind) external onlyRole(CONFIG_ROLE) {
        if (approvedInputs[token] != InputKind.None) revert AlreadyConfigured();
        if (token.code.length == 0 || kind == InputKind.None) revert InvalidConfiguration();
        if (kind == InputKind.Resource && IResourceInput(token).decimals() != 0) revert InvalidConfiguration();
        if (kind == InputKind.Component && !IERC165(token).supportsInterface(type(IERC1155).interfaceId)) revert InvalidConfiguration();
        approvedInputs[token] = kind;
        emit InputApproved(token, kind);
    }

    function configureRecipe(bytes32 recipeId, address collection, bytes32 editionId, Input[] calldata inputs) external onlyRole(CONFIG_ROLE) {
        if (recipes[recipeId].exists) revert AlreadyConfigured();
        if (recipeId == bytes32(0) || collection.code.length == 0 || inputs.length == 0 || inputs.length > MAX_INPUTS ||
            !IERC165(collection).supportsInterface(type(ICollectionSettlement).interfaceId) ||
            ICollectionSettlement(collection).editionProduct(editionId) == bytes32(0)) revert InvalidConfiguration();
        for (uint256 i; i < inputs.length; ++i) {
            Input calldata input = inputs[i];
            if (input.amount == 0 || input.kind == InputKind.None || approvedInputs[input.token] != input.kind ||
                (input.kind == InputKind.Resource && input.id != 0)) revert InvalidConfiguration();
            for (uint256 j; j < i; ++j) {
                if (input.token == inputs[j].token && input.id == inputs[j].id) revert InvalidConfiguration();
            }
            _inputs[recipeId].push(input);
        }
        bytes32 recipeHash = keccak256(abi.encode(collection, editionId, inputs));
        // A local draft or mock CSV is never enough; an independent registry must approve the exact output and inputs.
        if (!blueprintApproval.isRecipeApproved(recipeId, recipeHash)) revert UnapprovedRecipe();
        recipes[recipeId] = Recipe(collection, editionId, recipeHash, true);
        emit RecipeConfigured(recipeId, recipeHash, collection, editionId);
    }

    function recipeInputs(bytes32 recipeId) external view returns (Input[] memory) { return _inputs[recipeId]; }

    // Explicit owner consent is bound to this job, exact immutable recipe and a deadline; token allowances alone are insufficient.
    function jobIdFor(address owner, bytes32 recipeId, bytes32 jobSalt) public view returns (bytes32) {
        return keccak256(abi.encode(JOB_DOMAIN, block.chainid, address(this), owner, recipeId, jobSalt));
    }

    function authorizeJob(bytes32 jobSalt, bytes32 recipeId, uint64 deadline) external returns (bytes32 jobId) {
        jobId = jobIdFor(msg.sender, recipeId, jobSalt);
        if (jobSalt == bytes32(0) || jobs[jobId].state != JobState.None || usedSettlements[jobId] || deadline <= block.timestamp) revert InvalidJob();
        Recipe storage recipe = recipes[recipeId];
        if (!recipe.exists || !blueprintApproval.isRecipeApproved(recipeId, recipe.recipeHash)) revert UnapprovedRecipe();
        jobs[jobId] = Job(msg.sender, recipeId, deadline, JobState.Authorized);
        emit JobAuthorized(jobId, msg.sender, recipeId, deadline);
    }

    function cancelJob(bytes32 jobId) external {
        Job storage job = jobs[jobId];
        if (job.owner != msg.sender || job.state != JobState.Authorized) revert InvalidJob();
        job.state = JobState.Cancelled;
        emit JobCancelled(jobId);
    }

    // SETTLER_ROLE attests game production completion. No public fee/time claims are inferred from proposal data.
    function settle(bytes32 jobId) external onlyRole(SETTLER_ROLE) nonReentrant returns (uint256 tokenId) {
        Job storage job = jobs[jobId];
        if (job.state != JobState.Authorized || job.deadline < block.timestamp || usedSettlements[jobId]) revert InvalidJob();
        Recipe storage recipe = recipes[job.recipeId];
        if (!blueprintApproval.isRecipeApproved(job.recipeId, recipe.recipeHash)) revert UnapprovedRecipe();
        usedSettlements[jobId] = true;
        job.state = JobState.Completed;
        // This is distinct from recipe approval, equipment ownership or any Trinity/legacy holding.
        editionRights.consumeProductionRight(job.owner, recipe.collection, recipe.editionId, recipe.recipeHash);
        Input[] storage inputs = _inputs[job.recipeId];
        for (uint256 i; i < inputs.length; ++i) {
            Input storage input = inputs[i];
            if (input.kind == InputKind.Resource) IResourceInput(input.token).burnFrom(job.owner, input.amount);
            else IComponentInput(input.token).burn(job.owner, input.id, input.amount);
        }
        // If any burn, right, cap, replay check or receiver fails, this entire cross-contract transaction rolls back.
        tokenId = ICollectionSettlement(recipe.collection).settleProduction(jobId, recipe.editionId, job.owner);
        emit ProductionCompleted(jobId, job.owner, recipe.collection, recipe.editionId, tokenId);
    }
}
