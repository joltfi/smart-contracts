import { ethToWEth } from "./eth-to-weth";
import { swap } from "./swap";
import { CURRENT_NETWORK } from "../ignition/constant";
import { ethers } from "hardhat";

const PRIVATE_KEY = process.env.PRIVATE_KEY; // Replace with the private key

async function main() {
  for (const privateKey of [PRIVATE_KEY]) {
    // get some WETH
    await ethToWEth(privateKey!, undefined, "2");
    // get some USDC
    await swap(
      privateKey!,
      CURRENT_NETWORK.USDC.ASSET_ADDRESS,
      ethers.parseEther("0.01"),
      500
    );
    // get some WBTC
    await swap(
      privateKey!,
      CURRENT_NETWORK.WBTC.ASSET_ADDRESS,
      ethers.parseEther("1"),
      500
    );
  }
}

main();
