import config from "config";
import dotenvFlow from "dotenv-flow";
import { MaxUpdateConstraint, OracleSourceConfiguration } from "../GasUpdater";
import logger from "./logger";
dotenvFlow.config();
if (!process.env["NODE_CONFIG_DIR"]) {
  process.env["NODE_CONFIG_DIR"] = __dirname + "/../../config/";
}

export default config;
export { config };
export type OracleConfig = {
  acceptableGasGapToOracle: number;
  runEveryXHours: number;
  oracleSourceConfiguration: OracleSourceConfiguration;
};

export function readAndValidateConfig(): OracleConfig {
  let acceptableGasGapToOracle = 0;
  let runEveryXHours = 0;

  const configErrors: string[] = [];
  // - acceptable gap
  if (config.has("acceptableGasGapToOracle")) {
    acceptableGasGapToOracle = config.get<number>("acceptableGasGapToOracle");
  } else {
    configErrors.push("'acceptableGasGapToOracle' missing");
  }

  // - run every X hours
  if (config.has("runEveryXHours")) {
    runEveryXHours = config.get<number>("runEveryXHours");
  } else {
    configErrors.push("'runEveryXHours' missing");
  }

  // - oracle source config
  let constantOracleGasPrice: number | undefined;
  let oracleURL = "";
  let oracleURL_Key = "";
  let oracleURL_subKey = "";
  let maxUpdateConstraint: MaxUpdateConstraint = {};

  if (config.has("constantOracleGasPrice")) {
    constantOracleGasPrice = config.get<number>("constantOracleGasPrice");
  }

  if (config.has("oracleURL")) {
    oracleURL = config.get<string>("oracleURL");
  }

  if (config.has("oracleURL_Key")) {
    oracleURL_Key = config.get<string>("oracleURL_Key");
  }

  if (config.has("oracleURL_subKey")) {
    oracleURL_subKey = config.get<string>("oracleURL_subKey");
  }

  if (config.has("maxUpdateConstraint")) {
    maxUpdateConstraint = config.get<MaxUpdateConstraint>(
      "maxUpdateConstraint"
    );
  }

  if (
    maxUpdateConstraint?.constant &&
    acceptableGasGapToOracle > maxUpdateConstraint.constant
  ) {
    configErrors.push(
      "The max update constraint is lower than the acceptableGasGap. With this config, the gas price will never be updated"
    );
  }

  let oracleSourceConfiguration: OracleSourceConfiguration;
  if (constantOracleGasPrice != null) {
    // if constant price set, use that and ignore other gas price config
    logger.info(
      `Configuration for constant oracle gas price found. Using the configured value.`,
      { data: constantOracleGasPrice }
    );

    oracleSourceConfiguration = {
      OracleGasPrice: constantOracleGasPrice,
      _tag: "Constant",
    };
  } else {
    // basic validatation of endpoint config
    if (
      oracleURL == null ||
      oracleURL == "" ||
      oracleURL_Key == null ||
      oracleURL_Key == ""
    ) {
      configErrors.push(
        `Either 'constantOracleGasPrice' or the pair ('oracleURL', 'oracleURL_Key') must be set in config. Found values: constantOracleGasPrice: '${constantOracleGasPrice}', oracleURL: '${oracleURL}', oracleURL_Key: '${oracleURL_Key}', oracleURL_subKey: '${oracleURL_subKey}'`
      );
    }
    logger.info(
      `Configuration for oracle endpoint found. Using the configured values.`,
      {
        data: { oracleURL, oracleURL_Key },
      }
    );

    if (configErrors.length > 0) {
      throw new Error(
        `Found following config errors: [${configErrors.join(", ")}]`
      );
    }

    oracleSourceConfiguration = {
      oracleEndpointURL: oracleURL,
      oracleEndpointKey: oracleURL_Key,
      oracleEndpointSubKey: oracleURL_subKey,
      _tag: "Endpoint",
    };
  }

  return {
    acceptableGasGapToOracle: acceptableGasGapToOracle,
    oracleSourceConfiguration: oracleSourceConfiguration,
    runEveryXHours: runEveryXHours,
  };
}
