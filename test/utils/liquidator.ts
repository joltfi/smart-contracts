import { ethers, JsonRpcProvider } from "ethers";
import {
  Borrower,
  UserAccountData,
  UserPosition,
  UserReserveData,
} from "../definitions/liquidate";
import { lendingPoolAbi } from "../abi/lending-pool.abi";
import { erc20Abi } from "../abi/erc20.abi";
import { liquidatorAbi, LiquidationParams } from "../abi/liquidator";
import { multicall3Abi } from "../abi/multicall3.abi";
import { UniswapService } from "./uniswap.service";
import {
  getAssetPricesWithMulticall3,
  getReservesData3Impl,
  getReservesList,
} from "./liquidator/pool";
import { getUserCollateralAndDebtBalancesInBatches } from "./liquidator/wallet";
import { getUserConfigurations } from "./liquidator/lendingpool";
import { mergeUserDataAndUserConfiguration } from "./liquidator/other";
import { CURRENT_NETWORK } from "../../ignition/constant";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

export async function getMergedData(
  borrowers: Borrower[],
  provider: JsonRpcProvider,
  LENDING_POOL_ADDRESS: string,
  MULTICALL3: string
): Promise<{
  mergedData: Record<string, Record<string, UserPosition>>;
  assetPrices: Record<string, UserReserveData>;
  reserveList: string[];
}> {
  // Step 0.1 Get Reserve assets.
  const reserveAssets = await getReservesList(LENDING_POOL_ADDRESS!, provider);

  // Step 0.2 Get reseve Data
  const reserveData = await getReservesData3Impl(
    provider,
    reserveAssets,
    LENDING_POOL_ADDRESS!,
    MULTICALL3!
  );

  const reserves: Record<string, UserReserveData> = {};

  Object.entries(reserveData).forEach(([reserve, reserveData]) => {
    reserves[reserve] = {};
    reserves[reserve].reserveData = reserveData;
  });

  const assetPrices = await getAssetPricesWithMulticall3(
    reserves,
    MULTICALL3!,
    provider
  );

  const userData = await getUserCollateralAndDebtBalancesInBatches(
    borrowers,
    reserves,
    provider,
    MULTICALL3
  );

  const userConfigurations = await getUserConfigurations(
    provider,
    borrowers,
    MULTICALL3,
    LENDING_POOL_ADDRESS
  );

  const mergedData = mergeUserDataAndUserConfiguration(
    userData,
    userConfigurations,
    reserveAssets,
    assetPrices!
  );

  return { mergedData, assetPrices: assetPrices!, reserveList: reserveAssets };
}

export async function performLiquidations(
  mergedData: Record<string, Record<string, UserPosition>>,
  reserveList: string[],
  provider: JsonRpcProvider,
  assetPrices: Record<string, UserReserveData>,
  LENDING_POOL_ADDRESS: string,
  ASSET_PROVIDER: string,
  LIQUIDATOR_CONTRACT: string,
  signer: HardhatEthersSigner
) {
  try {
    // 1. Get liquidity data from protocols

    const lendingPoolReserves = await fetchLendingPoolReserves(
      reserveList,
      provider,
      assetPrices
    );
    const assetProviderBalances = await fetchAssetProviderBalances(
      reserveList,
      provider,
      assetPrices,
      ASSET_PROVIDER,
      LENDING_POOL_ADDRESS
    );

    // 2. Process each user's positions
    for (const [userAddress, positions] of Object.entries(mergedData)) {
      try {
        // 3. Determine optimal liquidation targets
        const { collateralReserve, debtReserve } =
          determineOptimalDebtAndCollateral(positions, assetPrices);

        if (!collateralReserve || !debtReserve) {
          // DISCORD WEBHOOK
          console.log("FROZEN, CANNOT LIQUIDATE");
          continue;
        }
        // collateralReserve = biggest collateral
        // debtReserve = biggest debt

        // 4. Select borrow token based on liquidity
        const borrowToken = await selectBorrowToken(
          debtReserve,
          positions,
          lendingPoolReserves,
          assetProviderBalances
        );

        // 5. Calculate safe debt-to-cover amount
        const debtToCover = calculateDebtToCover(
          collateralReserve,
          debtReserve,
          borrowToken,
          lendingPoolReserves,
          assetProviderBalances,
          positions,
          assetPrices
        );

        console.log("debtToCover", debtToCover);
        if (debtToCover > 0n) {
          // 5.5 double check health
          const userHealthData = await getSingleUserHealthData(
            userAddress,
            provider,
            LENDING_POOL_ADDRESS
          );

          if (userHealthData.healthFactor < ethers.parseEther("1")) {
            console.log("Executing liquidation");
            // 6. Execute liquidation
            await executeLiquidation(
              collateralReserve,
              debtReserve,
              borrowToken,
              userAddress,
              debtToCover,
              provider,
              assetPrices,
              signer,
              LIQUIDATOR_CONTRACT,
              ASSET_PROVIDER,
              LENDING_POOL_ADDRESS
            );
          }
        }
      } catch (userError) {
        console.error(`Error processing user ${userAddress}:`, userError);
      }
    }
  } catch (globalError) {
    console.error("Global liquidation error:", globalError);
    throw globalError;
  }
}

