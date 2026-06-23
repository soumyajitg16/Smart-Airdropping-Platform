// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "../lib/forge-std/src/Script.sol";
import {console} from "../lib/forge-std/src/console.sol";
import {AirdropFactory} from "../src/AirdropFactory.sol";
import {MerkleAirdrop} from "../src/MerkleAirdrop.sol";
import {GenerateMerkle} from "./GenerateMerkle.s.sol";
import {TestToken} from "../src/TestToken.sol";

//For the Pull model, we need to deploy the implementation contract and the factory contract separately. The factory contract will be used to create new airdrop contracts for each airdrop campaign. The implementation contract will be used as a template for the new airdrop contracts created by the factory.
contract DeployAirdrop is Script {
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

        vm.stopBroadcast();

        // Merkle Tree Creation
        GenerateMerkle generateMerkle = new GenerateMerkle();
        vm.allowCheatcodes(address(generateMerkle));
        bytes32 MerkleRoot = generateMerkle.run();
        console.log("\n\nMerkle Root is: ", vm.toString(MerkleRoot));

        //Creator Account Setup
        uint256 creatorKey = vm.envUint("creatorPrivateKey");
        vm.startBroadcast(creatorKey);
        
        // Token Deployment
        TestToken testToken = new TestToken ("Air Token 1", "AirT-1");
        console.log ("TestToken Contract Address: ", address(testToken));
        testToken.approve(address(airdropFactory), 1000e18);

        // Create Airdrop (EIP-1167 Clone)
        address airdrop = airdropFactory.createAndFundAirdrop(address(testToken), MerkleRoot, 1000 ether, 1 days);
        console.log ("Airdrop Address: ", address(airdrop));
        
        vm.stopBroadcast();

        return (airdropFactory);
    }
}