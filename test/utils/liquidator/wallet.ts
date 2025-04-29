import { ethers, JsonRpcProvider } from "ethers";
import { erc20Abi } from "../../abi/erc20.abi";
import { multicall3Abi } from "../../abi/multicall3.abi";
import {
  Borrower,
  UserReserveData,
  UserPosition,
} from "../../definitions/liquidate";

export async function getUserCollateralAndDebtBalancesInBatches(
  borrowers: Borrower[],
  reserves: Record<string, UserReserveData>,
  provider: JsonRpcProvider,
  MULTICALL3: string
) {
  console.log("multi3", MULTICALL3);
  try {
    const multicallContract = new ethers.Contract(
      MULTICALL3,
      multicall3Abi,
      provider
    );

    // Arrays to store call objects and their mapping info
    const calls: any[] = [];
    const callMappings: {
      userAddress: string;
      reserve: string;
      type: "collateral" | "debt";
    }[] = [];
    const entries = Object.entries(reserves);
    const erc20Interface = new ethers.Interface(erc20Abi);

    // Build calls and mapping arrays
    entries.forEach(([reserve, userReserveData]) => {
      borrowers.forEach((borrower) => {
        // Collateral balance call (aToken)
        calls.push({
          target: userReserveData.reserveData!.aTokenAddress,
          callData: erc20Interface.encodeFunctionData("balanceOf", [
            borrower.address,
          ]),
        });
        callMappings.push({
          userAddress: borrower.address!,
          reserve,
          type: "collateral",
        });

        // Debt balance call (variableDebtToken)
        calls.push({
          target: userReserveData.reserveData!.variableDebtTokenAddress,
          callData: erc20Interface.encodeFunctionData("balanceOf", [
            borrower.address,
          ]),
        });
        callMappings.push({
          userAddress: borrower.address!,
          reserve,
          type: "debt",
        });
      });
    });

    // Prepare the output object
    const userBalances: Record<string, Record<string, UserPosition>> = {};

    // Helper function to initialize the nested structure if missing
    const initializeUserReserve = (
      userAddress: string,
      reserve: string,
      reserveData: UserReserveData
    ) => {
      if (!userBalances[userAddress]) {
        userBalances[userAddress] = {};
      }
      if (!userBalances[userAddress][reserve]) {
        userBalances[userAddress][reserve] = {
          userCollateralAddress: reserveData.reserveData?.aTokenAddress!,
          userDebtAddress: reserveData.reserveData?.variableDebtTokenAddress!,
          userCollateralAmount: 0n,
          userDebtAmount: 0n,
        };
      }
    };

    const errors: any[] = [];
    const batchSize = 10; // Adjust based on RPC limits

    // Process calls in batches
    for (let i = 0; i < calls.length; i += batchSize) {
      const currentBatch = calls.slice(i, i + batchSize);
      const currentMappings = callMappings.slice(i, i + batchSize);

      try {
        // Execute the multicall for the current batch
        const result = await multicallContract.aggregate.staticCall(
          currentBatch
        );
        const returnData = result[1];

        // Process each result using our mapping
        for (let j = 0; j < returnData.length; j++) {
          const mapping = currentMappings[j];
          const value = ethers.toBigInt(returnData[j]);
          const reserveData = reserves[mapping.reserve];

          // Ensure the nested structure exists
          initializeUserReserve(
            mapping.userAddress,
            mapping.reserve,
            reserveData
          );

          // Update the appropriate field based on the call type
          if (mapping.type === "collateral") {
            userBalances[mapping.userAddress][
              mapping.reserve
            ].userCollateralAmount = value;
          } else if (mapping.type === "debt") {
            userBalances[mapping.userAddress][mapping.reserve].userDebtAmount =
              value;
          }
        }
      } catch (error) {
        errors.push({
          batchIndex: Math.floor(i / batchSize),
          error: error instanceof Error ? error.message : "Unknown error",
        });
        console.error(`Batch ${Math.floor(i / batchSize)} failed:`, error);
      }
    }

    // Return both the collected balances and any errors encountered
    return {
      balances: userBalances,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    console.error("Critical error in balance fetching:", error);
    throw new Error(
      "Failed to fetch balances: " +
        (error instanceof Error ? error.message : "Unknown error")
    );
  }
}
