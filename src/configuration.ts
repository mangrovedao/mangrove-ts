import loadedTokens from "./constants/tokens.json";
import loadedBlockManagerOptionsByNetwork from "./constants/blockManagerOptionsByNetwork.json";
import loadedReliableHttpProviderOptionsByNetwork from "./constants/reliableHttpProviderOptionsByNetwork.json";
import loadedReliableWebSocketOptionsByNetwork from "./constants/reliableWebSocketOptionsByNetwork.json";
import loadedKandelConfiguration from "./constants/kandelConfiguration.json";
import loadedMangroveOrderConfiguration from "./constants/mangroveOrder.json";
import contractPackageVersions from "./constants/contractPackageVersions.json";

import { ethers } from "ethers";
import Big from "big.js";
import {
  BlockManager,
  ReliableHttpProvider,
  ReliableWebsocketProvider,
} from "@mangrovedao/reliable-event-subscriber";
import { Bigish, Provider, typechain } from "./types";
import * as mgvDeployments from "@mangrovedao/mangrove-deployments";
import * as contextAddresses from "@mangrovedao/context-addresses";
import * as eth from "./eth";
import clone from "just-clone";
import deepmerge from "deepmerge";
import moize from "moize";

// Make keys optional at all levels of T
export type RecursivePartial<T> = {
  [P in keyof T]?: T[P] extends (infer U)[]
    ? RecursivePartial<U>[]
    : T[P] extends object | undefined
    ? RecursivePartial<T[P]>
    : T[P];
};

export type network = string;
export type address = string;
export type tokenSymbol = string;

export type NamedAddresses = Record<string, address>;
export type AddressesConfig = Record<network, NamedAddresses>;

export type TokenConfig = {
  decimals?: number;
  displayedDecimals?: number;
  displayedAsPriceDecimals?: number;
  cashness?: number;
};
export type TokenDefaults = {
  defaultDisplayedDecimals: number;
  defaultDisplayedPriceDecimals: number;
};

export type ReliableEventSubscriberConfig = {
  defaultBlockManagerOptions: BlockManager.Options;
  blockManagerOptionsByNetwork: Record<network, BlockManager.Options>;
  defaultReliableHttpProviderOptions: Omit<
    ReliableHttpProvider.Options,
    "onError"
  >;
  reliableHttpProviderOptionsByNetwork: Record<
    network,
    Omit<ReliableHttpProvider.Options, "onError">
  >;
  defaultReliableWebSocketOptions: Omit<
    ReliableWebsocketProvider.Options,
    "wsUrl"
  >;
  reliableWebSocketOptionsByNetwork: Record<
    network,
    Omit<ReliableWebsocketProvider.Options, "wsUrl">
  >;
};

/** Kandel configuration for a specific chain.
 * @param gaspriceFactor The factor to multiply the gasprice by. This is used to ensure that the Kandel offers do not fail to be reposted even if Mangrove's gasprice increases up to this.
 * @param maxOffersInPopulateChunk The maximum number of offers to include in a single populate transaction to avoid exceeding the gas limit.
 * @param maxOffersInRetractChunk The maximum number of offers to include in a single retract transaction to avoid exceeding the gas limit.
 */
export type KandelNetworkConfiguration = {
  gaspriceFactor: number;
  maxOffersInPopulateChunk: number;
  maxOffersInRetractChunk: number;
};

/** Kandel configuration for a specific market.
 * @param aaveEnabled Whether AaveKandel should be allowed to be used.
 * @param minimumBasePerOfferFactor Additional factor for the minimum amount of base token that should be offered per offer to stay above density requirements.
 * @param minimumQuotePerOfferFactor Additional factor for the minimum amount of quote token that should be offered per offer to stay above density requirements.
 * @param spread The default spread used when transporting funds from an offer to its dual.
 * @param ratio The default ratio of the geometric progression of prices.
 */
export type KandelMarketConfiguration = {
  aaveEnabled: boolean;
  minimumBasePerOfferFactor: Big;
  minimumQuotePerOfferFactor: Big;
  spread: number;
  ratio: Big;
};

export type KandelRawMarketConfiguration = Omit<
  KandelMarketConfiguration,
  "minimumBasePerOfferFactor" | "minimumQuotePerOfferFactor" | "ratio"
