import { CURRENT_NETWORK } from "../ignition/constant";

const { ethers } = require("hardhat");

export async function assetPrice() {
  const a = "0xB9a725E052A1A10b21840A6283b4A672a5BF5126";
  const b = "0x21F9330Ddd71E2410F0bD1772e88760201df1307"; //wbtc
  const c = "0xD76CcAfA7395CD9434e003AAe9bE606af7D3BEBa";

  const contract = new ethers.Contract(
    a,
    ["function getAssetPrice() external view returns (uint256)"],
    ethers.provider
  );

  // Call the deposit function to convert Ether to WETH
  const tx = await contract.getAssetPrice();
  console.log("tx", tx);
}

assetPrice();
