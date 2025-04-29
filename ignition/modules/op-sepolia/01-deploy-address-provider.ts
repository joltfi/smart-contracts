import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { OPTIMISM_SEPOLIA } from "../../constant.ts";

module.exports = buildModule(
  "DeployLendingPoolAddressesProviderModule",
  (m) => {
    const marketId = m.getParameter("marketId", OPTIMISM_SEPOLIA.MARKET_ID);

    const lendingPoolAddressesProvider = m.contract(
      "LendingPoolAddressesProvider",
      [marketId]
    );

    m.call(lendingPoolAddressesProvider, "setPoolAdmin", [
      OPTIMISM_SEPOLIA.DEPLOYER,
    ]);
    m.call(lendingPoolAddressesProvider, "setEmergencyAdmin", [
      OPTIMISM_SEPOLIA.DEPLOYER,
    ]);

    return { lendingPoolAddressesProvider };
  }
);