export async function getSingleUserHealthData(
  userAddress: string,
  provider: JsonRpcProvider,
  LENDING_POOL_ADDRESS: string
): Promise<UserAccountData> {
  try {
    const lendingPoolContract = new ethers.Contract(
      LENDING_POOL_ADDRESS,
      lendingPoolAbi,
      provider
    );
    // Directly call getUserAccountData for the given userAddress
    const result = await lendingPoolContract.getUserAccountData(userAddress);
    // Destructure the returned tuple:
    const [
      totalCollateralETH,
      totalDebtETH,
      availableBorrowsETH,
      currentLiquidationThreshold,
      ltv,
      healthFactor,
    ] = result;

    return {
      totalCollateralETH,
      totalDebtETH,
      availableBorrowsETH,
      currentLiquidationThreshold,
      ltv,
      healthFactor,
    };
  } catch (error) {
    console.error(`Error fetching health data for ${userAddress}:`, error);
    throw error;
  }
}

// Helper functions
async function fetchLendingPoolReserves(
  reserves: string[],
  provider: ethers.JsonRpcProvider,
  assetPrices: Record<string, UserReserveData>
): Promise<Record<string, { balance: bigint; balanceUsd: bigint }>> {
  const calls: any = [];
  reserves.forEach((reserve) =>
    calls.push({
      target: reserve,
      callData: new ethers.Interface(erc20Abi).encodeFunctionData("balanceOf", [
        assetPrices[reserve].reserveData?.aTokenAddress,
      ]),
    })
  );

  const multicall3 = new ethers.Contract(
    CURRENT_NETWORK.MULTICALL3!,
    multicall3Abi,
    provider
  );

  const { returnData } = await multicall3.aggregate(calls);
  return Object.fromEntries(
    reserves.map((reserve, index) => {
      // Decode the result using the proper return data
      const [underlying] = new ethers.Interface(erc20Abi).decodeFunctionResult(
        "balanceOf",
        returnData[index]
      );

      const balance = BigInt(underlying);
      return [
        reserve,
        {
          balance: balance,
          balanceUsd:
            (balance * assetPrices[reserve].assetPrice!) /
            10n ** BigInt(assetPrices[reserve].reserveData?.decimals!),
        },
      ];
    })
  );
}

interface AssetProviderBalancesResult {
  balances: Record<string, { balance: bigint; balanceUsd: bigint }>;
  userAccountData: UserAccountData; // Replace `any` with a proper type if available
  borrowTotalUsd: bigint;
}

