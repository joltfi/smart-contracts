import { CURRENT_NETWORK } from "../ignition/constant";

const { ethers } = require("hardhat");

export async function ethToWEth(
  privateKey: string,
  _signer?: any | undefined,
  amountInEther?: string
) {
  // Private key of the signer (ensure the private key is stored securely and not hardcoded in production)

  // Create a signer from the private key
  const signer = _signer ?? new ethers.Wallet(privateKey, ethers.provider);

  // Connect to the WETH contract
  const wethContract = new ethers.Contract(
    CURRENT_NETWORK.WETH.ASSET_ADDRESS,
    [
      "function deposit() public payable",
      "function balanceOf(address account) external view returns (uint256)",
    ],
    signer
  );

  // Amount of Ether to wrap (in wei)
  const amountInWei = ethers.parseEther(amountInEther ?? "0.00001");

  // Call the deposit function to convert Ether to WETH
  const tx = await wethContract.deposit({ value: amountInWei });
  await tx.wait();

  // Check WETH balance of the signer
  const wethBalance = await wethContract.balanceOf(signer.address);
  console.log(
    `Address: ${signer.address} WETH Balance: ${ethers.formatEther(
      wethBalance
    )}`
  );
}
