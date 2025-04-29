import { ethers } from "hardhat";
import { ERC20_ABI } from "../../abi/abi";

export async function approve(
  signer: any,
  token: string,
  spender: string,
  amount: bigint
) {
  // Create a contract instance connected to the provider
  const contract = new ethers.Contract(token, ERC20_ABI, signer);

  const balance = await contract.approve(spender, amount);

  return balance;
}