export async function fetchAssetProviderBalances(
  reserves: string[],
  provider: ethers.JsonRpcProvider,
  assetPrices: Record<string, UserReserveData>,
  ASSET_PROVIDER: string,
  LENDING_POOL_ADDRESS: string
): Promise<AssetProviderBalancesResult> {
  // Prepare multicall calls for aToken balanceOf for each reserve.
  const balanceCalls = reserves.map((reserve) => ({
    target: assetPrices[reserve].reserveData?.aTokenAddress!,
    callData: new ethers.Interface(erc20Abi).encodeFunctionData("balanceOf", [
      ASSET_PROVIDER!,
    ]),
  }));

  // Prepare the LendingPool getUserAccountData call.
  const lendingPoolCall = {
    target: LENDING_POOL_ADDRESS!,
    callData: new ethers.Interface(lendingPoolAbi).encodeFunctionData(
      "getUserAccountData",
      [ASSET_PROVIDER!]
    ),
  };

  // Combine all calls into one array.
  const calls = [...balanceCalls, lendingPoolCall];

  // Instantiate the multicall3 contract.
  const multicall3 = new ethers.Contract(
    CURRENT_NETWORK.MULTICALL3,
    multicall3Abi,
    provider
  );

  // Execute all calls in a single multicall.
  const { returnData } = await multicall3.aggregate(calls);

  // Decode each balance call result.
  const balances: Record<string, { balance: bigint; balanceUsd: bigint }> =
    Object.fromEntries(
      reserves.map((reserve, index) => {
        const aTokenAddress = assetPrices[reserve].reserveData?.aTokenAddress!;
        const contractInterface = new ethers.Interface(erc20Abi);
        const [balance] = contractInterface.decodeFunctionResult(
          "balanceOf",
          returnData[index]
        ) as unknown as [bigint];
        const balanceUsd =
          (balance * assetPrices[reserve].assetPrice!) /
          10n ** BigInt(assetPrices[reserve].reserveData?.decimals!);
        return [
          reserve,
          {
            balance,
            balanceUsd,
          },
        ];
      })
    );

  // Decode the LendingPool getUserAccountData result (it's the last call).
  const lendingPoolInterface = new ethers.Interface(lendingPoolAbi);
  const decodedUserAccountData = lendingPoolInterface.decodeFunctionResult(
    "getUserAccountData",
    returnData[returnData.length - 1]
  ) as unknown as [bigint, bigint, bigint, bigint, bigint, bigint];

  const userAccountData: UserAccountData = {
    totalCollateralETH: decodedUserAccountData[0],
    totalDebtETH: decodedUserAccountData[1],
    availableBorrowsETH: decodedUserAccountData[2],
    currentLiquidationThreshold: decodedUserAccountData[3],
    ltv: decodedUserAccountData[4],
    healthFactor: decodedUserAccountData[5],
  };

  const borrowTotalUsd = userAccountData.availableBorrowsETH;
  return { balances, userAccountData, borrowTotalUsd };
}

function determineOptimalDebtAndCollateral(
  positions: Record<string, UserPosition>,
  assetPrices: Record<string, UserReserveData>
): { collateralReserve: string; debtReserve: string } {
  let maxCollateral = 0n;
  let maxDebt = 0n;
  let collateralReserve = "";
  let debtReserve = "";

  for (const [reserve, position] of Object.entries(positions)) {
    if (
      position.userCollateralAmount > maxCollateral &&
      position.isCollateral
    ) {
      maxCollateral = position.userCollateralAmount;
      collateralReserve = reserve;
    }

    if (position.userDebtAmount > maxDebt && !isPaused(reserve, assetPrices)) {
      maxDebt = position.userDebtAmount;
      debtReserve = reserve;
    }
  }

  return { collateralReserve, debtReserve };
}

function isPaused(address: string, reserves: Record<string, UserReserveData>) {
  return (
    Object.entries(reserves).find(
      (entry) =>
        entry[0] === address ||
        entry[1].reserveData?.aTokenAddress === address ||
        entry[1].reserveData?.variableDebtTokenAddress === address
    )?.[1]?.reserveData?.isFrozen ?? false
  );
}

