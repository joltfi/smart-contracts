import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import "@nomicfoundation/hardhat-ethers";

const ChefModule = require("./08-deploy-chef");

module.exports = buildModule("StartChefModule", (m) => {
  const chefModule = m.useModule(ChefModule);

  m.call(chefModule.chefIncentivesController as any, "start", [], {
    after: [],
  });

  return {};
});
