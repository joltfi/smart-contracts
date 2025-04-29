import { ethers } from "hardhat";

// Replace this with the address of the Uniswap V3 Pool you want to interact with
const uniswapV3PoolAddress = "0xf19751adb999867DDEFB35FFd5E5986Bb8d14a51"; // e.g. "0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8"

const UNISWAP_V3_POOL_ABI = [
  "function token0() external view returns (address)",
  "function token1() external view returns (address)",
  "function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)",
  "function liquidity() external view returns (uint128)",
];

const ERC20_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
];

async function main() {
  const poolAddress = uniswapV3PoolAddress;
  const provider = ethers.provider;

  // Connect to pool contract
  const poolContract = new ethers.Contract(
    poolAddress,
    UNISWAP_V3_POOL_ABI,
    provider
  );

  // Get token addresses
  const token0Address = await poolContract.token0();
  const token1Address = await poolContract.token1();

  // Connect to token contracts
  const token0Contract = new ethers.Contract(
    token0Address,
    ERC20_ABI,
    provider
  );
  const token1Contract = new ethers.Contract(
    token1Address,
    ERC20_ABI,
    provider
  );

  // Get decimals
  const decimals0 = await token0Contract.decimals();
  const decimals1 = await token1Contract.decimals();

  // Get pool data
  const slot0 = await poolContract.slot0();
  const liquidity = await poolContract.liquidity();
  const sqrtPriceX96 = BigInt(slot0.sqrtPriceX96.toString());
  const liquidityBN = BigInt(liquidity.toString());

  // Calculate virtual reserves (for pricing)
  const token0Virtual = (liquidityBN * 2n ** 96n) / sqrtPriceX96;
  const token1Virtual = (liquidityBN * sqrtPriceX96) / 2n ** 96n;

  // Get actual balances
  const balance0 = BigInt(
    (await token0Contract.balanceOf(poolAddress)).toString()
  );
  const balance1 = BigInt(
    (await token1Contract.balanceOf(poolAddress)).toString()
  );

  // Formatting functions
  const formatUnits = (value: bigint, decimals: number) =>
    ethers.formatUnits(value.toString(), decimals);

  const calculatePrice = (
    numerator: bigint,
    denominator: bigint,
    decNum: number,
    decDen: number
  ) => {
    const scaledNumerator = numerator * 10n ** BigInt(decDen);
    const scaledDenominator = denominator * 10n ** BigInt(decNum);
    return Number(scaledNumerator) / Number(scaledDenominator);
  };

  // Calculate prices
  const prices = {
    virtual: {
      token1PerToken0: calculatePrice(
        token1Virtual,
        token0Virtual,
        decimals0,
        decimals1
      ),
      token0PerToken1: calculatePrice(
        token0Virtual,
        token1Virtual,
        decimals1,
        decimals0
      ),
    },
    actual: {
      token1PerToken0: calculatePrice(balance1, balance0, decimals0, decimals1),
      token0PerToken1: calculatePrice(balance0, balance1, decimals1, decimals0),
    },
  };

  console.log(`\nPool Address: ${poolAddress}`);
  console.log(`Token 0 (${await token0Contract.symbol()}): ${token0Address}`);
  console.log(`Token 1 (${await token1Contract.symbol()}): ${token1Address}\n`);

  console.log("Virtual Reserves (Pricing):");
  console.log(`Token 0: ${formatUnits(token0Virtual, decimals0)}`);
  console.log(`Token 1: ${formatUnits(token1Virtual, decimals1)}\n`);

  console.log("Actual Balances:");
  console.log(`Token 0: ${formatUnits(balance0, decimals0)}`);
  console.log(`Token 1: ${formatUnits(balance1, decimals1)}\n`);

  console.log("Prices from Virtual Reserves:");
  console.log(`1 Token 0 = ${prices.virtual.token1PerToken0} Token 1`);
  console.log(`1 Token 1 = ${prices.virtual.token0PerToken1} Token 0\n`);

  console.log("Prices from Actual Balances:");
  console.log(`1 Token 0 = ${prices.actual.token1PerToken0} Token 1`);
  console.log(`1 Token 1 = ${prices.actual.token0PerToken1} Token 0`);
} // Helper function to calculate price from sqrtPriceX96

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
