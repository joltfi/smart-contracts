import { ethers, JsonRpcProvider } from "ethers";
import { aTokenAbi } from "../../abi/atoken.abi";
import { lendingPoolAbi } from "../../abi/lending-pool.abi";
import { multicall3Abi } from "../../abi/multicall3.abi";
import { ReserveData, UserReserveData } from "../../definitions/liquidate";

// Fetch the list of reserves (assets) from the lending pool
export async function getReservesList(
  lendingPoolAddress: string,
  provider: JsonRpcProvider
): Promise<string[]> {
  const lendingPoolAbi = [
    "function getReservesList() view returns (address[] memory reserves)",
  ];

  try {
    const lendingPool = new ethers.Contract(
      lendingPoolAddress,
      lendingPoolAbi,
      provider
    );

    const reservesList: string[] = await lendingPool.getReservesList();

    return reservesList;
  } catch (error) {
    console.error("Error fetching reserve assets:", error);
    return [];
  }
}

// Function to fetch reserve data for all assets using multicall3
export async function getReservesData3Impl(
  provider: JsonRpcProvider,
  reserveAddresses: string[],
  lendingPoolAddress: string,
  multicall3Address: string
) {
  try {
    // Create Multicall3 contract instance
    const multicallContract = new ethers.Contract(
      multicall3Address,
      multicall3Abi,
      provider
    );

    // Prepare the calls array for Multicall3
    const calls = reserveAddresses.map((reserveAddress) => ({
      target: lendingPoolAddress,
      callData: new ethers.Interface(lendingPoolAbi).encodeFunctionData(
        "getReserveData",
        [reserveAddress]
      ),
    }));

    const [, returnData] = await multicallContract["aggregate"](calls);

    const reserveData: Record<string, ReserveData> = {};

    // Process each reserve's data from returnData
    returnData.forEach((encodedData: ethers.BytesLike, index: number) => {
      const reserveAddress = reserveAddresses[index];
      const decodedData = new ethers.Interface(
        lendingPoolAbi
      ).decodeFunctionResult("getReserveData", encodedData);

      const [
        configuration,
        liquidityIndex,
        variableBorrowIndex,
        currentLiquidityRate,
        currentVariableBorrowRate,
        currentStableBorrowRate,
        lastUpdateTimestamp,
        aTokenAddress,
        stableDebtTokenAddress,
        variableDebtTokenAddress,
        interestRateStrategyAddress,
        id,
      ] = decodedData;

      const configurationData = BigInt(configuration);

      const LTV = Number(configurationData & BigInt("0xFFFF"));
      const liquidationThreshold = Number(
        (configurationData >> BigInt(16)) & BigInt("0xFFFF")
      );
      const liquidationBonus = Number(
        (configurationData >> BigInt(32)) & BigInt("0xFFFF")
      );
      const decimals = Number(
        (configurationData >> BigInt(48)) & BigInt("0xFF")
      );

      const isActive =
        ((configurationData >> BigInt(56)) & BigInt("0x1")) === BigInt(1);
      const isFrozen =
        ((configurationData >> BigInt(57)) & BigInt("0x1")) === BigInt(1);
      const isBorrowingEnabled =
        ((configurationData >> BigInt(58)) & BigInt("0x1")) === BigInt(1);
      const isStableRateBorrowingEnabled =
        ((configurationData >> BigInt(59)) & BigInt("0x1")) === BigInt(1);
      const reserved = Number(
        (configurationData >> BigInt(60)) & BigInt("0xF")
      );
      const reserveFactor = Number(
        (configurationData >> BigInt(64)) & BigInt("0xFFFF")
      );

      reserveData[reserveAddress] = {
        configuration: configuration.toString(),
        liquidityIndex: liquidityIndex.toString(),
        variableBorrowIndex: variableBorrowIndex.toString(),
        currentLiquidityRate: currentLiquidityRate.toString(),
        currentVariableBorrowRate: currentVariableBorrowRate.toString(),
        currentStableBorrowRate: currentStableBorrowRate.toString(),
        lastUpdateTimestamp: lastUpdateTimestamp.toString(),
        aTokenAddress,
        stableDebtTokenAddress,
        variableDebtTokenAddress,
        interestRateStrategyAddress,
        id: id.toString(),

        ltv: LTV,
        decimals,
        isActive,
        isBorrowingEnabled,
        isFrozen,
        isStableRateBorrowingEnabled,
        liquidationBonus,
        liquidationThreshold,
        reserved,
        reserveFactor,
      };
    });

    return reserveData;
  } catch (error) {
    console.error("Error fetching reserves data:", error);
    return {};
  }
}

export async function getAssetPricesWithMulticall3(
  reserves: Record<string, UserReserveData>, // List of aToken addresses
  multicall3Address: string, // Multicall3 contract address
  provider: JsonRpcProvider
) {
  try {
    // Create Multicall3 contract instance
    const multicallContract = new ethers.Contract(
      multicall3Address,
      multicall3Abi,
      provider
    );

    const entries = Object.entries(reserves);

    // Create the multicall for assetPrice for each aToken
    const calls: any = [];

    Object.values(entries).forEach(([reserve, userReserveData]) =>
      calls.push({
        target: userReserveData.reserveData?.aTokenAddress!,
        callData: new ethers.Interface(aTokenAbi).encodeFunctionData(
          "getAssetPrice"
        ),
      })
    );

    // Perform the multicall
    const result = await multicallContract.aggregate(calls);

    // Extract returnData from result
    const returnData = result[1]; // The actual data returned by the multicall

    // Decode the price for each aToken
    for (let i = 0; i < entries.length; i++) {
      const price = returnData[i];

      reserves[entries[i][0]].assetPrice = BigInt(price);
    }

    return reserves;
  } catch (error) {
    console.error("Error fetching asset prices:", error);
  }
}
