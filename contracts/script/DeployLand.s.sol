// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {ChainWorldLand} from "../ChainWorldLand.sol";
/// @notice Run with a secure Foundry account after configuring the actual currency and gas quote signer.
contract DeployLand is Script {
    function run()external returns(address deployed){
        require(block.chainid==10143,"Monad Testnet only");
        address collection=vm.envAddress("CHOG_ADDRESS");address currency=vm.envAddress("GAME_CURRENCY_ADDRESS");
        bytes32 ranks=vm.envBytes32("LAND_RARITY_ROOT");address signer=vm.envAddress("LAND_QUOTE_SIGNER");
        address treasury=vm.envAddress("LAND_TREASURY");bool mapped=vm.envOr("SOURCE_MAPPED_COLLECTION",true);
        vm.startBroadcast();deployed=address(new ChainWorldLand(collection,currency,ranks,mapped,signer,treasury));vm.stopBroadcast();
        console2.log("LAND_ADDRESS",deployed);
    }
}
