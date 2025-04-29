import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const DeployOftModule = require("./00-deploy-oft");
const DeployAddressProvider = require("./01-deploy-address-provider");
const DeployLendingPoolModule = require("./02-deploy-lending-pool");
const DeployCollateralConfiguratorModule = require("./04-deploy-lending-pool-configurator");
const DeployCollateralManagerModule = require("./05-deploy-lending-pool-collateral-manager");
const DeployLendingRateOracleModule = require("./06-deploy-lending-rate-oracle");
const DeployMultiFeeModule = require("./07-deploy-multi-fee-distribution");
const DeployChefModule = require("./08-deploy-chef");
const DeployPriceOracleModule = require("./09-deploy-price-oracle");
const DeployWETHGatewayModule = require("./12-deploy-weth-gateway");
const DeployWETHModule = require("./20-deploy-weth");
const DeployUSDCModule = require("./25-deploy-usdc");
const DeployWBTCModule = require("./30-deploy-wbtc");
const DeployLiquidatorModule = require("./98-deploy-liquidator");
const PausePoolModule = require("./90-pause-pool");

module.exports = buildModule("DeployAllModule", (m) => {
  m.useModule(DeployOftModule);
  m.useModule(DeployAddressProvider);
  m.useModule(DeployLendingPoolModule);
  m.useModule(DeployCollateralConfiguratorModule);
  m.useModule(DeployCollateralManagerModule);
  m.useModule(DeployLendingRateOracleModule);
  m.useModule(DeployMultiFeeModule);
  m.useModule(DeployChefModule);
  m.useModule(DeployPriceOracleModule);
  m.useModule(DeployWETHGatewayModule);

  // tokens
  m.useModule(DeployWETHModule);
  m.useModule(DeployUSDCModule);
  m.useModule(DeployWBTCModule);

  // pause pool

  // deploy liquidator
  m.useModule(DeployLiquidatorModule);

  m.useModule(PausePoolModule);

  return {};
});
