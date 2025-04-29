import { expect } from "chai";
import exp from "constants";
import {
  ContractTransaction,
  TransactionReceipt,
  TransactionResponse,
} from "ethers";
import hre from "hardhat";

const DeployLendingPoolAddressesProviderModule = require("../../ignition/modules/01-deploy-address-provider");
const DeployLendingPoolModule = require("../../ignition/modules/02-deploy-lending-pool");

describe("LendingPoolAddressesProvider - initialize", function () {
  describe("initialize", function () {
    it("Should change to addressProvider", async function () {
      const [owner] = await hre.ethers.getSigners();
      const { lendingPoolAddressesProvider } = await hre.ignition.deploy(
        DeployLendingPoolAddressesProviderModule
      );
      const { lendingPool } = await hre.ignition.deploy(
        DeployLendingPoolModule
      );
      await lendingPool.connect(owner).getFunction("initialize")(
        lendingPoolAddressesProvider
      );

      expect(await lendingPool.getFunction("getAddressesProvider")()).to.equal(
        lendingPoolAddressesProvider
      );
    });

    it("Cannot be initialized twice", async function () {
      const [owner] = await hre.ethers.getSigners();
      const { lendingPoolAddressesProvider } = await hre.ignition.deploy(
        DeployLendingPoolAddressesProviderModule
      );
      const { lendingPool } = await hre.ignition.deploy(
        DeployLendingPoolModule
      );

      const lendingPoolAddress = await lendingPool.getAddress();

      const tx: TransactionResponse = await lendingPoolAddressesProvider
        .connect(owner)
        .getFunction("setLendingPoolImpl")(lendingPoolAddress);

      await tx.wait();

      // cannot initialized twice
      expect(
        lendingPoolAddressesProvider
          .connect(owner)
          .getFunction("setLendingPoolImpl")(lendingPoolAddress)
      ).to.be.reverted;

      // cannot initialized twice
      expect(
        lendingPoolAddressesProvider
          .connect(owner)
          .getFunction("setLendingPoolImpl")(lendingPoolAddress)
      ).to.be.reverted;
    });
  });
});
