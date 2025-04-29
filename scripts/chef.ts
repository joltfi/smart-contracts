import { CHEF_ABI } from "../abi/abi";
import { erc20 } from "./erc20";
import { getDeploymentAddress } from "./utils/hardhat";

const { ethers } = require("hardhat");

async function main() {
  // Address of the deployed contract
  const contractAddress = getDeploymentAddress(
    "DeployChefIncentivesController#ChefIncentivesController"
  );

  const rewardToken = getDeploymentAddress("DeployJoltOFT#JoltOFT");

  // Get the signer (the account that will interact with the contract)
  const [signer] = await ethers.getSigners();

  console.log(`Using signer address: ${signer.address}`);

  const contract = new ethers.Contract(contractAddress, CHEF_ABI, signer);

  console.log(`totalAllocPoint: ` + (await contract.totalAllocPoint()));

  for (let i = 0; i < 2; i++) {
    const addr = await contract.registeredTokens(i);
    console.log(`token ${i}: ` + addr);
    erc20(addr);
  }
}

// Execute the script
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
