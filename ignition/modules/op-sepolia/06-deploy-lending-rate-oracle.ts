import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import "@nomicfoundation/hardhat-ethers";

const AddressProviderModule = require("./01-deploy-address-provider");

module.exports = buildModule("DeployLendingRateOracle", (m) => {
  const lendingRateOracle = m.contract("LendingRateOracle", [], {});

  const addressProviderModule = m.useModule(AddressProviderModule);
  m.call(
    addressProviderModule.lendingPoolAddressesProvider as any,
    "setLendingRateOracle",
    [lendingRateOracle]
  );

  return { lendingRateOracle };
});
