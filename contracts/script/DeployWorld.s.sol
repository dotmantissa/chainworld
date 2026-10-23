// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {ChainWorldRegistry} from "../ChainWorldRegistry.sol";
import {ChainWorldTestChog} from "../ChainWorldTestChog.sol";

/// @notice Run a simulation first. Broadcasting is an explicit operator action using a Foundry account.
contract DeployWorld is Script {
    function run() external returns (address collection, address registry) {
        require(block.chainid == 10143, "Monad Testnet only");
        bool deployFaucet = vm.envOr("DEPLOY_TEST_CHOG", false);
        vm.startBroadcast();
        if (deployFaucet) {
            collection = address(new ChainWorldTestChog(vm.envBytes32("MANIFEST_ROOT"), vm.envUint("MANIFEST_SUPPLY")));
        } else {
            collection = vm.envAddress("CHOG_ADDRESS");
        }
        registry = address(new ChainWorldRegistry(collection));
        vm.stopBroadcast();
        console2.log("CHOG_ADDRESS", collection);
        console2.log("REGISTRY_V2_ADDRESS", registry);
    }
}
