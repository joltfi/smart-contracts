import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { OPTIMISM_MAINNET } from "../../constant";

const LendingPoolProxyModule = require("./02-deploy-lending-pool");

module.exports = buildModule("AaveLiquidationBotModule", (m) => {
  const liquidationBot = m.contract("AaveLiquidationBot", [m.getAccount(0)]);

  const lendingPoolProxy = m.useModule(LendingPoolProxyModule);

  const lendingPool = m.contractAt("LendingPool", lendingPoolProxy.proxy);
  m.call(lendingPool, "whitelist", [liquidationBot, true]);

  return { liquidationBot };
});
