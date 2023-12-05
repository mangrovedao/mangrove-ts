// Unit tests for Trade.ts
import assert from "assert";
import { Big } from "big.js";
import { BigNumber } from "ethers";
import { describe, it } from "mocha";
import {
  anything,
  capture,
  instance,
  mock,
  spy,
  verify,
  when,
} from "ts-mockito";
import { Market, Token } from "../../src";
import { Bigish } from "../../src/types";
import Trade from "../../src/util/trade";
import * as TickLib from "../../src/util/coreCalculations/TickLib";
import TickPriceHelper from "../../src/util/tickPriceHelper";

describe("Trade unit tests suite", () => {
  describe("getParamsForBuy", () => {
    it("returns fillVolume as volume, tick as -1*tick(price) and fillWants true, when params has price!=null and volume", async function () {
      //Arrange
      const trade = new Trade();
      const spyTrade = spy(trade);
      const limitPrice: Bigish = 20;
      const slippage = 3;
      const params: Market.TradeParams = {
        limitPrice,
        volume: 30,
        slippage: slippage,
      };
      const baseToken = mock(Token);
      const quoteToken = mock(Token);
      when(baseToken.toUnits(anything())).thenReturn(
        BigNumber.from(params.volume),
      );
      when(baseToken.decimals).thenReturn(18);
      when(quoteToken.toUnits(anything()))
        .thenReturn(BigNumber.from(params.limitPrice))
        .thenCall((b) => {
          return BigNumber.from(b.toFixed(0));
        });
      when(quoteToken.decimals).thenReturn(12);
      when(spyTrade.validateSlippage(slippage)).thenReturn(slippage);
      const tickPriceHelper = new TickPriceHelper("asks", {
        base: { decimals: 18 },
        quote: { decimals: 12 },
      });

      //Act
      const result = trade.getParamsForBuy(
        params,
        instance(baseToken),
        instance(quoteToken),
      );
      const [wants] = capture(baseToken.toUnits).first();

      //Assert
      assert.equal(
        result.fillVolume.toString(),
        BigNumber.from(params.volume).toString(),
      );

      const expectedTickWithSlippage = tickPriceHelper.tickFromPrice(
        Big(params.limitPrice)
          .mul(100 + slippage)
          .div(100),
      );

      assert.equal(
        result.maxTick.toString(),
        BigNumber.from(expectedTickWithSlippage).toString(),
      );
      assert.equal(result.fillWants, true);
      assert.equal(Big(params.volume).toFixed(), Big(wants).toFixed());
    });

    it("returns fillVolume as total, tick as tick(price) and fillWants false, when params has price!=null and total", async function () {
      //Arrange
      const trade = new Trade();
      const spyTrade = spy(trade);
      const limitPrice: Bigish = 20;
      const slippage = 3;
      const params: Market.TradeParams = {
        limitPrice,
        total: 30,
        slippage: slippage,
      };
      const baseToken = mock(Token);
      const quoteToken = mock(Token);
      when(baseToken.toUnits(anything())).thenReturn(
        BigNumber.from(Big(params.total).div(limitPrice).toFixed(0)),
      );
      when(baseToken.decimals).thenReturn(18);
      when(quoteToken.toUnits(anything())).thenReturn(
        BigNumber.from(params.total),
      );
      when(quoteToken.decimals).thenReturn(12);
      when(spyTrade.validateSlippage(slippage)).thenReturn(slippage);
      const tickPriceHelper = new TickPriceHelper("asks", {
        base: { decimals: 18 },
        quote: { decimals: 12 },
      });

      //Act
      const result = trade.getParamsForBuy(
        params,
        instance(baseToken),
        instance(quoteToken),
      );
      //Assert

      const expectedTickWithSlippage = tickPriceHelper.tickFromPrice(
        Big(params.limitPrice)
          .mul(100 + slippage)
          .div(100),
      );

      assert.equal(
        result.fillVolume.eq(BigNumber.from(Big(params.total).toFixed(0))),
        true,
      );
      assert.equal(result.fillWants, false);
      assert.equal(
        result.maxTick.toString(),
        expectedTickWithSlippage.toString(),
      );
    });

    it("returns fillVolume as fillVolume, tick as tick and fillWants as true, when params has fillVolume and tick, but no fillWants ", async function () {
      //Arrange
      const trade = new Trade();
      const spyTrade = spy(trade);
      const slippage = 3;
      const params: Market.TradeParams = {
        maxTick: 20,
        fillVolume: 30,
        slippage: slippage,
      };
      const baseToken = mock(Token);
      const quoteToken = mock(Token);
      when(baseToken.toUnits(anything())).thenReturn(
        BigNumber.from(Big(params.fillVolume).toFixed(0)),
      );
      when(quoteToken.toUnits(anything())).thenReturn(
        BigNumber.from(Big(params.fillVolume).toFixed(0)),
      );
      when(spyTrade.validateSlippage(slippage)).thenReturn(slippage);

      //Act
      const result = trade.getParamsForBuy(
        params,
        instance(baseToken),
        instance(quoteToken),
      );

      //Assert

      const expectedTickWithSlippage = TickPriceHelper.tickFromRawRatio(
        TickPriceHelper.rawRatioFromTick(BigNumber.from(params.maxTick))
          .mul(100 + slippage)
          .div(100),
      );

      assert.equal(
        result.fillVolume.eq(BigNumber.from(Big(params.fillVolume).toFixed(0))),
        true,
      );
      assert.equal(result.fillWants, true);
      assert.equal(
        result.maxTick.toString(),
        expectedTickWithSlippage.toString(),
      );
    });

    it("returns fillVolume as fillVolume, tick as tick and fillWants as fillWants, when params has tick, fillVolume and fillWants ", async function () {
      //Arrange
      const trade = new Trade();
      const spyTrade = spy(trade);
      const slippage = 3;
      const params: Market.TradeParams = {
        maxTick: 20,
        fillVolume: 30,
        fillWants: false,
        slippage: slippage,
      };
      const baseToken = mock(Token);
      const quoteToken = mock(Token);
      when(baseToken.toUnits(anything())).thenReturn(
        BigNumber.from(Big(params.fillVolume).toFixed(0)),
      );
      when(quoteToken.toUnits(anything())).thenReturn(
        BigNumber.from(Big(params.fillVolume).toFixed(0)),
      );
      when(spyTrade.validateSlippage(slippage)).thenReturn(slippage);

      //Act
      const result = trade.getParamsForBuy(
        params,
        instance(baseToken),
        instance(quoteToken),
      );

      //Assert

      const expectedTickWithSlippage = TickPriceHelper.tickFromRawRatio(
        TickPriceHelper.rawRatioFromTick(BigNumber.from(params.maxTick))
          .mul(100 + slippage)
          .div(100),
      );

      assert.equal(
        result.fillVolume.eq(BigNumber.from(Big(params.fillVolume).toFixed(0))),
        true,
      );
      assert.deepStrictEqual(
        result.maxTick.toString(),
        expectedTickWithSlippage.toString(),
      );
      assert.equal(result.fillWants, params.fillWants);
    });

    it("returns fillVolume as gives, tick as TickLib.fromVolume(gives,wants) and fillWants as fillWants, when params has gives, wants and fillWants ", async function () {
      //Arrange
      const trade = new Trade();
      const spyTrade = spy(trade);
      const slippage = 3;
      const params: Market.TradeParams = {
        wants: 20,
        gives: 30,
        fillWants: false,
        slippage: slippage,
      };
      const baseToken = {
        decimals: 18,
        toUnits: (v: Bigish) =>
          BigNumber.from(Big(v).mul(Big(10).pow(18)).toFixed(0)),
      };
      const quoteToken = {
        decimals: 18,
        toUnits: (v: Bigish) =>
          BigNumber.from(Big(v).mul(Big(10).pow(18)).toFixed(0)),
        fromUnits: (v: BigNumber) => Big(v.toString()).div(Big(10).pow(18)),
      };
      when(spyTrade.validateSlippage(slippage)).thenReturn(slippage);

      const tickPriceHelper = new TickPriceHelper("asks", {
        base: baseToken,
        quote: quoteToken,
      });

      //Act
      const result = trade.getParamsForBuy(params, baseToken, quoteToken);

      //Assert
      const givesWithSlippage = Big(params.gives)
        .mul(100 + slippage)
        .div(100);
      const expectedTick = tickPriceHelper.tickFromVolumes(
        givesWithSlippage,
        params.wants,
      );

      assert.equal(
        result.fillVolume.toString(),
        quoteToken.toUnits(givesWithSlippage).toString(),
        "fillVolume",
      );
      assert.deepStrictEqual(
        result.maxTick.toString(),
        expectedTick.toString(),
        "maxTick",
      );
      assert.equal(result.fillWants, params.fillWants, "fillWants");
    });
  });

  describe("getParamsForSell", () => {
    it("returns fillVolume as volume, tick as tick(price) and fillWants false, when params has price!=null and volume", async function () {
      //Arrange
      const trade = new Trade();
      const spyTrade = spy(trade);
      const limitPrice: Bigish = 20;
      const slippage = 3;
      const params: Market.TradeParams = {
        limitPrice,
        volume: 30,
        slippage: slippage,
      };
      const baseToken = mock(Token);
      const quoteToken = mock(Token);
      when(baseToken.toUnits(anything())).thenReturn(
        BigNumber.from(params.volume),
      );
      when(baseToken.decimals).thenReturn(18);
      when(quoteToken.toUnits(anything())).thenReturn(
        BigNumber.from(Big(params.volume).mul(limitPrice).toFixed(0)),
      );
      when(quoteToken.decimals).thenReturn(12);
      when(spyTrade.validateSlippage(slippage)).thenReturn(slippage);

      //Act
      const result = trade.getParamsForSell(
        params,
        instance(baseToken),
        instance(quoteToken),
      );
      const priceWithCorrectDecimals = Big(params.limitPrice).mul(
        Big(10).pow(
          Math.abs(
            instance(baseToken).decimals - instance(quoteToken).decimals,
          ),
        ),
      );
      const expectedTickWithSlippage = TickPriceHelper.tickFromRawRatio(
        Big(priceWithCorrectDecimals)
          .mul(100 - slippage)
          .div(100),
      );

      //Assert
      assert.equal(
        result.maxTick.toString(),
        expectedTickWithSlippage.toString(),
      );
      assert.equal(result.fillVolume.eq(BigNumber.from(params.volume)), true);
      assert.equal(result.fillWants, false);
    });

    it("returns fillVolume as total, tick as tick(price) and fillWants true, when params has price!=null and total", async function () {
      //Arrange
      const trade = new Trade();
      const spyTrade = spy(trade);
      const limitPrice = 20;
      const slippage = 3;
      const params: Market.TradeParams = {
        limitPrice,
        total: 30,
        slippage: slippage,
      };
      const baseToken = mock(Token);
      const quoteToken = mock(Token);
      when(quoteToken.toUnits(anything())).thenReturn(
        BigNumber.from(params.total),
      );
      when(quoteToken.decimals).thenReturn(12);
      when(baseToken.toUnits(anything())).thenReturn(
        BigNumber.from(Big(params.total).div(limitPrice).toFixed(0)),
      );
      when(baseToken.decimals).thenReturn(18);
      when(spyTrade.validateSlippage(slippage)).thenReturn(slippage);

      //Act
      const result = trade.getParamsForSell(
        params,
        instance(baseToken),
        instance(quoteToken),
      );
      const priceWithCorrectDecimals = Big(params.limitPrice).mul(
        Big(10).pow(
          Math.abs(
            instance(baseToken).decimals - instance(quoteToken).decimals,
          ),
        ),
      );
      const expectedTickWithSlippage = TickPriceHelper.tickFromRawRatio(
        Big(1).div(
          Big(priceWithCorrectDecimals)
            .mul(100 - slippage)
            .div(100),
        ),
      );

      //Assert
      assert.equal(
        result.fillVolume.toString(),
        BigNumber.from(params.total).toString(),
      );
      assert.equal(
        result.maxTick.toString(),
        expectedTickWithSlippage.toString(),
      );
      assert.equal(result.fillWants, true);
    });

    it("returns fillVolume as fillVolume, tick as tick and fillWants false, when params has wants and gives, but no fillWants", async function () {
      //Arrange
      const trade = new Trade();
      const spyTrade = spy(trade);
      const slippage = 3;
      const params: Market.TradeParams = {
        fillVolume: 20,
        maxTick: 30,
        slippage: slippage,
      };
      const baseToken = mock(Token);
      const quoteToken = mock(Token);
      when(quoteToken.toUnits(anything())).thenReturn(
        BigNumber.from(params.fillVolume),
      );
      when(baseToken.toUnits(anything())).thenReturn(
        BigNumber.from(params.fillVolume),
      );
      when(spyTrade.validateSlippage(slippage)).thenReturn(slippage);

      //Act
      const result = trade.getParamsForSell(
        params,
        instance(baseToken),
        instance(quoteToken),
      );

      //Assert
      const expectedTickWithSlippage = TickPriceHelper.tickFromRawRatio(
        TickPriceHelper.rawRatioFromTick(BigNumber.from(params.maxTick))
          .mul(100 - slippage)
          .div(100),
      );

      assert.equal(
        result.fillVolume.toString(),
        BigNumber.from(params.fillVolume).toString(),
      );
      assert.equal(
        result.maxTick.toString(),
        expectedTickWithSlippage.toString(),
      );
      assert.equal(result.fillWants, false);
    });

    it("returns wants as wants, gives as gives and fillWants as fillWants, when params has wants, gives and fillWants", async function () {
      //Arrange
      const trade = new Trade();
      const spyTrade = spy(trade);
      const slippage = 3;
      const params: Market.TradeParams = {
        fillVolume: 20,
        maxTick: 30,
        fillWants: true,
        slippage: slippage,
      };
      const baseToken = mock(Token);
      const quoteToken = mock(Token);
      when(quoteToken.toUnits(anything())).thenReturn(
        BigNumber.from(params.fillVolume),
      );
      when(baseToken.toUnits(anything())).thenReturn(
        BigNumber.from(params.fillVolume),
      );
      when(spyTrade.validateSlippage(slippage)).thenReturn(slippage);

      //Act
      const result = trade.getParamsForSell(
        params,
        instance(baseToken),
        instance(quoteToken),
      );

      //Assert

      const expectedTickWithSlippage = TickPriceHelper.tickFromRawRatio(
        TickPriceHelper.rawRatioFromTick(BigNumber.from(params.maxTick))
          .mul(100 - slippage)
          .div(100),
      );

      assert.equal(
        result.fillVolume.toString(),
        BigNumber.from(params.fillVolume).toString(),
      );
      assert.equal(
        result.maxTick.toString(),
        expectedTickWithSlippage.toString(),
      );
      assert.equal(result.fillWants, true);
    });

    it("returns fillVolume as gives, tick as TickLib.fromVolume(gives,wants) and fillWants as fillWants, when params has gives, wants and fillWants ", async function () {
      //Arrange
      const trade = new Trade();
      const spyTrade = spy(trade);
      const slippage = 3;
      const params: Market.TradeParams = {
        wants: 20,
        gives: 30,
        fillWants: false,
        slippage: slippage,
      };
      const baseTokenDecimals = 18;
      const baseToken = {
        decimals: baseTokenDecimals,
        toUnits: (v: Bigish) =>
          BigNumber.from(Big(v).mul(Big(10).pow(baseTokenDecimals)).toFixed(0)),
      };
      const quoteTokenDecimals = 18;
      const quoteToken = {
        decimals: quoteTokenDecimals,
        toUnits: (v: Bigish) =>
          BigNumber.from(
            Big(v).mul(Big(10).pow(quoteTokenDecimals)).toFixed(0),
          ),
        fromUnits: (v: BigNumber) =>
          Big(v.toString()).div(Big(10).pow(quoteTokenDecimals)),
      };
      when(spyTrade.validateSlippage(slippage)).thenReturn(slippage);

      const tickPriceHelper = new TickPriceHelper("bids", {
        base: baseToken,
        quote: quoteToken,
      });

      //Act
      const result = trade.getParamsForSell(params, baseToken, quoteToken);

      //Assert
      const wantsWithSlippage = Big(params.wants)
        .mul(100 - slippage)
        .div(100);
      const expectedTick = tickPriceHelper.tickFromVolumes(
        params.gives,
        wantsWithSlippage,
      );

      assert.equal(
        result.fillVolume.toString(),
        quoteToken.toUnits(params.gives).toString(),
      );
      assert.deepStrictEqual(
        result.maxTick.toString(),
        expectedTick.toString(),
      );
      assert.equal(result.fillWants, params.fillWants);
    });
  });

  describe("validateSlippage", () => {
    it("returns 0, when slippage is undefined", async function () {
      //Arrange
      const trade = new Trade();
      //Act
      const result = trade.validateSlippage();
      //Assert
      assert.equal(result, 0);
    });

    it("throw error, when slippage is above 100", async function () {
      //Arrange
      const trade = new Trade();
      //Act

      //Assert
      assert.throws(() => trade.validateSlippage(101));
    });

    it("throw error, when slippage is lower than 0", async function () {
      //Arrange
      const trade = new Trade();
      //Act

      //Assert
      assert.throws(() => trade.validateSlippage(-1));
    });

    it("return given slippage, when it is valid", async function () {
      //Arrange
      const trade = new Trade();
      //Act
      const result = trade.validateSlippage(10);
      //Assert
      assert.equal(result, 10);
    });
  });

  describe("isPriceBetter", () => {
    it("Uses “lt“ when ba = asks", async function () {
      // Arrange
      const trade = new Trade();
      const spyTrade = spy(trade);
      const ba = "asks";
      const price = 10;
      const referencePrice = 9;

      //Act
      const result = trade.isPriceBetter(price, referencePrice, ba);

      //Assert
      verify(spyTrade.comparePrices(price, "lt", referencePrice)).once();
      assert.equal(result, false);
    });

    it("Uses “gt“ when ba = bids", async function () {
      // Arrange
      const trade = new Trade();
      const spyTrade = spy(trade);
      const ba = "bids";
      const price = 10;
      const referencePrice = 9;

      //Act
      const result = trade.isPriceBetter(price, referencePrice, ba);

      //Assert
      verify(spyTrade.comparePrices(price, "gt", referencePrice)).once();
      assert.equal(result, true);
    });
  });

  describe("isPriceWorse", () => {
    it("Uses “gt“ when ba = bids", async function () {
      // Arrange
      const trade = new Trade();
      const spyTrade = spy(trade);
      const ba = "bids";
      const price = 10;
      const referencePrice = 9;

      //Act
      const result = trade.isPriceBetter(price, referencePrice, ba);

      //Assert
      verify(spyTrade.comparePrices(price, "gt", referencePrice)).once();
      assert.equal(result, true);
    });

    it("Uses “lt“ when ba = asks", async function () {
      // Arrange
      const trade = new Trade();
      const spyTrade = spy(trade);
      const ba = "asks";
      const price = 10;
      const referencePrice = 9;

      //Act
      const result = trade.isPriceBetter(price, referencePrice, ba);

      //Assert
      verify(spyTrade.comparePrices(price, "lt", referencePrice)).once();
      assert.equal(result, false);
    });
  });

  describe("comparePrices", () => {
    it("returns true, when price < referencePrice and compare is “lt“", async function () {
      // Arrange
      const trade = new Trade();
      const price = 10;
      const referencePrice = 11;

      //Act
      const result = trade.comparePrices(price, "lt", referencePrice);

      //Assert
      assert.equal(result, true);
    });

    it("returns false, when price > referencePrice and compare is “lt“", async function () {
      // Arrange
      const trade = new Trade();
      const price = 10;
      const referencePrice = 9;

      //Act
      const result = trade.comparePrices(price, "lt", referencePrice);

      //Assert
      assert.equal(result, false);
    });

    it("returns false, when price = referencePrice and compare is “lt“", async function () {
      // Arrange
      const trade = new Trade();
      const price = 10;
      const referencePrice = 10;

      //Act
      const result = trade.comparePrices(price, "lt", referencePrice);

      //Assert
      assert.equal(result, false);
    });

    it("returns true, when price < referencePrice and compare is “gt“", async function () {
      // Arrange
      const trade = new Trade();
      const price = 10;
      const referencePrice = 11;

      //Act
      const result = trade.comparePrices(price, "gt", referencePrice);

      //Assert
      assert.equal(result, false);
    });

    it("returns false, when price > referencePrice and compare is “gt“", async function () {
      // Arrange
      const trade = new Trade();
      const price = 10;
      const referencePrice = 9;

      //Act
      const result = trade.comparePrices(price, "gt", referencePrice);

      //Assert
      assert.equal(result, true);
    });

    it("returns false, when price = referencePrice and compare is “gt“", async function () {
      // Arrange
      const trade = new Trade();
      const price = 10;
      const referencePrice = 10;

      //Act
      const result = trade.comparePrices(price, "gt", referencePrice);

      //Assert
      assert.equal(result, false);
    });
  });
});
