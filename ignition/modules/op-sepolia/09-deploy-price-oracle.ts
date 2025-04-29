import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import "@nomicfoundation/hardhat-ethers";

const AddressProviderModule = require("./01-deploy-address-provider");

module.exports = buildModule("DeployPriceOracle", (m) => {
  const aaveOracle = m.contract("AaveOracle", [[], []], {});

  const addressProviderModule = m.useModule(AddressProviderModule);
  m.call(
    addressProviderModule.lendingPoolAddressesProvider as any,
    "setPriceOracle",
    [aaveOracle]
  );

  return { aaveOracle };
});
