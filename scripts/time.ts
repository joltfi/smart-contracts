import { time } from "@nomicfoundation/hardhat-network-helpers";

async function main() {
  // advance time by one hour and mine a new block
  await time.increase((3600 * 24 * 365)) ; // 1 month
}

main();
