import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import "@nomicfoundation/hardhat-ethers";

const DeployMultiFeeDistributionModule = require("./07-deploy-multi-fee-distribution");
const LendingPoolConfiguratorModule = require("./04-deploy-lending-pool-configurator");
const OftModule = require("./00-deploy-oft");

module.exports = buildModule("DeployFixedChefIncentivesController", (m) => {
  const multiFeeDistribution = m.useModule(DeployMultiFeeDistributionModule);
  const lendingPoolConfigurator = m.useModule(LendingPoolConfiguratorModule);
  const oftModule = m.useModule(OftModule);

  const chefIncentivesController = m.contract(
    "ChefIncentivesController",
    [
      lendingPoolConfigurator.proxy,
      multiFeeDistribution.multiFeeDistribution,
      oftModule.joltOft,
      223147795, // APR
    ],
    {}
  );

  return { chefIncentivesController };
});