> & {
  minimumBasePerOfferFactor: Bigish;
  minimumQuotePerOfferFactor: Bigish;
  ratio: Bigish;
};

export type KandelAllConfigurationFields = KandelNetworkConfiguration &
  KandelRawMarketConfiguration;

export type PartialKandelAllConfigurationFields =
  Partial<KandelAllConfigurationFields>;
export type PartialMarketConfig = PartialKandelAllConfigurationFields;
export type PartialNetworkConfig = PartialKandelAllConfigurationFields & {
  markets?: Record<tokenSymbol, Record<tokenSymbol, PartialMarketConfig>>; // base symbol -> quote symbol -> market config
};

export type PartialKandelConfiguration = PartialKandelAllConfigurationFields & {
  networks?: Record<network, PartialNetworkConfig>;
};

/** Mangrove order configuration for a specific chain.
 * @param restingOrderGasreq The gasreq for a resting order using the MangroveOrder contract.
 * @param takeGasOverhead The overhead of making a market order using the take function on MangroveOrder vs a market order directly on Mangrove.
 */
export type MangroveOrderNetworkConfiguration = {
  restingOrderGasreq: number;
  takeGasOverhead: number;
};

export type PartialMangroveOrderConfiguration =
  Partial<MangroveOrderNetworkConfiguration> & {
    networks?: Record<network, Partial<MangroveOrderNetworkConfiguration>>;
  };

export type Configuration = {
  addressesByNetwork: AddressesConfig;
  tokenDefaults: TokenDefaults;
  tokens: Record<tokenSymbol, TokenConfig>;
  mangroveOrder: PartialMangroveOrderConfiguration;
  reliableEventSubscriber: ReliableEventSubscriberConfig;
  kandel: PartialKandelConfiguration;
};

let config: Configuration;

export type PartialConfiguration = RecursivePartial<Configuration>;

/// ADDRESSES

const addressWatchers: Map<
  string,
  Map<string, ((address: string) => void)[]>
> = new Map(); // network -> name -> watchers[]

export const addressesConfiguration = {
  /**
   * Read all contract addresses on the given network.
   */
  getAllAddresses: (network: string): [string, string][] => {
    const networkAddresses = config.addressesByNetwork[network];
    if (networkAddresses === undefined) {
      throw Error(`No addresses for network ${network}.`);
    }

    return Object.entries(networkAddresses);
  },

  /**
   * Read a contract address on a given network.
   */
  getAddress: (name: string, network: string): string => {
    const networkAddresses = config.addressesByNetwork[network];
    if (networkAddresses === undefined) {
      throw Error(`No addresses for network ${network}.`);
    }

    const address = networkAddresses[name];
    if (address === undefined) {
      throw Error(`No address for ${name} on network ${network}.`);
    }

    return address;
  },

  /** Register a watcher for changes to the address associated with a name on a specific network. */
  watchAddress: (
    network: string,
    name: string,
    callback: (address: string) => void
  ) => {
    let networkWatchers = addressWatchers.get(network);
    if (networkWatchers === undefined) {
      networkWatchers = new Map();
      addressWatchers.set(network, networkWatchers);
    }

    let watchers = networkWatchers.get(name);
    if (watchers === undefined) {
      watchers = [];
      networkWatchers.set(name, watchers);
    }
    watchers.push(callback);
  },

  /**
   * Set a contract address on the given network.
   */
  setAddress: (name: string, address: string, network: string): void => {
    let networkAddresses = config.addressesByNetwork[network];
    if (networkAddresses === undefined) {
      networkAddresses = {};
      config.addressesByNetwork[network] = networkAddresses;
    }
    address = ethers.utils.getAddress(address); // Normalize addresses to allow easy comparison
    config.addressesByNetwork[network][name] = address;

    const watchers = addressWatchers.get(network)?.get(name);
    if (watchers !== undefined) {
      for (const watcher of watchers) {
        watcher(address);
      }
    }
  },

  /**
   * Gets the name of an address on the current network.
   *
   * Note that this reads from the static `Mangrove` address registry which is shared across instances of this class.
   */
  getNameFromAddress: (
    address: string,
    network: string
  ): string | undefined => {
    const networkAddresses = config.addressesByNetwork[network];
    address = ethers.utils.getAddress(address); // normalize

    if (networkAddresses) {
      for (const [name, candidateAddress] of Object.entries(
        networkAddresses
      ) as any) {
        if (candidateAddress == address) {
          return name;
        }
      }
    }
    return undefined;
  },
};

