import { CURRENT_NETWORK } from "../ignition/constant";
import { ethers } from "hardhat";

export async function swap(
  privateKey: string | any,
  tokenAddress: string,
  amountIn: bigint,
  feeTier?: number
) {
  const now = Date.now();
  let account;
  if (typeof privateKey === "string")
    account = new ethers.Wallet(privateKey, ethers.provider);
  else account = privateKey;

  // --- Define Addresses ---
  // Uniswap V3 SwapRouter address (must be the V3 router, not the V2 one)
  const routerAddress = CURRENT_NETWORK.UNISWAP_ROUTER;
  // WETH address on your network
  const WETHAddress = CURRENT_NETWORK.WETH.ASSET_ADDRESS;
  // Uniswap V3 Factory (used to lookup pools)
  const factoryAddress = CURRENT_NETWORK.UNISWAP_V3_FACTORY;

  // --- Define ABIs ---
  // Factory: getPool(tokenA, tokenB, fee)
  const factoryABI = [
    "function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)",
  ];

  // Router: exactInputSingle(params)
  const routerABI = [
    "function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)",
  ];

  // Minimal ERC20 ABI (for approval)
  const erc20ABI = [
    "function approve(address spender, uint256 amount) external returns (bool)",
  ];

  // --- Create Contract Instances ---
  const factory = new ethers.Contract(factoryAddress, factoryABI, account);
  const router = new ethers.Contract(routerAddress, routerABI, account);
  const weth = new ethers.Contract(WETHAddress, erc20ABI, account);

  // --- Find the Pool ---
  // We are using the fee tier of 1% (i.e. fee = 10000)

  const poolAddress: string = await factory.getPool(
    WETHAddress,
    tokenAddress,
    feeTier ?? 500
  );
  if (poolAddress === ethers.ZeroAddress) {
    throw new Error(
      "Pool not found for the given token pair with a 1% fee tier."
    );
  }
  //console.log("Found pool at address:", poolAddress);

  // --- Define Swap Parameters ---
  const deadline = Date.now(); // 1 minutes
  const params = {
    tokenIn: WETHAddress,
    tokenOut: tokenAddress,
    fee: feeTier,
    recipient: account.address,
    deadline: deadline,
    amountIn: amountIn,
    amountOutMinimum: 0n,
    sqrtPriceLimitX96: 0n, // 0 means no price limit; use bigint literal
  };

  // --- Approve the Router to Spend WETH ---
  //console.log("Approving router to spend WETH...");
  const approveTx = await weth["approve"](routerAddress, amountIn);
  await approveTx.wait(); // Wait for the approval to be mined
  // console.log("Router approved.");

  // --- Execute the Swap ---
  //console.log("Executing swap...");
  const swapTx = await router.exactInputSingle(params);
  //console.log("Swap transaction submitted. Tx hash:", swapTx.hash);

  await swapTx.wait();
  // console.log("Swap completed successfully!");
  console.log("Swap took " + (Date.now() - now) + "ms");

  return swapTx;
}
