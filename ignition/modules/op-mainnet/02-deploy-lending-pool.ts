import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import "@nomicfoundation/hardhat-ethers";
import { PROXY_CONTRACT } from "../../constant";

const DeployLendingPoolAddressesProviderModule = require("./01-deploy-address-provider");

module.exports = buildModule("DeployLendingPoolModule", (m) => {
  const addressProviderModule = m.useModule(
    DeployLendingPoolAddressesProviderModule
  );
  const genericLogic = m.library("GenericLogic");
  const reserveLogic = m.library("ReserveLogic");
  const validationLogic = m.library("ValidationLogic", {
    libraries: {
      GenericLogic: genericLogic,
    },
  });

  const lendingPool = m.contract("LendingPool", [], {
    libraries: {
      ReserveLogic: reserveLogic,
      ValidationLogic: validationLogic,
    },
  });

  const call1 = m.call(
    addressProviderModule.lendingPoolAddressesProvider as any,
    "setLendingPoolImpl",
    [lendingPool]
  );

  const proxyAddress = m.readEventArgument(call1, "ProxyCreated", 1);

  const proxy = m.contractAt(PROXY_CONTRACT, proxyAddress);

  return { lendingPool, proxy, genericLogic, reserveLogic, validationLogic };
});
