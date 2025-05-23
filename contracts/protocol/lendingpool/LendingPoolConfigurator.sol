// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.7.6;
pragma experimental ABIEncoderV2;

import {SafeMath} from "../../dependencies/openzeppelin/contracts/SafeMath.sol";
import {VersionedInitializable} from "../libraries/aave-upgradeability/VersionedInitializable.sol";
import {InitializableImmutableAdminUpgradeabilityProxy} from "../libraries/aave-upgradeability/InitializableImmutableAdminUpgradeabilityProxy.sol";
import {ReserveConfiguration} from "../libraries/configuration/ReserveConfiguration.sol";
import {ILendingPoolAddressesProvider} from "../../interfaces/ILendingPoolAddressesProvider.sol";
import {ILendingPool} from "../../interfaces/ILendingPool.sol";
import {SafeERC20} from "../../dependencies/openzeppelin/contracts/SafeERC20.sol";
import {IAToken} from "../../interfaces/IAToken.sol";
import {IERC20Detailed} from "../../dependencies/openzeppelin/contracts/IERC20Detailed.sol";
import {Errors} from "../libraries/helpers/Errors.sol";
import {PercentageMath} from "../libraries/math/PercentageMath.sol";
import {DataTypes} from "../libraries/types/DataTypes.sol";
import {IInitializableDebtToken} from "../../interfaces/IInitializableDebtToken.sol";
import {IInitializableAToken} from "../../interfaces/IInitializableAToken.sol";
import {IChefIncentivesController} from "../../interfaces/IChefIncentivesController.sol";
import {ILendingPoolConfigurator} from "../../interfaces/ILendingPoolConfigurator.sol";
import {IMultiFeeDistribution} from "../../interfaces/IMultiFeeDistribution.sol";

/**
 * @title LendingPoolConfigurator contract
 * @author Aave
 * @dev Implements the configuration methods for the Aave protocol
 **/

