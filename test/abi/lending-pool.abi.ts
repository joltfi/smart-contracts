export const lendingPoolAbi = [
  "function deposit(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external",
  "function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode) external",
  "function withdraw(address asset, uint256 amount, address to) external",
  "function getUserAccountData(address user) external view returns (uint256, uint256, uint256, uint256, uint256, uint256)",
  "function getReservesList() external view returns (address[])",
  "function getUserConfiguration(address user) external view returns (uint256)",
  "function getReserveData(address reserve) external view returns (" +
    "uint256 configuration, " +
    "uint128 liquidityIndex, " +
    "uint128 variableBorrowIndex, " +
    "uint128 currentLiquidityRate, " +
    "uint128 currentVariableBorrowRate, " +
    "uint128 currentStableBorrowRate, " +
    "uint40 lastUpdateTimestamp, " +
    "address aTokenAddress, " +
    "address stableDebtTokenAddress, " +
    "address variableDebtTokenAddress, " +
    "address interestRateStrategyAddress, " +
    "uint8 id" +
    ")",

  "event Borrow(address indexed reserve, address indexed user, address indexed onBehalfOf, uint256 amount, uint256 borrowRateMode, uint256 borrowRate, uint16 referral)",
];
