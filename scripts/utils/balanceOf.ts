import { ethers } from "hardhat";
import { ERC20_ABI } from "../../abi/abi";

export async function balanceOf(token: string, address: string) {
  // Connect to the provider
  const provider = ethers.provider;

  // Create a contract instance connected to the provider
  const contract = new ethers.Contract(token, ERC20_ABI, provider);

  const balance = await contract.balanceOf(address);

  return balance;
}
