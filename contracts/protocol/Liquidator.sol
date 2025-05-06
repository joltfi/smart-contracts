// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../dependencies/openzeppelin/contracts/ReentrancyGuard.sol";
import "../dependencies/openzeppelin/contracts/AccessControl.sol";
 

interface ISwapRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function exactInputSingle(
        ExactInputSingleParams calldata params
    ) external payable returns (uint256 amountOut);

    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }

    function exactInput(
        ExactInputParams calldata params
    ) external payable returns (uint256 amountOut);
}

interface IQuoter {
    function quoteExactInput(
        bytes memory path,
        uint256 amountIn
    ) external returns (uint256 amountOut);

    function quoteExactInputSingle(
        address tokenIn,
        address tokenOut,
        uint24 fee,
        uint256 amountIn,
        uint160 sqrtPriceLimitX96
    ) external returns (uint256 amountOut);

    function quoteExactOutput(
        bytes memory path,
        uint256 amountOut
    ) external returns (uint256 amountIn);

    function quoteExactOutputSingle(
        address tokenIn,
        address tokenOut,
        uint24 fee,
        uint256 amountOut,
        uint160 sqrtPriceLimitX96
    ) external returns (uint256 amountIn);
}

interface ILendingPool {
    function borrow(
        address asset,
        uint256 amount,
        uint256 interestRateMode,
        uint16 referralCode,
        address onBehalfOf
    ) external;

    function liquidationCall(
        address collateralAsset,
        address debtAsset,
        address user,
        uint256 debtToCover,
        bool receiveAToken
    ) external;

    function deposit(
        address asset,
        uint256 amount,
        address onBehalfOf,
        uint16 referralCode
    ) external;

    function repay(
        address asset,
        uint256 amount,
        uint256 rateMode,
        address onBehalfOf
    ) external;
}

