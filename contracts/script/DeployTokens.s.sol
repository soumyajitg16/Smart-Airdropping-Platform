// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "../lib/forge-std/src/Script.sol";
import {console} from "../lib/forge-std/src/console.sol";
import {TestToken} from "../src/TestToken.sol";

contract DeployTokens is Script {
    function run() external {
        /* // Creator-1
        uint256 creatorKey1 = vm.envUint("creatorPrivateKey");
        vm.startBroadcast(creatorKey1);
        TestToken token1 = new TestToken("Air Token 1", "AirT-1");
        console.log("Token 1 address: ", address(token1));
        vm.stopBroadcast();
        */

        // Creator-2        
        uint256 creatorKey2 = vm.envUint("privateKey2");
        vm.startBroadcast(creatorKey2);
        TestToken token2 = new TestToken("Air Token 2", "AirT-2");
        console.log("Token 2 address: ", address(token2));
        vm.stopBroadcast();

        // Creator-3        
        uint256 creatorKey3 = vm.envUint("privateKey3");
        vm.startBroadcast(creatorKey3);
        TestToken token3 = new TestToken("Air Token 3", "AirT-3");
        console.log("Token 3 address: ", address(token3));
        vm.stopBroadcast();

        // Creator-4        
        uint256 creatorKey4 = vm.envUint("privateKey4");
        vm.startBroadcast(creatorKey4);
        TestToken token4 = new TestToken("Air Token 4", "AirT-4");
        console.log("Token 4 address: ", address(token4));
        vm.stopBroadcast();

        // Creator-5        
        uint256 creatorKey5 = vm.envUint("privateKey5");
        vm.startBroadcast(creatorKey5);
        TestToken token5 = new TestToken("Air Token 5", "AirT-5");
        console.log("Token 5 address: ", address(token5));
        vm.stopBroadcast();

        // Creator-6        
        uint256 creatorKey6 = vm.envUint("privateKey6");
        vm.startBroadcast(creatorKey6);
        TestToken token6 = new TestToken("Air Token 6", "AirT-6");
        console.log("Token 6 address: ", address(token6));
        vm.stopBroadcast();

        // Creator-7        
        uint256 creatorKey7 = vm.envUint("privateKey7");
        vm.startBroadcast(creatorKey7);
        TestToken token7 = new TestToken("Air Token 7", "AirT-7");
        console.log("Token 7 address: ", address(token7));
        vm.stopBroadcast();

        // Creator-8        
        uint256 creatorKey8 = vm.envUint("privateKey8");
        vm.startBroadcast(creatorKey8);
        TestToken token8 = new TestToken("Air Token 8", "AirT-8");
        console.log("Token 8 address: ", address(token8));
        vm.stopBroadcast();

        // Creator-9        
        uint256 creatorKey9 = vm.envUint("privateKey9");
        vm.startBroadcast(creatorKey9);
        TestToken token9 = new TestToken("Air Token 9", "AirT-9");
        console.log("Token 9 address: ", address(token9));
        vm.stopBroadcast();
    }
}