// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.7.6;

/**
 * @title ILendingRateOracle interface
 * @notice Interface for the Aave borrow rate oracle. Provides the average market borrow rate to be used as a base for the stable borrow rate calculations
 **/

interface ILendingRateOracle {
    event MarketBorrowRateSet(address indexed asset, uint256 rate);

    /**
    @dev returns the market borrow rate in ray
    **/
    function getMarketBorrowRate(address asset) external view returns (uint256);

    /**
    @dev sets the market borrow rate. Rate value must be in ray
    **/
    function setMarketBorrowRate(address asset, uint256 rate) external;
}