/// TOKENS

function getOrCreateTokenConfig(tokenName: string) {
  let tokenConfig = config.tokens[tokenName];
  if (tokenConfig === undefined) {
    config.tokens[tokenName] = tokenConfig = {};
  }
  return tokenConfig;
}

export const tokensConfiguration = {
  /**
   * Read decimals for `tokenName`.
   * To read decimals directly onchain, use `fetchDecimals`.
   */
  getDecimals: (tokenName: string): number | undefined => {
    return config.tokens[tokenName]?.decimals;
  },

  /**
   * Read decimals for `tokenName`. Fails if the decimals are not in the configuration.
   * To read decimals directly onchain, use `fetchDecimals`.
   */
  getDecimalsOrFail: (tokenName: string): number => {
    const decimals = tokensConfiguration.getDecimals(tokenName);
    if (decimals === undefined) {
      throw Error(`No decimals on record for token ${tokenName}`);
    }

    return decimals;
  },

  /**
   * Read decimals for `tokenName` on given network.
   * If not found in the local configuration, fetch them from the current network and save them
   */
  getOrFetchDecimals: async (
    tokenName: string,
    provider: Provider
  ): Promise<number> => {
    const decimals = tokensConfiguration.getDecimals(tokenName);
    if (decimals !== undefined) {
      return decimals;
    }

    return tokensConfiguration.fetchDecimals(tokenName, provider);
  },

  /**
   * Read chain for decimals of `tokenName` on current network and save them
   */
  fetchDecimals: async (
    tokenName: string,
    provider: Provider
  ): Promise<number> => {
    const network = await eth.getProviderNetwork(provider);
    const token = typechain.IERC20__factory.connect(
      addressesConfiguration.getAddress(tokenName, network.name),
      provider
    );
    const decimals = await token.decimals();
    tokensConfiguration.setDecimals(tokenName, decimals);
    return decimals;
  },

  /**
   * Read chain for decimals of `address` on current network
   */
  fetchDecimalsFromAddress: moize(
    async (address: string, provider: Provider): Promise<number> => {
      const token = typechain.IERC20__factory.connect(address, provider);
      return token.decimals();
    }
  ),

  /**
   * Read displayed decimals for `tokenName`.
   */
  getDisplayedDecimals: (tokenName: string): number => {
    return (
      config.tokens[tokenName]?.displayedDecimals ||
      config.tokenDefaults.defaultDisplayedDecimals
    );
  },

  /**
   * Read displayed decimals for `tokenName` when displayed as a price.
   */
  getDisplayedPriceDecimals: (tokenName: string): number => {
    return (
      config.tokens[tokenName]?.displayedAsPriceDecimals ||
      config.tokenDefaults.defaultDisplayedPriceDecimals
    );
  },

  /** Get the cashness of a token. See {@link setCashness} for details.
   */
  getCashness: (tokenName: string): number | undefined => {
    return config.tokens[tokenName]?.cashness;
  },

  /**
   * Set decimals for `tokenName`.
   */
  setDecimals: (tokenName: string, dec: number): void => {
    getOrCreateTokenConfig(tokenName).decimals = dec;
  },

  /**
   * Set displayed decimals for `tokenName`.
   */
  setDisplayedDecimals: (tokenName: string, dec: number): void => {
    getOrCreateTokenConfig(tokenName).displayedDecimals = dec;
  },

  /**
   * Set displayed decimals for `tokenName` when displayed as a price.
   */
  setDisplayedPriceDecimals: (tokenName: string, dec: number): void => {
    getOrCreateTokenConfig(tokenName).displayedAsPriceDecimals = dec;
  },

  /** Set the relative cashness of a token. This determines which token is base & which is quote in a {@link Market}.
   * Lower cashness is base, higher cashness is quote, tiebreaker is lexicographic ordering of name string (name is most likely the same as the symbol).
   */
  setCashness: (tokenName: string, cashness: number) => {
    getOrCreateTokenConfig(tokenName).cashness = cashness;
  },
};

