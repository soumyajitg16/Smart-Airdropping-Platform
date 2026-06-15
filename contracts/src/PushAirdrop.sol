// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20, SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract PushAirdrop {
    using SafeERC20 for IERC20;

    // Total Number of Recipients is 10, for testing purposes. This can be removed or modified as needed for larger batches.
    uint256 private constant TOTAL_RECIPIENTS = 10;

    error ArrayLengthMismatch();
    error ZeroTransferAmount();
    error FundingMismatch();

    event MultiSendExecuted(address indexed token, address indexed sender, uint256 totalAddresses);

    /**
     * @notice Pushes tokens directly to an array of recipient wallets in a single batch transaction.
     * @dev Creator must approve this contract to spend tokens before executing.
     * @param token The ERC-20 token address to distribute.
     * @param recipients Array of target wallet addresses.
     * @param amounts Array of specific token allocations corresponding to each recipient.
     */
    function pushTokens(
        address token,
        address[] calldata recipients,
        uint256[] calldata amounts,
        uint256 totalRequired
    ) external {
        uint256 length = recipients.length;
        if (length > TOTAL_RECIPIENTS) revert ArrayLengthMismatch();
        if (length == 0 || length != amounts.length) revert ArrayLengthMismatch();

        address sender = msg.sender;

        // 1. Safely pull the combined sum from the creator's wallet into this helper execution environment
        IERC20(token).safeTransferFrom(sender, address(this), totalRequired);

        // 2. Track the actual tokens processed on-chain in real-time
        uint256 actualTotalProcessed = 0;

        // 3. Systematically pump tokens out to every target account destination
        for (uint256 i = 0; i < length; i++) {
            if (amounts[i] == 0) revert ZeroTransferAmount();
            IERC20(token).safeTransfer(recipients[i], amounts[i]);

            unchecked {
                actualTotalProcessed += amounts[i];
            }
        }

        // 4. THE SAFETY NET: Ensure the claimed amount matches reality perfectly
        // If someone bypasses your backend and passes bad data, this stops them cold.
        if (actualTotalProcessed != totalRequired) revert FundingMismatch();

        emit MultiSendExecuted(token, sender, length);
    }
}