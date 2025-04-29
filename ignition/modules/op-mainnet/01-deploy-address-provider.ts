import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { OPTIMISM_MAINNET } from "../../constant.ts";

module.exports = buildModule(
  "DeployLendingPoolAddressesProviderModule",
  (m) => {
    const marketId = m.getParameter("marketId", OPTIMISM_MAINNET.MARKET_ID);

    const lendingPoolAddressesProvider = m.contract(
      "LendingPoolAddressesProvider",
      [marketId]
    );

    m.call(lendingPoolAddressesProvider, "setPoolAdmin", [
      OPTIMISM_MAINNET.DEPLOYER,
    ]);
    m.call(lendingPoolAddressesProvider, "setEmergencyAdmin", [
      OPTIMISM_MAINNET.DEPLOYER,
    ]);

    return { lendingPoolAddressesProvider };
  }
);
