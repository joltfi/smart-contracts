import { ethers } from "hardhat";
import { OFT_ABI } from "../abi/abi";
import { CURRENT_NETWORK } from "../ignition/constant";
import { getDeploymentAddress } from "./utils/hardhat";

export async function erc20() {
  const wallet = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";
  console.log("hello");

  const addresses = [
    await getDeploymentAddress("DeployJoltOFT#JoltOFT"),
    CURRENT_NETWORK.WETH.ASSET_ADDRESS,
    CURRENT_NETWORK.USDC.ASSET_ADDRESS,
  ];

  for (const address of addresses) {
    await ercCall(address, wallet);
  }
}

async function ercCall(address: string, wallet: string) {
  console.log("ercCall", address);

  // Connect to the provider
  const provider = ethers.provider;

  // Create a contract instance connected to the provider
  const contract = new ethers.Contract(address, OFT_ABI, provider);

  // Fetch and log contract details
  const name = await contract.name();
  const symbol = await contract.symbol();
  const decimals = await contract.decimals();
  const totalSupply = await contract.totalSupply();
  const balance = await contract.balanceOf(wallet);

  console.log(`Name: ${name}`);
  console.log(`Symbol: ${symbol}`);
  console.log(`Decimals: ${decimals}`);
  console.log(`Total Supply: ${totalSupply}`);
  console.log(`Balance of ${wallet}: ${balance}`);
}

// Execute the script
erc20().catch((error) => {
  console.error("Error executing script:", error);
});
