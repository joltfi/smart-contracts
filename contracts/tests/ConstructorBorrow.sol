// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "hardhat/console.sol";

interface IWETH {
    function deposit() external payable;

    function withdraw(uint256) external;

    function approve(address spender, uint256 amount) external returns (bool);
}

interface ILendingPool {
    function deposit(
        address asset,
        uint256 amount,
        address onBehalfOf,
        uint16 referralCode
    ) external;

    function borrow(
        address asset,
        uint256 amount,
        uint256 interestRateMode,
        uint16 referralCode,
        address onBehalfOf
    ) external;
}

contract ConstructorBorrow {
    address public immutable WETH;
    ILendingPool public lendingPool;

    event Deposited(address indexed user, uint256 amount);
    event Borrowed(address indexed user, address token, uint256 amount);

    /**
     * @notice Constructor that executes the deposit and borrow logic.
     * @param _weth Address of the WETH contract.
     * @param _lendingPool Address of the lending pool.
     * @param borrowToken Address of the token to borrow.
     * @param borrowAmount Amount of the token to borrow.
     *
     * The constructor is payable so that ETH can be sent during deployment.
     */
    constructor(
        address _weth,
        address _lendingPool,
        address borrowToken,
        uint256 borrowAmount
    ) payable {
        require(msg.value > 0, "Must send ETH to convert to WETH");

        WETH = _weth;
        lendingPool = ILendingPool(_lendingPool);

        IWETH weth = IWETH(WETH);

        // Convert ETH to WETH
        weth.deposit{value: msg.value}();

        console.log("convert eth to wth ok");
        // Approve lending pool to use the WETH
        require(
            weth.approve(address(lendingPool), msg.value),
            "WETH approval failed"
        );

        console.log("deposit");
        // Deposit WETH into the lending pool on behalf of the deployer
        lendingPool.deposit(WETH, msg.value, address(this), 0);
        emit Deposited(msg.sender, msg.value);

        console.log("deposit ok");
        console.log("borrowing");
        // Borrow the specified token from the lending pool on behalf of the deployer
        // Using interest rate mode 2 (variable rate); adjust if needed.
        lendingPool.borrow(borrowToken, borrowAmount, 2, 0, address(this));
        emit Borrowed(msg.sender, borrowToken, borrowAmount);
        console.log("borrow ok");
    }
}
