import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import "@nomicfoundation/hardhat-ethers";
import { ethers } from "ethers";
import { OPTIMISM_MAINNET } from "../../constant";
import JSBI from "jsbi";
import { TickMath } from "./utils/TickMath";
import { sqrt } from "@uniswap/sdk-core";

const DeployOftModule = require("./00-deploy-oft");
const DeployMultiFeeModule = require("./07-deploy-multi-fee-distribution");

module.exports = buildModule("CreateUniswapLP", (m) => {
  const FEE_TIER = 3000; // Supported fee tiers: 500, 3000, 10000
  const REWARD_TOKEN_AMOUNT = ethers.parseEther("1");
  const WETH_TOKEN_AMOUNT = ethers.parseEther("0.002"); // ~$50

  const multiFeeModule = m.useModule(DeployMultiFeeModule);

  const price: bigint = REWARD_TOKEN_AMOUNT / WETH_TOKEN_AMOUNT;

  const tick = priceToTick(price);

  // Calculate sqrtPriceX96
  const sqrtPriceX96 = TickMath.getSqrtRatioAtTick(tick);

  const oftModule = m.useModule(DeployOftModule);

  const uniswapV3Factory = m.contractAt(
    "IUniswapV3Factory",
    OPTIMISM_MAINNET.UNISWAP_V3_FACTORY
  );

  const jolt = m.contractAt("JoltOFT", oftModule.joltOft as any);

  const wETH = m.contractAt(
    "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20",
    OPTIMISM_MAINNET.WETH.ASSET_ADDRESS
  );

  const mintData =
    jolt.address > wETH.address
      ? {
          token0: {
            token: jolt,
            amount: REWARD_TOKEN_AMOUNT,
          },
          token1: {
            token: wETH,
            amount: WETH_TOKEN_AMOUNT,
          },
        }
      : {
          token0: {
            token: wETH,
            amount: WETH_TOKEN_AMOUNT,
          },
          token1: {
            token: jolt,
            amount: REWARD_TOKEN_AMOUNT,
          },
        };

  const createLP = m.call(
    uniswapV3Factory,
    "createPool",
    [mintData.token0.token, mintData.token1.token, FEE_TIER],
    { after: [multiFeeModule.multiFeeDistribution] }
  );

  const lpAddress = m.readEventArgument(createLP, "PoolCreated", "pool");

  const uniswapV3Pool = m.contractAt("IUniswapV3Pool", lpAddress);

  const callInitialize = m.call(uniswapV3Pool, "initialize", [
    sqrtPriceX96.toString(),
  ]);

  const positionManager = m.contractAt(
    "INonfungiblePositionManager",
    OPTIMISM_MAINNET.POSITION_MANAGER_ADDRESS
  );

  // approve tokens for mint
  const approveWETH = m.call(
    wETH,
    "approve",
    [OPTIMISM_MAINNET.POSITION_MANAGER_ADDRESS, WETH_TOKEN_AMOUNT],
    { id: "approveWETHforLP", after: [multiFeeModule.multiFeeDistribution] }
  );

  const approveReward = m.call(
    oftModule.joltOft as any,
    "approve",
    [OPTIMISM_MAINNET.POSITION_MANAGER_ADDRESS, REWARD_TOKEN_AMOUNT],
    { id: "approveRewardforLP", after: [multiFeeModule.multiFeeDistribution] }
  );

  const deadline = 3485097076338; // Date.now() * 2
  const TICK_LOWER = -887220; // Lower tick range
  const TICK_UPPER = 887220; // Upper tick range
  // Call the mint function to add liquidity
  const callMint = m.call(
    positionManager,
    "mint",
    [
      {
        token0: mintData.token0.token,
        token1: mintData.token1.token,
        fee: FEE_TIER,
        tickLower: TICK_LOWER,
        tickUpper: TICK_UPPER,
        amount0Desired: mintData.token0.amount,
        amount1Desired: mintData.token1.amount,
        amount0Min: 0,
        amount1Min: 0,
        recipient: m.getAccount(0),
        deadline,
      },
    ],
    { after: [createLP, callInitialize, approveWETH, approveReward] }
  );

  return { uniswapV3Factory, uniswapV3Pool };
});

// Convert price ratio to tick (simplified approach)
function priceToTick(price: BigInt): number {
  const sqrtPriceX96 = encodeSqrtRatioX96(price, BigInt(1));
  const tick = TickMath.getTickAtSqrtRatio(sqrtPriceX96);
  return tick;
}

export function encodeSqrtRatioX96(amount1: BigInt, amount0: BigInt): JSBI {
  const numerator = JSBI.leftShift(
    JSBI.BigInt(amount1.toString()),
    JSBI.BigInt(192)
  );
  const denominator = JSBI.BigInt(amount0.toString());
  const ratioX192 = JSBI.divide(numerator, denominator);
  return sqrt(ratioX192);
}
