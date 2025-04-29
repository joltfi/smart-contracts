import { expect } from "chai";
import hre from "hardhat";

const DeployLendingPoolAddressesProviderModule = require("../ignition/modules/01-deploy-address-provider");
const DeployLendingPoolModule = require("../ignition/modules/02-deploy-lending-pool");

describe("DeployLendingPool", function () {
  describe("Deployment", function () {
    it("Should deploy", async function () {
      const { lendingPool } = await hre.ignition.deploy(
        DeployLendingPoolModule
      );
      expect(lendingPool).to.not.be.null;
    });
  });

  describe("initialize", function () {
    it("should link to address provider", async function () {
      const [owner, otherAccount] = await hre.ethers.getSigners();

      const { lendingPool } = await hre.ignition.deploy(
        DeployLendingPoolModule
      );

      await lendingPool.connect(owner).getFunction("initialize")(
        otherAccount.address
      );

      expect(lendingPool).to.not.be.null;
    });
  });
});
