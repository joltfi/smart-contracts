export const multicall3Abi = [
  "function aggregate(tuple(address target, bytes callData)[] calls) payable returns (uint256 blockNumber, bytes[] returnData)",
  "function tryAggregate(bool requireSuccess, tuple(address target, bytes callData)[] calls) payable returns (tuple(bool success, bytes returnData)[] returnData)",
  "function tryBlockAndAggregate(bool requireSuccess, tuple(address target, bytes callData)[] calls) payable returns (uint256 blockNumber, bytes32 blockHash, tuple(bool success, bytes returnData)[] returnData)",
  "function blockAndAggregate(tuple(address target, bytes callData)[] calls) payable returns (uint256 blockNumber, bytes32 blockHash, bytes[] returnData)",
  "function getEthBalance(address addr) view returns (uint256 balance)",
  "function getBlockHash(uint256 blockNumber) view returns (bytes32 blockHash)",
  "function getBlockNumber() view returns (uint256 blockNumber)",
  "function getCurrentBlockCoinbase() view returns (address coinbase)",
  "function getCurrentBlockDifficulty() view returns (uint256 difficulty)",
  "function getCurrentBlockGasLimit() view returns (uint256 gasLimit)",
  "function getCurrentBlockTimestamp() view returns (uint256 timestamp)",
  "function getChainId() view returns (uint256 chainId)",
  "function getLastBlockHash() view returns (bytes32 blockHash)",
];

export type Multicall3ABI = [
  {
    inputs: [
      {
        components: [
          { name: "target"; type: "address" },
          { name: "allowFailure"; type: "bool" },
          { name: "callData"; type: "bytes" }
        ];
        name: "calls";
        type: "tuple[]";
      }
    ];
    name: "aggregate";
    outputs: [
      { name: "blockNumber"; type: "uint256" },
      {
        components: [
          { name: "success"; type: "bool" },
          { name: "returnData"; type: "bytes" }
        ];
        name: "returnData";
        type: "tuple[]";
      }
    ];
    stateMutability: "nonpayable";
    type: "function";
  }
];
