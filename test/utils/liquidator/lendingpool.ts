import { ethers, JsonRpcProvider } from "ethers";
import { Borrower } from "../../definitions/liquidate";
import { lendingPoolAbi } from "../../abi/lending-pool.abi";
import { multicall3Abi } from "../../abi/multicall3.abi";
// Main function to fetch and decode user configurations
export async function getUserConfigurations(
  provider: JsonRpcProvider,
  borrowers: Borrower[],
  MULTICALL3: string,
  LENDING_POOL_ADDRESS: string
): Promise<{
  [address: string]: { isBorrowing: boolean[]; isSupplying: boolean[] };
}> {
  // Create Multicall3 contract instance
  const multicall = new ethers.Contract(MULTICALL3!, multicall3Abi, provider);

  // Create Aave V2 Lending Pool contract instance
  const lendingPool = new ethers.Contract(
    LENDING_POOL_ADDRESS!,
    lendingPoolAbi,
    provider
  );

  // Prepare Multicall3 calls
  const calls = borrowers.map((borrower) => ({
    target: LENDING_POOL_ADDRESS!,
    callData: lendingPool.interface.encodeFunctionData("getUserConfiguration", [
      borrower.address,
    ]),
  }));

  // Execute Multicall3
  const [, returnData] = await multicall.aggregate(calls);

  // Decode results
  const results: {
    [address: string]: { isBorrowing: boolean[]; isSupplying: boolean[] };
  } = {};
  for (let i = 0; i < borrowers.length; i++) {
    const bitmask = BigInt(returnData[i]);
    results[borrowers[i].address!] = decodeUserConfiguration(bitmask);
  }

  return results;
}

function decodeUserConfiguration(bitmask: bigint): {
  isBorrowing: boolean[];
  isSupplying: boolean[];
} {
  const isBorrowing: boolean[] = [];
  const isSupplying: boolean[] = [];

  // Iterate over the first 128 bits (Aave V2 supports up to 128 reserves)
  for (let i = 0; i < 128; i++) {
    // Check if the bit is set for borrowing (odd bits)
    isSupplying.push(((bitmask >> BigInt(i * 2 + 1)) & 1n) === 1n);
    // Check if the bit is set for supplying (even bits)
    isBorrowing.push(((bitmask >> BigInt(i * 2)) & 1n) === 1n);
  }

  return { isBorrowing, isSupplying };
}
