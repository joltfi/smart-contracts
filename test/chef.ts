import { expect } from "chai";
import hre from "hardhat";

const Module = require("../ignition/modules/08-deploy-chef");

describe("DeployChef", function () {
  describe("constructor", function () {
    it("Should set the right APR", async () => {
      const { chefIncentivesController } = await hre.ignition.deploy(Module);

      expect(await chefIncentivesController.getFunction("apr")()).to.equal(
        3000
      );
      expect(
        await chefIncentivesController.getFunction("rewardsPerSecond")()
      ).to.equal(951398401826484);
    });

    it("Adjust APR correctly to 10%", async () => {
      const { chefIncentivesController } = await hre.ignition.deploy(Module);
      const apr = await chefIncentivesController.getFunction("setAPR")(1000);
      expect(await chefIncentivesController.getFunction("apr")()).to.equal(
        1000
      );
      expect(
        await chefIncentivesController.getFunction("rewardsPerSecond")()
      ).to.equal(317132800608828);
    });
  });
});
