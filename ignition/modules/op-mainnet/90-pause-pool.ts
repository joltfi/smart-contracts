import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
const DeployCollateralConfiguratorModule = require("./04-deploy-lending-pool-configurator");
const DeployWETHModule = require("./20-deploy-weth");
const DeployUSDCModule = require("./25-deploy-usdc");
const DeployWBTCModule = require("./30-deploy-wbtc");

module.exports = buildModule("PausePoolModule", (m) => {
  const lendingPoolConfiguratorModule = m.useModule(
    DeployCollateralConfiguratorModule
  );

  // pause pool
  const lendingPoolConfiguratorProxy = m.contractAt(
    "LendingPoolConfigurator",
    lendingPoolConfiguratorModule.proxy
  );
  m.call(lendingPoolConfiguratorProxy, "setPoolPause", [true], {
    after: [DeployWETHModule, DeployUSDCModule, DeployWBTCModule],
  });

  return {};
});
