import { ERC20_ABI } from "../abi/abi";
import { CURRENT_NETWORK } from "../ignition/constant";
import { getDeploymentAddress } from "./utils/hardhat";

const { ethers } = require("hardhat");

export async function mint() {
  // ABI of the contract (you need to know the ABI of the contract)
  const abi = ERC20_ABI;

  // Get the signer (the account that will interact with the contract)
  const [signer] = await ethers.getSigners();

  console.log(`Using signer address: ${signer.address}`);

  const wETH = new ethers.Contract(
    CURRENT_NETWORK.WETH.ASSET_ADDRESS,
    abi,
    signer
  );

  const reward = new ethers.Contract(
    getDeploymentAddress("DeployJoltOFT#JoltOFT"),
    abi,
    signer
  );

  const wethBalance = await wETH.balanceOf(signer.address);
  const wethAllowance = await wETH.allowance(
    signer.address,
    CURRENT_NETWORK.POSITION_MANAGER_ADDRESS
  );
  const joltBalance = await reward.balanceOf(signer.address);
  const joltAllowance = await reward.allowance(
    signer.address,
    CURRENT_NETWORK.POSITION_MANAGER_ADDRESS
  );
  console.log(`wethAllowance: ${wethAllowance}`);
  console.log(`wethBalance: ${wethBalance}`);
  console.log(`joltAllowance: ${joltAllowance}`);
  console.log(`joltBalance: ${joltBalance}`);
}
mint();
