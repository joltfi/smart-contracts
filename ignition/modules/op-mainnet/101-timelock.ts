import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import "@nomicfoundation/hardhat-ethers";
import { OPTIMISM_MAINNET } from "../../constant";

module.exports = buildModule("TimelockController2", (m) => {
  const TIMELOCK_CONTRACT = "0x272Cf01607783CC9DB7506244dc6ac2f113702FC";
  const AAVE_ORACLE = "0x4526B19247305a57605af2A9381d1f842d3D25f1";
  const CHEF = "0x0774275E354561C2eDcAac816f2CE7971aCA1d9a";
  const WETH_PRICE_FEED = "0x8209d4eCFf1253feCAd1B0A030B7d16Ba348a1E2";
  const USDC_PRICE_FEED = "0xF849f96B72De00ca5EF8Fdff76D83cfB4e53b0D8";
  const WBTC_PRICE_FEED = "0x47d4B5848cB723BcF3d9799432a7B31eE9992d59";
  const WETH_GATEWAY = "0x6915F20F7793d2bba1BAb289994188e9C7167BB0";
  const LENDING_RATE_ORACLE = "0xd57DfC8202BF2945CE742aeaEaA88921aEa1EBff";

  // price oracle
  const aaveOracle = m.contractAt("AaveOracle", AAVE_ORACLE, {
    id: "aaveOracle",
  });
  m.call(aaveOracle, "transferOwnership", [TIMELOCK_CONTRACT], {
    id: "aaveOracleOwnership",
  });

  // chef
  const chef = m.contractAt("ChefIncentivesController", CHEF, {
    id: "chef",
  });
  m.call(chef, "transferOwnership", [TIMELOCK_CONTRACT], {
    id: "chefOwnership",
  });

  // oracles
  const weth = m.contractAt("ChainlinkUniswapV3PriceFeed", WETH_PRICE_FEED, {
    id: "weth",
  });
  m.call(weth, "transferOwnership", [TIMELOCK_CONTRACT], {
    id: "wethOracleOwnership",
  });

  const wbtc = m.contractAt("ChainlinkUniswapV3PriceFeed", WBTC_PRICE_FEED, {
    id: "wbtc",
  });
  m.call(wbtc, "transferOwnership", [TIMELOCK_CONTRACT], {
    id: "wbtcOracleOwnership",
  });

  const usdc = m.contractAt("ChainlinkUniswapV3PriceFeedV2", USDC_PRICE_FEED, {
    id: "usdc",
  });
  m.call(usdc, "transferOwnership", [TIMELOCK_CONTRACT], {
    id: "usdcOracleOwnership",
  });

  // weth gateway
  const gateway = m.contractAt("WETHGateway", WETH_GATEWAY, {
    id: "gateway",
  });
  m.call(gateway, "transferOwnership", [TIMELOCK_CONTRACT], {
    id: "wethGatewayOwnership",
  });

  // lending rate oracle
  const lendingRateOracle = m.contractAt(
    "LendingRateOracle",
    LENDING_RATE_ORACLE,
    {
      id: "lendingRateOracle",
    }
  );
  m.call(lendingRateOracle, "transferOwnership", [TIMELOCK_CONTRACT], {
    id: "lendingRateOracleOwnership",
  });

  return {};
});