async function selectBorrowToken(
  debtReserve: string,
  positions: Record<string, UserPosition>,
  lendingPoolReserves: Record<
    string,
    {
      balance: bigint;
      balanceUsd: bigint;
    }
  >,
  assetProviderBalances: AssetProviderBalancesResult
): Promise<string> {
  /*
    Selection criteria of token to borrow to get the debtToken
    debtReserve = users biggest debt token

    1. DebtBalance Available USD >= 15% of debt?
      -> debt token, no swaps required!

    2. Get token with most liquidity
      -> 

  */
  const userDebtUsd = positions[debtReserve].userDebtAmountUsd ?? 0n;
  const debtTokenAvailableToBorrow =
    lendingPoolReserves[debtReserve].balanceUsd;

  const fifteenPctOfDebt = (userDebtUsd / 100n) * 15n;

  const gasTokenAvailable =
    lendingPoolReserves[CURRENT_NETWORK.WETH.ASSET_ADDRESS].balanceUsd;

  if (fifteenPctOfDebt <= debtTokenAvailableToBorrow) {
    return debtReserve;
  } else if (fifteenPctOfDebt <= gasTokenAvailable) {
    return CURRENT_NETWORK.WETH.ASSET_ADDRESS;
  }

  // Helper function to return the minimum of two bigints.
  const minBigInt = (a: bigint, b: bigint): bigint => (a < b ? a : b);

  // Find the reserve with maximum available liquidity by comparing the minimum of the lending pool balance and the asset provider's borrow total.
  return Object.entries(lendingPoolReserves).reduce(
    (maxReserve, [reserve, data]) => {
      const currentLiquidity = minBigInt(
        data.balanceUsd,
        assetProviderBalances.balances[reserve].balanceUsd
      );
      const maxLiquidity = minBigInt(
        lendingPoolReserves[maxReserve].balanceUsd,
        assetProviderBalances.balances[maxReserve].balanceUsd
      );
      return currentLiquidity > maxLiquidity ? reserve : maxReserve;
    },
    Object.keys(lendingPoolReserves)[0]
  );
}

export function calculateDebtToCover(
  collateralReserve: string,
  debtReserve: string,
  borrowToken: string,
  lendingPoolReserves: Record<
    string,
    {
      balance: bigint;
      balanceUsd: bigint;
    }
  >,
  assetProviderBalances: AssetProviderBalancesResult,
  positions: Record<string, UserPosition>,
  assetPrices: Record<string, UserReserveData>
): bigint {
  const userPosition = positions?.[debtReserve];
  const userDebtUsd = userPosition.userDebtAmountUsd!;
  const lendingPoolLiquidity = lendingPoolReserves[borrowToken].balance;
  console.log("userDebt USD", ethers.formatEther(userDebtUsd));
  const lendingPoolLiquidityUsd =
    (lendingPoolReserves[borrowToken].balance *
      BigInt(assetPrices[borrowToken].assetPrice!)) /
    10n ** BigInt(assetPrices[borrowToken].reserveData?.decimals!);
  const assetProviderBalanceUsd = assetProviderBalances.borrowTotalUsd;
  // debt is more than we can borrow
  console.log("collateralReserve", collateralReserve);
  return _calculateDebtToCover(
    assetProviderBalanceUsd,
    lendingPoolLiquidityUsd,
    userDebtUsd,
    assetPrices[borrowToken].assetPrice!,
    assetPrices[borrowToken].reserveData!.decimals!,
    collateralReserve === borrowToken,
    assetPrices[collateralReserve].reserveData?.liquidationBonus!
  );
}

