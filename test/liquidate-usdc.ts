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
import { balanceOf } from "../scripts/utils/balanceOf";
import { ReserveData } from "./definitions/liquidate";
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
  let reserveData: Record<string, ReserveData> = {};
  const WETHAddress = CURRENT_NETWORK.WETH.ASSET_ADDRESS;
  let snapshotId;

  this.beforeEach(async () => {
    console.log(
      "----------- start ------------- cblock = " +
        (await ethers.provider.getBlockNumber())
    );

    snapshotId = await hre.network.provider.send("evm_snapshot");

    await hre.network.provider.send("evm_mine");

    await populatePool(_lendingPool, _proxy);

    const usdc = await balanceOf(
      CURRENT_NETWORK.USDC.ASSET_ADDRESS,
      reserveData[CURRENT_NETWORK.USDC.ASSET_ADDRESS]?.aTokenAddress
    );
    const wbtc = await balanceOf(
      CURRENT_NETWORK.WBTC.ASSET_ADDRESS,
      reserveData[CURRENT_NETWORK.WBTC.ASSET_ADDRESS]?.aTokenAddress
    );
    const eth = await balanceOf(
      CURRENT_NETWORK.WETH.ASSET_ADDRESS,
      reserveData[CURRENT_NETWORK.WETH.ASSET_ADDRESS]?.aTokenAddress
    );
    console.log(
      "USDC Available: ",
      ethers.formatUnits(
        usdc,
        reserveData[CURRENT_NETWORK.USDC.ASSET_ADDRESS].decimals
      )
    );
    console.log(
      "WBTC Available: ",
      ethers.formatUnits(
        wbtc,
        reserveData[CURRENT_NETWORK.WBTC.ASSET_ADDRESS].decimals
      )
    );
    console.log(
      "ETH Available: ",
      ethers.formatUnits(
        eth,
        reserveData[CURRENT_NETWORK.WETH.ASSET_ADDRESS].decimals
      )
    );
  });

  this.afterEach(async () => {
    console.log(
      "----------- rollback ------------- cblock = " +
        (await ethers.provider.getBlockNumber())
    );

    await hre.network.provider.send("evm_revert", [snapshotId!]);
  });

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

  it("USDC -> USDC -> USDC AP More than Borrower", async () => {
    const { updatedHealthFactor, startHealthFactor } = await setup(
      _lendingPool,
      _proxy,
      _liquidationBot,
      assetProvider,
      _borrower,
      CURRENT_NETWORK.USDC.ASSET_ADDRESS, // deposit 1 eth  as asset provider
      "10",
      CURRENT_NETWORK.USDC.ASSET_ADDRESS, // borrower supplies 1 eth
      "1",
      CURRENT_NETWORK.USDC.ASSET_ADDRESS, // borrower borrows 0.5 WETH
      ethers.parseUnits("2000", 6)
    );

    expect(startHealthFactor).to.not.be.undefined;
    expect(updatedHealthFactor).to.not.be.undefined;
    expect(updatedHealthFactor).to.be.greaterThan(startHealthFactor);
  });

  it("USDC -> USDC -> USDC AP Less than Borrower", async () => {
    const { updatedHealthFactor, startHealthFactor } = await setup(
      _lendingPool,
      _proxy,
      _liquidationBot,
      assetProvider,
      _borrower,
      CURRENT_NETWORK.USDC.ASSET_ADDRESS, // deposit 1 eth  as asset provider
      "1",
      CURRENT_NETWORK.USDC.ASSET_ADDRESS, // borrower supplies 1 eth
      "10",
      CURRENT_NETWORK.USDC.ASSET_ADDRESS, // borrower borrows 0.5 WETH
      ethers.parseUnits("20000", 6)
    );

    expect(startHealthFactor).to.not.be.undefined;
    expect(updatedHealthFactor).to.not.be.undefined;
    expect(updatedHealthFactor).to.be.greaterThan(startHealthFactor);
  });

  it("USDC -> USDC -> WBTC AP Less than Borrower", async () => {
    const { updatedHealthFactor, startHealthFactor } = await setup(
      _lendingPool,
      _proxy,
      _liquidationBot,
      assetProvider,
      _borrower,
      CURRENT_NETWORK.USDC.ASSET_ADDRESS, // deposit 1 eth  as asset provider
      "1",
      CURRENT_NETWORK.USDC.ASSET_ADDRESS, // borrower supplies 1 eth
      "10",
      CURRENT_NETWORK.WBTC.ASSET_ADDRESS, // borrower borrows 0.5 WETH

      ethers.parseUnits("0.1", 8)
    );

    expect(startHealthFactor).to.not.be.undefined;
    expect(updatedHealthFactor).to.not.be.undefined;
    expect(updatedHealthFactor).to.be.greaterThan(startHealthFactor);
  });

  it("USDC -> USDC -> WBTC AP More than Borrower", async () => {
    const { updatedHealthFactor, startHealthFactor } = await setup(
      _lendingPool,
      _proxy,
      _liquidationBot,
      assetProvider,
      _borrower,
      CURRENT_NETWORK.USDC.ASSET_ADDRESS, // deposit 1 eth  as asset provider
      "10",
      CURRENT_NETWORK.USDC.ASSET_ADDRESS, // borrower supplies 1 eth
      "1",
      CURRENT_NETWORK.WBTC.ASSET_ADDRESS, // borrower borrows 0.5 WETH

      ethers.parseUnits("0.02", 8)
    );

    expect(startHealthFactor).to.not.be.undefined;
    expect(updatedHealthFactor).to.not.be.undefined;
    expect(updatedHealthFactor).to.be.greaterThan(startHealthFactor);
  });

  it("USDC -> USDC -> WETH AP Less than Borrower", async () => {
    const { updatedHealthFactor, startHealthFactor } = await setup(
      _lendingPool,
      _proxy,
      _liquidationBot,
      assetProvider,
      _borrower,
      CURRENT_NETWORK.USDC.ASSET_ADDRESS, // deposit 1 eth  as asset provider
      "1",
      CURRENT_NETWORK.USDC.ASSET_ADDRESS, // borrower supplies 1 eth
      "10",
      CURRENT_NETWORK.WETH.ASSET_ADDRESS, // borrower borrows 0.5 WETH
      ethers.parseEther("3")
    );

    expect(startHealthFactor).to.not.be.undefined;
    expect(updatedHealthFactor).to.not.be.undefined;
    expect(updatedHealthFactor).to.be.greaterThan(startHealthFactor);
  });

  it("USDC -> USDC -> WETH AP More than Borrower", async () => {
    const { updatedHealthFactor, startHealthFactor } = await setup(
      _lendingPool,
      _proxy,
      _liquidationBot,
      assetProvider,
      _borrower,
      CURRENT_NETWORK.USDC.ASSET_ADDRESS, // deposit 1 eth  as asset provider
      "10",
      CURRENT_NETWORK.USDC.ASSET_ADDRESS, // borrower supplies 1 eth
      "1",
      CURRENT_NETWORK.WETH.ASSET_ADDRESS, // borrower borrows 0.5 WETH
      ethers.parseEther("0.6")
    );

    expect(startHealthFactor).to.not.be.undefined;
    expect(updatedHealthFactor).to.not.be.undefined;
    expect(updatedHealthFactor).to.be.greaterThan(startHealthFactor);
  });

  // USDC -> WETH

  it("USDC -> WETH -> WETH AP More than Borrower", async () => {
    const { updatedHealthFactor, startHealthFactor } = await setup(
      _lendingPool,
      _proxy,
      _liquidationBot,
      assetProvider,
      _borrower,
      CURRENT_NETWORK.USDC.ASSET_ADDRESS, // deposit 1 eth  as asset provider
      "10",
      CURRENT_NETWORK.WETH.ASSET_ADDRESS, // borrower supplies 1 eth
      "1",
      CURRENT_NETWORK.WETH.ASSET_ADDRESS, // borrower borrows 0.5 WETH
      ethers.parseEther("0.6")
    );

    expect(startHealthFactor).to.not.be.undefined;
    expect(updatedHealthFactor).to.not.be.undefined;
    expect(updatedHealthFactor).to.be.greaterThan(startHealthFactor);
  });

  it("USDC -> WETH -> WETH AP Less than Borrower", async () => {
    const { updatedHealthFactor, startHealthFactor } = await setup(
      _lendingPool,
      _proxy,
      _liquidationBot,
      assetProvider,
      _borrower,
      CURRENT_NETWORK.USDC.ASSET_ADDRESS, // deposit 1 eth  as asset provider
      "1",
      CURRENT_NETWORK.WETH.ASSET_ADDRESS, // borrower supplies 1 eth
      "10",
      CURRENT_NETWORK.WETH.ASSET_ADDRESS, // borrower borrows 0.5 WETH
      ethers.parseEther("6")
    );

    expect(startHealthFactor).to.not.be.undefined;
    expect(updatedHealthFactor).to.not.be.undefined;
    expect(updatedHealthFactor).to.be.greaterThan(startHealthFactor);
  });

  it("USDC -> WETH -> WBTC AP Less than Borrower", async () => {
    const { updatedHealthFactor, startHealthFactor } = await setup(
      _lendingPool,
      _proxy,
      _liquidationBot,
      assetProvider,
      _borrower,
      CURRENT_NETWORK.USDC.ASSET_ADDRESS, // deposit 1 eth  as asset provider
      "1",
      CURRENT_NETWORK.WETH.ASSET_ADDRESS, // borrower supplies 1 eth
      "10",
      CURRENT_NETWORK.WBTC.ASSET_ADDRESS, // borrower borrows 0.5 WETH
      ethers.parseUnits("0.1", 8)
    );

    expect(startHealthFactor).to.not.be.undefined;
    expect(updatedHealthFactor).to.not.be.undefined;
    expect(updatedHealthFactor).to.be.greaterThan(startHealthFactor);
  });

  it("USDC -> WETH -> WBTC AP More than Borrower", async () => {
    const { updatedHealthFactor, startHealthFactor } = await setup(
      _lendingPool,
      _proxy,
      _liquidationBot,
      assetProvider,
      _borrower,
      CURRENT_NETWORK.USDC.ASSET_ADDRESS, // deposit 1 eth  as asset provider
      "10",
      CURRENT_NETWORK.WETH.ASSET_ADDRESS, // borrower supplies 1 eth
      "1",
      CURRENT_NETWORK.WBTC.ASSET_ADDRESS, // borrower borrows 0.5 WETH
      ethers.parseUnits("0.02", 8)
    );

    expect(startHealthFactor).to.not.be.undefined;
    expect(updatedHealthFactor).to.not.be.undefined;
    expect(updatedHealthFactor).to.be.greaterThan(startHealthFactor);
  });

  it("USDC -> WETH -> USDC AP More than Borrower", async () => {
    const { updatedHealthFactor, startHealthFactor } = await setup(
      _lendingPool,
      _proxy,
      _liquidationBot,
      assetProvider,
      _borrower,
      CURRENT_NETWORK.USDC.ASSET_ADDRESS, // deposit 1 eth  as asset provider
      "10",
      CURRENT_NETWORK.WETH.ASSET_ADDRESS, // borrower supplies 1 eth
      "1",
      CURRENT_NETWORK.USDC.ASSET_ADDRESS, // borrower borrows 0.5 WETH
      ethers.parseUnits("1700", 6)
    );

    expect(startHealthFactor).to.not.be.undefined;
    expect(updatedHealthFactor).to.not.be.undefined;
    expect(updatedHealthFactor).to.be.greaterThan(startHealthFactor);
  });

  it("USDC -> WETH -> USDC AP Less than Borrower", async () => {
    const { updatedHealthFactor, startHealthFactor } = await setup(
      _lendingPool,
      _proxy,
      _liquidationBot,
      assetProvider,
      _borrower,
      CURRENT_NETWORK.USDC.ASSET_ADDRESS, // deposit 1 eth  as asset provider
      "1",
      CURRENT_NETWORK.WETH.ASSET_ADDRESS, // borrower supplies 1 eth
      "10",
      CURRENT_NETWORK.USDC.ASSET_ADDRESS, // borrower borrows 0.5 WETH
      ethers.parseUnits("10000", 6)
    );

    expect(startHealthFactor).to.not.be.undefined;
    expect(updatedHealthFactor).to.not.be.undefined;
    expect(updatedHealthFactor).to.be.greaterThan(startHealthFactor);
  });

  // USDC WBTC
  it("USDC -> WBTC -> USDC AP Less than Borrower", async () => {
    const { updatedHealthFactor, startHealthFactor } = await setup(
      _lendingPool,
      _proxy,
      _liquidationBot,
      assetProvider,
      _borrower,
      CURRENT_NETWORK.USDC.ASSET_ADDRESS, // deposit 1 eth  as asset provider
      "1",
      CURRENT_NETWORK.WBTC.ASSET_ADDRESS, // borrower supplies 1 eth
      "10",
      CURRENT_NETWORK.USDC.ASSET_ADDRESS, // borrower borrows 0.5 WETH
      ethers.parseUnits("10000", 6)
    );

    expect(startHealthFactor).to.not.be.undefined;
    expect(updatedHealthFactor).to.not.be.undefined;
    expect(updatedHealthFactor).to.be.greaterThan(startHealthFactor);
  });

  it("USDC -> WBTC -> USDC AP More than Borrower", async () => {
    const { updatedHealthFactor, startHealthFactor } = await setup(
      _lendingPool,
      _proxy,
      _liquidationBot,
      assetProvider,
      _borrower,
      CURRENT_NETWORK.USDC.ASSET_ADDRESS, // deposit 1 eth  as asset provider
      "10",
      CURRENT_NETWORK.WBTC.ASSET_ADDRESS, // borrower supplies 1 eth
      "1",
      CURRENT_NETWORK.USDC.ASSET_ADDRESS, // borrower borrows 0.5 WETH
      ethers.parseUnits("1700", 6)
    );

    expect(startHealthFactor).to.not.be.undefined;
    expect(updatedHealthFactor).to.not.be.undefined;
    expect(updatedHealthFactor).to.be.greaterThan(startHealthFactor);
  });

  it("USDC -> WBTC -> WETH AP More than Borrower", async () => {
    const { updatedHealthFactor, startHealthFactor } = await setup(
      _lendingPool,
      _proxy,
      _liquidationBot,
      assetProvider,
      _borrower,
      CURRENT_NETWORK.USDC.ASSET_ADDRESS, // deposit 1 eth  as asset provider
      "10",
      CURRENT_NETWORK.WBTC.ASSET_ADDRESS, // borrower supplies 1 eth
      "1",
      CURRENT_NETWORK.WETH.ASSET_ADDRESS, // borrower borrows 0.5 WETH
      ethers.parseUnits("0.5", 18)
    );

    expect(startHealthFactor).to.not.be.undefined;
    expect(updatedHealthFactor).to.not.be.undefined;
    expect(updatedHealthFactor).to.be.greaterThan(startHealthFactor);
  });

  it("USDC -> WBTC -> WETH AP Less than Borrower", async () => {
    const { updatedHealthFactor, startHealthFactor } = await setup(
      _lendingPool,
      _proxy,
      _liquidationBot,
      assetProvider,
      _borrower,
      CURRENT_NETWORK.USDC.ASSET_ADDRESS, // deposit 1 eth  as asset provider
      "1",
      CURRENT_NETWORK.WBTC.ASSET_ADDRESS, // borrower supplies 1 eth
      "10",
      CURRENT_NETWORK.WETH.ASSET_ADDRESS, // borrower borrows 0.5 WETH
      ethers.parseUnits("4", 18)
    );

    expect(startHealthFactor).to.not.be.undefined;
    expect(updatedHealthFactor).to.not.be.undefined;
    expect(updatedHealthFactor).to.be.greaterThan(startHealthFactor);
  });

  it("USDC -> WBTC -> WBTC AP More than Borrower", async () => {
    const { updatedHealthFactor, startHealthFactor } = await setup(
      _lendingPool,
      _proxy,
      _liquidationBot,
      assetProvider,
      _borrower,
      CURRENT_NETWORK.USDC.ASSET_ADDRESS, // deposit 1 eth  as asset provider
      "10",
      CURRENT_NETWORK.WBTC.ASSET_ADDRESS, // borrower supplies 1 eth
      "1",
      CURRENT_NETWORK.WBTC.ASSET_ADDRESS, // borrower borrows 0.5 WETH
      ethers.parseUnits("0.01", 8)
    );

    expect(startHealthFactor).to.not.be.undefined;
    expect(updatedHealthFactor).to.not.be.undefined;
    expect(updatedHealthFactor).to.be.greaterThan(startHealthFactor);
  });

  it("USDC -> WBTC -> WBTC AP Less than Borrower", async () => {
    const { updatedHealthFactor, startHealthFactor } = await setup(
      _lendingPool,
      _proxy,
      _liquidationBot,
      assetProvider,
      _borrower,
      CURRENT_NETWORK.USDC.ASSET_ADDRESS, // deposit 1 eth  as asset provider
      "1",
      CURRENT_NETWORK.WBTC.ASSET_ADDRESS, // borrower supplies 1 eth
      "10",
      CURRENT_NETWORK.WBTC.ASSET_ADDRESS, // borrower borrows 0.5 WETH
      ethers.parseUnits("0.1", 8)
    );

    expect(startHealthFactor).to.not.be.undefined;
    expect(updatedHealthFactor).to.not.be.undefined;
    expect(updatedHealthFactor).to.be.greaterThan(startHealthFactor);
  });
});
