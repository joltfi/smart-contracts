import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import "@nomicfoundation/hardhat-ethers";
import { OPTIMISM_SEPOLIA } from "../../constant";

const LendingPoolAddresesProviderModule = require("./01-deploy-address-provider");
const LendingPoolModule = require("./02-deploy-lending-pool");
const LendingPoolConfigurator = require("./04-deploy-lending-pool-configurator");
const MultiFeeDistributionModule = require("./07-deploy-multi-fee-distribution");
const ChefIncentivesControllerModule = require("./08-deploy-chef");
const PriceOracleModule = require("./09-deploy-price-oracle");

module.exports = buildModule("DeployWEthModule", (m) => {
  const CONFIG = OPTIMISM_SEPOLIA.WETH;
  const DECIMALS = CONFIG.DECIMALS;
  const SYMBOL = CONFIG.SYMBOL;

  // https://eth-converter.com/
  const INITIAL_DEPOSIT_AMOUNT = 777777777777777n; // $2.50

  const chef = m.useModule(ChefIncentivesControllerModule);
  const multiFee = m.useModule(MultiFeeDistributionModule);
  const addressProvider = m.useModule(LendingPoolAddresesProviderModule);
  const lendingPoolConfigurator = m.useModule(LendingPoolConfigurator);
  const priceOracleModule = m.useModule(PriceOracleModule);
  const lendingPool = m.useModule(LendingPoolModule);

  // price feed
  const priceFeed = m.contract("ChainlinkUniswapV3PriceFeed", [
    OPTIMISM_SEPOLIA.WETH.CHAINLINK,
    OPTIMISM_SEPOLIA.WETH.UNISWAPV3,
    60 * 30, // TWAP window
    60 * 30, // 30 minutes
    false,
  ]);

  const priceOracleUpdate = m.call(
    priceOracleModule.aaveOracle as any,
    "setAssetSources",
    [[OPTIMISM_SEPOLIA.WETH.ASSET_ADDRESS], [priceFeed]],
    { after: [priceFeed] }
  );

  // atoken
  const jWETH = m.contract("AToken", [], {});

  // stable debt token
  const stableDebtJWETH = m.contract("StableDebtToken", [], {});

  // variable debt token
  const variableDebtJWETH = m.contract("VariableDebtToken", [], {});

  // interest rate strategy
  const defaultInterestRateStrategy = m.contract(
    "DefaultReserveInterestRateStrategy",
    [
      addressProvider.lendingPoolAddressesProvider,
      450000000000000000000000000n, // optimal util rate
      0, // base variable borrow rate
      70000000000000000000000000n, // variable rate slope1
      3000000000000000000000000000n, // variable rate slope2
      0n, // stable rate slope 1
      0n, // stable rate slope 2
    ],
    {}
  );

  const approve = m.call(
    m.contractAt(
      "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20",
      OPTIMISM_SEPOLIA.WETH.ASSET_ADDRESS,
      { id: "approveweth1" }
    ),
    "approve",
    [lendingPoolConfigurator.proxy, INITIAL_DEPOSIT_AMOUNT],
    { id: "approveweth11" }
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
        aTokenImpl: jWETH,
        stableDebtTokenImpl: stableDebtJWETH,
        variableDebtTokenImpl: variableDebtJWETH,
        underlyingAssetDecimals: DECIMALS,
        interestRateStrategyAddress: defaultInterestRateStrategy,
        underlyingAsset: OPTIMISM_SEPOLIA.WETH.ASSET_ADDRESS,
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
        jWETH,
        stableDebtJWETH,
        variableDebtJWETH,
      ],
    }
  );

  // configure reserve
  const configureReserveAsCollateral = m.call(
    lpcProxy,
    "configureReserveAsCollateral",
    [
      OPTIMISM_SEPOLIA.WETH.ASSET_ADDRESS,
      7500, // LTV 75%
      8000, // Liquidation Threshold 80%
      11500, // Liquidation Bonus: 15%
      9000, // treasury split 90% , team 10%
    ],
    { after: [initReserve] }
  );

  // setReserveFactor
  const setReserveFactor = m.call(
    lpcProxy,
    "setReserveFactor",
    [
      OPTIMISM_SEPOLIA.WETH.ASSET_ADDRESS,
      5000, // 50%
    ],
    { after: [initReserve] }
  );

  // setReserveFactor
  const enableBorrowingOnReserve = m.call(
    lpcProxy,
    "enableBorrowingOnReserve",
    [
      OPTIMISM_SEPOLIA.WETH.ASSET_ADDRESS,
      false, // stable borrowing
    ],
    { after: [configureReserveAsCollateral, setReserveFactor] }
  );

  return {
    jWETH,
    stableDebtJWETH,
    variableDebtJWETH,
    priceFeed,
    defaultInterestRateStrategy,
  };
});
