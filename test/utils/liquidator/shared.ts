import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { Contract, JsonRpcProvider } from "ethers";
import hre, { ethers } from "hardhat";
import { CURRENT_NETWORK } from "../../../ignition/constant";
import { ethToWEth } from "../../../scripts/eth-to-weth";
import { swap } from "../../../scripts/swap";
import { approve } from "../../../scripts/utils/approve";
import { balanceOf } from "../../../scripts/utils/balanceOf";
import { Borrower } from "../../definitions/liquidate";
import { getMergedData, performLiquidations } from "../liquidator";
import { time } from "@nomicfoundation/hardhat-network-helpers";

export async function setup(
  _lendingPool: Contract,
  _proxy: Contract,
  _liquidationBot: Contract,
  assetProvider: HardhatEthersSigner,
  _borrower: HardhatEthersSigner,
  _assetProviderSupplyToken: string,
  _assetProviderSupplyAmountInEther: string,
  _borrowerSupplyToken: string,
  _borrowerSupplyAmountInEther: string,
  _borrowerBorrowToken: string,
  _borrowerBorrowAmount: bigint
) {
  // asset provider setup
  await deposit(
    _lendingPool,
    _proxy,
    assetProvider,
    _assetProviderSupplyToken,
    _assetProviderSupplyAmountInEther
  );

  // borrower deposit
  await deposit(
    _lendingPool,
    _proxy,
    _borrower,
    _borrowerSupplyToken,
    _borrowerSupplyAmountInEther
  );

  await borrow(
    _lendingPool,
    _borrower,
    _borrowerBorrowToken,
    _borrowerBorrowAmount
  );

  const { updatedHealthFactor, startHealthFactor } = await liquidate(
    _lendingPool,
    _proxy,
    _liquidationBot,
    _borrower,
    assetProvider
  );

  return { updatedHealthFactor, startHealthFactor };
}

export async function populatePool(_lendingPool: Contract, _proxy: Contract) {
  const signers = await ethers.getSigners();
  for (const signer of signers.slice(11, 15)) {
    await deposit(
      _lendingPool,
      _proxy,
      signer,
      CURRENT_NETWORK.WETH.ASSET_ADDRESS,
      "1"
    );
    await deposit(
      _lendingPool,
      _proxy,
      signer,
      CURRENT_NETWORK.WBTC.ASSET_ADDRESS,
      "1"
    );
    await deposit(
      _lendingPool,
      _proxy,
      signer,
      CURRENT_NETWORK.USDC.ASSET_ADDRESS,
      "1"
    );
  }
}

export async function deposit(
  _lendingPool: Contract,
  _proxy: Contract,
  _signer: HardhatEthersSigner,
  _token: string,
  balance: string
) {
  // conver eth to weth
  await ethToWEth("", _signer, balance);
  const _wethBalance = await balanceOf(
    CURRENT_NETWORK.WETH.ASSET_ADDRESS,
    await _signer.getAddress()
  );

  if (_token !== CURRENT_NETWORK.WETH.ASSET_ADDRESS)
    await swap(_signer, _token, _wethBalance, 500);

  const _balance = await balanceOf(_token, await _signer.getAddress());
  await approve(_signer, _token, await _lendingPool.getAddress(), _balance);
  console.log("depositing", _balance, " of ", _token);
  await _lendingPool.connect(_signer).getFunction("deposit")(
    _token,
    _balance,
    await _signer.getAddress(),
    0
  );
  return _balance;
}

export async function borrow(
  _lendingPool: Contract,
  _borrower: HardhatEthersSigner,
  _token: string,
  balance: bigint
) {
  console.log(`borrow ${balance} of ${_token}`);
  // Execute borrow after approval
  const borrowTx = await _lendingPool.connect(_borrower).getFunction("borrow")(
    _token,
    balance,
    2, // Variable interest rate mode
    0, // Referral code
    await _borrower.getAddress()
  );
  await borrowTx.wait();

  console.log("borrow ok");
}

export async function approveLiquidator(
  reserveData: Record<string, any>,
  assetProvider: HardhatEthersSigner,
  liquidatorContract: string
) {
  const approvals = Object.entries(reserveData).map(async ([, entry]) => {
    const variableDebtTokenAddress = entry.variableDebtTokenAddress;
    const variableDebtToken = await ethers.getContractAt(
      "DebtTokenBase",
      variableDebtTokenAddress
    );
    const tx = await variableDebtToken
      .connect(assetProvider)
      .getFunction("approveDelegation")(
      liquidatorContract,
      ethers.MaxUint256 // Unlimited allowance
    );
    return tx.wait();
  });
  await Promise.all(approvals);
}

export async function liquidate(
  _lendingPool: Contract,
  _proxy: Contract,
  _liquidationBot: Contract,
  _borrower: HardhatEthersSigner,
  assetProvider: HardhatEthersSigner
) {
  let healthFactor;
  while (true) {
    healthFactor = await _lendingPool.getFunction("getUserAccountData")(
      _borrower.getAddress()
    );
    if (healthFactor[5] < ethers.parseEther("1")) {
      break;
    }
    // 10 days
    await time.increase(60 * 60 * 24 * 7);
  }

  const startHealthFactor = healthFactor[5];
  const borrowers: Borrower[] = [
    { ...healthFactor, address: await _borrower.getAddress() },
  ];

  const mergedData = await getMergedData(
    borrowers,
    _borrower.provider as JsonRpcProvider,
    await _proxy.getAddress(),
    CURRENT_NETWORK.MULTICALL3
  );

  const tx = await performLiquidations(
    mergedData.mergedData,
    mergedData.reserveList,
    assetProvider.provider as JsonRpcProvider,
    mergedData.assetPrices,
    await _proxy.getAddress(),
    await assetProvider.getAddress(),
    await _liquidationBot.getAddress(),
    assetProvider
  );

  await hre.network.provider.send("evm_mine");

  const updatedHealthFactor = await _lendingPool.getFunction(
    "getUserAccountData"
  )(_borrower.getAddress());

  console.log(
    "SHF:",
    startHealthFactor,
    "UHF:",
    updatedHealthFactor[5],
    "DIFF:",
    updatedHealthFactor[5] - startHealthFactor
  );

  return { updatedHealthFactor: updatedHealthFactor[5], startHealthFactor };
}
