// SPDX-License-Identifier: MIT

pragma solidity 0.7.6;

interface IPriceFeed {
    function fetchPrice() external view returns (uint);
}
