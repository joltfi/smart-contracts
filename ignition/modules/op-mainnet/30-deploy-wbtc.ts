import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import "@nomicfoundation/hardhat-ethers";
import { OPTIMISM_MAINNET } from "../../constant";
import { ethers } from "ethers";

const LendingPoolAddresesProviderModule = require("./01-deploy-address-provider");
const LendingPoolModule = require("./02-deploy-lending-pool");
const LendingPoolConfigurator = require("./04-deploy-lending-pool-configurator");
const MultiFeeDistributionModule = require("./07-deploy-multi-fee-distribution");
const ChefIncentivesControllerModule = require("./08-deploy-chef");
const PriceOracleModule = require("./09-deploy-price-oracle");

module.exports = buildModule("DeployWBTCModule", (m) => {
  const CONFIG = OPTIMISM_MAINNET.WBTC;
  const DECIMALS = CONFIG.DECIMALS;
  const SYMBOL = CONFIG.SYMBOL;
  const ADDRESS = CONFIG.ASSET_ADDRESS;

  const INITIAL_DEPOSIT_AMOUNT = ethers.parseUnits("0.00002", DECIMALS); // $2.50

  const chef = m.useModule(ChefIncentivesControllerModule);
  const multiFee = m.useModule(MultiFeeDistributionModule);
  const addressProvider = m.useModule(LendingPoolAddresesProviderModule);
  const lendingPoolConfigurator = m.useModule(LendingPoolConfigurator);
  const priceOracleModule = m.useModule(PriceOracleModule);

  // price feed
  const priceFeed = m.contract("ChainlinkUniswapV3PriceFeed", [
    CONFIG.CHAINLINK,
    CONFIG.UNISWAPV3,
    60 * 30, // TWAP window
    60 * 30, // Chainlink window
    false,
  ]);

  const priceOracleUpdate = m.call(
    priceOracleModule.aaveOracle as any,
    "setAssetSources",
    [[ADDRESS], [priceFeed]],
    { after: [priceFeed] }
  );

  // atoken
  const aToken = m.contract("AToken", [], {});

  // stable debt token
  const sDebt = m.contract("StableDebtToken", [], {});

  // variable debt token
  const vDebt = m.contract("VariableDebtToken", [], {});

  // interest rate strategy
  const defaultInterestRateStrategy = m.contract(
    "DefaultReserveInterestRateStrategy",
    [
      addressProvider.lendingPoolAddressesProvider,
      450000000000000000000000000n, // optimal util rate
      0, // base variable borrow rate
      70000000000000000000000000n, // variable rate slop1
      3000000000000000000000000000n, // slope2
      0n,
      0n,
    ],
    {}
  );

  const approve = m.call(
    m.contractAt(
      "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20",
      ADDRESS,
      { id: "approveusdc1" }
    ),
    "approve",
    [lendingPoolConfigurator.proxy, INITIAL_DEPOSIT_AMOUNT],
    { id: "approveusdc2" }
  );

  const lpcProxy = m.contractAt(
    "LendingPoolConfigurator",
    lendingPoolConfigurator.proxy
  );

  const initReserve = m.call(
    lpcProxy,
    "initReserve",
    [
      {
        aTokenImpl: aToken,
        stableDebtTokenImpl: sDebt,
        variableDebtTokenImpl: vDebt,
        underlyingAssetDecimals: DECIMALS,
        interestRateStrategyAddress: defaultInterestRateStrategy,
        underlyingAsset: ADDRESS,
        treasury: multiFee.multiFeeDistribution,
        incentivesController: chef.chefIncentivesController,
        allocPoint: 100,
        underlyingAssetName: SYMBOL,
        aTokenName: `JOLT ${SYMBOL}`,
        aTokenSymbol: `j${SYMBOL}`,
        variableDebtTokenName: `Jolt vd${SYMBOL}`,
        variableDebtTokenSymbol: `jvd${SYMBOL}`,
        stableDebtTokenName: `Jolt sd${SYMBOL}`,
        stableDebtTokenSymbol: `jsd${SYMBOL}`,
        params: "0x10",
      },
      INITIAL_DEPOSIT_AMOUNT,
    ],
    {
      after: [
        approve,
        priceOracleUpdate,
        defaultInterestRateStrategy,
        aToken,
        sDebt,
        vDebt,
      ],
    }
  );

  // configure reserve
  const configureReserveAsCollateral = m.call(
    lpcProxy,
    "configureReserveAsCollateral",
    [
      ADDRESS,
      7500, // LTV 75%
      8000, // Liquidation Threshold 80%
      11500, // Liquidation Bonus: 115%
      9000, // treasury split 80% , team 20%
    ],
    { after: [initReserve] }
  );

  // setReserveFactor
  const setReserveFactor = m.call(
    lpcProxy,
    "setReserveFactor",
    [
      ADDRESS,
      5000, // 5%
    ],
    { after: [initReserve] }
  );

  // setReserveFactor
  const enableBorrowingOnReserve = m.call(
    lpcProxy,
    "enableBorrowingOnReserve",
    [
      ADDRESS,
      false, // stable borrowing
    ],
    { after: [configureReserveAsCollateral, setReserveFactor] }
  );

  return {
    aToken,
    sDebt,
    vDebt,
    priceFeed,
    defaultInterestRateStrategy,
  };
});
