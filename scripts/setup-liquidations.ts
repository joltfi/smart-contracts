import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { CURRENT_NETWORK } from "../ignition/constant";
import { ethToWEth } from "./eth-to-weth";
import { swap } from "./swap";
import { balanceOf } from "./utils/balanceOf";
import { getDeploymentAddress } from "./utils/hardhat";

const { ethers } = require("hardhat");

async function setupLiquidation(signer: HardhatEthersSigner) {
  // Address of the deployed contract
  const lendingPool = getDeploymentAddress(
    "DeployLendingPoolModule#InitializableImmutableAdminUpgradeabilityProxy"
  );
  const wethGateway = getDeploymentAddress(
    "WETHGatewayModule#wethLendingPoolDeployment"
  );

  console.log(`Using signer address: ${signer.address}`);

  const wethBalance: bigint = await balanceOf(
    CURRENT_NETWORK.WETH.ASSET_ADDRESS,
    await signer.getAddress()
  );
  if (wethBalance !== 0n) {
    console.log("already setup this signer, skipping");
    return;
  }

  await ethToWEth("", signer, "1000");

  await swap(
    signer,
    CURRENT_NETWORK.USDC.ASSET_ADDRESS,
    ethers.parseEther("1")
  );
  await swap(
    signer,
    CURRENT_NETWORK.WBTC.ASSET_ADDRESS,
    ethers.parseEther("1")
  );
}
