import { BigNumber } from "ethers";
import KandelDistribution, { OfferDistribution } from "../kandelDistribution";
import { TickLib } from "../../util/coreCalculations/TickLib";
import { Bigish } from "../../types";

/** @title A geometric distribution of bids and ask for a geometric Kandel. */
class GeometricKandelDistribution extends KandelDistribution {
  baseQuoteTickIndex0: number;
  baseQuoteTickOffset: number;
  bidGives: Bigish | undefined;
  askGives: Bigish | undefined;
  firstAskIndex: number;

  /** Constructor
   * @param baseQuoteTickIndex0 The base quote tick index of the first price point.
   * @param baseQuoteTickOffset The number of ticks to jump between two price points - this gives the geometric progression. Should be >=1.
   * @param firstAskIndex The index of the first ask in the distribution.
   * @param bidGives The amount of quote to give for each bid (undefined means derive from constant ask gives)
   * @param askGives The amount of base to give for each ask (undefined means derive from constant bid gives)
   * @param pricePoints The number of price points in the distribution.
   * @param stepSize The step size used when transporting funds from an offer to its dual. Should be >=1.
   * @param offers The distribution of bids and asks.
   * @param baseDecimals The number of decimals for the base token.
   * @param quoteDecimals The number of decimals for the quote token.
   */
  public constructor(
    baseQuoteTickIndex0: number,
    baseQuoteTickOffset: number,
    firstAskIndex: number,
    bidGives: Bigish | undefined,
    askGives: Bigish | undefined,
    pricePoints: number,
    stepSize: number,
    offers: OfferDistribution,
    baseDecimals: number,
    quoteDecimals: number,
  ) {
    super(pricePoints, stepSize, offers, baseDecimals, quoteDecimals);
    this.baseQuoteTickOffset = baseQuoteTickOffset;
    this.baseQuoteTickIndex0 = baseQuoteTickIndex0;
    this.bidGives = bidGives;
    this.askGives = askGives;
    this.firstAskIndex = firstAskIndex;
  }

  /** Gets the price ratio given by the baseQuoteTickOffset. */
  public getPriceRatio() {
    // This simply calculates 1.001^offset which will be the difference between prices.
    return TickLib.priceFromTick(BigNumber.from(this.baseQuoteTickOffset));
  }

  /** Split a distribution into chunks according to the maximum number of offers in a single chunk.
   * @param maxOffersInChunk The maximum number of offers in a single chunk.
   * @returns The chunks.
   */
  public chunkGeometricDistribution(maxOffersInChunk: number) {
    return this.helper.chunkIndicesAroundMiddle(
      0,
      this.pricePoints,
      maxOffersInChunk,
      this.getFirstLiveAskIndex(),
    );
  }
}

export default GeometricKandelDistribution;