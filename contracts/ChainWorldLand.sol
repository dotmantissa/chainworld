// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface ISourceChog { function sourceTokenId(uint256) external view returns(uint256); }

/// @notice NFT-bound estates in five virtual blockchain cities. No address-bound abandoned plots.
/// @dev A separate deployment/indexer is required before using this as game property authority.
contract ChainWorldLand is EIP712, ReentrancyGuard {
    using SafeERC20 for IERC20;
    error InvalidInput(); error NotOwner(); error Occupied(); error NotAdjacent();
    error InvalidProof(); error InvalidQuote(); error InvalidOffer(); error ProtectedHome(); error DisconnectedEstate();
    IERC721 public immutable residents;
    IERC20 public immutable currency;
    bytes32 public immutable rarityRoot;
    bool public immutable sourceMapped;
    address public immutable quoteSigner;
    address public immutable treasury;
    bytes32 public constant QUOTE_TYPEHASH=keccak256("LandQuote(uint256 residentId,uint8 city,uint32 district,uint8 x,uint8 y,uint256 amount,uint256 nonce,uint256 deadline)");
    struct Estate { bool registered; uint8 city; uint32 district; uint8 x; uint8 y; uint16 rank; uint64 plots; }
    struct Parcel { bool occupied; uint256 residentId; }
    struct Quote { uint256 residentId; uint8 city; uint32 district; uint8 x; uint8 y; uint256 amount; uint256 nonce; uint256 deadline; }
    enum OfferStatus { Pending, Accepted, Canceled, Rejected }
    struct Offer { uint256 buyer; uint256 seller; address depositor; uint8 city; uint32 district; uint8 x; uint8 y; uint256 amount; uint64 expiresAt; OfferStatus status; }
    mapping(uint256=>Estate) public estates;
    mapping(bytes32=>Parcel) public parcels;
    mapping(uint256=>uint256) public quoteNonce;
    mapping(uint256=>Offer) public offers;
    uint256 public nextOfferId=1;
    event HomeRegistered(uint256 indexed residentId,uint8 city,uint32 district,uint8 x,uint8 y,uint16 rank,uint64 plots);
    event ParcelBought(uint256 indexed residentId,bytes32 indexed parcel,uint256 amount);
    event OfferMade(uint256 indexed id,uint256 indexed buyer,uint256 indexed seller,uint256 amount,uint64 expiresAt);
    event OfferResolved(uint256 indexed id,OfferStatus status);

    constructor(address collection,address token,bytes32 ranks,bool mapped,address signer,address proceeds) EIP712("ChainWorldLand","1") {
        if(collection.code.length==0||token.code.length==0||ranks==bytes32(0)||signer==address(0)||proceeds==address(0))revert InvalidInput();
        residents=IERC721(collection);currency=IERC20(token);rarityRoot=ranks;sourceMapped=mapped;quoteSigner=signer;treasury=proceeds;
    }
    modifier onlyOwner(uint256 id) { if(residents.ownerOf(id)!=msg.sender)revert NotOwner();_; }
    function parcelKey(uint8 city,uint32 district,uint8 x,uint8 y) public pure returns(bytes32) { return keccak256(abi.encode(city,district,x,y)); }
    function _bit(uint8 x,uint8 y) private pure returns(uint64) { if(x>=8||y>=8)revert InvalidInput();return uint64(1)<<(x+8*y); }
    function _neighbors(uint64 mask) private pure returns(uint64) {
        return ((mask&0x7f7f7f7f7f7f7f7f)<<1)|((mask&0xfefefefefefefefe)>>1)|(mask<<8)|(mask>>8);
    }
    function _adjacent(Estate memory home,uint8 city,uint32 district,uint8 x,uint8 y) private pure {
        if(!home.registered||home.city!=city||home.district!=district||(_neighbors(_bit(x,y))&home.plots)==0)revert NotAdjacent();
    }
    function _claim(uint256 id,uint8 city,uint32 district,uint8 x,uint8 y) private {
        bytes32 key=parcelKey(city,district,x,y);
        if(parcels[key].occupied)revert Occupied();
        parcels[key]=Parcel(true,id);estates[id].plots|=_bit(x,y);
    }
    function registerHome(uint256 id,uint8 city,uint32 district,uint8 x,uint8 y,uint16 rank,bytes32[] calldata proof) external onlyOwner(id) {
        if(estates[id].registered||city>=5||rank==0||rank>1969)revert InvalidInput();
        uint256 originalId=sourceMapped?ISourceChog(address(residents)).sourceTokenId(id):id;
        bytes32 leaf=keccak256(bytes.concat(keccak256(abi.encode(originalId,rank))));
        if(!MerkleProof.verifyCalldata(proof,rarityRoot,leaf))revert InvalidProof();
        estates[id]=Estate(true,city,district,x,y,rank,0);
        _claim(id,city,district,x,y);
        // Same six rarity bands as the game. Larger starter estates require verified rarity.
        uint8 tier=rank<=50?5:rank<=200?4:rank<=500?3:rank<=900?2:rank<=1400?1:0;
        if(tier>=2)_claim(id,city,district,x+1,y);
        if(tier>=4)_claim(id,city,district,x,y+1);
        _emitHome(id);
    }
    function _emitHome(uint256 id) private { Estate memory h=estates[id];emit HomeRegistered(id,h.city,h.district,h.x,h.y,h.rank,h.plots); }
    function quoteDigest(Quote calldata q) public view returns(bytes32) {
        return _hashTypedDataV4(keccak256(abi.encode(QUOTE_TYPEHASH,q.residentId,q.city,q.district,q.x,q.y,q.amount,q.nonce,q.deadline)));
    }
    function buyAdjacent(Quote calldata q,uint256 maximum,bytes calldata signature) external nonReentrant onlyOwner(q.residentId) {
        if(q.amount==0||q.amount>maximum||q.deadline<block.timestamp||q.deadline>block.timestamp+5 minutes||q.nonce!=quoteNonce[q.residentId]||ECDSA.recover(quoteDigest(q),signature)!=quoteSigner)revert InvalidQuote();
        _adjacent(estates[q.residentId],q.city,q.district,q.x,q.y);
        _claim(q.residentId,q.city,q.district,q.x,q.y);
        quoteNonce[q.residentId]++;
        currency.safeTransferFrom(msg.sender,treasury,q.amount);
        emit ParcelBought(q.residentId,parcelKey(q.city,q.district,q.x,q.y),q.amount);
    }
    function makeOffer(uint256 buyer,uint8 city,uint32 district,uint8 x,uint8 y,uint256 amount,uint64 expiresAt) external nonReentrant onlyOwner(buyer) returns(uint256 id) {
        _adjacent(estates[buyer],city,district,x,y);
        Parcel memory parcel=parcels[parcelKey(city,district,x,y)];
        if(!parcel.occupied||parcel.residentId==buyer||amount==0||expiresAt<=block.timestamp||expiresAt>block.timestamp+7 days)revert InvalidOffer();
        id=nextOfferId++;
        offers[id]=Offer(buyer,parcel.residentId,msg.sender,city,district,x,y,amount,expiresAt,OfferStatus.Pending);
        uint256 beforeBalance=currency.balanceOf(address(this));
        currency.safeTransferFrom(msg.sender,address(this),amount);
        if(currency.balanceOf(address(this))-beforeBalance!=amount)revert InvalidInput();
        emit OfferMade(id,buyer,parcel.residentId,amount,expiresAt);
    }
    function acceptOffer(uint256 id) external nonReentrant {
        Offer storage offer=offers[id];
        if(id==0||id>=nextOfferId||offer.status!=OfferStatus.Pending||offer.expiresAt<block.timestamp)revert InvalidOffer();
        if(residents.ownerOf(offer.seller)!=msg.sender)revert NotOwner();
        // A burned buyer cannot receive land; its escrow remains refundable to its depositor.
        residents.ownerOf(offer.buyer);
        bytes32 key=parcelKey(offer.city,offer.district,offer.x,offer.y);
        if(!parcels[key].occupied||parcels[key].residentId!=offer.seller)revert InvalidOffer();
        Estate storage seller=estates[offer.seller];
        if(seller.x==offer.x&&seller.y==offer.y)revert ProtectedHome();
        _adjacent(estates[offer.buyer],offer.city,offer.district,offer.x,offer.y);
        uint64 remaining=seller.plots&~_bit(offer.x,offer.y);
        uint64 reached=_bit(seller.x,seller.y);
        while(true){uint64 next=(reached|_neighbors(reached))&remaining;if(next==reached)break;reached=next;}
        if(reached!=remaining)revert DisconnectedEstate();
        offer.status=OfferStatus.Accepted;seller.plots=remaining;
        estates[offer.buyer].plots|=_bit(offer.x,offer.y);
        parcels[key].residentId=offer.buyer;
        currency.safeTransfer(msg.sender,offer.amount);
        emit OfferResolved(id,OfferStatus.Accepted);
    }
    function refundOffer(uint256 id,bool reject) external nonReentrant {
        Offer storage offer=offers[id];
        if(id==0||id>=nextOfferId||offer.status!=OfferStatus.Pending)revert InvalidOffer();
        address buyer;
        try residents.ownerOf(offer.buyer)returns(address current){buyer=current;}catch{buyer=offer.depositor;}
        if(reject){if(residents.ownerOf(offer.seller)!=msg.sender)revert NotOwner();}
        else if(msg.sender!=buyer&&block.timestamp<=offer.expiresAt)revert NotOwner();
        offer.status=reject?OfferStatus.Rejected:OfferStatus.Canceled;
        currency.safeTransfer(buyer,offer.amount);
        emit OfferResolved(id,offer.status);
    }
    function parcelOwner(uint8 city,uint32 district,uint8 x,uint8 y) external view returns(address owner,uint256 residentId) {
        Parcel memory p=parcels[parcelKey(city,district,x,y)];
        if(!p.occupied)return(address(0),0);
        residentId=p.residentId;
        try residents.ownerOf(residentId)returns(address current){owner=current;}catch{}
    }
}
