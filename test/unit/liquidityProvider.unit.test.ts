import assert from "assert";
import { LiquidityProvider } from "../../src";
import { BigNumber } from "ethers/lib/ethers";

describe("Liquidity provider unit tests suite", () => {
  it("normalizeOfferParams", async function () {
    const { tick, gives, price, fund } = LiquidityProvider.normalizeOfferParams(
      {
        ba: "asks",
        tick: 1,
        gives: 1,
      },
      {
        tickSpacing: BigNumber.from(1),
        base: {
          decimals: 18,
        },
        quote: {
          decimals: 18,
        },
      }
    );
    assert.equal(price.toNumber(), 1.0001);
    //FIXME: test the rest
  });
});