import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import "@nomicfoundation/hardhat-ethers";
import { ethers } from "ethers";
import { BURN_ADDRESS, OPTIMISM_MAINNET } from "../../constant";

const DeployOftModule = require("./00-deploy-oft");

module.exports = buildModule("DeployMultiFeeDistribution", (m) => {
  const oftModule = m.useModule(DeployOftModule);

  const multiFeeDistribution = m.contract(
    "MultiFeeDistribution",
    [oftModule.joltOft],
    {}
  );

  const setMinter = m.call(
    oftModule.joltOft as any,
    "setMinter",
    [multiFeeDistribution],
    {
      id: "setMinter",
    }
  );

  m.call(
    oftModule.joltOft as any,
    "mint",
    [BURN_ADDRESS, ethers.parseEther("100000")],
    { id: "initialBurn", after: [setMinter] }
  );

  m.call(
    oftModule.joltOft as any,
    "mint",
    [multiFeeDistribution, ethers.parseEther("1")],
    { id: "mintToRewards", after: [setMinter] }
  ); // initial mint
  m.call(
    oftModule.joltOft as any,
    "mint",
    [m.getAccount(0), ethers.parseEther("1")],
    { id: "mintForLP", after: [setMinter] }
  ); // initial mint

  return { multiFeeDistribution };
});
