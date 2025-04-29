import { time } from "@nomicfoundation/hardhat-network-helpers";
import { getDeploymentAddress } from "./utils/hardhat";

async function main() {
  const addressProvider = getDeploymentAddress(
    "DeployLendingPoolAddressesProviderModule#LendingPoolAddressesProvider"
  );
  const jolt = getDeploymentAddress("DeployJoltOFT#JoltOFT");
  const pool = getDeploymentAddress("CreateUniswapLP#IUniswapV3Pool");
  const liquidatiorContract = getDeploymentAddress(
    "AaveLiquidationBotModule#AaveLiquidationBot"
  );

  console.log("addressProvider:", addressProvider);
  console.log("jolt:", jolt);
  console.log("pool:", pool);
  console.log("liquidatorContract:", liquidatiorContract);
}

main();
