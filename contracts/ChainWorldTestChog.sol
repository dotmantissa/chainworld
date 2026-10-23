// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @notice Unofficial testnet spinoff. No mainnet asset value or secure randomness is implied.
/// @dev Immutable manifest root commits ordered (copy id, original token id, original URI) leaves.
contract ChainWorldTestChog is ERC721Enumerable, ReentrancyGuard {
    error AlreadyClaimed();
    error SoldOut();
    error InvalidSource();
    error InvalidManifest();
    bytes32 public immutable manifestRoot;
    uint256 public immutable maxSupply;
    address public constant sourceCollection = 0xc96d31F8626c6D03Fae5dCD3d61e3FB9F4a73763;
    uint256 public constant sourceChainId = 143;
    mapping(address => bool) public hasClaimed;
    mapping(uint256 => bool) public sourceClaimed;
    mapping(uint256 => uint256) public sourceTokenId;
    mapping(uint256 => string) private _sourceURI;

    event Claimed(address indexed player, uint256 indexed tokenId, uint256 indexed originalTokenId);
    constructor(bytes32 root, uint256 supply) ERC721("Chain World Test Chog (Unofficial)", "CWCHOG") {
        if (root == bytes32(0) || supply == 0 || supply > 1969) revert InvalidManifest();
        manifestRoot = root;
        maxSupply = supply;
    }
    function claim(uint256 originalId, string calldata originalURI, bytes32[] calldata proof) external nonReentrant {
        if (hasClaimed[msg.sender]) revert AlreadyClaimed();
        uint256 id = totalSupply();
        if (id >= maxSupply) revert SoldOut();
        bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(id, originalId, originalURI))));
        if (sourceClaimed[originalId] || bytes(originalURI).length == 0 || !MerkleProof.verifyCalldata(proof, manifestRoot, leaf)) revert InvalidSource();
        hasClaimed[msg.sender] = true;
        sourceClaimed[originalId] = true;
        sourceTokenId[id] = originalId;
        _sourceURI[id] = originalURI;
        _safeMint(msg.sender, id);
        emit Claimed(msg.sender, id, originalId);
    }
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return _sourceURI[tokenId];
    }
}
