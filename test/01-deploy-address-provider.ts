import { expect } from "chai";
import hre from "hardhat";
import { NOT_OWNER } from "./utils/definitions";

const DeployLendingPoolAddressesProviderModule = require("../ignition/modules/01-deploy-address-provider");
const DeployLendingPoolModule = require("../ignition/modules/02-deploy-lending-pool");

describe("DeployLendingPoolAddressesProvider", function () {
  describe("Address Management", function () {
    it("Should set and get address with setAddress", async function () {
      const [owner, otherAccount] = await hre.ethers.getSigners();
      const { lendingPoolAddressesProvider } = await hre.ignition.deploy(
        DeployLendingPoolAddressesProviderModule
      );
      const id = hre.ethers.id(NOT_OWNER);

      await lendingPoolAddressesProvider
        .connect(owner)
        .getFunction("setAddress")(id, otherAccount.address);

      expect(
        await lendingPoolAddressesProvider.getFunction("getAddress")(id)
      ).to.equal(otherAccount.address);
    });

    it("Should not allow non-owner to setAddress", async function () {
      const [owner, otherAccount] = await hre.ethers.getSigners();
      const { lendingPoolAddressesProvider } = await hre.ignition.deploy(
        DeployLendingPoolAddressesProviderModule
      );
      const id = hre.ethers.id(NOT_OWNER);
      await expect(
        lendingPoolAddressesProvider
          .connect(otherAccount)
          .getFunction("setAddress")(id, otherAccount.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should create and update proxy address with setAddres", async function () {
      const [owner, otherAccount] = await hre.ethers.getSigners();
      const { lendingPoolAddressesProvider } = await hre.ignition.deploy(
        DeployLendingPoolAddressesProviderModule
      );
      const { lendingPool } = await hre.ignition.deploy(
        DeployLendingPoolModule
      );
      const id = hre.ethers.id("LENDING_POOL");

      await lendingPoolAddressesProvider
        .connect(owner)
        .getFunction("setAddress")(id, lendingPool); // Use the deployed contract's address

      const proxyAddress = await lendingPoolAddressesProvider.getFunction(
        "getAddress"
      )(id);
      expect(proxyAddress).to.equal(lendingPool);
    });
  });

  describe("Admin Roles", function () {
    it("Should set and get Pool Admin address", async function () {
      const [owner, otherAccount] = await hre.ethers.getSigners();
      const { lendingPoolAddressesProvider } = await hre.ignition.deploy(
        DeployLendingPoolAddressesProviderModule
      );
      await lendingPoolAddressesProvider
        .connect(owner)
        .getFunction("setPoolAdmin")(otherAccount.address);
      expect(
        await lendingPoolAddressesProvider.getFunction("getPoolAdmin")()
      ).to.equal(otherAccount.address);
    });

    it("Should set and get Price Oracle address", async function () {
      const [owner, otherAccount] = await hre.ethers.getSigners();
      const { lendingPoolAddressesProvider } = await hre.ignition.deploy(
        DeployLendingPoolAddressesProviderModule
      );
      await lendingPoolAddressesProvider
        .connect(owner)
        .getFunction("setPriceOracle")(otherAccount.address);
      expect(
        await lendingPoolAddressesProvider.getFunction("getPriceOracle")()
      ).to.equal(otherAccount.address);
    });
  });
});
