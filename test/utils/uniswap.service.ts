import { ethers } from "ethers";
import { PoolInfo, QUOTER_ABI, UNISWAP_FACTORY_ABI } from "../abi/uniswap.abi";
import { multicall3Abi } from "../abi/multicall3.abi";
import { CURRENT_NETWORK } from "../../ignition/constant";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

export class UniswapService {
  FEE_TIERS = [500, 3000, 10000];
  /**
   * Uses Multicall3 to query the factory for the existence of direct pools between tokenIn and tokenOut.
   * Then, for each valid pool, it queries the quoter for the expected output amount.
   */
  async getDirectPools(
    tokenIn: string,
    tokenOut: string,
    amountIn: bigint,
    provider: HardhatEthersSigner
  ): Promise<PoolInfo[]> {
    const factory = new ethers.Contract(
      CURRENT_NETWORK.UNISWAP_V3_FACTORY,
      UNISWAP_FACTORY_ABI,
      provider
    );
    const multicall = new ethers.Contract(
      CURRENT_NETWORK.MULTICALL3,
      multicall3Abi,
      provider
    );
    const quoter = new ethers.Contract(
      CURRENT_NETWORK.UNISWAP_QUOTER,
      QUOTER_ABI,
      provider
    );

    // Build an array of calls—one for each fee tier.
    const calls = this.FEE_TIERS.map((fee) => {
      const callData = factory.interface.encodeFunctionData("getPool", [
        tokenIn,
        tokenOut,
        fee,
      ]);
      return {
        target: CURRENT_NETWORK.UNISWAP_V3_FACTORY,
        allowFailure: true,
        callData,
      };
    });

    // Execute the multicall aggregate3
    const results: { success: boolean; returnData: string }[] = await multicall[
      "aggregate3"
    ](calls);

    const pools: PoolInfo[] = [];
    for (let i = 0; i < this.FEE_TIERS.length; i++) {
      const fee = this.FEE_TIERS[i];
      const { success, returnData } = results[i];
      if (success) {
        const decoded = factory.interface.decodeFunctionResult(
          "getPool",
          returnData
        );
        const poolAddress = decoded[0];
        // If the returned pool address is nonzero, then the pool exists.
        if (poolAddress !== ethers.ZeroAddress) {
          let output: bigint | undefined;
          try {
            output = await quoter["quoteExactInputSingle"](
              tokenIn,
              tokenOut,
              fee,
              amountIn,
              0 // sqrtPriceLimitX96 = 0 indicates no limit.
            );
          } catch (err) {
            console.error(`Quoter call failed for fee ${fee}:`, err);
          }

          const encodedPath = ethers.solidityPacked(
            ["address", "uint24", "address"],
            [tokenIn, fee, tokenOut]
          );

          pools.push({
            route: "direct",
            fee,
            pool: poolAddress,
            output,
            encodedPath,
          });
        }
      }
    }
    return pools;
  }

