// Integration tests for SimpleMaker.ts
import { afterEach, beforeEach, describe, it } from "mocha";

import { utils } from "ethers";

import assert from "assert";
import {
  LiquidityProvider,
  Mangrove,
  Market,
  MgvToken,
  OfferLogic,
  mgvTestUtil,
} from "../../src";
import { AbstractRouter } from "../../src/types/typechain";

import { JsonRpcProvider, TransactionResponse } from "@ethersproject/providers";
import { Big } from "big.js";
import { waitForTransaction } from "../../src/util/test/mgvIntegrationTestUtil";

//pretty-print when using console.log
Big.prototype[Symbol.for("nodejs.util.inspect.custom")] = function () {
  return `<Big>${this.toString()}`; // previously just Big.prototype.toString;
};

describe("RestingOrder", () => {
  let mgv: Mangrove;
  let tokenA: MgvToken;
  let tokenB: MgvToken;
  let orderLogic: OfferLogic;
  let orderLP: LiquidityProvider;
  let router: AbstractRouter;

  afterEach(async () => {
    mgv.disconnect();
  });

  describe("RestingOrder connectivity", function () {
    it("deploys and connects", async function () {
      mgv = await Mangrove.connect({
        provider: this.server.url,
        privateKey: this.accounts.tester.key,
      });
      //shorten polling for faster tests
      (mgv.provider as any).pollingInterval = 10;

      // interpreting mangroveOrder as a maker contract
      orderLogic = mgv.offerLogic(mgv.orderContract.address);
      orderLP = await LiquidityProvider.connect(orderLogic, {
        base: "TokenA",
        quote: "TokenB",
        tickSpacing: 1,
        bookOptions: { maxOffers: 30 },
      });

      //check that contract responds
      const gasreq = await orderLogic.offerGasreq();
      assert(gasreq == orderLP.gasreq, "Cannot talk to resting order contract");
      assert(orderLP.computeAskProvision({ gasreq: gasreq }));
    });
  });

  describe("Resting order integration tests suite", () => {
    /* Make sure tx has been mined so we can read the result off the chain */
    const w = async (r: Promise<TransactionResponse>) => (await r).wait(1);

    beforeEach(async function () {
      //set mgv object

      mgv = await Mangrove.connect({
        provider: this.server.url,
        privateKey: this.accounts.deployer.key,
      });

      tokenA = await mgv.token("TokenA");
      tokenB = await mgv.token("TokenB");

      //shorten polling for faster tests
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      mgv.provider.pollingInterval = 10;
      orderLogic = mgv.offerLogic(mgv.orderContract.address);
      const market = await mgv.market({
        base: "TokenA",
        quote: "TokenB",
        tickSpacing: 1,
        bookOptions: { maxOffers: 30 },
      });

      orderLP = await LiquidityProvider.connect(orderLogic, market);
      router = (await orderLogic.router()) as AbstractRouter;

      await w(orderLogic.activate(["TokenA", "TokenB"]));

      // minting As and Bs for test runner
      const me = await mgv.signer.getAddress();
      await w(tokenA.contract.mintTo(me, utils.parseUnits("100", 18)));
      await w(tokenB.contract.mintTo(me, utils.parseUnits("100", 18)));

      // `me` proposes asks on Mangrove so should approve base
      await w(tokenA.approveMangrove());
      const meAsLP = await mgv.liquidityProvider(market);

      const provision = await meAsLP.computeAskProvision();
      // fills Asks semi book
      await meAsLP.newAsk({
        price: 10 / 10,
        volume: 10,
        fund: provision,
      });
      await meAsLP.newAsk({
        price: 10 / 9,
        volume: 9,
        fund: provision,
      });
      await meAsLP.newAsk({
        price: 10 / 8,
        volume: 8,
        fund: provision,
      });
      mgvTestUtil.initPollOfTransactionTracking(mgv.provider);
    });

    it("simple resting order, with no forceRoutingToMangroveOrder", async () => {
      const provision = await orderLP.computeBidProvision();

      await w(tokenB.approve(router.address));
      await w(tokenA.approve(router.address));

      const buyPromises = await orderLP.market.buy({
        price: 1,
        volume: 20,
        restingOrder: { provision: provision },
      });

      const orderResult = await buyPromises.result;
      orderResult.summary = orderResult.summary as Market.OrderSummary;
      assert(
        // 2.5% fee configured in mochaHooks.js
        orderResult.summary.totalGot!.eq(10 * 0.975),
        `Taker received an incorrect amount ${orderResult.summary.totalGot}`
      );
      assert(
        orderResult.summary.totalGave!.sub(10).abs().lt(0.001),
        `Taker gave an incorrect amount ${orderResult.summary.totalGave}`
      );
      assert(
        orderResult.restingOrder ? orderResult.restingOrder.id > 0 : false,
        "Resting order was not posted"
      );
      assert(
        orderResult.summary.partialFill,
        "Order should have been partially filled"
      );
      assert(orderResult.summary.bounty!.eq(0), "No offer should have failed");
    });

    it("simple resting order, with forceRoutingToMangroveOrder:true", async () => {
      const provision = await orderLP.computeBidProvision();

      await w(tokenB.approve(router.address));
      await w(tokenA.approve(router.address));

      const buyPromises = await orderLP.market.buy({
        forceRoutingToMangroveOrder: true,
        price: 1,
        volume: 20,
        restingOrder: { provision: provision },
      });
      const orderResult = await buyPromises.result;
      orderResult.summary = orderResult.summary as Market.OrderSummary;
      assert(
        // 2.5% fee configured in mochaHooks.js
        orderResult.summary.totalGot!.eq(10 * 0.975),
        `Taker received an incorrect amount ${orderResult.summary.totalGot}`
      );
      assert(
        orderResult.summary.totalGave!.sub(10).abs().lt(0.001),
        `Taker gave an incorrect amount ${orderResult.summary.totalGave}`
      );
      assert(
        orderResult.restingOrder ? orderResult.restingOrder.id > 0 : false,
        "Resting order was not posted"
      );
      assert(
        orderResult.summary.partialFill,
        "Order should have been partially filled"
      );
      assert(orderResult.summary.bounty!.eq(0), "No offer should have failed");
    });

    it("simple resting order, with forceRoutingToMangroveOrder:false", async () => {
      const provision = await orderLP.computeBidProvision();

      await w(tokenB.approve(router.address));
      await w(tokenA.approve(router.address));

      const buyPromises = await orderLP.market.buy({
        forceRoutingToMangroveOrder: false,
        price: 1, // tokenA
        volume: 20, // tokenB
        restingOrder: { provision: provision },
      });
      const orderResult = await buyPromises.result;
      orderResult.summary = orderResult.summary as Market.OrderSummary;
      assert(
        // 2.5% fee configured in mochaHooks.js
        orderResult.summary.totalGot!.eq(10 * 0.975),
        `Taker received an incorrect amount ${orderResult.summary.totalGot}`
      );
      assert(
        orderResult.summary.totalGave!.sub(10).abs().lt(0.001),
        `Taker gave an incorrect amount ${orderResult.summary.totalGave}`
      );
      assert(
        orderResult.restingOrder ? orderResult.restingOrder.id > 0 : false,
        "Resting order was not posted"
      );
      assert(
        orderResult.summary.partialFill,
        "Order should have been partially filled"
      );
      assert(orderResult.summary.bounty!.eq(0), "No offer should have failed");
    });

    it("no resting order params, with forceRoutingToMangroveOrder:true", async () => {
      await w(tokenB.approve(router.address));
      await w(tokenA.approve(router.address));

      const buyPromises = await orderLP.market.buy({
        forceRoutingToMangroveOrder: true,
        price: 1, // tokenA
        volume: 5, // tokenB
      });
      const orderResult = await buyPromises.result;
      orderResult.summary = orderResult.summary as Market.OrderSummary;
      assert(
        // 2,5% fee configured in mochaHooks.js
        orderResult.summary.totalGot!.eq(5 * 0.975),
        `Taker received an incorrect amount ${orderResult.summary.totalGot}`
      );
      assert(
        orderResult.summary.totalGave!.sub(5).abs().lt(0.001),
        `Taker gave an incorrect amount ${orderResult.summary.totalGave}`
      );
      assert(!orderResult.restingOrder?.id, "Resting order was posted");
      assert(
        !orderResult.summary.partialFill,
        "Order should have been fully filled"
      );
      assert(orderResult.summary.bounty!.eq(0), "No offer should have failed");
    });

    it("resting order with deadline", async () => {
      const provision = await orderLP.computeBidProvision();

      await w(tokenB.approve(router.address));
      await w(tokenA.approve(router.address));

      const market: Market = orderLP.market;

      const buyPromises = await market.buy({
        price: 1, // tokenA
        volume: 20, // tokenB
        expiryDate:
          (
            await mgv.provider.getBlock(mgv.provider.getBlockNumber())
          ).timestamp + 5,
        restingOrder: {
          provision: provision,
        },
      });
      const orderResult = await buyPromises.result;
      const tx = await waitForTransaction(buyPromises.response);
      await mgvTestUtil.waitForBlock(market.mgv, tx.blockNumber);
      assert(
        orderResult.restingOrder ? orderResult.restingOrder.id > 0 : false,
        "Resting order was not posted"
      );
      const olKeyHash = mgv.getOlKeyHash(tokenB.address, tokenA.address, 1);
      const ttl = await mgv.orderContract.expiring(
        olKeyHash!,
        orderResult.restingOrder ? orderResult.restingOrder.id : 0
      );

      assert(
        orderResult.restingOrder
          ? orderResult.restingOrder.gives.sub(10).abs().lt(0.001)
          : false,
        `orderResult.restingOrder.gives: ${orderResult.restingOrder?.gives}, should be 10`
      );
      assert(
        orderResult.restingOrder
          ? orderResult.restingOrder.price.sub(1).abs().lt(0.001)
          : false,
        `orderResult.restingOrder.price should be 1 but is ${orderResult.restingOrder?.price.toFixed()}`
      );

      // taking resting offer

      await w(tokenB.approveMangrove());
      await w(tokenA.approveMangrove());

      const sellPromises = await market.sell({
        tick: orderResult.restingOrder!.tick.toNumber(),
        fillVolume: 1,
        fillWants: true,
      });
      const result = await sellPromises.result;
      result.summary = result.summary as Market.OrderSummary;
      const tx2 = await waitForTransaction(sellPromises.response);

      await mgvTestUtil.waitForBlock(market.mgv, tx2.blockNumber);

      // 2,5% fee configured in mochaHooks.js
      assert(
        result.summary
          .totalGot!.minus(1 * 0.975)
          .abs()
          .lt(0.001),
        `Taker received an incorrect amount ${result.summary.totalGot}`
      );
      assert(
        await orderLP.market.isLive(
          "bids",
          orderResult.restingOrder ? orderResult.restingOrder.id : 0
        ),
        "Residual should still be in the book"
      );
      // Advance time 6 seconds by changing clock and mining block
      await (mgv.provider as JsonRpcProvider).send("evm_increaseTime", ["6"]);
      await (mgv.provider as JsonRpcProvider).send("anvil_mine", ["0x100"]);

      assert(
        ttl.lt(
          (await mgv.provider.getBlock(mgv.provider.getBlockNumber())).timestamp
        ),
        "Timestamp did not advance"
      );

      const sellPromises_ = await market.sell({ price: 1.0001, volume: 5 });
      const result_ = await sellPromises_.result;
      assert(result_.summary.bounty!.gt(0), "Order should have reneged");
    });

    it("no resting order params, with forceRoutingToMangroveOrder:true", async () => {
      await w(tokenB.approve(router.address));
      await w(tokenA.approve(router.address));

      const buyPromises = await orderLP.market.buy({
        forceRoutingToMangroveOrder: true,
        price: 1, // tokenA
        volume: 5, // tokenB
      });
      const orderResult = await buyPromises.result;
      orderResult.summary = orderResult.summary as Market.OrderSummary;
      assert(
        // 2,5% fee configured in mochaHooks.js
        orderResult.summary.totalGot!.eq(5 * 0.975),
        `Taker received an incorrect amount ${orderResult.summary.totalGot}`
      );
      assert(
        orderResult.summary.totalGave!.sub(5).abs().lt(0.001),
        `Taker gave an incorrect amount ${orderResult.summary.totalGave}`
      );
      assert(!orderResult.restingOrder?.id, "Resting order was posted");
      assert(
        !orderResult.summary.partialFill,
        "Order should have been fully filled"
      );
      assert(orderResult.summary.bounty!.eq(0), "No offer should have failed");
    });

    it("resting order, using existing offer", async () => {
      const provision = await orderLP.computeBidProvision();

      await w(tokenB.approve(router.address));
      await w(tokenA.approve(router.address));

      const market: Market = orderLP.market;

      const buyPromises = await market.buy({
        price: 1, // tokenA
        volume: 20, // tokenB
        restingOrder: {
          provision: provision,
        },
      });
      const orderResult = await buyPromises.result;
      const tx = await waitForTransaction(buyPromises.response);
      await mgvTestUtil.waitForBlock(market.mgv, tx.blockNumber);
      assert(
        orderResult.restingOrder ? orderResult.restingOrder.id > 0 : false,
        "Resting order was not posted"
      );
      assert(
        orderResult.restingOrder
          ? orderResult.restingOrder.gives.sub(10).abs().lt(0.001)
          : false,
        `orderResult.restingOrder.gives: ${orderResult.restingOrder?.gives}, should be 10`
      );
      assert(
        orderResult.restingOrder
          ? orderResult.restingOrder.price.sub(1).abs().lt(0.001)
          : false,
        `orderResult.restingOrder.price should be 1 but is ${orderResult.restingOrder?.price.toFixed()}`
      );

      // taking resting offer

      await w(tokenB.approveMangrove());
      await w(tokenA.approveMangrove());

      const sellPromises = await market.sell({
        tick: orderResult.restingOrder!.tick.toNumber(),
        fillVolume: 10,
        fillWants: true,
      });
      const result = await sellPromises.result;
      result.summary = result.summary as Market.OrderSummary;
      const tx2 = await waitForTransaction(sellPromises.response);

      await mgvTestUtil.waitForBlock(market.mgv, tx2.blockNumber);

      // 2,5% fee configured in mochaHooks.js
      assert(
        result.summary
          .totalGot!.minus(10 * 0.975)
          .abs()
          .lt(0.001),
        `Taker received an incorrect amount ${result.summary.totalGot}`
      );
      assert(
        !(await orderLP.market.isLive(
          "bids",
          orderResult.restingOrder ? orderResult.restingOrder.id : 0
        )),
        "Residual should not still be in the book"
      );

      const buyAgainPromises = await market.buy({
        price: 1, // tokenA
        volume: 20, // tokenB
        restingOrder: {
          provision: provision,
          offerId: orderResult.restingOrder!.id,
        },
      });
      const orderAgainResult = await buyAgainPromises.result;
      const tx3 = await waitForTransaction(buyAgainPromises.response);
      await mgvTestUtil.waitForBlock(market.mgv, tx3.blockNumber);

      assert(
        await orderLP.market.isLive("bids", orderResult.restingOrder!.id),
        "Residual should be in the book again, on same offerId"
      );

      assert.deepStrictEqual(
        orderAgainResult.restingOrder!.id,
        orderResult.restingOrder!.id,
        "OfferId should be the same"
      );

      assert.deepStrictEqual(
        orderAgainResult.restingOrder,
        orderAgainResult.offerWrites[0].offer,
        "Resting order was not correct"
      );
    });
  });
});