contract AaveLiquidationBot is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant LIQUIDATOR_ROLE = keccak256("LIQUIDATOR_ROLE");

    event LiquidationExecuted(
        address indexed user,
        address collateralAsset,
        address debtAsset,
        uint256 profit
    );

    modifier onlyLiquidator() {
        require(
            hasRole(LIQUIDATOR_ROLE, msg.sender),
            "Not a whitelisted liquidator"
        );
        _;
    }
    struct LiquidationParams {
        address lendingPool;
        address uniswapRouter;
        address uniswapQuoter;
        address assetProvider; // address to borrow funds from
        address collateralAsset; // asset to take
        address borrowAsset; // asset to borrow
        address debtAsset; // asset to repay
        address userToLiquidate; // address of user getting liquidated
        uint256 debtToCover; // amount of debt to repay
        uint256 slippage; // slippage tolerance (e.g., 100 = 1%)
        bytes swapPathBorrowToDebt; // precomputed path for borrowAsset -> debtAsset
        bytes swapPathCollateralToBorrow; // precomputed path for collateralAsset -> borrowAsset
    }

    constructor(address _admin) {
        require(_admin != address(0), "Invalid admin address");
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(LIQUIDATOR_ROLE, _admin);
    }

    function liquidationBorrow(
        LiquidationParams calldata params
    ) external onlyLiquidator nonReentrant {
        require(
            params.lendingPool != address(0),
            "Invalid LendingPool address"
        );
        require(params.uniswapRouter != address(0), "Invalid router address");
        require(params.uniswapQuoter != address(0), "Invalid quoter address");
        require(params.collateralAsset != address(0), "Invalid collateral");
        require(params.debtAsset != address(0), "Invalid debt asset");
        require(params.userToLiquidate != address(0), "Invalid target");
        require(params.slippage <= 500, "Slippage too high"); // 5% max slippage

        // Borrow from lending pool
        ILendingPool(params.lendingPool).borrow(
            params.borrowAsset,
            params.debtToCover,
            2,
            0,
            params.assetProvider
        );

        // Swap borrow asset for debt asset if necessary
        if (params.borrowAsset != params.debtAsset) {
            _swap(
                params.uniswapQuoter,
                params.uniswapRouter,
                params.borrowAsset,
                params.swapPathBorrowToDebt,
                params.debtToCover,
                params.slippage
            );
        }

        // Liquidate
        _liquidationCall(
            params.lendingPool,
            params.collateralAsset,
            params.debtAsset,
            params.userToLiquidate
        );

        uint256 collateralBalance = IERC20(params.collateralAsset).balanceOf(
            address(this)
        );
        
        if (params.collateralAsset != params.borrowAsset) {
            // Swap collateral for debt
            _swap(
                params.uniswapQuoter,
                params.uniswapRouter,
                params.collateralAsset,
                params.swapPathCollateralToBorrow,
                collateralBalance,
                params.slippage
            );
        }

        uint256 borrowBalance = IERC20(params.borrowAsset).balanceOf(
            address(this)
        );

        require(
            borrowBalance >= params.debtToCover,
            "Insufficient repayment amount"
        );

        // Repay the borrowed asset
        _repay(
            params.lendingPool,
            params.borrowAsset,
            params.debtToCover,
            params.assetProvider
        );

        uint256 liquidationProfit = IERC20(params.borrowAsset).balanceOf(
            address(this)
        );

        if (liquidationProfit > 0) {
            _deposit(
                params.lendingPool,
                params.borrowAsset,
                liquidationProfit,
                params.assetProvider
            );
        }

        emit LiquidationExecuted(
            params.userToLiquidate,
            params.collateralAsset,
            params.debtAsset,
            liquidationProfit
        );
    }

    function _deposit(
        address _lendingPool,
        address asset,
        uint256 amount,
        address assetProvider
    ) internal {
        IERC20(asset).safeIncreaseAllowance(_lendingPool, amount);
        // repay debt
        ILendingPool(_lendingPool).deposit(asset, amount, assetProvider, 0);
    }

    function _repay(
        address _lendingPool,
        address asset,
        uint256 amount,
        address user
    ) internal {
        IERC20(asset).safeIncreaseAllowance(_lendingPool, amount);
        // repay debt
        ILendingPool(_lendingPool).repay(asset, amount, 2, user);
    }

    function _swap(
        address _uniswapQuoter,
        address _uniswapRouter,
        address tokenIn,
        bytes memory path,
        uint256 amountIn,
        uint256 slippage
    ) internal {
        uint256 amountOutMin = _calculateMinAmountOut(
            _uniswapQuoter,
            path,
            amountIn,
            slippage
        );
        _swapTokensV3(_uniswapRouter, tokenIn, path, amountIn, amountOutMin);
    }

    function _calculateMinAmountOut(
        address _uniswapQuoter,
        bytes memory path,
        uint256 amountIn,
        uint256 slippage
    ) internal returns (uint256) {
        // The quoter will simulate the swap along the provided path.
        uint256 amountOut = IQuoter(_uniswapQuoter).quoteExactInput(
            path,
            amountIn
        );
        // Apply slippage (where slippage is expressed in basis points)
        return (amountOut * (10000 - slippage)) / 10000;
    }

    function _swapTokensV3(
        address _uniswapRouter,
        address tokenIn,
        bytes memory path,
        uint256 amountIn,
        uint256 amountOutMin
    ) internal returns (uint256 amountOut) {
        // Increase allowance for the router to spend tokenIn.
        IERC20(tokenIn).safeIncreaseAllowance(_uniswapRouter, amountIn);

        // Set up the parameters for the multi-hop swap via the precomputed path.
        ISwapRouter.ExactInputParams memory params = ISwapRouter
            .ExactInputParams({
                path: path,
                recipient: address(this),
                deadline: block.timestamp,
                amountIn: amountIn,
                amountOutMinimum: amountOutMin
            });

        // Perform the swap. This call handles both single-hop and multi-hop swaps
        amountOut = ISwapRouter(_uniswapRouter).exactInput(params);
    }

    function _liquidationCall(
        address _lendingPool,
        address collateralAsset,
        address debtAsset,
        address userToLiquidate
    ) internal {
        // debt balance
        uint256 debtBalance = IERC20(debtAsset).balanceOf(address(this));

        // approve
        IERC20(debtAsset).safeIncreaseAllowance(_lendingPool, debtBalance);

        // liquidate
        ILendingPool(_lendingPool).liquidationCall(
            collateralAsset,
            debtAsset,
            userToLiquidate,
            debtBalance,
            false
        );
    }

    // Role management functions
    function addRole(
        bytes32 role,
        address account
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(role, account);
    }

    function removeRole(
        bytes32 role,
        address account
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(role, account);
    }

    function rescueTokens(address token) external onlyRole(DEFAULT_ADMIN_ROLE) {
        IERC20(token).safeTransfer(
            msg.sender,
            IERC20(token).balanceOf(address(this))
        );
    }
}
