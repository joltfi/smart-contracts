import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import "@nomicfoundation/hardhat-ethers";
import { OPTIMISM_MAINNET } from "../../constant";

const JoltOftModule = require("./00-deploy-oft");
const AddressProviderModule = require("./01-deploy-address-provider");
const DeployLendingPoolModule = require("./02-deploy-lending-pool");

module.exports = buildModule("TimelockController", (m) => {
  const minDelay = 86400 * 3; // 3 days
  const proposers = [OPTIMISM_MAINNET.MULTISIG];
  const executors = [OPTIMISM_MAINNET.MULTISIG];

  const lendingPool = m.useModule(DeployLendingPoolModule);
  const addressProvider = m.useModule(AddressProviderModule);
  const joltOFT = m.useModule(JoltOftModule);

  // deploy timelock contract
  const timelockController = m.contract("Timelock", [
    minDelay,
    proposers,
    executors,
    "0x0000000000000000000000000000000000000000",
  ]);

  // add to whitelist, not required, but doesnt hurt
  const lpProxy = m.contractAt("LendingPool", lendingPool.proxy);
  const whitelist1 = m.call(lpProxy, "whitelist", [timelockController, true], {
    id: "whitelistTimelock",
  });
  const whitelist2 = m.call(
    lpProxy,
    "whitelist",
    [OPTIMISM_MAINNET.MULTISIG, true],
    {
      id: "whitelistMultisig",
    }
  );

  // transfer ownership
  const poolAdmin = m.call(
    addressProvider.lendingPoolAddressesProvider as any,
    "setPoolAdmin",
    [timelockController],
    {
      after: [whitelist1, whitelist2],
    }
  );

  const transferOwnership = m.call(
    addressProvider.lendingPoolAddressesProvider as any,
    "transferOwnership",
    [timelockController],
    {
      id: "addressProviderOwnership",
      after: [whitelist1, whitelist2, poolAdmin],
    }
  );

  m.call(joltOFT.joltOft as any, "transferOwnership", [timelockController], {
    id: "joltOwnership",
  });

  return { timelockController };
});
