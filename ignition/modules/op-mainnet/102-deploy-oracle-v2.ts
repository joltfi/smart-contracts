import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import "@nomicfoundation/hardhat-ethers";
import { OPTIMISM_MAINNET } from "../../constant";

const PriceOracleModule = require("./09-deploy-price-oracle");

module.exports = buildModule("DeployOracleV2ForUSDC", (m) => {
  const CONFIG = OPTIMISM_MAINNET.USDC;
  const ADDRESS = CONFIG.ASSET_ADDRESS;

  const priceOracleModule = m.useModule(PriceOracleModule);

  // price feed
  const priceFeed = m.contract("ChainlinkUniswapV3PriceFeedV2", [
    OPTIMISM_MAINNET.USDC.CHAINLINK,
    OPTIMISM_MAINNET.USDC.UNISWAPV3,
    60 * 30, // TWAP 30 minutes
    60 * 60 * 24 + 60 * 15, // 24 hours + 15 minutes heartbeat chainlink timeout
    true,
  ]);

  const priceOracleUpdate = m.call(
    priceOracleModule.aaveOracle as any,
    "setAssetSources",
    [[ADDRESS], [priceFeed]],
    { after: [priceFeed] }
  );

  return {
    priceFeed,
  };
});
