// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import {Test} from "forge-std/Test.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {ChainWorldRegistry} from "../ChainWorldRegistry.sol";
import {ChainWorldTestChog} from "../ChainWorldTestChog.sol";
contract TestNFT is ERC721 {
    constructor() ERC721("Test", "TEST") {}
    function mint(address to, uint256 id) external { _mint(to,id); }
}
contract ReentrantReceiver is IERC721Receiver {
    ChainWorldTestChog public nft;
    constructor(ChainWorldTestChog token) { nft=token; }
    function claim(uint256 id,string calldata uri,bytes32[] calldata proof) external { nft.claim(id,uri,proof); }
    function onERC721Received(address,address,uint256,bytes calldata) external returns(bytes4) {
        bytes32[] memory proof=new bytes32[](0);
        try nft.claim(12,"ipfs://source",proof) {} catch {}
        return IERC721Receiver.onERC721Received.selector;
    }
}
contract RejectingReceiver {
    function claim(ChainWorldTestChog token,uint256 id,string calldata uri,bytes32[] calldata proof) external { token.claim(id,uri,proof); }
}
contract RegistryTest is Test {
    TestNFT nft;
    ChainWorldRegistry registry;
    function setUp() public { nft=new TestNFT(); registry=new ChainWorldRegistry(address(nft)); }
    function test37thRegistrationPreservesEarlierLots() public {
        for(uint256 i;i<37;++i){address player=address(uint160(i+1));nft.mint(player,i);vm.prank(player);registry.register(i);}
        (address first,uint256 token)=registry.getLot(0);
        assertEq(first,address(1));assertEq(token,0);
        (address last,uint256 lastToken)=registry.getLot(36);
        assertEq(last,address(37));assertEq(lastToken,36);assertEq(registry.totalRegistered(),37);
        (address[] memory owners,uint256[] memory ids)=registry.getLots(36,36);
        assertEq(owners.length,1);assertEq(ids[0],36);
    }
    function testTransferRetainsLotAndDeniesPreviousOwner() public {
        nft.mint(address(this),0);registry.register(0);
        nft.transferFrom(address(this),address(7),0);
        (address owner,uint256 token)=registry.getLot(0);assertEq(owner,address(7));assertEq(token,0);
        vm.expectRevert(ChainWorldRegistry.NotTokenOwner.selector);registry.setZone(0,2);
        vm.prank(address(7));registry.setZone(0,2);
        vm.prank(address(7));vm.expectRevert(ChainWorldRegistry.AlreadyRegistered.selector);registry.register(0);
        assertEq(registry.tokenLot(0),0);assertEq(registry.totalRegistered(),1);
    }
    function testSnapshotAllows500ReputationAndBoundsHousing() public {
        nft.mint(address(this),12);registry.register(12);
        registry.saveMeterSnapshot(12,[uint16(100),100,100,100,500,5]);
        (,,,uint16[6] memory meters,uint256 updated)=registry.getPlayer(12);
        assertEq(meters[4],500);assertEq(updated,block.timestamp);
        vm.expectRevert(ChainWorldRegistry.InvalidMeterValue.selector);registry.saveMeterSnapshot(12,[uint16(100),100,100,100,500,6]);
        vm.expectRevert(ChainWorldRegistry.InvalidZone.selector);registry.setZone(12,6);
    }
    function testOnlyOwnerCanRegisterAndWritesRequireRegistration() public {
        nft.mint(address(this),0);
        vm.prank(address(9));vm.expectRevert(ChainWorldRegistry.NotTokenOwner.selector);registry.register(0);
        vm.expectRevert(ChainWorldRegistry.NotRegistered.selector);registry.setZone(0,0);
        vm.expectRevert(ChainWorldRegistry.InvalidPage.selector);registry.getLots(0,37);
    }
}
contract FaucetTest is Test {
    bytes32 leaf0; bytes32 leaf1; ChainWorldTestChog faucet;
    function leaf(uint256 index,uint256 original,string memory uri) internal pure returns(bytes32) { return keccak256(bytes.concat(keccak256(abi.encode(index,original,uri)))); }
    function setUp() public {
        leaf0=leaf(0,1462,"ipfs://source/1462.json");leaf1=leaf(1,9,"ipfs://source/9.json");
        bytes32 root=leaf0<leaf1?keccak256(abi.encodePacked(leaf0,leaf1)):keccak256(abi.encodePacked(leaf1,leaf0));
        faucet=new ChainWorldTestChog(root,2);
    }
    function testProofPreservesExactMappingAndCannotClaimAfterTransfer() public {
        bytes32[] memory proof=new bytes32[](1);proof[0]=leaf1;
        vm.prank(address(1));faucet.claim(1462,"ipfs://source/1462.json",proof);
        assertEq(faucet.ownerOf(0),address(1));assertEq(faucet.sourceTokenId(0),1462);assertEq(faucet.tokenURI(0),"ipfs://source/1462.json");
        assertEq(faucet.tokenOfOwnerByIndex(address(1),0),0);
        vm.prank(address(1));faucet.transferFrom(address(1),address(8),0);
        vm.prank(address(1));vm.expectRevert(ChainWorldTestChog.AlreadyClaimed.selector);faucet.claim(9,"ipfs://source/9.json",proof);
        proof[0]=leaf0;vm.prank(address(2));faucet.claim(9,"ipfs://source/9.json",proof);
        vm.prank(address(3));vm.expectRevert(ChainWorldTestChog.SoldOut.selector);faucet.claim(9,"ipfs://source/9.json",proof);
    }
    function testInvalidProofAndRejectedReceiverRollbackClaim() public {
        bytes32[] memory proof=new bytes32[](1);proof[0]=leaf1;
        vm.expectRevert(ChainWorldTestChog.InvalidSource.selector);faucet.claim(1462,"ipfs://invented",proof);
        assertFalse(faucet.hasClaimed(address(this)));
        RejectingReceiver receiver=new RejectingReceiver();
        vm.expectRevert();receiver.claim(faucet,1462,"ipfs://source/1462.json",proof);
        assertFalse(faucet.hasClaimed(address(receiver)));assertEq(faucet.totalSupply(),0);
    }
    function testReceiverCallbackCannotClaimTwice() public {
        ChainWorldTestChog single=new ChainWorldTestChog(leaf(0,12,"ipfs://source"),1);
        ReentrantReceiver receiver=new ReentrantReceiver(single);
        bytes32[] memory proof=new bytes32[](0);receiver.claim(12,"ipfs://source",proof);
        assertEq(single.totalSupply(),1);assertTrue(single.hasClaimed(address(receiver)));
    }
    function testNoPaymentAccepted() public {
        vm.deal(address(this),1 ether);
        (bool success,)=address(faucet).call{value:1}("");assertFalse(success);
    }
}
