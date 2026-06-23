// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "../lib/forge-std/src/Script.sol";
import {stdJson} from "../lib/forge-std/src/StdJson.sol";
import {MerkleProof} from "../lib/openzeppelin-contracts/contracts/utils/cryptography/MerkleProof.sol";

// This works as an alternative to off-chain scripts for generating Merkle roots and proofs. It can be run using `forge script` command. It reads the airdrop list from a JSON file, constructs the Merkle tree, and outputs the Merkle root and proof arrays for each user in the console. This is useful for testing and debugging purposes without needing to rely on external tools or libraries.
contract GenerateMerkle is Script {
    using stdJson for string;
    
    // Define the exact struct structure that matches your JSON keys
    struct AirdropEntry {
        address address_; // note the underscore if 'address' hits a reserved word conflict in older versions
        uint256 amount;
    }

    // Secondary type matching structure for stdJson's strict parsing engine
    struct JSONRoot {
        AirdropEntry[] airdrops;
    }

    function sortHashes(bytes32 a, bytes32 b) internal pure returns (bytes32, bytes32) {
        return a < b ? (a, b) : (b, a);
    }

    function _readAirdropEntries() internal view returns (AirdropEntry[] memory entries) {
        string memory rootPath = vm.projectRoot();
        string memory path = string.concat(rootPath, "/airdrop_list.json");
        string memory json = vm.readFile(path);
        bytes memory data = json.parseRaw(".airdrops");
        entries = abi.decode(data, (AirdropEntry[]));
    }

    function _buildTree(AirdropEntry[] memory entries) internal pure returns (bytes32[] memory treeNodes) {
        uint256 totalUsers = entries.length;
        bytes32[] memory leaves = new bytes32[](totalUsers);

        // Create Leaves
        for (uint256 i = 0; i < totalUsers; i++) {
            leaves[i] = keccak256(abi.encodePacked(entries[i].address_, entries[i].amount));
        }

        // Build Tree Structure
        uint256 totalNodesCalculated = totalUsers;
        uint256 layerSize = totalUsers;

        while (layerSize > 1) {
            layerSize = (layerSize + 1) / 2;
            totalNodesCalculated += layerSize;
        }

        treeNodes = new bytes32[](totalNodesCalculated);
        for (uint256 i = 0; i < totalUsers; i++) {
            treeNodes[i] = leaves[i];
        }

        uint256 currentReadIndex = 0;
        uint256 currentWriteIndex = totalUsers;
        layerSize = totalUsers;

        while (layerSize > 1) {
            for (uint256 i = 0; i < layerSize; i += 2) {
                if (i + 1 < layerSize) {
                    (bytes32 left, bytes32 right) = sortHashes(
                        treeNodes[currentReadIndex + i],
                        treeNodes[currentReadIndex + i + 1]
                    );
                    treeNodes[currentWriteIndex] = keccak256(abi.encodePacked(left, right));
                } else {
                    treeNodes[currentWriteIndex] = treeNodes[currentReadIndex + i];
                }
                currentWriteIndex++;
            }
            currentReadIndex += layerSize;
            layerSize = (layerSize + 1) / 2;
        }
    }

    function _getProof(
        bytes32[] memory treeNodes,
        uint256 totalUsers,
        uint256 targetUserIndex
    ) internal pure returns (bytes32[] memory proof) {
        // Extract Proof Payloads
        uint256 depth = 0;
        uint256 tempSize = totalUsers;
        while (tempSize > 1) {
            tempSize = (tempSize + 1) / 2;
            depth++;
        }

        proof = new bytes32[](depth);
        uint256 nodeIndex = targetUserIndex;
        uint256 layerOffset = 0;
        uint256 currentLayerLength = totalUsers;

        for (uint256 level = 0; level < depth; level++) {
            uint256 siblingIndex;
            if (nodeIndex % 2 == 0) {
                siblingIndex = (nodeIndex + 1 < currentLayerLength) ? nodeIndex + 1 : nodeIndex;
            } else {
                siblingIndex = nodeIndex - 1;
            }

            proof[level] = treeNodes[layerOffset + siblingIndex];

            layerOffset += currentLayerLength;
            currentLayerLength = (currentLayerLength + 1) / 2;
            nodeIndex = nodeIndex / 2;
        }
    }

    /// @notice Reusable helper for other scripts. Returns whether `user` exists in
    /// `airdrop_list.json`, plus that user's amount and Merkle proof.
    /// @dev This does not revert if the user is absent. It returns `(false, 0, [])`.
    function getProofForUser(address user)
        public
        view
        returns (bool found, uint256 amount, bytes32[] memory proof)
    {
        AirdropEntry[] memory entries = _readAirdropEntries();
        uint256 totalUsers = entries.length;

        for (uint256 i = 0; i < totalUsers; i++) {
            if (entries[i].address_ == user) {
                bytes32[] memory treeNodes = _buildTree(entries);
                return (true, entries[i].amount, _getProof(treeNodes, totalUsers, i));
            }
        }

        return (false, 0, new bytes32[](0));
    }

    function run() public view returns (bytes32) {
        AirdropEntry[] memory entries = _readAirdropEntries();
        uint256 totalUsers = entries.length;
        bytes32[] memory treeNodes = _buildTree(entries);

        bytes32 merkleRoot = treeNodes[treeNodes.length - 1];
        console2.log("FINAL MERKLE ROOT:", vm.toString(merkleRoot));

        for (uint256 targetUserIndex = 0; targetUserIndex < totalUsers; targetUserIndex++) {
            console2.log("\n------------------------------------------------");
            console2.log("User:", entries[targetUserIndex].address_);
            console2.log("Amount:", entries[targetUserIndex].amount);

            bytes32[] memory proof = _getProof(treeNodes, totalUsers, targetUserIndex);

            string memory proofString = "[";
            for (uint256 p = 0; p < proof.length; p++) {
                proofString = string.concat(proofString, vm.toString(proof[p]));
                if (p < proof.length - 1) proofString = string.concat(proofString, ",");
            }
            proofString = string.concat(proofString, "]");

            console2.log("Proof Array Payload:");
            console2.log(proofString);
        }
        return (merkleRoot);
    }
}