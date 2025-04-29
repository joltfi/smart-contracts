import { ATOKEN_ABI, ERC20_ABI } from "../abi/abi";
import { CURRENT_NETWORK } from "../ignition/constant";
import { getDeploymentAddress } from "./utils/hardhat";

const { ethers } = require("hardhat");

async function main() {
  const wethAToken = getDeploymentAddress("DeployWEthModule#AToken");

  // Get the signer (the account that will interact with the contract)
  const [signer, signer2] = await ethers.getSigners();

  console.log(`Using signer address: ${signer.address}`);
  console.log("wethAToken", wethAToken);

  const contract = new ethers.Contract(
    "0x3A7BADaE41a29CB894Be03E2C053135ad7d585f0",
    ATOKEN_ABI,
    signer
  );

  const debtContract = new ethers.Contract(
    "0xe46927C16204a64f6183848a0636C0648C90d4d5",
    ATOKEN_ABI,
    signer
  );

  const weth = new ethers.Contract(
    CURRENT_NETWORK.WETH.ASSET_ADDRESS,
    ERC20_ABI,
    signer
  );

  const currentATokenSupply = await contract.totalSupply();
  const totalBorrowed = await debtContract.totalSupply();
  const currentUnderlyingBalance = await weth.balanceOf(
    "0x3A7BADaE41a29CB894Be03E2C053135ad7d585f0"
  );

  const requiredLiquidity = currentATokenSupply - totalBorrowed;

  console.log("currentUnderlyingBalance", currentUnderlyingBalance);
  console.log("currentATokenSupply     ", currentATokenSupply);
  console.log("totalBorrowed           ", totalBorrowed);
  console.log("requiredLiquidity       ", requiredLiquidity);
  const maxWithdraw = currentUnderlyingBalance - requiredLiquidity;
  console.log(
    "Max withdrawable        " +
      (maxWithdraw > currentUnderlyingBalance
        ? currentUnderlyingBalance
        : maxWithdraw)
  );
  await contract.withdrawReserves(
    maxWithdraw > currentUnderlyingBalance
      ? currentUnderlyingBalance
      : maxWithdraw
  );
}

// Execute the script
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
