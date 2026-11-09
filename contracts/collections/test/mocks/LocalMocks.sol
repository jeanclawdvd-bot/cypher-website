// SPDX-License-Identifier: MIT
pragma solidity 0.8.38;

// TEST FIXTURES ONLY. These unrestricted issuers/verifiers are deliberately unsuitable for deployment.
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {ERC1155Burnable} from "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {ERC1155Holder} from "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import {IERC1271} from "@openzeppelin/contracts/interfaces/IERC1271.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {IBlueprintApproval, IEditionRights} from "../../src/interfaces/IProduction.sol";

contract LocalResource is ERC20Burnable {
    constructor() ERC20("LOCAL FIXTURE RESOURCE", "LOCAL") {}
    function decimals() public pure override returns (uint8) { return 0; }
    function mint(address to, uint256 amount) external { _mint(to, amount); }
}
contract LocalFractionalResource is ERC20Burnable {
    constructor() ERC20("INVALID FRACTIONAL FIXTURE", "INVALID") {}
}
contract LocalComponents is ERC1155Burnable {
    constructor() ERC1155("local-fixture://components/{id}") {}
    function mint(address to, uint256 id, uint256 amount) external { _mint(to, id, amount, ""); }
}
contract LocalBlueprintApproval is IBlueprintApproval {
    mapping(bytes32 => bytes32) public approvedHash;
    function setApproved(bytes32 recipeId, bytes32 recipeHash) external { approvedHash[recipeId] = recipeHash; }
    function isRecipeApproved(bytes32 recipeId, bytes32 recipeHash) external view returns (bool) { return recipeHash != bytes32(0) && approvedHash[recipeId] == recipeHash; }
}
contract LocalEditionRights is IEditionRights {
    mapping(bytes32 => uint256) public rights;
    address public consumer;
    function setConsumer(address consumer_) external { consumer = consumer_; }
    function key(address owner, address collection, bytes32 editionId, bytes32 recipeHash) public pure returns (bytes32) { return keccak256(abi.encode(owner, collection, editionId, recipeHash)); }
    function grant(address owner, address collection, bytes32 editionId, bytes32 recipeHash, uint256 amount) external { rights[key(owner, collection, editionId, recipeHash)] = amount; }
    function consumeProductionRight(address owner, address collection, bytes32 editionId, bytes32 recipeHash) external {
        require(msg.sender == consumer, "WRONG_CONSUMER");
        bytes32 k = key(owner, collection, editionId, recipeHash);
        require(rights[k] != 0, "NO_EDITION_RIGHT");
        --rights[k];
    }
}
contract LocalReceiver is IERC721Receiver, ERC1155Holder {
    address public target;
    bytes public attack;
    bool public reject;
    bool public reentrySucceeded;
    function configure(address target_, bytes calldata attack_, bool reject_) external { target = target_; attack = attack_; reject = reject_; }
    function callTarget(address to, bytes calldata data) external returns (bytes memory) {
        (bool ok, bytes memory result) = to.call(data);
        if (!ok) assembly ("memory-safe") { revert(add(result, 32), mload(result)) }
        return result;
    }
    function onERC721Received(address, address, uint256, bytes calldata) external returns (bytes4) {
        if (target != address(0)) (reentrySucceeded,) = target.call(attack);
        require(!reject, "RECEIVER_REJECTS");
        return IERC721Receiver.onERC721Received.selector;
    }
}

contract LocalContractAttestor is IERC1271 {
    address public immutable signer;
    // Fixture modes: 0 checks ECDSA, 1 rejects, 2 reverts, 3 returns a deliberately malformed ABI value.
    uint8 public mode;
    constructor(address signer_) { signer = signer_; }
    function setMode(uint8 mode_) external { mode = mode_; }
    function isValidSignature(bytes32 digest, bytes calldata signature) external view returns (bytes4) {
        if (mode == 1) return 0xffffffff;
        require(mode != 2, "ATTESTOR_REVOKED");
        if (mode == 3) assembly ("memory-safe") { mstore(0, 0x1626ba7e) return(28, 4) }
        (address recovered, ECDSA.RecoverError error,) = ECDSA.tryRecover(digest, signature);
        return error == ECDSA.RecoverError.NoError && recovered == signer ? IERC1271.isValidSignature.selector : bytes4(0xffffffff);
    }
}
