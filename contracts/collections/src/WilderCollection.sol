// SPDX-License-Identifier: MIT
pragma solidity 0.8.38;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ICollectionSettlement, IValidatedProduction} from "./interfaces/IProduction.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {SettlementRegistry} from "./SettlementRegistry.sol";

/// @notice New editions only. Existing legacy ownership is never a mint entitlement.
abstract contract WilderCollection is ERC721, AccessControl, ReentrancyGuard, ICollectionSettlement {
    bytes32 public constant CONFIG_ROLE = keccak256("CONFIG_ROLE");
    bytes32 public constant FULFILLER_ROLE = keccak256("FULFILLER_ROLE");
    bytes32 public constant PRODUCTION_ROLE = keccak256("PRODUCTION_ROLE");

    enum ItemKind { None, Vehicle, RimSet, Clothing, Totem, Furniture }
    struct Product {
        bytes32 sourceIdHash;
        uint64 cap;
        uint64 minted;
        ItemKind kind;
    }
    struct Edition {
        bytes32 productId;
        bytes32 colorwayId;
        uint64 cap;
        uint64 minted;
        string metadataURI;
    }

    mapping(bytes32 => Product) public products;
    mapping(bytes32 => Edition) public editions;
    mapping(uint256 => bytes32) public tokenEdition;
    // One namespace for purchase AND production, not per caller or route.
    mapping(bytes32 => bool) public usedSettlements;
    uint256 public nextTokenId = 1;
    SettlementRegistry public immutable settlementRegistry;

    error InvalidConfiguration();
    error AlreadyConfigured();
    error UnknownEdition();
    error SettlementUsed();
    error SupplyCapReached();
    error TokenInUse();
    error OwnerRequired();

    event ProductApproved(bytes32 indexed productId, bytes32 sourceIdHash, ItemKind kind, uint64 cap);
    event EditionApproved(bytes32 indexed editionId, bytes32 indexed productId, bytes32 colorwayId, uint64 cap, string metadataURI);
    event SettlementMinted(bytes32 indexed settlementId, uint256 indexed tokenId, bytes32 indexed editionId, address recipient, bool production);

    constructor(string memory name_, string memory symbol_, address admin, address registry) ERC721(name_, symbol_) {
        if (admin == address(0) || registry.code.length == 0) revert InvalidConfiguration();
        settlementRegistry = SettlementRegistry(registry);
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(CONFIG_ROLE, admin);
    }

    function approveProduct(bytes32 productId, bytes32 sourceIdHash, ItemKind kind, uint64 cap)
        external onlyRole(CONFIG_ROLE)
    {
        if (productId == bytes32(0) || sourceIdHash == bytes32(0) || cap == 0 || !_supportsKind(kind)) {
            revert InvalidConfiguration();
        }
        if (products[productId].cap != 0) revert AlreadyConfigured();
        products[productId] = Product(sourceIdHash, cap, 0, kind);
        emit ProductApproved(productId, sourceIdHash, kind, cap);
    }

    function approveEdition(bytes32 editionId, bytes32 productId, bytes32 colorwayId, uint64 cap, string calldata uri)
        external onlyRole(CONFIG_ROLE)
    {
        Product storage product = products[productId];
        if (editionId == bytes32(0) || product.cap == 0 || colorwayId == bytes32(0) || cap == 0 || cap > product.cap || bytes(uri).length == 0) {
            revert InvalidConfiguration();
        }
        if (editions[editionId].cap != 0) revert AlreadyConfigured();
        editions[editionId] = Edition(productId, colorwayId, cap, 0, uri);
        emit EditionApproved(editionId, productId, colorwayId, cap, uri);
    }

    function settlePurchase(bytes32 settlementId, bytes32 editionId, address recipient)
        external onlyRole(FULFILLER_ROLE) nonReentrant returns (uint256)
    { return _settle(settlementId, editionId, recipient, false); }

    function settleProduction(bytes32 settlementId, bytes32 editionId, address recipient)
        external onlyRole(PRODUCTION_ROLE) nonReentrant returns (uint256)
    { return _settle(settlementId, editionId, recipient, true); }

    function _settle(bytes32 settlementId, bytes32 editionId, address recipient, bool production) private returns (uint256 tokenId) {
        if (settlementId == bytes32(0) || recipient == address(0)) revert InvalidConfiguration();
        if (usedSettlements[settlementId]) revert SettlementUsed();
        Edition storage edition = editions[editionId];
        if (edition.cap == 0) revert UnknownEdition();
        Product storage product = products[edition.productId];
        if (edition.minted >= edition.cap || product.minted >= product.cap) revert SupplyCapReached();
        settlementRegistry.consume(settlementId);
        usedSettlements[settlementId] = true;
        ++edition.minted;
        ++product.minted;
        tokenId = nextTokenId++;
        tokenEdition[tokenId] = editionId;
        // All identity, cap and replay state is set before the ERC721 receiver callback.
        _safeMint(recipient, tokenId);
        emit SettlementMinted(settlementId, tokenId, editionId, recipient, production);
    }

    function editionProduct(bytes32 editionId) external view returns (bytes32) { return editions[editionId].productId; }
    function tokenProduct(uint256 tokenId) public view returns (bytes32) {
        _requireOwned(tokenId);
        return editions[tokenEdition[tokenId]].productId;
    }
    function tokenKind(uint256 tokenId) public view returns (ItemKind) { return products[tokenProduct(tokenId)].kind; }
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return editions[tokenEdition[tokenId]].metadataURI;
    }

    // Production must go through a validating contract, never directly through an EOA.
    function grantRole(bytes32 role, address account) public override {
        if (role == PRODUCTION_ROLE && (account.code.length == 0 || !IERC165(account).supportsInterface(type(IValidatedProduction).interfaceId))) revert InvalidConfiguration();
        super.grantRole(role, account);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, AccessControl) returns (bool) {
        return interfaceId == type(ICollectionSettlement).interfaceId || super.supportsInterface(interfaceId);
    }
    function _supportsKind(ItemKind kind) internal pure virtual returns (bool);
}
