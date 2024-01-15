// Load environment variables (RPC_URL and PRIVATE_KEY) from the .env file
require("dotenv").config();

// Import Mangrove and KandelStrategies APIs
const {
  Mangrove,
  KandelStrategies,
  ethers,
} = require("@mangrovedao/mangrove.js");

// Create a wallet with a provider to interact with the chain
const provider = new ethers.providers.WebSocketProvider(process.env.LOCAL_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// Connect the API to Mangrove
const mgv = await Mangrove.connect({ signer: wallet });

// Choose a market
const market = await mgv.market({
  base: "WETH",
  quote: "USDT",
  tickSpacing: 1,
});

// Initialize KandelStrategies for strategy management
const kandelStrategies = new KandelStrategies(mgv);

// Retrieve default configuration for the selected market
const config = kandelStrategies.configuration.getConfig(market);

// Create a distribution generator for the selected market
const distributionGenerator = kandelStrategies.generator(market);

// Get the minimum required base and quote amounts per offer for the market
const minBasePerOffer = await kandelStrategies.seeder.getMinimumVolume({
  market,
  offerType: "asks",
  onAave: false,
});
const minQuotePerOffer = await kandelStrategies.seeder.getMinimumVolume({
  market,
  offerType: "bids",
  onAave: false,
});

// Calculate a candidate distribution with the recommended minimum volumes given the price range and a price ratio of roughly 1% (it gets converted to an offset in ticks between prices, and some precision is lost)
// The price points are generated outwards from the mid price, and the default step size for the market is used.
const minDistribution =
  await distributionGenerator.calculateMinimumDistribution({
    distributionParams: {
      minPrice: 900,
      maxPrice: 1100,
      priceRatio: 1.01,
      midPrice: 1000,
      generateFromMid: true,
      stepSize: config.stepSize,
    },
    minimumBasePerOffer: minBasePerOffer,
    minimumQuotePerOffer: minQuotePerOffer,
  });

// Output information about the minimum distribution
const minVolumes = minDistribution.getOfferedVolumeForDistribution();
console.log("Number of price points:", minDistribution.pricePoints);
console.log("Minimum base volume:", minVolumes.requiredBase.toString());
console.log("Minimum quote volume:", minVolumes.requiredQuote.toString());

// Recalculate the distribution based on desired base and quote amounts, which should be at least the recommended.
const finalDistribution =
  await distributionGenerator.recalculateDistributionFromAvailable({
    distribution: minDistribution,
    availableBase: 3,
    availableQuote: 3000,
  });
const offeredVolumes = finalDistribution.getOfferedVolumeForDistribution();

// Inspect the final distribution's offers - their raw ticks are shown along with their price - and initially dead offers can be seen with 0 gives.
console.log(finalDistribution.getOffersWithPrices());

// Prepare seed data for deploying a Kandel instance
const seed = {
  onAave: false,
  market,
  liquiditySharing: false,
};

// Deploy a Kandel instance with the specified seed data (the offers are later populated based on the above distribution)
const { result } = await kandelStrategies.seeder.sow(seed);
const kandelInstance = await result;

// Approve Kandel instance to use our funds
const approvalTxs = await kandelInstance.approveIfHigher();

// Wait for approval transactions (one for base, one for quote) to be mined
const approvalReceipts = await Promise.all(approvalTxs.map((x) => x?.wait()));

// To mint test tokens the following can be used
await (
  await market.base.contract.mint(
    market.base.toUnits(offeredVolumes.requiredBase),
  )
).wait();
await (
  await market.quote.contract.mint(
    market.quote.toUnits(offeredVolumes.requiredQuote),
  )
).wait();

// Populate the Kandel instance according to our desired distribution (can be multiple transactions if there are many price points)
const populateTxs = await kandelInstance.populateGeometricDistribution({
  distribution: finalDistribution,
  depositBaseAmount: offeredVolumes.requiredBase,
  depositQuoteAmount: offeredVolumes.requiredQuote,
});

// The populate uses the recommended provision of native tokens for the offers which can be inspected with:
ethers.utils.formatUnits(populateTxs[0].value, "ether");
// The recommended provision was calculated using this:
await kandelStrategies.seeder.getRequiredProvision(seed, finalDistribution);

// Wait for the populate transactions to be mined
const populateReceipts = await Promise.all(populateTxs.map((x) => x.wait()));

// If the transactions went through, then the kandel is now populated and has the funds transferred to it
console.log(
  "Kandel balance of base =",
  await kandelInstance.getBalance("asks"),
  "and quote =",
  await kandelInstance.getBalance("bids"),
);

// Retrieve deployed Kandels owned by the wallet via the farm which detects Kandels by inspecting events from the seeder.
const ownedKandels = await kandelStrategies.farm.getKandels({
  owner: wallet.address,
});

// Get an instance to interact with one of the deployed Kandels
const deployedKandel = await kandelStrategies.instance({
  address: ownedKandels[0].kandelAddress,
});

// We can get the status of the offers using the following which retrieves data for all the Kandel offers and correlates it with the given mid price
const offerStatuses = await deployedKandel.getOfferStatuses(1000);
// Inspect the lowest priced bid
console.log(offerStatuses.statuses[0].bids);

// Finally, we may at some point want to withdraw the entire instance and all funds
const withdrawTxs = await deployedKandel.retractAndWithdraw();
const withdrawReceipts = await Promise.all(withdrawTxs.map((x) => x.wait()));

// Check the Kandel instance balances after withdrawal are now 0
console.log(
  "Kandel balance of base =",
  await kandelInstance.getBalance("asks"),
  "and quote =",
  await kandelInstance.getBalance("bids"),
);
