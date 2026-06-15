// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Initializable} from "../lib/openzeppelin-contracts/contracts/proxy/utils/Initializable.sol";
import {SafeERC20, IERC20} from "../lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {MerkleProof} from "../lib/openzeppelin-contracts/contracts/utils/cryptography/MerkleProof.sol";

contract MerkleAirdrop is Initializable {
    using SafeERC20 for IERC20;

    IERC20 public token;
    bytes32 public merkleRoot;
    address public creator;
    uint256 public deadline;
    
    mapping(address => bool) public hasClaimed;

    // Custom Error Definitions
    error AlreadyClaimed();
    error InvalidProof();
    error AirdropExpired();
    error AirdropStillActive();
    error OnlyCreator();

    event Claimed(address indexed claimant, uint256 amount);
    event Refunded(address indexed creator, uint256 amount);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _token,
        bytes32 _merkleRoot,
        address _creator,
        uint256 _deadline
    ) external initializer {
        token = IERC20(_token);
        merkleRoot = _merkleRoot;
        creator = _creator;
        deadline = _deadline;
    }

    function claim(uint256 amount, bytes32[] calldata proof) external {
        // Enforce the pull timestamp boundary
        if (block.timestamp > deadline) revert AirdropExpired();
        if (hasClaimed[msg.sender]) revert AlreadyClaimed();

        bytes32 leaf = keccak256(abi.encodePacked(msg.sender, amount));
        if (!MerkleProof.verify(proof, merkleRoot, leaf)) revert InvalidProof();

        hasClaimed[msg.sender] = true;
        token.safeTransfer(msg.sender, amount);

        emit Claimed(msg.sender, amount);
    }

    /**
     * @notice Allows the creator to reclaim all remaining funding tokens once the deadline passes.
     */
    function refund() external {
        if (msg.sender != creator) revert OnlyCreator();
        if (block.timestamp <= deadline) revert AirdropStillActive();

        uint256 remainingBalance = token.balanceOf(address(this));
        token.safeTransfer(creator, remainingBalance);

        emit Refunded(creator, remainingBalance);
    }
}