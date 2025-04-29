export const liquidatorAbi = [
  "function liquidationBorrow((address lendingPool, address uniswapRouter, address uniswapQuoter, address assetProvider, address collateralAsset, address borrowAsset, address debtAsset, address userToLiquidate, uint256 debtToCover, uint256 slippage, bytes swapPathBorrowToDebt, bytes swapPathCollateralToBorrow) calldata params) external",
];

export interface LiquidationParams {
  lendingPool: string; // Address of the lending pool.
  uniswapRouter: string; // Address of the Uniswap router.
  uniswapQuoter: string; // Address of the Uniswap quoter.
  assetProvider: string; // Address to borrow funds from.
  collateralAsset: string; // Address of the collateral asset.
  borrowAsset: string; // Address of the asset to borrow.
  debtAsset: string; // Address of the asset to repay.
  userToLiquidate: string; // Address of the user being liquidated.
  debtToCover: bigint; // Amount of debt to repay.
  slippage: number; // Slippage tolerance (e.g., 100 = 1%).
  swapPathBorrowToDebt: string; // Precomputed encoded path for borrowAsset -> debtAsset.
  swapPathCollateralToBorrow: string; // Precomputed encoded path for collateralAsset -> borrowAsset.
}
