import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

module.exports = buildModule("UnpausePoolModule", (m) => {
  // pause pool
  const lendingPoolConfiguratorProxy = m.contractAt(
    "LendingPoolConfigurator",
    "0x431c27E5633CDFC20Cf5392ADE921C37524CE6EB"
  );
  m.call(lendingPoolConfiguratorProxy, "setPoolPause", [false], {
    id: "unpauseAfterGoLive",
  });

  return {};
});
