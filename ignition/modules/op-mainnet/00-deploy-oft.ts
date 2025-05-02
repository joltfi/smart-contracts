import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { OPTIMISM_MAINNET } from "../../constant";

module.exports = buildModule("DeployJoltOFT", (m) => {
  const joltOft = m.contract("JoltOFT", [
    "JOLT Finance",
    "JOLT",
    OPTIMISM_MAINNET.LZ_ENDPOINT,
    m.getAccount(0),
  ]);

  return { joltOft };
});