/// RELIABLE EVENT SUBSCRIBER

export const reliableEventSubscriberConfiguration = {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getLogsTimeout: (network: string): number => {
    return 20_000; // 20 seconds
  },
  getBlockManagerOptions: (network: string): BlockManager.Options => {
    return (
      config.reliableEventSubscriber.blockManagerOptionsByNetwork[network] ??
      config.reliableEventSubscriber.defaultBlockManagerOptions
    );
  },

  getReliableHttpProviderOptions: (
    network: string
  ): Omit<ReliableHttpProvider.Options, "onError"> => {
    return (
      config.reliableEventSubscriber.reliableHttpProviderOptionsByNetwork[
        network
      ] ?? config.reliableEventSubscriber.defaultReliableHttpProviderOptions
    );
  },

  getReliableWebSocketOptions: (
    network: string
  ): Omit<ReliableWebsocketProvider.Options, "wsUrl"> => {
    return (
      config.reliableEventSubscriber.reliableWebSocketOptionsByNetwork[
        network
      ] ?? config.reliableEventSubscriber.defaultReliableWebSocketOptions
    );
  },
};

/// MANGROVE ORDER

export const mangroveOrderConfiguration = {
  /** Gets the gasreq for a resting order using the MangroveOrder contract. */
  getRestingOrderGasreq: (network: string) => {
    const value =
      config.mangroveOrder.networks?.[network]?.restingOrderGasreq ??
      config.mangroveOrder.restingOrderGasreq;
    if (!value) {
      throw Error("No restingOrderGasreq configured");
    }
    return value;
  },

  /** Gets the overhead of making a market order using the take function on MangroveOrder vs a market order directly on Mangrove. */
  getTakeGasOverhead: (network: string) => {
    const value =
      config.mangroveOrder.networks?.[network]?.takeGasOverhead ??
      config.mangroveOrder.takeGasOverhead;
    if (!value) {
      throw Error("No takeGasOverhead configured");
    }
    return value;
  },
};

/// KANDEL

export const kandelConfiguration = {
  getRawConfiguration: (): PartialKandelConfiguration => {
    return config.kandel;
  },
};

/// CONFIGURATION RESET & UPDATE

/** Reset the configuration to defaults provided by mangrove.js */
export function resetConfiguration(): void {
  config = {
    addressesByNetwork: {}, // Addresses are loaded below to ensure normalization
    tokenDefaults: {
      defaultDisplayedDecimals: 2,
      defaultDisplayedPriceDecimals: 6,
    },
    tokens: clone(loadedTokens as Record<tokenSymbol, TokenConfig>),
    reliableEventSubscriber: {
      defaultBlockManagerOptions: {
        maxBlockCached: 50,
        maxRetryGetBlock: 10,
        retryDelayGetBlockMs: 500,
        maxRetryGetLogs: 10,
        retryDelayGetLogsMs: 500,
        batchSize: 200,
      },
      blockManagerOptionsByNetwork: clone(
        loadedBlockManagerOptionsByNetwork as Record<
          network,
          BlockManager.Options
        >
      ),
      defaultReliableHttpProviderOptions: {
        estimatedBlockTimeMs: 2000,
      },
      reliableHttpProviderOptionsByNetwork: clone(
        loadedReliableHttpProviderOptionsByNetwork as Record<
          network,
          Omit<ReliableHttpProvider.Options, "onError">
        >
      ),
      defaultReliableWebSocketOptions: {
        pingIntervalMs: 10000,
        pingTimeoutMs: 5000,
        estimatedBlockTimeMs: 2000,
      },
      reliableWebSocketOptionsByNetwork: clone(
        loadedReliableWebSocketOptionsByNetwork as Record<
          network,
          Omit<ReliableWebsocketProvider.Options, "wsUrl">
        >
      ),
    },
    mangroveOrder: clone(
      loadedMangroveOrderConfiguration as PartialMangroveOrderConfiguration
    ),
    kandel: clone(loadedKandelConfiguration as PartialKandelConfiguration),
  };

  // Load addresses in the following order:
  // 1. context-addresses addresses
  // 2. mangrove-deployments addresses
  // Last loaded address is used
  readContextAddresses();
  readMangroveDeploymentAddresses();
}

