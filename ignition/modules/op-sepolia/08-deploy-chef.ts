import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import "@nomicfoundation/hardhat-ethers";

const DeployMultiFeeDistributionModule = require("./07-deploy-multi-fee-distribution");
const LendingPoolConfiguratorModule = require("./04-deploy-lending-pool-configurator");
const OftModule = require("./00-deploy-oft");

module.exports = buildModule("DeployChefIncentivesController", (m) => {
  const multiFeeDistribution = m.useModule(DeployMultiFeeDistributionModule);
  const lendingPoolConfigurator = m.useModule(LendingPoolConfiguratorModule);
  const oftModule = m.useModule(OftModule);

  const chefIncentivesController = m.contract(
    "ChefIncentivesController",
    [
      lendingPoolConfigurator.proxy,
      multiFeeDistribution.multiFeeDistribution,
      oftModule.joltOft,
      3000,
    ],
    {}
  );

  const call1 = m.call(
    multiFeeDistribution.multiFeeDistribution as any,
    "setMinters",
    [[chefIncentivesController]]
  );

  const call2 = m.call(
    multiFeeDistribution.multiFeeDistribution as any,
    "setIncentivesController",
    [chefIncentivesController]
  );

  m.call(
    multiFeeDistribution.multiFeeDistribution as any,
    "transferOwnership",
    [lendingPoolConfigurator.proxy],
    { after: [call2, call1] }
  );

  return { chefIncentivesController };
});
