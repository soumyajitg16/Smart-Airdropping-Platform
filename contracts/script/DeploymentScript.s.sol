// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "../lib/forge-std/src/Script.sol";
import {console} from "../lib/forge-std/src/console.sol";
import {AirdropFactory} from "../src/AirdropFactory.sol";
import {MerkleAirdrop} from "../src/MerkleAirdrop.sol";
import {TestToken} from "../src/TestToken.sol";
import {PushAirdrop} from "../src/PushAirdrop.sol";

//For the Pull model, we need to deploy the implementation contract and the factory contract separately. The factory contract will be used to create new airdrop contracts for each airdrop campaign. The implementation contract will be used as a template for the new airdrop contracts created by the factory.
contract DeploymentScript is Script {
    function run () external returns (AirdropFactory) {
        // Deployer Account Setup
        uint256 deployerKey = vm.envUint("deployerPrivateKey");
        vm.startBroadcast(deployerKey);

        // 1) Pull Model Deployment
        // Implemetation Contract Deployment
        MerkleAirdrop merkleAirdrop = new MerkleAirdrop ();
        console.log ("Impletation Contract Address: ", address(merkleAirdrop));

        // Factory Contract Deployment
        AirdropFactory airdropFactory = new AirdropFactory(address(merkleAirdrop));
        console.log ("Factory Contract Address: ", address(airdropFactory));

        // 2) Push Model Deployment
        PushAirdrop pushAirdrop = new PushAirdrop ();
        console.log ("PushAirdrop Contract Address: ", address(pushAirdrop));
        vm.stopBroadcast();

        //Creator Account Setup
        uint256 creatorKey = vm.envUint("creatorPrivateKey");
        vm.startBroadcast(creatorKey);

        // Token Deployment
        TestToken testToken = new TestToken ();
        // testToken.approve(address(airdropFactory), 1000e18);
        console.log ("TestToken Contract Address: ", address(testToken));
        vm.stopBroadcast();

        return (airdropFactory);
    }
}