export function _calculateDebtToCover(
  assetProviderBalanceUsd: bigint,
  lendingPoolLiquidityUsd: bigint,
  userDebtUsd: bigint,
  borrowTokenAssetPrice: bigint,
  decimals: number,
  collateralIsBorrow: boolean,
  liquidationBonus: number
) {
  const isUserDebtMoreThanAvailable = userDebtUsd >= lendingPoolLiquidityUsd;
  const isUserDebtMoreThanAssetProvider =
    userDebtUsd >= assetProviderBalanceUsd;

  const isAssetProviderMoreThanAvailable =
    assetProviderBalanceUsd >= lendingPoolLiquidityUsd;
  let maxBorrowUsd;

  if (isUserDebtMoreThanAvailable) {
    if (isAssetProviderMoreThanAvailable) {
      // IF collateral token === borrow token
      //  lending pool liquidity borrowed must be 40% or less or you wont be able to liquidate
      //  because you borrowed the token you want to get as collateral
      console.log(1);
      maxBorrowUsd = lendingPoolLiquidityUsd;
    } else {
      console.log(2);
      maxBorrowUsd = assetProviderBalanceUsd;
    }
  } else {
    if (isUserDebtMoreThanAssetProvider) {
      console.log(3);
      maxBorrowUsd = assetProviderBalanceUsd;
    } else {
      console.log(4);
      maxBorrowUsd = userDebtUsd;
    }
  }

  const onePercentOfLiquidity = lendingPoolLiquidityUsd / 10000n;
  const maxBorrowIfCollateral =
    onePercentOfLiquidity * 5000n -
    onePercentOfLiquidity * BigInt(liquidationBonus - 10000);

  console.log("Available USD: ", ethers.formatEther(lendingPoolLiquidityUsd));
  console.log("AssetProv USD: ", ethers.formatEther(assetProviderBalanceUsd));

  /*
    IF collateral == borrow we need to reserve some collateral for liquidation
      -- if we borrow it all, we cannot liquidate because we cannot claim the collateral because we borrowed it
  */
  console.log("borrow USD", ethers.formatEther(maxBorrowUsd));
  if (collateralIsBorrow && maxBorrowUsd > maxBorrowIfCollateral) {
    maxBorrowUsd = maxBorrowIfCollateral;
  }
  console.log("borrow USD", ethers.formatEther(maxBorrowUsd));
  const maxBorrow = convertUsdToTokenAmount(
    { decimals, assetPrice: borrowTokenAssetPrice },
    maxBorrowUsd
  );

  return maxBorrow;
}

