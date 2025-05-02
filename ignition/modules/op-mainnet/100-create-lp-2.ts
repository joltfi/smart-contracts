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
  const REWARD_TOKEN_AMOUNT = ethers.parseEther("0.000001");
  const WETH_TOKEN_AMOUNT = ethers.parseEther("0.000001"); // ~$50

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

  const positionManager = m.contractAt(
    "INonfungiblePositionManager",
    OPTIMISM_MAINNET.POSITION_MANAGER_ADDRESS
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
    {
      id: "mint2",
    }
  );

  return { uniswapV3Factory };
});
