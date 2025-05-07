// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";
import "@uniswap/v3-core/contracts/libraries/TickMath.sol";
import "../dependencies/openzeppelin/contracts/Ownable.sol";
import "../dependencies/openzeppelin/contracts/IERC20Detailed.sol";
import "../interfaces/IPriceFeed.sol";
import "@uniswap/v3-periphery/contracts/libraries/OracleLibrary.sol";
import "../dependencies/openzeppelin/contracts/SafeMath.sol";

interface IChainlinkAggregator {

    function decimals() external view returns (uint8);

    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );
}

contract ChainlinkUniswapV3PriceFeedV2 is Ownable, IPriceFeed {
    using SafeMath for uint256;
    
    address public immutable chainlinkFeed;
    address public immutable uniswapPool;
    address public immutable token0;
    address public immutable token1;
    uint8 public immutable token0Decimals;
    uint8 public immutable token1Decimals;
    uint8 public immutable chainlinkDecimals;
    bool public immutable reverseTwap;

    // TWAP observation window (in seconds)
    uint32 public twapWindow;

    uint32 public chainlinkTimeout = 1800; // 30 minutes
    
    uint32 private constant MIN_TWAP_WINDOW = 1800; // 30 minutes

    uint32 private constant MIN_CHAINLINK_TIMEOUT = 900; // 15 minutes
    uint32 private constant MAX_CHAINLINK_TIMEOUT = 172800; // 48 hours

    enum Source {
        CHAINLINK,
        UNISWAP
    }

    constructor(
        address _chainlinkFeed,
        address _uniswapPool,
        uint32 _twapWindow,
        uint32 _chainlinkTimeout,
        bool _reverseTwap
    ) {
        require(_chainlinkFeed != address(0), "Invalid Chainlink feed address");
        require(_uniswapPool != address(0), "Invalid Uniswap pool address");
        require(_twapWindow >= MIN_TWAP_WINDOW, "Invalid TWAP window");
        require(
            _chainlinkTimeout >= MIN_CHAINLINK_TIMEOUT &&
                _chainlinkTimeout <= MAX_CHAINLINK_TIMEOUT,
            "Invalid chainlinkTimeout"
        );

        chainlinkFeed = _chainlinkFeed;
        chainlinkTimeout = _chainlinkTimeout;
        chainlinkDecimals = IChainlinkAggregator(_chainlinkFeed).decimals();

        uniswapPool = _uniswapPool;
        IUniswapV3Pool uniswap = IUniswapV3Pool(_uniswapPool);

        token0 = uniswap.token0();
        token1 = uniswap.token1();
        token0Decimals = IERC20Detailed(uniswap.token0()).decimals();
        token1Decimals = IERC20Detailed(uniswap.token1()).decimals();

        twapWindow = _twapWindow;
        reverseTwap = _reverseTwap;
    }

    /**
     * @notice Set the TWAP observation window
     * @param _twapWindow The TWAP observation window (in seconds)
     */
    function setTwapWindow(uint32 _twapWindow) external onlyOwner {
        require(_twapWindow >= MIN_TWAP_WINDOW, "Invalid TWAP window");
        twapWindow = _twapWindow;
    }

    /**
     * @notice Set the time before switching to uniswap
     * @param _chainlinkTimeout The time in seconds
     */
    function setChainlinkTimeout(uint32 _chainlinkTimeout) external onlyOwner {
        require(
            _chainlinkTimeout >= MIN_CHAINLINK_TIMEOUT &&
                _chainlinkTimeout <= MAX_CHAINLINK_TIMEOUT,
            "Invalid chainlink timeout"
        );
        chainlinkTimeout = _chainlinkTimeout;
    }

    function fetchPrice() external view override returns (uint256 price) {
        (price, ) = _fetchPrice();
        return price;
    }

    function fetchSource() external view returns (Source source) {
        (, source) = _fetchPrice();
        return source;
    }

    function getChainlinkPrice() external view returns (uint256 price) {
        (price, ) = _getChainlinkPrice();
        return price;
    }

    function getUniswapTwapPrice() external view returns (uint256 price) {
        return _getUniswapTwapPrice();
    }

    /**
     * @dev Internal function to fetch Chainlink price
     * @return price The asset price in USD (18 decimals)
     */
    function _getChainlinkPrice()
        internal
        view
        returns (uint256 price, bool success)
    {
        try IChainlinkAggregator(chainlinkFeed).latestRoundData() returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) {
            if (answer <= 0) return (0, false);

            price = uint256(answer).mul(10 ** uint256(18).sub(uint256(chainlinkDecimals)));

            if (
                answer <= 0 ||
                block.timestamp.sub(updatedAt) > chainlinkTimeout ||
                answeredInRound < roundId
            ) {
                return (price, false);
            }
            return (price, true);
        } catch {
            return (0, false);
        }
    }

    /**
     * @dev Internal function to fetch Uniswap TWAP price.
     * Uses OracleLibrary.consult and getQuoteAtTick to determine the average tick and compute the price.
     * @return price The asset price in USD (18 decimals).
     */
    function _getUniswapTwapPrice() internal view returns (uint256 price) {
        (int24 tick, ) = OracleLibrary.consult(uniswapPool, twapWindow);
        if (reverseTwap) {
            uint256 quoteAmount = OracleLibrary.getQuoteAtTick(
                tick,
                uint128(10 ** token0Decimals),
                token0,
                token1
            );
            
            price = quoteAmount.mul(10 ** uint256(18).sub(uint256(token1Decimals)));

        } else {
            uint256 quoteAmount = OracleLibrary.getQuoteAtTick(
                tick,
                uint128(10 ** token1Decimals),
                token1,
                token0
            );
            
            price = quoteAmount.mul(10 ** uint256(18).sub(uint256(token0Decimals)));

        }
    }

    function _fetchPrice()
        internal
        view
        returns (uint256 price, Source source)
    {
        (uint256 chainlinkPrice, bool success) = _getChainlinkPrice();

        if (success == true) {
            return (chainlinkPrice, Source.CHAINLINK);
        }

        uint256 uniswapPrice = _getUniswapTwapPrice();
        require(uniswapPrice > 0, "Invalid Uniswap TWAP price");
        return (uniswapPrice, Source.UNISWAP);
    }
}
