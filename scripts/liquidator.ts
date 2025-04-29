import { getDeploymentAddress } from "./utils/hardhat";

const { ethers } = require("hardhat");

async function main() {
  const LENDING_POOL = getDeploymentAddress(
    "DeployLendingPoolModule#InitializableImmutableAdminUpgradeabilityProxy"
  );

  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy the AaveLiquidationBot contract
  const AaveLiquidationBot = await ethers.getContractFactory(
    "AaveLiquidationBot"
  );
  const liquidationBot = await AaveLiquidationBot.deploy(deployer.address);
  await liquidationBot.waitForDeployment();
  console.log(
    "AaveLiquidationBot deployed at:",
    await liquidationBot.getAddress()
  );

  // Call addToWhitelist on the lending pool
  const lendingPool = await ethers.getContractAt(
    "LendingPool",
    await LENDING_POOL
  );
  await lendingPool.addToWhitelist(await liquidationBot.getAddress());
  console.log("Added liquidation bot to lending pool whitelist");

  // Encode roles
  const LIQUIDATOR_ROLE = ethers.keccak256(
    ethers.toUtf8Bytes("LIQUIDATOR_ROLE")
  );
  const targetAddress = "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199";

  // Assign role to address
  await liquidationBot.addRole(LIQUIDATOR_ROLE, targetAddress);
  console.log("Assigned LIQUIDATOR_ROLE to:", targetAddress);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
