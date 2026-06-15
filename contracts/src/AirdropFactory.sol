// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// cast send 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 "createAndFundAirdrop(address, bytes32, uint256)(address)"

import {Clones} from "../lib/openzeppelin-contracts/contracts/proxy/Clones.sol";
import {SafeERC20, IERC20} from "../lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {MerkleAirdrop} from "./MerkleAirdrop.sol";

contract AirdropFactory {
    using SafeERC20 for IERC20;

    address public immutable implementation;
    address[] public allAirdrops;

    event AirdropCreated(address indexed cloneAddress, address indexed creator, address token, uint256 deadline);

    constructor(address _implementation) {
        implementation = _implementation;
    }

    function createAndFundAirdrop(
        address token,
        bytes32 merkleRoot,
        uint256 totalAllocation,
        uint256 durationInSeconds
    ) external returns (address) {
        // Deploy the lightweight 45-byte proxy clone    
        address clone = Clones.clone(implementation);
        
        // Calculate the immutable expiration target point
        uint256 deadline = block.timestamp + durationInSeconds;
        
        // Initialize the tracking properties inside the fresh clone sandbox
        MerkleAirdrop(clone).initialize(token, merkleRoot, msg.sender, deadline);

        // Pull the funds directly from the creator into the clone container
        IERC20(token).safeTransferFrom(msg.sender, clone, totalAllocation);

        allAirdrops.push(clone);
        emit AirdropCreated(clone, msg.sender, token, deadline);

        return clone;
    }

    function getAirdropCount() external view returns (uint256) {
        return allAirdrops.length;
    }
}