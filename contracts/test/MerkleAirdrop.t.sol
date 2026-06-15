// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {MerkleAirdrop} from "../src/MerkleAirdrop.sol";
import {AirdropFactory} from "../src/AirdropFactory.sol";
import {ERC20} from "../lib/openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";

// Simple Mock Token for testing purposes
contract MockToken is ERC20 {
    constructor() ERC20("Test Token", "TST") {}
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract MerkleAirdropTest is Test {
    AirdropFactory public factory;
    MerkleAirdrop public implementation;
    MockToken public token;

    // 1. Declare the actors as empty state variables
    address public creator;
    address public user1;
    address public user2;
    address public attacker;

    // Allocations
    uint256 public user1Amount = 100 ether;
    uint256 public user2Amount = 200 ether;
    uint256 public totalAllocation = user1Amount + user2Amount;

    // Merkle Data
    bytes32 public leaf1;
    bytes32 public leaf2;
    bytes32 public merkleRoot;
    bytes32[] public user1Proof;
    bytes32[] public user2Proof;

    // The address of the clone deployed during setUp
    MerkleAirdrop public activeAirdropClone;

    function setUp() public {
        // 2. Initialize the actors using makeAddr inside setUp()
        creator = makeAddr("creator");
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        attacker = makeAddr("attacker");

        // 3. Deploy Core Infrastructure 
        implementation = new MerkleAirdrop();
        factory = new AirdropFactory(address(implementation));
        token = new MockToken();

        // 4. Fund the Creator
        token.mint(creator, 10_000 ether);

        // 5. Construct a 2-Leaf Merkle Tree dynamically in Solidity
        // Leaf = keccak256(abi.encodePacked(address, amount))
        leaf1 = keccak256(abi.encodePacked(user1, user1Amount));
        leaf2 = keccak256(abi.encodePacked(user2, user2Amount));

        // Sort pairs to mimic the behavior of 'merkletreejs' (sortPairs: true)
        if (leaf1 < leaf2) {
            merkleRoot = keccak256(abi.encodePacked(leaf1, leaf2));
            
            // Proof for User 1 is just the sibling Leaf 2
            user1Proof.push(leaf2);
            // Proof for User 2 is just the sibling Leaf 1
            user2Proof.push(leaf1);
        } else {
            merkleRoot = keccak256(abi.encodePacked(leaf2, leaf1));
            user1Proof.push(leaf2);
            user2Proof.push(leaf1);
        }

        // 6. Create an active airdrop clone to use across various tests
        vm.startPrank(creator);
        token.approve(address(factory), totalAllocation);
        address cloneAddr = factory.createAndFundAirdrop(address(token), merkleRoot, totalAllocation, 7 days);
        activeAirdropClone = MerkleAirdrop(cloneAddr);
        vm.stopPrank();
    }

    /* ========================================================================
       FACTORY TESTS
       ======================================================================== */

    function test_InitializationAndFunding() public view {
        // Check that the clone was assigned the proper state properties
        assertEq(address(activeAirdropClone.token()), address(token));
        assertEq(activeAirdropClone.merkleRoot(), merkleRoot);
        
        // Verify that funding tokens were physically pulled into the Clone Vault
        assertEq(token.balanceOf(address(activeAirdropClone)), totalAllocation);
        
        // Check that the tracking index in the factory updated properly
        assertEq(factory.getAirdropCount(), 1);
        assertEq(factory.allAirdrops(0), address(activeAirdropClone));
    }

    function test_Revert_FactoryInvalidInputs() public {
        vm.startPrank(creator);
        token.approve(address(factory), 100 ether);

        // Fail Case 1: Token address is 0
        vm.expectRevert();
        factory.createAndFundAirdrop(address(0), merkleRoot, 100 ether, 7 days);

        // Fail Case 2: Merkle Root is empty bytes
        vm.expectRevert();
        factory.createAndFundAirdrop(address(token), bytes32(0), 100 ether, 7 days);

        // Fail Case 3: Allocation amount is 0
        vm.expectRevert();
        factory.createAndFundAirdrop(address(token), merkleRoot, 0, 7 days);
        vm.stopPrank();
    }

    /* ========================================================================
       CLAIM ARCHITECTURE TESTS
       ======================================================================== */

    function test_SuccessfulClaim() public {
        uint256 startingBalance = token.balanceOf(user1);

        // Act as User 1 and submit the valid claim
        vm.prank(user1);
        activeAirdropClone.claim(user1Amount, user1Proof);

        // Assertions
        assertTrue(activeAirdropClone.hasClaimed(user1));
        assertEq(token.balanceOf(user1), startingBalance + user1Amount);
        assertEq(token.balanceOf(address(activeAirdropClone)), totalAllocation - user1Amount);
    }

    function test_Revert_AlreadyClaimed() public {
        vm.startPrank(user1);
        
        // First claim succeeds
        activeAirdropClone.claim(user1Amount, user1Proof);

        // Second claim must trigger custom error AlreadyClaimed()
        vm.expectRevert(MerkleAirdrop.AlreadyClaimed.selector);
        activeAirdropClone.claim(user1Amount, user1Proof);
        vm.stopPrank();
    }

    function test_Revert_InvalidProof_AlteredAmount() public {
        vm.prank(user1);
        // User 1 tries to greedily modify their claim amount to 999 tokens
        vm.expectRevert(MerkleAirdrop.InvalidProof.selector);
        activeAirdropClone.claim(999 ether, user1Proof);
    }

    function test_Revert_InvalidProof_AttackerSteal() public {
        vm.prank(attacker);
        // Attacker attempts to submit User 1's proof using their own wallet identity
        vm.expectRevert(MerkleAirdrop.InvalidProof.selector);
        activeAirdropClone.claim(user1Amount, user1Proof);
    }

    /* ========================================================================
       PROXY ISOLATION SECURITY TESTS
       ======================================================================== */

    function test_CloneIsolation() public {
        // 1. Create a completely separate 2nd Airdrop Campaign for a different project
        bytes32 distinctRoot = keccak256(abi.encodePacked("Different Campaign"));
        
        vm.startPrank(creator);
        token.approve(address(factory), 500 ether);
        address clone2Addr = factory.createAndFundAirdrop(address(token), distinctRoot, 500 ether, 7 days);
        MerkleAirdrop secondClone = MerkleAirdrop(clone2Addr);
        vm.stopPrank();

        // 2. Prove that claiming on Clone 1 doesn't block or cross-contaminate Clone 2
        vm.prank(user1);
        activeAirdropClone.claim(user1Amount, user1Proof);

        assertTrue(activeAirdropClone.hasClaimed(user1));
        assertFalse(secondClone.hasClaimed(user1)); // State is isolated!
    }
}