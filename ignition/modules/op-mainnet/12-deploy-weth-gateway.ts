import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import "@nomicfoundation/hardhat-ethers";
import { OPTIMISM_MAINNET } from "../../constant";

const LendingPoolModule = require("./02-deploy-lending-pool");

module.exports = buildModule("WETHGatewayModule", (m) => {
  const lendingPoolModule = m.useModule(LendingPoolModule);

  const lendingPoolProxy = m.contractAt(
    "LendingPool",
    lendingPoolModule.proxy,
    { id: "wethGatewayLendingPoolProxy" }
  );

  const wethGateway = m.contract(
    "WETHGateway",
    [OPTIMISM_MAINNET.WETH.ASSET_ADDRESS],
    { id: "wethLendingPoolDeployment" }
  );

  m.call(wethGateway, "authorizeLendingPool", [lendingPoolProxy], {
    id: "authProxy",
  });

  m.call(lendingPoolProxy, "whitelist", [wethGateway, true]);

  return { wethGateway };
});
