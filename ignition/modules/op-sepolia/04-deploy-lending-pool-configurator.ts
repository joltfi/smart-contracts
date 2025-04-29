import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import "@nomicfoundation/hardhat-ethers";
import { PROXY_CONTRACT } from "../../constant";

const AddressProviderModule = require("./01-deploy-address-provider");

const LendingPoolProxyModule = require("./02-deploy-lending-pool");
module.exports = buildModule("DeployLendingPoolConfiguratorModule", (m) => {
  const lendingPoolConfigurator = m.contract("LendingPoolConfigurator", [], {});

  const addressProviderModule = m.useModule(AddressProviderModule);
  const lendingPoolModule = m.useModule(LendingPoolProxyModule);

  const call1 = m.call(
    addressProviderModule.lendingPoolAddressesProvider as any,
    "setLendingPoolConfiguratorImpl",
    [lendingPoolConfigurator],
    { after: [lendingPoolModule.lendingPool] }
  );

  const proxyAddress = m.readEventArgument(call1, "ProxyCreated", 1);

  const proxy = m.contractAt(PROXY_CONTRACT, proxyAddress);

  return { lendingPoolConfigurator, proxy };
});
