import { ethers } from "hardhat";

// Replace this with the address of the Uniswap V3 Pool you want to interact with
const uniswapV3PoolAddress = "0x968B9d91b20c2021837FD5C0B134825fe890C0D1"; // e.g. "0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8"

// ABI for the Uniswap V3 Pool contract
const uniswapV3PoolABI = [
  // Add only the functions you need from the Uniswap V3 Pool contract ABI
  "function token0() external view returns (address)",
  "function token1() external view returns (address)",
  "function fee() external view returns (uint24)",
  "function liquidity() external view returns (uint128)",
  "function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)",
  "function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
];

async function main() {
  // Get the Uniswap V3 Pool contract
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const uniswapV3Pool: Contract = new ethers.Contract(
    uniswapV3PoolAddress,
    uniswapV3PoolABI,
    deployer
  );

  // Get token0 and token1 of the pool
  const token0 = await uniswapV3Pool.token0();
  const token1 = await uniswapV3Pool.token1();
  console.log("Token0 Address:", token0);
  console.log("Token1 Address:", token1);

  // Get the fee of the pool
  const fee = await uniswapV3Pool.fee();
  console.log("Fee:", fee);

  // Get the liquidity of the pool
  const liquidity = await uniswapV3Pool.liquidity();
  console.log("Liquidity:", liquidity.toString());

  // Get slot0 data (sqrtPriceX96, tick, etc.)
  const slot0 = await uniswapV3Pool.slot0();
  const [sqrtPriceX96, tick] = slot0;
  console.log("SqrtPriceX96:", sqrtPriceX96.toString());
  console.log("Tick:", tick);
  console.log("Price:", calculatePriceFromSqrtPrice(sqrtPriceX96));
} // Helper function to calculate price from sqrtPriceX96

function calculatePriceFromSqrtPrice(sqrtPriceX96: bigint): bigint {
  const Q96 = 2n ** 96n;
  const step2 = (Q96 / sqrtPriceX96) * 2n;
  return step2;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
