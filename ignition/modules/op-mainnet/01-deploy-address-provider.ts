import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { OPTIMISM_MAINNET } from "../../constant.ts";
import { keccak256, toUtf8Bytes } from "ethers";

module.exports = buildModule(
  "DeployLendingPoolAddressesProviderModule",
  (m) => {
    const marketId = m.getParameter("marketId", OPTIMISM_MAINNET.MARKET_ID);

    const lendingPoolAddressesProvider = m.contract(
      "LendingPoolAddressesProvider",
      [marketId]
    );

    m.call(lendingPoolAddressesProvider, "setAddress", [
      keccak256(toUtf8Bytes("TEAM_WALLET")),
      OPTIMISM_MAINNET.TEAM_WALLET,
    ]);

    m.call(lendingPoolAddressesProvider, "setPoolAdmin", [m.getAccount(0)]);

    m.call(lendingPoolAddressesProvider, "setEmergencyAdmin", [
      m.getAccount(0),
    ]);

    return { lendingPoolAddressesProvider };
  }
);