contract LendingPoolConfigurator is
    VersionedInitializable,
    ILendingPoolConfigurator
{
    using SafeMath for uint256;
    using SafeERC20 for IERC20Detailed;
    using PercentageMath for uint256;
    using ReserveConfiguration for DataTypes.ReserveConfigurationMap;

    event ReserveTreasurySplitUpdated(
        address indexed asset,
        uint16 newTreasurySplit
    );

    ILendingPoolAddressesProvider internal addressesProvider;
    ILendingPool internal pool;

    modifier onlyPoolAdmin() {
        require(
            addressesProvider.getPoolAdmin() == msg.sender,
            Errors.CALLER_NOT_POOL_ADMIN
        );
        _;
    }

    modifier onlyEmergencyAdmin() {
        require(
            addressesProvider.getEmergencyAdmin() == msg.sender,
            Errors.LPC_CALLER_NOT_EMERGENCY_ADMIN
        );
        _;
    }

    uint256 internal constant CONFIGURATOR_REVISION = 0x1;

    function getRevision() internal pure override returns (uint256) {
        return CONFIGURATOR_REVISION;
    }

    function initialize(
        ILendingPoolAddressesProvider provider
    ) public initializer {
        addressesProvider = provider;
        pool = ILendingPool(addressesProvider.getLendingPool());
    }

    // used to initialize a new reserve
    function initReserve(
        InitReserveInput calldata input,
        uint256 initialDepositAmount
    ) external onlyPoolAdmin {
        require(
            initialDepositAmount > 0,
            "Initial deposit must be greater than zero"
        );

        ILendingPool cachedPool = pool;
        _initReserve(cachedPool, input);

        // Check sender approval for the initial deposit
        uint256 allowance = IERC20Detailed(input.underlyingAsset).allowance(
            msg.sender,
            address(this)
        );

        require(
            allowance >= initialDepositAmount,
            "Insufficient allowance for initial deposit"
        );

        IERC20Detailed(input.underlyingAsset).safeTransferFrom(
            msg.sender,
            address(this),
            initialDepositAmount
        );

        IERC20Detailed(input.underlyingAsset).approve(
            address(pool),
            initialDepositAmount
        );

        pool.deposit(
            input.underlyingAsset,
            initialDepositAmount,
            address(0x000000000000000000000000000000000000dEaD),
            0
        );
    }

    function _initReserve(
        ILendingPool pool,
        InitReserveInput calldata input
    ) internal {
        IChefIncentivesController incentivesController = IChefIncentivesController(
                input.incentivesController
            );
        address aTokenProxyAddress = _initTokenWithProxy(
            input.aTokenImpl,
            abi.encodeWithSelector(
                IInitializableAToken.initialize.selector,
                pool,
                input.treasury,
                input.underlyingAsset,
                incentivesController,
                input.underlyingAssetDecimals,
                input.aTokenName,
                input.aTokenSymbol,
                input.params
            )
        );

        incentivesController.addPool(aTokenProxyAddress, input.allocPoint);

        IMultiFeeDistribution(input.treasury).addReward(aTokenProxyAddress);

        address stableDebtTokenProxyAddress = _initTokenWithProxy(
            input.stableDebtTokenImpl,
            abi.encodeWithSelector(
                IInitializableDebtToken.initialize.selector,
                pool,
                input.underlyingAsset,
                IChefIncentivesController(input.incentivesController),
                input.underlyingAssetDecimals,
                input.stableDebtTokenName,
                input.stableDebtTokenSymbol,
                input.params
            )
        );

        // stableDebt is not added to incentives controller

        address variableDebtTokenProxyAddress = _initTokenWithProxy(
            input.variableDebtTokenImpl,
            abi.encodeWithSelector(
                IInitializableDebtToken.initialize.selector,
                pool,
                input.underlyingAsset,
                IChefIncentivesController(input.incentivesController),
                input.underlyingAssetDecimals,
                input.variableDebtTokenName,
                input.variableDebtTokenSymbol,
                input.params
            )
        );

        incentivesController.addPool(
            variableDebtTokenProxyAddress,
            input.allocPoint
        );

        pool.initReserve(
            input.underlyingAsset,
            aTokenProxyAddress,
            stableDebtTokenProxyAddress,
            variableDebtTokenProxyAddress,
            input.interestRateStrategyAddress
        );

        DataTypes.ReserveConfigurationMap memory currentConfig = pool
            .getConfiguration(input.underlyingAsset);

        currentConfig.setDecimals(input.underlyingAssetDecimals);
        currentConfig.setActive(true);
        currentConfig.setFrozen(false);

        pool.setConfiguration(input.underlyingAsset, currentConfig.data);

        emit ReserveInitialized(
            input.underlyingAsset,
            aTokenProxyAddress,
            stableDebtTokenProxyAddress,
            variableDebtTokenProxyAddress,
            input.interestRateStrategyAddress
        );
    }

    /**
     * @dev Updates the aToken implementation for the reserve
     **/
    function updateAToken(
        UpdateATokenInput calldata input
    ) external onlyPoolAdmin {
        ILendingPool cachedPool = pool;

        DataTypes.ReserveData memory reserveData = cachedPool.getReserveData(
            input.asset
        );

        (, , , uint256 decimals, ) = cachedPool
            .getConfiguration(input.asset)
            .getParamsMemory();

        bytes memory encodedCall = abi.encodeWithSelector(
            IInitializableAToken.initialize.selector,
            cachedPool,
            input.treasury,
            input.asset,
            input.incentivesController,
            decimals,
            input.name,
            input.symbol,
            input.params
        );

        _upgradeTokenImplementation(
            reserveData.aTokenAddress,
            input.implementation,
            encodedCall
        );

        emit ATokenUpgraded(
            input.asset,
            reserveData.aTokenAddress,
            input.implementation
        );
    }

    /**
     * @dev Updates the stable debt token implementation for the reserve
     **/
    function updateStableDebtToken(
        UpdateDebtTokenInput calldata input
    ) external onlyPoolAdmin {
        ILendingPool cachedPool = pool;

        DataTypes.ReserveData memory reserveData = cachedPool.getReserveData(
            input.asset
        );

        (, , , uint256 decimals, ) = cachedPool
            .getConfiguration(input.asset)
            .getParamsMemory();

        bytes memory encodedCall = abi.encodeWithSelector(
            IInitializableDebtToken.initialize.selector,
            cachedPool,
            input.asset,
            input.incentivesController,
            decimals,
            input.name,
            input.symbol,
            input.params
        );

        _upgradeTokenImplementation(
            reserveData.stableDebtTokenAddress,
            input.implementation,
            encodedCall
        );

        emit StableDebtTokenUpgraded(
            input.asset,
            reserveData.stableDebtTokenAddress,
            input.implementation
        );
    }

    /**
     * @dev Updates the variable debt token implementation for the asset
     **/
    function updateVariableDebtToken(
        UpdateDebtTokenInput calldata input
    ) external onlyPoolAdmin {
        ILendingPool cachedPool = pool;

        DataTypes.ReserveData memory reserveData = cachedPool.getReserveData(
            input.asset
        );

        (, , , uint256 decimals, ) = cachedPool
            .getConfiguration(input.asset)
            .getParamsMemory();

        bytes memory encodedCall = abi.encodeWithSelector(
            IInitializableDebtToken.initialize.selector,
            cachedPool,
            input.asset,
            input.incentivesController,
            decimals,
            input.name,
            input.symbol,
            input.params
        );

        _upgradeTokenImplementation(
            reserveData.variableDebtTokenAddress,
            input.implementation,
            encodedCall
        );

        emit VariableDebtTokenUpgraded(
            input.asset,
            reserveData.variableDebtTokenAddress,
            input.implementation
        );
    }

    /**
     * @dev Enables borrowing on a reserve
     * @param asset The address of the underlying asset of the reserve
     * @param stableBorrowRateEnabled True if stable borrow rate needs to be enabled by default on this reserve
     **/
    function enableBorrowingOnReserve(
        address asset,
        bool stableBorrowRateEnabled
    ) external onlyPoolAdmin {
        require(stableBorrowRateEnabled == false);
        DataTypes.ReserveConfigurationMap memory currentConfig = pool
            .getConfiguration(asset);

        currentConfig.setBorrowingEnabled(true);
        currentConfig.setStableRateBorrowingEnabled(false);

        pool.setConfiguration(asset, currentConfig.data);

        emit BorrowingEnabledOnReserve(asset, stableBorrowRateEnabled);
    }

    /**
     * @dev Disables borrowing on a reserve
     * @param asset The address of the underlying asset of the reserve
     **/
    function disableBorrowingOnReserve(address asset) external onlyPoolAdmin {
        DataTypes.ReserveConfigurationMap memory currentConfig = pool
            .getConfiguration(asset);

        currentConfig.setBorrowingEnabled(false);

        pool.setConfiguration(asset, currentConfig.data);
        emit BorrowingDisabledOnReserve(asset);
    }

    /**
     * @dev Configures the reserve collateralization parameters
     * all the values are expressed in percentages with two decimals of precision. A valid value is 10000, which means 100.00%
     * @param asset The address of the underlying asset of the reserve
     * @param ltv The loan to value of the asset when used as collateral
     * @param liquidationThreshold The threshold at which loans using this asset as collateral will be considered undercollateralized
     * @param liquidationBonus The bonus liquidators receive to liquidate this asset. The values is always above 100%. A value of 105%
     * means the liquidator will receive a 5% bonus
     **/
    function configureReserveAsCollateral(
        address asset,
        uint256 ltv,
        uint256 liquidationThreshold,
        uint256 liquidationBonus,
        uint16 treasurySplit
    ) external onlyPoolAdmin {
        DataTypes.ReserveConfigurationMap memory currentConfig = pool
            .getConfiguration(asset);

        //validation of the parameters: the LTV can
        //only be lower or equal than the liquidation threshold
        //(otherwise a loan against the asset would cause instantaneous liquidation)
        require(ltv <= liquidationThreshold, Errors.LPC_INVALID_CONFIGURATION);

        if (liquidationThreshold != 0) {
            //liquidation bonus must be bigger than 100.00%, otherwise the liquidator would receive less
            //collateral than needed to cover the debt
            require(
                liquidationBonus > PercentageMath.PERCENTAGE_FACTOR,
                Errors.LPC_INVALID_CONFIGURATION
            );

            //if threshold * bonus is less than PERCENTAGE_FACTOR, it's guaranteed that at the moment
            //a loan is taken there is enough collateral available to cover the liquidation bonus
            require(
                liquidationThreshold.percentMul(liquidationBonus) <=
                    PercentageMath.PERCENTAGE_FACTOR,
                Errors.LPC_INVALID_CONFIGURATION
            );
        } else {
            require(liquidationBonus == 0, Errors.LPC_INVALID_CONFIGURATION);
            //if the liquidation threshold is being set to 0,
            // the reserve is being disabled as collateral. To do so,
            //we need to ensure no liquidity is deposited
            _checkNoLiquidity(asset);
        }

        currentConfig.setLtv(ltv);
        currentConfig.setLiquidationThreshold(liquidationThreshold);
        currentConfig.setLiquidationBonus(liquidationBonus);
        currentConfig.setTreasurySplit(treasurySplit);

        pool.setConfiguration(asset, currentConfig.data);

        emit CollateralConfigurationChanged(
            asset,
            ltv,
            liquidationThreshold,
            liquidationBonus
        );
    }

    function setReserveTreasurySplit(
        address asset,
        uint16 newTreasurySplit
    ) external onlyPoolAdmin {
        require(newTreasurySplit <= 10000, "Invalid treasury split");

        DataTypes.ReserveConfigurationMap memory currentConfig = pool
            .getConfiguration(asset);

        currentConfig.setTreasurySplit(newTreasurySplit);
        pool.setConfiguration(asset, currentConfig.data);

        emit ReserveTreasurySplitUpdated(asset, newTreasurySplit);
    }

    /**
     * @dev Activates a reserve
     * @param asset The address of the underlying asset of the reserve
     **/
    function activateReserve(address asset) external onlyPoolAdmin {
        DataTypes.ReserveConfigurationMap memory currentConfig = pool
            .getConfiguration(asset);

        currentConfig.setActive(true);

        pool.setConfiguration(asset, currentConfig.data);

        emit ReserveActivated(asset);
    }

    /**
     * @dev Deactivates a reserve
     * @param asset The address of the underlying asset of the reserve
     **/
    function deactivateReserve(address asset) external onlyPoolAdmin {
        _checkNoLiquidity(asset);

        DataTypes.ReserveConfigurationMap memory currentConfig = pool
            .getConfiguration(asset);

        currentConfig.setActive(false);

        pool.setConfiguration(asset, currentConfig.data);

        emit ReserveDeactivated(asset);
    }

    /**
     * @dev Freezes a reserve. A frozen reserve doesn't allow any new deposit, borrow or rate swap
     *  but allows repayments, liquidations, rate rebalances and withdrawals
     * @param asset The address of the underlying asset of the reserve
     **/
    function freezeReserve(address asset) external onlyPoolAdmin {
        DataTypes.ReserveConfigurationMap memory currentConfig = pool
            .getConfiguration(asset);

        currentConfig.setFrozen(true);

        pool.setConfiguration(asset, currentConfig.data);

        emit ReserveFrozen(asset);
    }

    /**
     * @dev Unfreezes a reserve
     * @param asset The address of the underlying asset of the reserve
     **/
    function unfreezeReserve(address asset) external onlyPoolAdmin {
        DataTypes.ReserveConfigurationMap memory currentConfig = pool
            .getConfiguration(asset);

        currentConfig.setFrozen(false);

        pool.setConfiguration(asset, currentConfig.data);

        emit ReserveUnfrozen(asset);
    }

    /**
     * @dev Updates the reserve factor of a reserve
     * @param asset The address of the underlying asset of the reserve
     * @param reserveFactor The new reserve factor of the reserve
     **/
    function setReserveFactor(
        address asset,
        uint256 reserveFactor
    ) external onlyPoolAdmin {
        DataTypes.ReserveConfigurationMap memory currentConfig = pool
            .getConfiguration(asset);

        currentConfig.setReserveFactor(reserveFactor);

        pool.setConfiguration(asset, currentConfig.data);

        emit ReserveFactorChanged(asset, reserveFactor);
    }

    /**
     * @dev Sets the interest rate strategy of a reserve
     * @param asset The address of the underlying asset of the reserve
     * @param rateStrategyAddress The new address of the interest strategy contract
     **/
    function setReserveInterestRateStrategyAddress(
        address asset,
        address rateStrategyAddress
    ) external onlyPoolAdmin {
        pool.setReserveInterestRateStrategyAddress(asset, rateStrategyAddress);
        emit ReserveInterestRateStrategyChanged(asset, rateStrategyAddress);
    }

    /**
     * @dev pauses or unpauses all the actions of the protocol, including aToken transfers
     * @param val true if protocol needs to be paused, false otherwise
     **/
    function setPoolPause(bool val) external onlyEmergencyAdmin {
        pool.setPause(val);
    }

    function _initTokenWithProxy(
        address implementation,
        bytes memory initParams
    ) internal returns (address) {
        InitializableImmutableAdminUpgradeabilityProxy proxy = new InitializableImmutableAdminUpgradeabilityProxy(
                address(this)
            );

        proxy.initialize(implementation, initParams);

        return address(proxy);
    }

    function _upgradeTokenImplementation(
        address proxyAddress,
        address implementation,
        bytes memory initParams
    ) internal {
        InitializableImmutableAdminUpgradeabilityProxy proxy = InitializableImmutableAdminUpgradeabilityProxy(
                payable(proxyAddress)
            );

        proxy.upgradeToAndCall(implementation, initParams);
    }

    function _checkNoLiquidity(address asset) internal view {
        DataTypes.ReserveData memory reserveData = pool.getReserveData(asset);

        uint256 availableLiquidity = IERC20Detailed(asset).balanceOf(
            reserveData.aTokenAddress
        );

        require(
            availableLiquidity == 0 && reserveData.currentLiquidityRate == 0,
            Errors.LPC_RESERVE_LIQUIDITY_NOT_0
        );
    }
}
