import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-ignition";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-chai-matchers";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
import "@nomicfoundation/hardhat-ledger";

require("dotenv").config();

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.24",
      },
      {
        version: "0.8.20",
        settings: {
          viaIR: true, // Enable IR
        },
      },
      {
        version: "0.7.6",
        settings: {
          optimizer: {
            enabled: true, // Enable the optimizer
            runs: 200, // Set the number of runs, adjust as needed
          },
        },
      },
    ], // Make sure to use the correct version for your project
  },

  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: process.env.ETHERSCAN_API_KEY,

    customChains: [
      {
        network: "op_sepolia",
        chainId: 11155420,

        urls: {
          apiURL: "https://api-sepolia-optimistic.etherscan.io/api",
          browserURL: "https://sepolia-optimism.etherscan.io",
        },
      },
    ],
  },
  networks: {
    op_sepolia: {
      url: process.env.ALCHEMY_OP_SEPOLIA!,
      accounts: [process.env.PRIVATE_KEY!],
    },
    op_mainnet: {
      url: process.env.ALCHEMY_OP_MAINNET!,
      ledgerAccounts: [
        // This is an example address
        // Be sure to replace it with an address from your own Ledger device
        "0x3300ed582aadab0d80e6b04fbc00e35f50c6336d",
      ],
      chainId: 10,
    },
    hardhat: {
      mining: {
        auto: true,
        interval: 1000,
      },
      forking: {
        url: process.env.ALCHEMY_OP_SEPOLIA!, // Replace with your mainnet RPC URL
        blockNumber: 12345678, // Optional: Use a specific block number
      },
      accounts: [
        {
          privateKey: process.env.PRIVATE_KEY!,
          balance: "10000000000000000000000", // 10,000 ETH (adjust as needed)
        },
      ],
    },
  },
};

export default config;
