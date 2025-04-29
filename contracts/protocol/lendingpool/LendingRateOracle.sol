// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.7.6;

import {ILendingRateOracle} from "../../interfaces/ILendingRateOracle.sol";
import {Ownable} from "../../dependencies/openzeppelin/contracts/Ownable.sol";

contract LendingRateOracle is ILendingRateOracle, Ownable {
    mapping(address => uint256) internal _borrowRates;

    function getMarketBorrowRate(
        address asset
    ) external view override returns (uint256) {
        return _borrowRates[asset];
    }

    function setMarketBorrowRate(
        address asset,
        uint256 rate
    ) external override onlyOwner {
        _borrowRates[asset] = rate;

        emit MarketBorrowRateSet(asset, rate);
    }
}
