import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { OPTIMISM_SEPOLIA } from "../../constant";

module.exports = buildModule("DeployJoltOFT", (m) => {
  const joltOft = m.contract("JoltOFT", [
    "JOLT Finance",
    "JOLT",
    OPTIMISM_SEPOLIA.LZ_ENDPOINT,
    OPTIMISM_SEPOLIA.DEPLOYER,
  ]);

  return { joltOft };
});
