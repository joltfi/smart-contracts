// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/governance/TimelockController.sol";

/**
 * @title Timelock
 * @dev Simple extension of OpenZeppelin's TimelockController, for deployment via Ignition.
 */
contract Timelock is TimelockController {
    /**
     * @param minDelay Seconds to wait before execution
     * @param proposers Addresses with PROPOSER_ROLE
     * @param executors Addresses with EXECUTOR_ROLE
     */
    constructor(
        uint256 minDelay,
        address[] memory proposers,
        address[] memory executors,
        address admin
    ) TimelockController(minDelay, proposers, executors, admin) {}
}