function readMangroveDeploymentAddresses() {
  // Note: Consider how to expose other deployments than the primary

  const mgvCoreVersionPattern = `^${contractPackageVersions["mangrove-core"]}`;
  // Note: Make this configurable?
  const mgvCoreReleasedFilter = undefined; // undefined => released & unreleased, true => released only, false => unreleased only
  const mgvCoreContractsDeployments =
    mgvDeployments.getCoreContractsVersionDeployments({
      version: mgvCoreVersionPattern,
      released: mgvCoreReleasedFilter,
    });
  readVersionDeploymentsAddresses(mgvCoreContractsDeployments);

  const mgvStratsVersionPattern = `^${contractPackageVersions["mangrove-strats"]}`;
  // Note: Make this configurable?
  const mgvStratsReleasedFilter = undefined; // undefined => released & unreleased, true => released only, false => unreleased only
  const mgvStratsContractsDeployments =
    mgvDeployments.getStratsContractsVersionDeployments({
      version: mgvStratsVersionPattern,
      released: mgvStratsReleasedFilter,
    });
  readVersionDeploymentsAddresses(mgvStratsContractsDeployments);
}

function readVersionDeploymentsAddresses(
  contractsDeployments: mgvDeployments.VersionDeployments[]
) {
  for (const contractDeployments of contractsDeployments) {
    for (const [networkId, networkDeployments] of Object.entries(
      contractDeployments.networkAddresses
    )) {
      const networkName = eth.getNetworkName(+networkId);
      addressesConfiguration.setAddress(
        contractDeployments.deploymentName ?? contractDeployments.contractName,
        networkDeployments.primaryAddress,
        networkName
      );
    }
  }
}

function readContextAddresses() {
  readContextMulticallAddresses();
  readContextErc20Addresses();
  readContextAaveAddresses();
}

function readContextMulticallAddresses() {
  const allMulticallAddresses = contextAddresses.getAllMulticallAddresses();
  for (const [addressId, role] of Object.entries(allMulticallAddresses)) {
    for (const [networkId, address] of Object.entries(role.networkAddresses)) {
      const networkName = eth.getNetworkName(+networkId);
      addressesConfiguration.setAddress(addressId, address, networkName);
    }
  }
}

function readContextErc20Addresses() {
  for (const [, /*tokenId*/ erc20] of Object.entries(
    contextAddresses.getAllErc20s()
  )) {
    for (const [networkId, networkInstances] of Object.entries(
      erc20.networkInstances
    )) {
      const networkName = eth.getNetworkName(+networkId);
      for (const [erc20InstanceId, erc20Instance] of Object.entries(
        networkInstances
      )) {
        addressesConfiguration.setAddress(
          erc20InstanceId,
          erc20Instance.address,
          networkName
        );
        // Also register the default instance as the token symbol for convenience
        if (erc20Instance.default) {
          addressesConfiguration.setAddress(
            erc20.symbol,
            erc20Instance.address,
            networkName
          );
        }
      }
    }
  }
}

function readContextAaveAddresses() {
  const allAaveV3Addresses = contextAddresses.getAllAaveV3Addresses();
  for (const [addressId, role] of Object.entries(allAaveV3Addresses)) {
    for (const [networkId, address] of Object.entries(role.networkAddresses)) {
      const networkName = eth.getNetworkName(+networkId);
      addressesConfiguration.setAddress(addressId, address, networkName);
    }
  }
}

/** Update the configuration by providing a partial configuration containing only the values that should be changed/added.
 *
 * Example for adding configuration for a new token with symbol "SYM":
 *
 *    updateConfiguration({tokens: { SYM: { decimals: 18}}})
 */
export function updateConfiguration(defaults: PartialConfiguration): void {
  config = deepmerge(config, defaults) as Configuration;
}

// Initialize configuration
resetConfiguration();

export const configuration = {
  addresses: addressesConfiguration,
  tokens: tokensConfiguration,
  reliableEventSubscriber: reliableEventSubscriberConfiguration,
  kandel: kandelConfiguration,
  mangroveOrder: mangroveOrderConfiguration,
  resetConfiguration,
  updateConfiguration,
};
export default configuration;
