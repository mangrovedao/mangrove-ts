import { describe, it } from "mocha";
import assert from "assert";
import PrettyPrint from "../../src/util/prettyPrint";
import { capture, spy } from "ts-mockito";
import { Market } from "../../src";
import Big from "big.js";
import { BigNumber } from "ethers";
import { TickLib } from "../../src/util/coreCalculations/TickLib";

describe("PrettyPrint Unit test suite", () => {
  describe("consoleOffers", () => {
    it("should use default filter", async function () {
      const prettyPrint = new PrettyPrint();
      //Arrange
      const spyPrint = spy(prettyPrint);
      const offer: Market.Offer = {
        id: 1,
        prev: 2,
        next: 3,
        gasprice: 4,
        maker: "maker",
        gasreq: 0,
        offer_gasbase: 0,
        gives: new Big(12),
        tick: BigNumber.from(31),
        price: TickLib.priceFromTick(BigNumber.from(31)),
      };
      const offers: Iterable<Market.Offer> = [offer];

      //Act
      prettyPrint.consoleOffers(offers);

      const [firstArg, secArg] = capture(spyPrint.prettyPrint).last();

      //Assert
      assert.equal(firstArg, offers);
      assert.equal(4, secArg.length);
      assert.equal(secArg[0], "id");
      assert.equal(secArg[1], "maker");
      assert.equal(secArg[2], "gives");
      assert.equal(secArg[3], "price");
    });

    it("should use given filter", async function () {
      const prettyPrint = new PrettyPrint();
      //Arrange
      const spyPrint = spy(prettyPrint);
      const offer: Market.Offer = {
        id: 1,
        prev: 2,
        next: 3,
        gasprice: 4,
        maker: "maker",
        gasreq: 0,
        offer_gasbase: 0,
        gives: new Big(12),
        tick: BigNumber.from(31),
        price: TickLib.priceFromTick(BigNumber.from(31)),
      };
      const offers: Iterable<Market.Offer> = [offer];

      //Act
      prettyPrint.consoleOffers(offers, ["id", "maker"]);

      const [firstArg, secArg] = capture(spyPrint.prettyPrint).last();

      //Assert
      assert.equal(firstArg, offers);
      assert.equal(2, secArg.length);
      assert.equal(secArg[0], "id");
      assert.equal(secArg[1], "maker");
    });
  });

  describe("prettyPrint", () => {
    it("prints the offers using the given filter", async function () {
      //Arrange
      const prettyPrint = new PrettyPrint();
      const offer: Market.Offer = {
        id: 1,
        prev: 2,
        next: 3,
        gasprice: 4,
        maker: "maker",
        gasreq: 0,
        offer_gasbase: 0,
        gives: new Big(12),
        tick: BigNumber.from(31),
        price: TickLib.priceFromTick(BigNumber.from(31)),
      };
      const offers: Iterable<Market.Offer> = [offer, offer];

      //Act
      prettyPrint.prettyPrint(offers, ["id", "next", "gives"]);
      //Assert
    });
  });
});
