import { ethers } from "ethers";
import { convertTokenAmount } from "./liquidator";
import { expect } from "chai";
/*
      isUserDebtMoreThanAvailable ?
        -> yes 
          -> isAssetProviderMoreThanAvailable
            -> yes
              -> lendingPoolAvailable
            -> no
              -> asset provider available
          

        -> no
          -> isUserDebtMoreThanAssetProvider ?
            -> yes
              -> asset provider
            -> no 
              -> debt
  */
describe("convert token", () => {
  const WETH = { assetPrice: 2000000000000000000000n, decimals: 18 };
  const WBTC = { assetPrice: 100000000000000000000000n, decimals: 8 };
  it("WETH to WBTC", () => {
    /* prettier-ignore-start */
    const amount = ethers.parseEther("0.1");
    const result = convertTokenAmount(WETH, WBTC, amount);

    expect(result).to.equal(200000n);
  });
  it("WBTC to WETH", () => {
    /* prettier-ignore-start */
    const amount = ethers.parseUnits("1", 8);
    const result = convertTokenAmount(WBTC, WETH, amount);

    expect(result).to.equal(ethers.parseEther("50"));
  });
});
