import hre, { ethers } from "hardhat";
import { CURRENT_NETWORK } from "../ignition/constant";
import { expect } from "chai";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { Contract, JsonRpcProvider } from "ethers";

import {
  populatePool,
  setup,
  approveLiquidator,
  deposit,
  borrow,
  liquidate,
} from "./utils/liquidator/shared";
import { balanceOf } from "../scripts/utils/balanceOf";
import { ReserveData } from "./definitions/liquidate";
import { getReservesData3Impl } from "./utils/liquidator/pool";

const Module = require("../ignition/modules/02-deploy-lending-pool");
const GatewayModule = require("../ignition/modules/12-deploy-weth-gateway");
const AaveLiquidationBotModule = require("../ignition/modules/98-deploy-liquidator");
const ConfiguratorModule = require("../ignition/modules/04-deploy-lending-pool-configurator");

describe("Liquidate Tests", function () {
  let _proxy: Contract;
  let _lendingPool: Contract;
  let _wethGateway: Contract;
  let _liquidationBot: Contract;
  let _configurator: Contract;
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

    const configurator = await hre.ignition.deploy(ConfiguratorModule);

    _configurator = await ethers.getContractAt(
      "LendingPoolConfigurator",
      configurator.proxy
    );

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

  it("33 33 33", async () => {
    // AP deposits 1 ETH
    // Borrower borrows 2.2ETH
    // Borrower deposits 1 ETH of USDC/BTC/WETH 33% 33% 33%

    await deposit(
      _lendingPool,
      _proxy,
      _borrower,
      CURRENT_NETWORK.USDC.ASSET_ADDRESS,
      "2"
    );
    await deposit(
      _lendingPool,
      _proxy,
      _borrower,
      CURRENT_NETWORK.WBTC.ASSET_ADDRESS,
      "2"
    );

    const { updatedHealthFactor, startHealthFactor } = await setup(
      _lendingPool,
      _proxy,
      _liquidationBot,
      assetProvider,
      _borrower,
      CURRENT_NETWORK.USDC.ASSET_ADDRESS, // deposit 1 eth  as asset provider
      "1",
      CURRENT_NETWORK.WETH.ASSET_ADDRESS, // borrower supplies 1 eth
      "2",
      CURRENT_NETWORK.WETH.ASSET_ADDRESS, // borrower borrows 0.5 WETH
      ethers.parseUnits("4.4", 18)
    );

    expect(startHealthFactor).to.not.be.undefined;
    expect(updatedHealthFactor).to.not.be.undefined;
    expect(updatedHealthFactor).to.be.greaterThan(startHealthFactor);
  });

  it("50/50", async () => {
    // AP deposits 1 ETH
    // Borrower borrows 2.2ETH
    // Borrower deposits 1 ETH of USDC/BTC/WETH 33% 33% 33%

    await deposit(
      _lendingPool,
      _proxy,
      _borrower,
      CURRENT_NETWORK.USDC.ASSET_ADDRESS,
      "2"
    );

    const { updatedHealthFactor, startHealthFactor } = await setup(
      _lendingPool,
      _proxy,
      _liquidationBot,
      assetProvider,
      _borrower,
      CURRENT_NETWORK.USDC.ASSET_ADDRESS, // deposit 1 eth  as asset provider
      "1",
      CURRENT_NETWORK.WBTC.ASSET_ADDRESS, // borrower supplies 1 eth
      "2",
      CURRENT_NETWORK.WETH.ASSET_ADDRESS, // borrower borrows 0.5 WETH
      ethers.parseUnits("2", 18)
    );

    expect(startHealthFactor).to.not.be.undefined;
    expect(updatedHealthFactor).to.not.be.undefined;
    expect(updatedHealthFactor).to.be.greaterThan(startHealthFactor);
  });

  it("90 nc USDC / 10 c WETH", async () => {
    // 90% marked as not collateral
    // 10% collateral

    await deposit(
      _lendingPool,
      _proxy,
      _borrower,
      CURRENT_NETWORK.USDC.ASSET_ADDRESS,
      "9"
    );

    await _lendingPool
      .connect(_borrower)
      .getFunction("setUserUseReserveAsCollateral")(
      CURRENT_NETWORK.USDC.ASSET_ADDRESS,
      false
    );

    const { updatedHealthFactor, startHealthFactor } = await setup(
      _lendingPool,
      _proxy,
      _liquidationBot,
      assetProvider,
      _borrower,
      CURRENT_NETWORK.WBTC.ASSET_ADDRESS, // deposit 1 eth  as asset provider
      "1",
      CURRENT_NETWORK.WETH.ASSET_ADDRESS, // borrower supplies 1 eth
      "1",
      CURRENT_NETWORK.WETH.ASSET_ADDRESS, // borrower borrows 0.5 WETH
      ethers.parseUnits("0.6", 18)
    );

    expect(startHealthFactor).to.not.be.undefined;
    expect(updatedHealthFactor).to.not.be.undefined;
    expect(updatedHealthFactor).to.be.greaterThan(startHealthFactor);
  });

  it("90 nc WETH / 10 c USDC", async () => {
    // 90% marked as not collateral
    // 10% collateral

    await deposit(
      _lendingPool,
      _proxy,
      _borrower,
      CURRENT_NETWORK.WETH.ASSET_ADDRESS,
      "9"
    );

    await _lendingPool
      .connect(_borrower)
      .getFunction("setUserUseReserveAsCollateral")(
      CURRENT_NETWORK.WETH.ASSET_ADDRESS,
      false
    );

    const { updatedHealthFactor, startHealthFactor } = await setup(
      _lendingPool,
      _proxy,
      _liquidationBot,
      assetProvider,
      _borrower,
      CURRENT_NETWORK.WBTC.ASSET_ADDRESS, // deposit 1 eth  as asset provider
      "1",
      CURRENT_NETWORK.USDC.ASSET_ADDRESS, // borrower supplies 1 eth
      "1",
      CURRENT_NETWORK.USDC.ASSET_ADDRESS, // borrower borrows 0.5 WETH
      ethers.parseUnits("1700", 6)
    );

    expect(startHealthFactor).to.not.be.undefined;
    expect(updatedHealthFactor).to.not.be.undefined;
    expect(updatedHealthFactor).to.be.greaterThan(startHealthFactor);
  });

  it("Collateral frozen", async () => {
    await deposit(
      _lendingPool,
      _proxy,
      assetProvider,
      CURRENT_NETWORK.WETH.ASSET_ADDRESS,
      "1"
    );

    await deposit(
      _lendingPool,
      _proxy,
      _borrower,
      CURRENT_NETWORK.WETH.ASSET_ADDRESS,
      "1"
    );

    await borrow(
      _lendingPool,
      _borrower,
      CURRENT_NETWORK.USDC.ASSET_ADDRESS,
      ethers.parseUnits("1700", 6)
    );

    await _configurator.connect(assetProvider).getFunction("freezeReserve")(
      CURRENT_NETWORK.WETH.ASSET_ADDRESS
    );

    const { updatedHealthFactor, startHealthFactor } = await liquidate(
      _lendingPool,
      _proxy,
      _liquidationBot,
      _borrower,
      assetProvider
    );

    expect(startHealthFactor).to.not.be.undefined;
    expect(updatedHealthFactor).to.not.be.undefined;
    expect(updatedHealthFactor).to.be.greaterThan(startHealthFactor);
  });

  it("Debt frozen", async () => {
    await deposit(
      _lendingPool,
      _proxy,
      assetProvider,
      CURRENT_NETWORK.WETH.ASSET_ADDRESS,
      "1"
    );

    await deposit(
      _lendingPool,
      _proxy,
      _borrower,
      CURRENT_NETWORK.WETH.ASSET_ADDRESS,
      "1"
    );

    await borrow(
      _lendingPool,
      _borrower,
      CURRENT_NETWORK.USDC.ASSET_ADDRESS,
      ethers.parseUnits("1700", 6)
    );

    await _configurator.connect(assetProvider).getFunction("freezeReserve")(
      CURRENT_NETWORK.USDC.ASSET_ADDRESS
    );

    const { updatedHealthFactor, startHealthFactor } = await liquidate(
      _lendingPool,
      _proxy,
      _liquidationBot,
      _borrower,
      assetProvider
    );

    expect(startHealthFactor).to.not.be.undefined;
    expect(updatedHealthFactor).to.not.be.undefined;
    // should fail to liquidate
    expect(updatedHealthFactor).to.be.lessThan(startHealthFactor);
  });
});
