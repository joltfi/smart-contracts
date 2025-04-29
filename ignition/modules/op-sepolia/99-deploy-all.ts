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
const CreateUniswapLPModule = require("./10-create-lp");
const DeployWETHGatewayModule = require("./12-deploy-weth-gateway");
const DeployWETHModule = require("./20-deploy-weth");
const DeployUSDCModule = require("./25-deploy-usdc");
const StartChefModule = require("./11-start-chef");
const DeployLiquidatorModule = require("./98-deploy-liquidator");

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
  m.useModule(CreateUniswapLPModule);
  m.useModule(DeployLiquidatorModule);
  m.useModule(DeployWETHGatewayModule);

  // tokens
  m.useModule(DeployWETHModule);
  m.useModule(DeployUSDCModule);

  // start chef
  m.useModule(StartChefModule);

  return {};
});
