// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import {Test} from "forge-std/Test.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ChainWorldLand} from "../ChainWorldLand.sol";
contract LandResident is ERC721 {
    constructor()ERC721("Resident","RES"){}
    function mint(address owner,uint256 id)external{_mint(owner,id);}
    function sourceTokenId(uint256 id)external pure returns(uint256){return id+1;}
}
contract LandCurrency is ERC20 {
    constructor()ERC20("Game","GCHOG"){}
    function mint(address owner,uint256 amount)external{_mint(owner,amount);}
}
contract ChainWorldLandTest is Test {
    LandResident nft;LandCurrency token;ChainWorldLand land;
    address alice=address(0xa11ce);address bob=address(0xb0b);address treasury=address(0xbeef);
    uint256 signerKey=0x12345;bytes32 aLeaf;bytes32 bLeaf;
    function setUp()public{
        nft=new LandResident();token=new LandCurrency();
        aLeaf=keccak256(bytes.concat(keccak256(abi.encode(uint256(1),uint16(1969)))));
        bLeaf=keccak256(bytes.concat(keccak256(abi.encode(uint256(2),uint16(1)))));
        bytes32 root=aLeaf<bLeaf?keccak256(abi.encodePacked(aLeaf,bLeaf)):keccak256(abi.encodePacked(bLeaf,aLeaf));
        land=new ChainWorldLand(address(nft),address(token),root,true,vm.addr(signerKey),treasury);
        nft.mint(alice,0);nft.mint(bob,1);token.mint(alice,10000);token.mint(bob,10000);
        vm.prank(alice);token.approve(address(land),type(uint256).max);
        vm.prank(bob);token.approve(address(land),type(uint256).max);
        bytes32[]memory proof=new bytes32[](1);proof[0]=bLeaf;vm.prank(alice);land.registerHome(0,0,0,0,0,1969,proof);
        proof[0]=aLeaf;vm.prank(bob);land.registerHome(1,0,0,2,0,1,proof);
    }
    function signature(ChainWorldLand.Quote memory q)internal returns(bytes memory){(uint8 v,bytes32 r,bytes32 s)=vm.sign(signerKey,land.quoteDigest(q));return abi.encodePacked(r,s,v);}
    function quote(uint256 id,uint8 x,uint8 y,uint256 nonce)internal view returns(ChainWorldLand.Quote memory){return ChainWorldLand.Quote(id,0,0,x,y,100,nonce,block.timestamp+2 minutes);}
    function testRarityGrantAndTransferFollowNFT()public{
        (,,,,,,uint64 low)=land.estates(0);(,,,,,,uint64 rare)=land.estates(1);
        assertEq(low,1);assertEq(rare,uint64(1<<2|1<<3|1<<10));
        vm.prank(alice);nft.transferFrom(alice,address(7),0);
        (address current,uint256 id)=land.parcelOwner(0,0,0,0);assertEq(current,address(7));assertEq(id,0);
        ChainWorldLand.Quote memory q=quote(0,1,0,0);bytes memory sig=signature(q);
        vm.prank(alice);vm.expectRevert(ChainWorldLand.NotOwner.selector);land.buyAdjacent(q,100,sig);
    }
    function testQuotePurchaseCannotReplayOverchargeOrJump()public{
        ChainWorldLand.Quote memory q=quote(0,1,0,0);bytes memory sig=signature(q);
        vm.prank(alice);vm.expectRevert(ChainWorldLand.InvalidQuote.selector);land.buyAdjacent(q,99,sig);
        vm.prank(alice);land.buyAdjacent(q,100,sig);assertEq(token.balanceOf(treasury),100);
        vm.prank(alice);vm.expectRevert(ChainWorldLand.InvalidQuote.selector);land.buyAdjacent(q,100,sig);
        q=quote(0,7,7,1);sig=signature(q);vm.prank(alice);vm.expectRevert(ChainWorldLand.NotAdjacent.selector);land.buyAdjacent(q,100,sig);
    }
    function testOfferEscrowAcceptanceAndReplay()public{
        ChainWorldLand.Quote memory q=quote(0,1,0,0);bytes memory sig=signature(q);vm.prank(alice);land.buyAdjacent(q,100,sig);
        // Bob's lower expansion parcel adjoins Alice only after buying (1,1).
        q=quote(0,1,1,1);sig=signature(q);vm.prank(alice);land.buyAdjacent(q,100,sig);
        vm.prank(alice);uint256 offer=land.makeOffer(0,0,0,2,1,70,uint64(block.timestamp+1 days));
        assertEq(token.balanceOf(address(land)),70);assertEq(token.balanceOf(bob),10000);
        vm.prank(bob);land.acceptOffer(offer);
        assertEq(token.balanceOf(address(land)),0);assertEq(token.balanceOf(bob),10070);
        (address owner,uint256 id)=land.parcelOwner(0,0,2,1);assertEq(owner,alice);assertEq(id,0);
        vm.prank(bob);vm.expectRevert(ChainWorldLand.InvalidOffer.selector);land.acceptOffer(offer);
    }
    function testRefundGoesToCurrentNFTBuyerOwnerExactlyOnce()public{
        ChainWorldLand.Quote memory q=quote(0,1,0,0);bytes memory sig=signature(q);vm.prank(alice);land.buyAdjacent(q,100,sig);
        vm.prank(alice);uint256 offer=land.makeOffer(0,0,0,2,0,70,uint64(block.timestamp+1 days));
        vm.prank(alice);nft.transferFrom(alice,address(7),0);
        vm.prank(address(7));land.refundOffer(offer,false);assertEq(token.balanceOf(address(7)),70);
        vm.prank(address(7));vm.expectRevert(ChainWorldLand.InvalidOffer.selector);land.refundOffer(offer,false);
    }
    function testCannotSellHomeOrDisconnectEstate()public{
        ChainWorldLand.Quote memory q=quote(0,1,0,0);bytes memory sig=signature(q);vm.prank(alice);land.buyAdjacent(q,100,sig);
        vm.prank(alice);uint256 offer=land.makeOffer(0,0,0,2,0,70,uint64(block.timestamp+1 days));
        vm.prank(bob);vm.expectRevert(ChainWorldLand.ProtectedHome.selector);land.acceptOffer(offer);
        // Add (4,0) through (3,0); selling (3,0) would strand (4,0).
        q=quote(1,4,0,0);sig=signature(q);vm.prank(bob);land.buyAdjacent(q,100,sig);
        q=quote(0,1,1,1);sig=signature(q);vm.prank(alice);land.buyAdjacent(q,100,sig);
        q=quote(0,1,2,2);sig=signature(q);vm.prank(alice);land.buyAdjacent(q,100,sig);
        q=quote(0,2,2,3);sig=signature(q);vm.prank(alice);land.buyAdjacent(q,100,sig);
        q=quote(0,3,2,4);sig=signature(q);vm.prank(alice);land.buyAdjacent(q,100,sig);
        q=quote(0,3,1,5);sig=signature(q);vm.prank(alice);land.buyAdjacent(q,100,sig);
        vm.prank(alice);offer=land.makeOffer(0,0,0,3,0,70,uint64(block.timestamp+1 days));
        vm.prank(bob);vm.expectRevert(ChainWorldLand.DisconnectedEstate.selector);land.acceptOffer(offer);
    }
    function testRejectsForgedRarityAndExpiredQuote()public{
        nft.mint(alice,2);bytes32[]memory proof=new bytes32[](1);proof[0]=bLeaf;
        vm.prank(alice);vm.expectRevert(ChainWorldLand.InvalidProof.selector);land.registerHome(2,1,0,0,0,1,proof);
        ChainWorldLand.Quote memory q=quote(0,1,0,0);bytes memory sig=signature(q);vm.warp(q.deadline+1);
        vm.prank(alice);vm.expectRevert(ChainWorldLand.InvalidQuote.selector);land.buyAdjacent(q,100,sig);
    }
}
