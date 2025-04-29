export interface ReserveData {
  configuration: string;
  liquidityIndex: string;
  variableBorrowIndex: string;
  currentLiquidityRate: string;
  currentVariableBorrowRate: string;
  currentStableBorrowRate: string;
  lastUpdateTimestamp: string;
  aTokenAddress: string;
  stableDebtTokenAddress: string;
  variableDebtTokenAddress: string;
  interestRateStrategyAddress: string;
  id: string;
  ltv: number;
  decimals: number;
  isActive: boolean;
  isBorrowingEnabled: boolean;
  isFrozen: boolean;
  isStableRateBorrowingEnabled: boolean;
  liquidationBonus: number;
  liquidationThreshold: number;
  reserved: number;
  reserveFactor: number;
}

export interface UserReserveData {
  reserveData?: ReserveData;
  assetPrice?: bigint;
}

export interface UserPosition {
  userCollateralAddress: string;
  userCollateralAmount: bigint;
  userCollateralAmountUsd?: bigint;
  isCollateral?: boolean;
  userDebtAddress: string;
  userDebtAmount: bigint;
  userDebtAmountUsd?: bigint;
}

export interface UserAccountData {
  totalCollateralETH: bigint;
  totalDebtETH: bigint;
  availableBorrowsETH: bigint;
  currentLiquidationThreshold: bigint;
  ltv: bigint;
  healthFactor: bigint;
}
export interface Borrower {
  id: number;
  address?: string;
  borrowerId: number;
  totalCollateralETH: bigint;
  totalDebtETH: bigint;
  availableBorrowsETH: bigint;
  currentLiquidationThreshold: bigint;
  ltv: bigint;
  healthFactor: bigint;
}
export interface Config {
  chainId: number;
  lastCheckedBlock?: number;
  lastCheckedTimestamp?: number;
  lastLiquidationRunTimestamp?: number;
}

export interface UserAccountData {
  totalCollateralETH: bigint;
  totalDebtETH: bigint;
  availableBorrowsETH: bigint;
  currentLiquidationThreshold: bigint;
  ltv: bigint;
  healthFactor: bigint;
}

export interface Liquidation {
  chainId: number;
  address: string;
  timestamp: number;
  collateral: string;
  debt: string;
  amount: bigint;
  borrow: string;
}
