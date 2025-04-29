import { UserPosition, UserReserveData } from "../../definitions/liquidate";

export function mergeUserDataAndUserConfiguration(
  userData: {
    balances: Record<string, Record<string, UserPosition>>;
    errors: any[] | undefined;
  },
  userConfigurations: {
    [address: string]: { isBorrowing: boolean[]; isSupplying: boolean[] };
  },
  reserveList: string[],
  assetPrices: Record<string, UserReserveData>
): Record<string, Record<string, UserPosition>> {
  const mergedData: Record<string, Record<string, UserPosition>> = {};

  for (const userAddress in userData.balances) {
    const userPositions = userData.balances[userAddress];
    const userConfig = userConfigurations[userAddress];

    if (!userConfig) continue; // Skip if no configuration exists

    const mergedPositions: Record<string, UserPosition> = {};

    for (const [index, asset] of reserveList.entries()) {
      const position = userPositions[asset];

      const isSupplying = userConfig.isSupplying[index] || false;
      const isBorrowing = userConfig.isBorrowing[index] || false;

      if (isSupplying) {
        position.isCollateral = true; // Mark as collateral if user is supplying
      }
      position.userCollateralAmountUsd =
        (BigInt(assetPrices[asset].assetPrice ?? 0) *
          position.userCollateralAmount) /
        10n ** BigInt(assetPrices[asset].reserveData?.decimals!);

      position.userDebtAmountUsd =
        (BigInt(assetPrices[asset].assetPrice ?? 0) * position.userDebtAmount) /
        10n ** BigInt(assetPrices[asset].reserveData?.decimals!);

      mergedPositions[asset] = position;
    }

    mergedData[userAddress] = mergedPositions;
  }

  return mergedData;
}
