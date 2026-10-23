// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/// @notice V2 token-bound directory. Snapshots are owner-reported display data, not game authority.
/// @dev A replacement deployment is required; the historical V1 address has a different ABI.
contract ChainWorldRegistry {
    error AlreadyRegistered();
    error NotTokenOwner();
    error NotRegistered();
    error InvalidZone();
    error InvalidMeterValue();
    error InvalidCollection();
    error InvalidPage();

    IERC721 public immutable chogContract;
    uint256 public totalRegistered;
    mapping(uint256 => bool) public isRegistered;
    mapping(uint256 => uint256) public tokenLot;
    mapping(uint256 => uint256) private _lotToken;
    mapping(uint256 => uint8) public currentZone;
    mapping(uint256 => uint16[6]) public meterSnapshot;
    mapping(uint256 => uint256) public snapshotAt;

    event Registered(address indexed player, uint256 indexed tokenId, uint256 lotId);
    event ZoneMoved(uint256 indexed tokenId, uint8 zoneId);
    event MetersSaved(uint256 indexed tokenId, uint16[6] meters, uint256 timestamp);

    constructor(address collection) {
        if (collection.code.length == 0) revert InvalidCollection();
        chogContract = IERC721(collection);
    }
    modifier onlyOwner(uint256 tokenId) {
        if (chogContract.ownerOf(tokenId) != msg.sender) revert NotTokenOwner();
        _;
    }
    function register(uint256 tokenId) external onlyOwner(tokenId) {
        if (isRegistered[tokenId]) revert AlreadyRegistered();
        uint256 lotId = totalRegistered++;
        isRegistered[tokenId] = true;
        tokenLot[tokenId] = lotId;
        _lotToken[lotId] = tokenId;
        emit Registered(msg.sender, tokenId, lotId);
    }
    function setZone(uint256 tokenId, uint8 zone) external onlyOwner(tokenId) {
        if (!isRegistered[tokenId]) revert NotRegistered();
        if (zone > 5) revert InvalidZone();
        currentZone[tokenId] = zone;
        emit ZoneMoved(tokenId, zone);
    }
    /// @param meters funds percent, hunger, energy, social, reputation, housing
    function saveMeterSnapshot(uint256 tokenId, uint16[6] calldata meters) external onlyOwner(tokenId) {
        if (!isRegistered[tokenId]) revert NotRegistered();
        if (meters[0] > 100 || meters[1] > 100 || meters[2] > 100 || meters[3] > 100 || meters[4] > 500 || meters[5] > 5) revert InvalidMeterValue();
        meterSnapshot[tokenId] = meters;
        snapshotAt[tokenId] = block.timestamp;
        emit MetersSaved(tokenId, meters, block.timestamp);
    }
    function getLot(uint256 lotId) public view returns (address owner, uint256 tokenId) {
        if (lotId >= totalRegistered) return (address(0), 0);
        tokenId = _lotToken[lotId];
        // Resolve current ownership. Transfers never duplicate or abandon the NFT's lot.
        try chogContract.ownerOf(tokenId) returns (address currentOwner) { owner = currentOwner; } catch {}
    }
    function getLots(uint256 start, uint256 count) external view returns (address[] memory owners, uint256[] memory tokenIds) {
        if (count > 36) revert InvalidPage();
        uint256 length = start >= totalRegistered ? 0 : totalRegistered - start;
        if (length > count) length = count;
        owners = new address[](length);
        tokenIds = new uint256[](length);
        for (uint256 i; i < length; ++i) (owners[i], tokenIds[i]) = getLot(start + i);
    }
    function getPlayer(uint256 tokenId) external view returns (bool registered, uint256 lot, uint8 zone, uint16[6] memory meters, uint256 updatedAt) {
        return (isRegistered[tokenId], tokenLot[tokenId], currentZone[tokenId], meterSnapshot[tokenId], snapshotAt[tokenId]);
    }
}
