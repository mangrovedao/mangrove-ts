import { Mangrove, Market, MgvToken, ethers } from "@mangrovedao/mangrove.js";
import UnitCalculations from "@mangrovedao/mangrove.js/dist/nodejs/util/unitCalculations";
import dotenvFlow from "dotenv-flow";
import { MgvArbitrage__factory } from "./types/typechain";
import { logger } from "./util/logger";
import { ArbConfig } from "./util/configUtils";
import { PriceUtils } from "@mangrovedao/bot-utils/build/util/priceUtils";
import { BigNumber, BigNumberish } from "ethers";
import Big from "big.js";
dotenvFlow.config();

export class ArbBot {
  mgv: Mangrove;
  poolContract: ethers.Contract;
  priceUtils = new PriceUtils(logger);

  constructor(_mgv: Mangrove, _poolContract: ethers.Contract) {
    this.mgv = _mgv;
    this.poolContract = _poolContract;
  }

  public async run(
    marketConfig: [string, string, number],
    config: ArbConfig
  ): Promise<{
    askTransaction: ethers.ContractTransaction;
    bidTransaction: ethers.ContractTransaction;
  }> {
    try {
      const [base, quote, fee] = marketConfig;
      const market = await this.mgv.market({
        base: base,
        quote: quote,
        bookOptions: { maxOffers: 20 },
      });
      const APIKEY = process.env["APIKEY"];
      if (!APIKEY) {
        throw new Error("No API key for alchemy");
      }
      const gasprice = await this.priceUtils.getGasPrice(
        APIKEY,
        this.mgv.network.name
      );
      const nativeToken = this.getNativeTokenNameAndDecimals(
        this.mgv.network.id
      );
      const holdsTokenPrice = await this.priceUtils
        .getExternalPriceFromInAndOut(nativeToken.name, config.holdingToken)
        .price();

      return {
        askTransaction: await this.checkPrice(
          market,
          "asks",
          config,
          fee,
          gasprice,
          holdsTokenPrice
        ),
        bidTransaction: await this.checkPrice(
          market,
          "bids",
          config,
          fee,
          gasprice,
          holdsTokenPrice
        ),
      };
    } catch (error) {
      logger.error("Error starting bots for market", { data: marketConfig });
      logger.error(error);
      throw error;
    }
  }

  private getNativeTokenNameAndDecimals(chainId?: number) {
    // const provider = this.mgv.provider;
    // const network = await provider.getNetwork();
    // const nativeCurrency = network.;
    // const currencyInfo = ethers.utils.get(nativeCurrency.symbol);
    // TODO: get the correct native token name and decimals
    return { name: "matic", decimals: 18 };
  }

  private async checkPrice(
    market: Market,
    BA: Market.BA,
    config: ArbConfig,
    fee: number,
    gasprice: BigNumber,
    holdsTokenPrice: Big
  ): Promise<ethers.ContractTransaction> {
    const bestId = market.getSemibook(BA).getBestInCache();
    const bestOffer = bestId ? await market.offerInfo(BA, bestId) : undefined;
    let wantsToken = BA == "asks" ? market.base : market.quote;
    let givesToken = BA == "asks" ? market.quote : market.base;

    if (bestOffer && bestId) {
      const result = await this.isProfitable(
        bestId,
        wantsToken,
        bestOffer,
        givesToken,
        config,
        fee,
        gasprice,
        holdsTokenPrice
      );
      if (result.isProfitable) {
        return (await this.doArbitrage(
          bestId,
          wantsToken,
          bestOffer,
          givesToken,
          result.costInHoldingToken,
          config,
          fee
        )) as ethers.ContractTransaction;
      }
    }
  }

