import { ALL_ABI, ERC20_ABI, MULTIFEE_ABI, OFT_ABI } from "../abi/abi";
import { CURRENT_NETWORK } from "../ignition/constant";
import { getDeploymentAddress } from "./utils/hardhat";

const { ethers } = require("hardhat");

async function main() {
  // Address of the deployed contract
  const contractAddress = getDeploymentAddress(
    "DeployMultiFeeDistribution#MultiFeeDistribution"
  );

  const rewardToken = getDeploymentAddress("DeployJoltOFT#JoltOFT");
  const jwETHAddress = getDeploymentAddress("DeployWEthModule#AToken");

  const wallet = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";

  // Get the signer (the account that will interact with the contract)
  const [signer] = await ethers.getSigners();

  console.log(`Using signer address: ${signer.address}`);

  const contract = new ethers.Contract(contractAddress, MULTIFEE_ABI, signer);
  const jWETH = new ethers.Contract(
    "0x3A7BADaE41a29CB894Be03E2C053135ad7d585f0",
    ERC20_ABI,
    signer
  );
  const wETH = new ethers.Contract(
    CURRENT_NETWORK.WETH.ASSET_ADDRESS,
    ERC20_ABI,
    signer
  );
  const jolt = new ethers.Contract(rewardToken, ERC20_ABI, signer);
  console.log("multiFeeAddresss: " + contractAddress);
  console.log("balanceOf JOLT: " + (await jolt.balanceOf(contractAddress)));
  console.log("balanceOf jWETH: " + (await jWETH.balanceOf(contractAddress)));
  console.log(
    "balanceOf WETH: " +
      (await wETH.balanceOf("0x3A7BADaE41a29CB894Be03E2C053135ad7d585f0"))
  );
  console.log(
    "balanceOf dead: " +
      (await jWETH.balanceOf("0x000000000000000000000000000000000000dEaD"))
  );
  console.log(
    `rewardPerToken JOLT: ` + (await contract.rewardPerToken(rewardToken))
  );
  console.log(
    `rewardPerToken WETH: ` +
      (await contract.rewardPerToken(CURRENT_NETWORK.WETH.ASSET_ADDRESS))
  );
  console.log(
    `rewardPerToken Signer: ` + (await contract.rewardPerToken(signer.address))
  );

  console.log(
    `getRewardForDuration JOLT: ` +
      (await contract.getRewardForDuration(rewardToken))
  );
  console.log(
    `getRewardForDuration WETH: ` +
      (await contract.getRewardForDuration(CURRENT_NETWORK.WETH.ASSET_ADDRESS))
  );
  console.log(
    `getRewardForDuration Signer: ` +
      (await contract.getRewardForDuration(signer.address))
  );

  console.log(`rewardData JOLT: ` + (await contract.rewardData(rewardToken)));
  console.log(
    `rewardData WETH: ` +
      (await contract.rewardData(CURRENT_NETWORK.WETH.ASSET_ADDRESS))
  );
  console.log(
    `rewardData Signer: ` + (await contract.rewardData(signer.address))
  );
  console.log(
    `incentivesController ` + (await contract.incentivesController())
  );
  console.log(`lockDuration ` + (await contract.lockDuration()));
  console.log(`lockedSupply ` + (await contract.lockedSupply()));
  console.log(`mintersAreSet ` + (await contract.mintersAreSet()));
  console.log(`rewardsDuration ` + (await contract.rewardsDuration()));
  console.log(`stakingToken ` + (await contract.stakingToken()));
  console.log(`totalSupply ` + (await contract.totalSupply()));

  const aTokenAddress = "0x3A7BADaE41a29CB894Be03E2C053135ad7d585f0";
  const aToken = new ethers.Contract(rewardToken, ERC20_ABI, signer);

  console.log("aTokenBalance ", await aToken.balanceOf(contractAddress));
  console.log(
    "wEth ",
    await aToken.balanceOf(CURRENT_NETWORK.WETH.ASSET_ADDRESS)
  );
}

// Execute the script
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