async function executeLiquidation(
  collateralAsset: string,
  debtAsset: string,
  borrowAsset: string,
  userToLiquidate: string,
  debtToCover: bigint,
  provider: ethers.JsonRpcProvider,
  assetPrices: Record<string, UserReserveData>,
  signer: HardhatEthersSigner,
  LIQUIDATOR_CONTRACT: string,
  ASSET_PROVIDER: string,
  LENDING_POOL_ADDRESS: string
) {
  try {
    const liquidator = new ethers.Contract(
      LIQUIDATOR_CONTRACT,
      liquidatorAbi,
      signer
    );

    const uniswapService = new UniswapService();

    console.log("debtToCover", debtToCover);
    console.log(
      "convertTokenAmount params",
      {
        // debt asset
        assetPrice: assetPrices[debtAsset].assetPrice!,
        decimals: assetPrices[debtAsset].reserveData?.decimals!,
      },
      {
        // borrow asset
        assetPrice: assetPrices[borrowAsset].assetPrice!,
        decimals: assetPrices[borrowAsset].reserveData?.decimals!,
      },
      debtToCover
    );
    // how much to borrow from pool
    const borrowAmount = convertTokenAmount(
      {
        // borrow asset
        assetPrice: assetPrices[borrowAsset].assetPrice!,
        decimals: assetPrices[borrowAsset].reserveData?.decimals!,
      },
      {
        // debt asset
        assetPrice: assetPrices[debtAsset].assetPrice!,
        decimals: assetPrices[debtAsset].reserveData?.decimals!,
      },
      debtToCover
    );
    console.log("borrowAmount", borrowAmount);

    const optimalBorrowToDebtPath = await uniswapService.getAvailableSwapRoutes(
      borrowAsset,
      debtAsset,
      borrowAmount,
      signer
    );
    console.log(
      "convertTokenAmount params2",
      {
        // borrow asset
        assetPrice: assetPrices[debtAsset].assetPrice!,
        decimals: assetPrices[debtAsset].reserveData?.decimals!,
      },
      {
        // collateral asset
        assetPrice: assetPrices[collateralAsset].assetPrice!,
        decimals: assetPrices[collateralAsset].reserveData?.decimals!,
      },
      borrowAmount
    );

    const collateralAmount = convertTokenAmount(
      {
        // borrow asset
        assetPrice: assetPrices[borrowAsset].assetPrice!,
        decimals: assetPrices[borrowAsset].reserveData?.decimals!,
      },
      {
        // collateral asset
        assetPrice: assetPrices[collateralAsset].assetPrice!,
        decimals: assetPrices[collateralAsset].reserveData?.decimals!,
      },
      borrowAmount
    );

    console.log("collateralAmount", collateralAmount);
    const optimalCollateralToBorrowPath =
      await uniswapService.getAvailableSwapRoutes(
        collateralAsset,
        borrowAsset,
        collateralAmount,
        signer
      );

    console.log("params->");
    let params: LiquidationParams = {
      lendingPool: LENDING_POOL_ADDRESS,
      uniswapRouter: CURRENT_NETWORK.UNISWAP_ROUTER,
      uniswapQuoter: CURRENT_NETWORK.UNISWAP_QUOTER,
      assetProvider: ASSET_PROVIDER,
      collateralAsset,
      borrowAsset,
      debtAsset,
      userToLiquidate,
      debtToCover,
      slippage: 100,
      swapPathBorrowToDebt: optimalBorrowToDebtPath?.[0]?.encodedPath ?? "0x",
      swapPathCollateralToBorrow:
        optimalCollateralToBorrowPath?.[0]?.encodedPath ?? "0x",
    };
    console.log(params);
    // borrow same token for liquidation
    // slippage doesnt mean anything since there is no slippage
    // swap paths are never used if 0x
    const sameAsset =
      borrowAsset === collateralAsset && borrowAsset === debtAsset;

    if (sameAsset) {
      console.log(params);
      console.log("Simulating same asset TX");
      const simulatedTx = await liquidator.liquidationBorrow.staticCall(params);
      console.log("Simulation OK, result:", simulatedTx);

      const actualTx = await liquidator.liquidationBorrow(params);
      await actualTx.wait();

      return;
    }

    if (!sameAsset) {
      const collateralPaths = optimalCollateralToBorrowPath?.length
        ? optimalCollateralToBorrowPath.map((path) => path.encodedPath)
        : ["0x"];
      const borrowPaths = optimalBorrowToDebtPath?.length
        ? optimalBorrowToDebtPath.map((path) => path.encodedPath)
        : ["0x"];

      for (let divisor = 1; divisor < 66666; divisor *= 2) {
        for (let slippage = 100; slippage < 1000; slippage += 100) {
          for (const collateralPath of collateralPaths) {
            for (const borrowPath of borrowPaths) {
              let lessParam = {
                ...params,
                debtToCover: params.debtToCover / BigInt(divisor),
                swapPathBorrowToDebt: borrowPath,
                swapPathCollateralToBorrow: collateralPath,
                slippage,
              };
              try {
                console.log(params);
                console.log(
                  "Simulating TX Divided by " +
                    divisor +
                    ", slippage=" +
                    slippage +
                    ", borrowPath: " +
                    borrowPath +
                    ", collateralPath=" +
                    collateralPath
                );
                const simulatedTx =
                  await liquidator.liquidationBorrow.staticCall(lessParam);
                console.log("Simulation OK, result:", simulatedTx);

                const actualTx = await liquidator.liquidationBorrow(lessParam);
                await actualTx.wait();

                return;
              } catch (error) {}
            }
          }
        }
      }
    }

    return;
  } catch (error) {
    console.error("Liquidation execution failed:", error);
    throw error;
  }
}

export function convertTokenAmount(
  tokenA: { decimals: number; assetPrice: bigint },
  tokenB: { decimals: number; assetPrice: bigint },
  amountA: bigint
): bigint {
  const baseAmountA = amountA * 10n ** BigInt(18 - tokenA.decimals);
  const valueInBase = (baseAmountA * tokenA.assetPrice) / 10n ** 18n;
  const amountB = (valueInBase * 10n ** 18n) / tokenB.assetPrice;
  return amountB / 10n ** BigInt(18 - tokenB.decimals);
}

function convertUsdToTokenAmount(
  tokenA: { decimals: number; assetPrice: bigint },
  usd: bigint
): bigint {
  // Multiply USD (18 decimals) by 10^(token decimals) to scale to token's smallest unit,
  // then divide by the token's assetPrice (also 18 decimals) to determine the token amount.
  return (usd * 10n ** BigInt(tokenA.decimals)) / tokenA.assetPrice;
}
