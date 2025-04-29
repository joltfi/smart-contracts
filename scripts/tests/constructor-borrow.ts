import { CURRENT_NETWORK } from "../../ignition/constant";
import { getDeploymentAddress } from "../utils/hardhat";

// scripts/deploy.js
const { ethers } = require("hardhat");

async function main() {
  // Get the deployer's account from Hardhat
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contract with the account:", deployer.address);

  // Example addresses (replace these with real addresses)
  const WETH_ADDRESS = CURRENT_NETWORK.WETH.ASSET_ADDRESS; // e.g., mainnet: 0xC02aaa39b223FE8D0A0e5C4F27eAD9083C756Cc2
  const LENDING_POOL_ADDRESS = getDeploymentAddress(
    "DeployLendingPoolModule#InitializableImmutableAdminUpgradeabilityProxy"
  ); // Lending pool address
  const BORROW_TOKEN_ADDRESS = CURRENT_NETWORK.USDC.ASSET_ADDRESS; // The token you want to borrow

  // Specify the amount of token to borrow (make sure to match token decimals)
  // Example: Borrow 100 tokens with 18 decimals
  const borrowAmount = ethers.parseUnits("0.000001", 18);

  // Specify how much ETH to send to the constructor to wrap into WETH (e.g., 1 ETH)
  const ethToSend = ethers.parseEther("1");

  // Get the contract factory for ConstructorBorrow
  const constructorBorrow = await ethers.getContractFactory(
    "ConstructorBorrow"
  );

  console.log("WETH_ADDRESS", WETH_ADDRESS);
  console.log("LENDING_POOL_ADDRESS", LENDING_POOL_ADDRESS);
  console.log("BORROW_TOKEN_ADDRESS", BORROW_TOKEN_ADDRESS);
  console.log("borrowAmount", borrowAmount);
  console.log("ethToSend", ethToSend);

  // Deploy the contract
  const contract = await constructorBorrow.deploy(
    WETH_ADDRESS,
    LENDING_POOL_ADDRESS,
    BORROW_TOKEN_ADDRESS,
    borrowAmount,
    { value: ethToSend } // send ETH for conversion to WETH
  );

  await contract.deployed();
  console.log("ETHToWETHLending deployed to:", contract.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
