// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "../lib/forge-std/src/Script.sol";
import {console} from "../lib/forge-std/src/console.sol";
import {GenerateMerkle} from "./GenerateMerkle.s.sol";
import {MerkleAirdrop} from "../src/MerkleAirdrop.sol";
import {IERC20} from "../lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

contract Claim is Script {
    // According to the sample-list.csv for the Test token (AirT-1)
    function run () external {
        // Claimant account address
        address sender = address(0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC);

        // Merkle Proof Generation
        GenerateMerkle generateMerkle = new GenerateMerkle();
        vm.allowCheatcodes(address(generateMerkle));
        (bool found, uint256 amount, bytes32[] memory proof) = generateMerkle.getProofForUser(address(sender));
        // Verification 
        require(found, "User not in airdrop");
        console.log("The User is in Airdrop: ", found);

        // Claimant account setup
        uint256 privateKey = vm.envUint("privateKey2");
        vm.startBroadcast(privateKey);
        console.log("The Balance before claim: ", IERC20(address(0x8464135c8F25Da09e49BC8782676a84730C318bC)).balanceOf(sender));
        console.log("The User's claimable amount is: ", amount);

        //Claimant Claims
        MerkleAirdrop(address(0xCafac3dD18aC6c6e92c921884f9E4176737C052c)).claim(amount, proof);

        console.log("The Balance after claim: ", IERC20(address(0x8464135c8F25Da09e49BC8782676a84730C318bC)).balanceOf(sender));
        vm.stopBroadcast();
    }
}