import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { OPTIMISM_MAINNET } from "../../ignition/constant";

const DeployLendingPoolAddressesProviderModule = require("../../ignition/modules/01-deploy-address-provider");

describe("LendingPoolAddressesProvider - marketId", function () {
  describe("constructor", function () {
    it("Should set the right marketId", async () => {
      const { lendingPoolAddressesProvider } = await hre.ignition.deploy(
        DeployLendingPoolAddressesProviderModule
      );
      expect(
        await lendingPoolAddressesProvider.getFunction("getMarketId")()
      ).to.equal(OPTIMISM_MAINNET.MARKET_ID);
    });
  });

  describe("marketId", function () {
    it("Should allow owner to set marketId", async function () {
      const [owner, otherAccount] = await hre.ethers.getSigners();
      const { lendingPoolAddressesProvider } = await hre.ignition.deploy(
        DeployLendingPoolAddressesProviderModule
      );
      const newMarketId = "new_test";

      await lendingPoolAddressesProvider
        .connect(owner)
        .getFunction("setMarketId")(newMarketId);

      expect(
        await lendingPoolAddressesProvider.getFunction("getMarketId")()
      ).to.equal(newMarketId);
    });

    it("Should emit event after set marketId", async function () {
      const [owner, otherAccount] = await hre.ethers.getSigners();
      const { lendingPoolAddressesProvider } = await hre.ignition.deploy(
        DeployLendingPoolAddressesProviderModule
      );
      const newMarketId = "new_test2";

      // Send the transaction to set the new market ID
      const tx = await lendingPoolAddressesProvider
        .connect(owner)
        .getFunction("setMarketId")(newMarketId);

      // Wait for the transaction to be mined and get the receipt
      const receipt = await tx.wait();

      // Check if the MarketIdSet event was emitted
      const event = receipt.logs.find(
        (log: { topics: ReadonlyArray<string>; data: string }) =>
          lendingPoolAddressesProvider?.interface?.parseLog(log)?.name ===
          "MarketIdSet"
      );

      // Assert that the event was emitted with the correct arguments
      expect(event).to.not.be.undefined;
      expect(event?.args?.newMarketId).to.equal(newMarketId);

      // Also check that the new marketId is returned correctly from the contract
      expect(await lendingPoolAddressesProvider.getMarketId()).to.equal(
        newMarketId
      );
    });

    it("Should not allow non-owner to set marketId", async function () {
      const [owner, otherAccount] = await hre.ethers.getSigners();
      const { lendingPoolAddressesProvider } = await hre.ignition.deploy(
        DeployLendingPoolAddressesProviderModule
      );
      await expect(
        lendingPoolAddressesProvider
          .connect(otherAccount)
          .getFunction("setMarketId")("hacker")
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
});
