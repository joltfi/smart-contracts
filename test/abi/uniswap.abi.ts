export const UNISWAP_ABI = [
  'function reserve0() view returns (uint256)',
  'function reserve1() view returns (uint256)',
  'function token0() view returns (address)',
  'function token1() view returns (address)',
];

export const QUOTER_ABI = [
  'function quoteExactInputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountIn, uint160 sqrtPriceLimitX96) external returns (uint256 amountOut)',
  'function quoteExactInput(bytes memory path, uint256 amountIn) external returns (uint256 amountOut)',
];
export const UNISWAP_FACTORY_ABI = [
  'function getPool(address, address, uint24) external view returns (address)',
];

export interface PoolInfo {
  route: 'direct' | 'multi-hop';
  fee?: number; // For direct routes, the fee tier used.
  // For multi-hop routes, you might want to include both fees.
  fee1?: number;
  fee2?: number;
  pool?: string; // For direct, the pool address (if found)
  // For multi-hop, you could optionally add pool addresses for each hop.
  output?: bigint; // Expected output given the input amount
  encodedPath: string; // The precomputed encoded swap path.
}
