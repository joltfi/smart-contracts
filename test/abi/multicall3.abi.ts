export const multicall3Abi = [
  "function aggregate(tuple(address target, bytes callData)[] calls) view returns (uint256 blockNumber, bytes[] returnData)",
  "function aggregate3(tuple(address target, bool allowFailure, bytes callData)[] calls) external view returns (tuple(bool success, bytes returnData)[] memory returnData)",
];