  /**
   * Checks for a multi-hop route via WETH.
   * It verifies that both tokenIn→WETH and WETH→tokenOut pools exist for various fee tiers,
   * then uses the quoter to estimate the output of the multi-hop swap.
   */
  async getMultiHopPools(
    tokenIn: string,
    tokenOut: string,
    amountIn: bigint,
    provider: HardhatEthersSigner
  ): Promise<PoolInfo[]> {
    // Only consider multi-hop if neither token is WETH.
    if (
      tokenIn.toLowerCase() ===
        CURRENT_NETWORK.WETH.ASSET_ADDRESS!.toLowerCase() ||
      tokenOut.toLowerCase() ===
        CURRENT_NETWORK.WETH.ASSET_ADDRESS!.toLowerCase()
    ) {
      return [];
    }

    const factory = new ethers.Contract(
      CURRENT_NETWORK.UNISWAP_V3_FACTORY,
      UNISWAP_FACTORY_ABI,
      provider
    );
    const multicall = new ethers.Contract(
      CURRENT_NETWORK.MULTICALL3,
      multicall3Abi,
      provider
    );
    const quoter = new ethers.Contract(
      CURRENT_NETWORK.UNISWAP_QUOTER,
      QUOTER_ABI,
      provider
    );

    // Build calls for the first leg: tokenIn -> WETH
    const callsFirstLeg = this.FEE_TIERS.map((fee) =>
      factory.interface.encodeFunctionData("getPool", [
        tokenIn,
        CURRENT_NETWORK.WETH.ASSET_ADDRESS,
        fee,
      ])
    );
    // Build calls for the second leg: WETH -> tokenOut
    const callsSecondLeg = this.FEE_TIERS.map((fee) =>
      factory.interface.encodeFunctionData("getPool", [
        CURRENT_NETWORK.WETH.ASSET_ADDRESS,
        tokenOut,
        fee,
      ])
    );

    // Prepare the multicall calls (first leg then second leg)
    const calls = [
      ...callsFirstLeg.map((callData) => ({
        target: CURRENT_NETWORK.UNISWAP_V3_FACTORY,
        allowFailure: true,
        callData,
      })),
      ...callsSecondLeg.map((callData) => ({
        target: CURRENT_NETWORK.UNISWAP_V3_FACTORY,
        allowFailure: true,
        callData,
      })),
    ];

    const results: { success: boolean; returnData: string }[] = await multicall[
      "aggregate3"
    ](calls);

    const multiHopPools: PoolInfo[] = [];
    // Process results for the first leg (indexes 0 .. FEE_TIERS.length - 1)
    for (let i = 0; i < this.FEE_TIERS.length; i++) {
      const fee1 = this.FEE_TIERS[i];
      const res1 = results[i];
      if (!res1.success) continue;
      const decoded1 = factory.interface.decodeFunctionResult(
        "getPool",
        res1.returnData
      );
      const pool1 = decoded1[0];
      if (pool1 === ethers.ZeroAddress) continue;

      // Process results for the second leg (indexes FEE_TIERS.length ... end)
      for (let j = 0; j < this.FEE_TIERS.length; j++) {
        const fee2 = this.FEE_TIERS[j];
        const res2 = results[this.FEE_TIERS.length + j];
        if (!res2.success) continue;
        const decoded2 = factory.interface.decodeFunctionResult(
          "getPool",
          res2.returnData
        );
        const pool2 = decoded2[0];
        if (pool2 === ethers.ZeroAddress) continue;

        // Build the multi-hop path: tokenIn -> WETH -> tokenOut
        const encodedPath = ethers.solidityPacked(
          ["address", "uint24", "address", "uint24", "address"],
          [tokenIn, fee1, CURRENT_NETWORK.WETH.ASSET_ADDRESS, fee2, tokenOut]
        );
        let output: bigint | undefined;
        try {
          output = await quoter["quoteExactInput"](encodedPath, amountIn);
        } catch (err) {
          console.error(
            `Multi-hop quoter failed for fees ${fee1} & ${fee2}:`,
            err
          );
        }
        multiHopPools.push({
          route: "multi-hop",
          fee1,
          fee2,
          // Optionally, you could include pool addresses for each leg here.
          output,
          encodedPath,
        });
      }
    }
    return multiHopPools;
  }

  /**
   * Main function.
   *
   * @param tokenIn - Address of the input token.
   * @param tokenOut - Address of the output token.
   * @param amountIn - The amount (as a BigNumberish) of tokenIn to swap.
   * @returns A Promise resolving to an array of possible routes with pool info and expected outputs.
   */
  async getAvailableSwapRoutes(
    tokenIn: string,
    tokenOut: string,
    amountIn: bigint,
    provider: HardhatEthersSigner
  ): Promise<PoolInfo[]> {
    const amount = amountIn;
    console.log("amountIn", amount);
    // Run both queries concurrently.
    const [directRoutes, multiHopRoutes] = await Promise.all([
      this.getDirectPools(tokenIn, tokenOut, amount, provider),
      this.getMultiHopPools(tokenIn, tokenOut, amount, provider),
    ]);

    // Combine the routes.
    const combinedRoutes = [...directRoutes, ...multiHopRoutes];

    // Sort routes in descending order based on expected output.
    combinedRoutes.sort((a, b) => {
      const aOut = a.output ?? BigInt(0);
      const bOut = b.output ?? BigInt(0);
      if (bOut > aOut) return 1;
      if (bOut < aOut) return -1;
      return 0;
    });
    return combinedRoutes;
  }
}
