import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import "@nomicfoundation/hardhat-ethers";

const AddressProviderModule = require("./01-deploy-address-provider");

module.exports = buildModule(
  "DeployLendingPoolCollateralManagerModule",
  (m) => {
    const addressProviderModule = m.useModule(AddressProviderModule);

    const lendingPoolCollateralManager = m.contract(
      "LendingPoolCollateralManager",
      [addressProviderModule.lendingPoolAddressesProvider],
      {}
    );

    m.call(
      addressProviderModule.lendingPoolAddressesProvider as any,
      "setLendingPoolCollateralManager",
      [lendingPoolCollateralManager]
    );

    return { lendingPoolCollateralManager };
  }
);
