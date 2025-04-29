import hre, { ethers } from "hardhat";
import { CURRENT_NETWORK } from "../ignition/constant";
import { expect } from "chai";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { Contract, JsonRpcProvider } from "ethers";

import {
  populatePool,
  setup,
  approveLiquidator,
} from "./utils/liquidator/shared";
import { getReservesData3Impl } from "./utils/liquidator/pool";
const Module = require("../ignition/modules/02-deploy-lending-pool");
const GatewayModule = require("../ignition/modules/12-deploy-weth-gateway");
const AaveLiquidationBotModule = require("../ignition/modules/98-deploy-liquidator");

describe("Liquidate Tests", function () {
  let _proxy: Contract;
  let _lendingPool: Contract;
  let _wethGateway: Contract;
  let _liquidationBot: Contract;
  let _borrower: HardhatEthersSigner;
  let assetProvider: HardhatEthersSigner;
  let reserveData: Record<string, any> = {};
  const WETHAddress = CURRENT_NETWORK.WETH.ASSET_ADDRESS;

  let snapshotId;

  before(async () => {
    const { proxy } = await hre.ignition.deploy(Module);
    _proxy = proxy;

    const { wethGateway } = await hre.ignition.deploy(GatewayModule);
    _wethGateway = wethGateway;

    const { liquidationBot } = await hre.ignition.deploy(
      AaveLiquidationBotModule
    );
    _liquidationBot = liquidationBot;

    const signers = await hre.ethers.getSigners();
    assetProvider = signers[0];
    _borrower = signers[1];

    _lendingPool = await ethers.getContractAt(
      "LendingPool",
      await proxy.getAddress()
    );

    reserveData = await getReservesData3Impl(
      assetProvider.provider as JsonRpcProvider,
      [
        CURRENT_NETWORK.USDC.ASSET_ADDRESS,
        CURRENT_NETWORK.WBTC.ASSET_ADDRESS,
        CURRENT_NETWORK.WETH.ASSET_ADDRESS,
      ],
      await proxy.getAddress(),
      CURRENT_NETWORK.MULTICALL3
    );

    await approveLiquidator(
      reserveData,
      assetProvider,
      await _liquidationBot.getAddress()
    );
  });

  this.beforeEach(async () => {
    console.log(
      "----------- start ------------- cblock = " +
        (await ethers.provider.getBlockNumber())
    );

    snapshotId = await hre.network.provider.send("evm_snapshot");
    await hre.network.provider.send("evm_mine");
    await populatePool(_lendingPool, _proxy);
  });

  this.afterEach(async () => {
    console.log(
      "----------- rollback ------------- cblock = " +
        (await ethers.provider.getBlockNumber())
    );

    await hre.network.provider.send("evm_revert", [snapshotId!]);
  });

  it("WBTC -> WBTC -> WBTC AP More than Borrower", async () => {
    const { updatedHealthFactor, startHealthFactor } = await setup(
      _lendingPool,
      _proxy,
      _liquidationBot,
      assetProvider,
      _borrower,
      CURRENT_NETWORK.WBTC.ASSET_ADDRESS, // deposit 1 eth  as asset provider
      "2",
      CURRENT_NETWORK.WBTC.ASSET_ADDRESS, // borrower supplies 1 eth
      "1",
      CURRENT_NETWORK.WBTC.ASSET_ADDRESS, // borrower borrows 0.02 WBTC
      30_0000n
    );

    expect(startHealthFactor).to.not.be.undefined;
    expect(updatedHealthFactor).to.not.be.undefined;
    expect(updatedHealthFactor).to.be.greaterThan(startHealthFactor);
  });

  it("WBTC -> WBTC->WBTC AP Less than Borrower", async () => {
    const { updatedHealthFactor, startHealthFactor } = await setup(
      _lendingPool,
      _proxy,
      _liquidationBot,
      assetProvider,
      _borrower,
      CURRENT_NETWORK.WBTC.ASSET_ADDRESS, // deposit 1 eth  as asset provider
      "1",
      CURRENT_NETWORK.WBTC.ASSET_ADDRESS, // borrower supplies 1 eth
      "5",
      CURRENT_NETWORK.WBTC.ASSET_ADDRESS, // borrower borrows 0.02 WBTC
      200_0000n
    );

    expect(startHealthFactor).to.not.be.undefined;
    expect(updatedHealthFactor).to.not.be.undefined;
    expect(updatedHealthFactor).to.be.greaterThan(startHealthFactor);
  });

  it("WBTC -> WBTC->USDC AP Less than Borrower", async () => {
    const { updatedHealthFactor, startHealthFactor } = await setup(
      _lendingPool,
      _proxy,
      _liquidationBot,
      assetProvider,
      _borrower,
      CURRENT_NETWORK.WBTC.ASSET_ADDRESS, // deposit 1 eth  as asset provider
      "1",
      CURRENT_NETWORK.WBTC.ASSET_ADDRESS, // borrower supplies 1 eth
      "10",
      CURRENT_NETWORK.USDC.ASSET_ADDRESS, // borrower borrows 0.02 WBTC
      3_00_000000n
    );

    expect(startHealthFactor).to.not.be.undefined;
    expect(updatedHealthFactor).to.not.be.undefined;
    expect(updatedHealthFactor).to.be.greaterThan(startHealthFactor);
  });
  it("WBTC -> WBTC->USDC AP More than Borrower", async () => {
    const { updatedHealthFactor, startHealthFactor } = await setup(
      _lendingPool,
      _proxy,
      _liquidationBot,
      assetProvider,
      _borrower,
      CURRENT_NETWORK.WBTC.ASSET_ADDRESS, // deposit 1 eth  as asset provider
      "10",
      CURRENT_NETWORK.WBTC.ASSET_ADDRESS, // borrower supplies 1 eth
      "1",
      CURRENT_NETWORK.USDC.ASSET_ADDRESS, // borrower borrows 0.02 WBTC
      500_000000n
    );

    expect(startHealthFactor).to.not.be.undefined;
    expect(updatedHealthFactor).to.not.be.undefined;
    expect(updatedHealthFactor).to.be.greaterThan(startHealthFactor);
  });

  it("WBTC -> WBTC->WETH AP More than Borrower", async () => {
    const { updatedHealthFactor, startHealthFactor } = await setup(
      _lendingPool,
      _proxy,
      _liquidationBot,
      assetProvider,
      _borrower,
      CURRENT_NETWORK.WBTC.ASSET_ADDRESS, // deposit 10 eth of wbtc as asset provider
      "10",
      CURRENT_NETWORK.WBTC.ASSET_ADDRESS, // borrower supplies 1 eth of btc
      "1",
      CURRENT_NETWORK.WETH.ASSET_ADDRESS, // borrower borrows weth
      ethers.parseEther("0.2")
    );

    expect(startHealthFactor).to.not.be.undefined;
    expect(updatedHealthFactor).to.not.be.undefined;
    expect(updatedHealthFactor).to.be.greaterThan(ethers.parseEther("1"));
  });

  it("WBTC -> WBTC->WETH AP Less than Borrower", async () => {
    const { updatedHealthFactor, startHealthFactor } = await setup(
      _lendingPool,
      _proxy,
      _liquidationBot,
      assetProvider,
      _borrower,
      CURRENT_NETWORK.WBTC.ASSET_ADDRESS, // deposit 1 eth  as asset provider
      "1",
      CURRENT_NETWORK.WBTC.ASSET_ADDRESS, // borrower supplies 10 eth
      "10",
      CURRENT_NETWORK.WETH.ASSET_ADDRESS, // borrower borrows 0.02 WBTC
      ethers.parseEther("1")
    );

    expect(startHealthFactor).to.not.be.undefined;
    expect(updatedHealthFactor).to.not.be.undefined;
    expect(updatedHealthFactor).to.be.greaterThan(startHealthFactor);
  });
});
