import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

module.exports = buildModule("DeployDataProviderModule", (m) => {
  const LENDING_POOL_ADDRESSES_PROVIDER =
    "0x3D8a1EA95EA4afA2469bFB80D94A4F9068670e82";

  const AaveDataProvider = m.contract("AaveProtocolDataProvider", [
    LENDING_POOL_ADDRESSES_PROVIDER,
  ]);

  return {};
});