  private async isProfitable(
    bestId: number,
    wantsToken: MgvToken,
    bestOffer: Market.Offer,
    givesToken: MgvToken,
    config: ArbConfig,
    fee: number,
    gasprice: BigNumber,
    holdsTokenPrice: Big
  ): Promise<{
    isProfitable: boolean;
    costInHoldingToken: BigNumberish;
  }> {
    try {
      let gasused = await this.estimateArbGas(
        bestId,
        wantsToken,
        bestOffer,
        givesToken,
        config,
        fee
      );
      const costInNative = gasprice.mul(gasused);
      const costInHoldingToken = holdsTokenPrice
        .mul(costInNative.toString())
        .round();
      const t = await this.staticArb(
        bestId,
        wantsToken,
        bestOffer,
        givesToken,
        costInHoldingToken.toString(),
        config,
        fee
      );
      return {
        isProfitable: true,
        costInHoldingToken: costInHoldingToken.toString(),
      };
    } catch (e) {
      logger.debug(e);
      return { isProfitable: false, costInHoldingToken: 0 };
    }
  }

  private async estimateArbGas(
    bestId: number,
    wantsToken: MgvToken,
    bestOffer: Market.Offer,
    givesToken: MgvToken,
    config: ArbConfig,
    fee: number
  ) {
    const gasused = await this.doArbitrage(
      bestId,
      wantsToken,
      bestOffer,
      givesToken,
      0,
      config,
      fee,
      true
    );
    return gasused as BigNumber;
  }

  private async staticArb(
    bestId: number,
    wantsToken: MgvToken,
    bestOffer: Market.Offer,
    givesToken: MgvToken,
    minGain: BigNumberish,
    config: ArbConfig,
    fee: number
  ) {
    await this.doArbitrage(
      bestId,
      wantsToken,
      bestOffer,
      givesToken,
      minGain,
      config,
      fee,
      false,
      true
    );
  }

  private async doArbitrage(
    bestId: number,
    wantsToken: MgvToken,
    bestOffer: Market.Offer,
    givesToken: MgvToken,
    minGain: BigNumberish,
    config: ArbConfig,
    fee: number,
    estimateGas = false,
    staticCall = false
  ) {
    const holdsToken = config.holdingToken == givesToken.name;

    const arbAddress = Mangrove.getAddress(
      "MgvArbitrage",
      (await this.mgv.provider.getNetwork()).name
    );
    const arbContract = MgvArbitrage__factory.connect(
      arbAddress,
      this.mgv.signer
    );

    if (holdsToken) {
      return await (staticCall
        ? arbContract.callStatic
        : estimateGas
        ? arbContract.estimateGas
        : arbContract
      ).doArbitrage({
        offerId: bestId,
        takerWantsToken: wantsToken.address,
        takerWants: UnitCalculations.toUnits(
          bestOffer.gives,
          wantsToken.decimals
        ).toString(),
        takerGivesToken: givesToken.address,
        takerGives: UnitCalculations.toUnits(
          bestOffer.wants,
          givesToken.decimals
        ).toString(),
        fee: fee,
        minGain: minGain,
      });
    } else if (config.exchangeConfig) {
      if ("fee" in config.exchangeConfig) {
        return await (staticCall
          ? arbContract.callStatic
          : estimateGas
          ? arbContract.estimateGas
          : arbContract
        ).doArbitrageExchangeOnUniswap(
          {
            offerId: bestId,
            takerWantsToken: wantsToken.address,
            takerWants: UnitCalculations.toUnits(
              bestOffer.gives,
              wantsToken.decimals
            ).toString(),
            takerGivesToken: givesToken.address,
            takerGives: UnitCalculations.toUnits(
              bestOffer.wants,
              givesToken.decimals
            ).toString(),
            fee: fee,
            minGain: minGain,
          },
          givesToken.mgv.token(config.holdingToken).address,
          config.exchangeConfig.fee
        );
      } else {
        return await (staticCall
          ? arbContract.callStatic
          : estimateGas
          ? arbContract.estimateGas
          : arbContract
        ).doArbitrageExchangeOnMgv(
          {
            offerId: bestId,
            takerWantsToken: wantsToken.address,
            takerWants: UnitCalculations.toUnits(
              bestOffer.gives,
              wantsToken.decimals
            ).toString(),
            takerGivesToken: givesToken.address,
            takerGives: UnitCalculations.toUnits(
              bestOffer.wants,
              givesToken.decimals
            ).toString(),
            fee: fee,
            minGain: minGain,
          },
          givesToken.mgv.token(config.holdingToken).address
        );
      }
    }
  }
}
