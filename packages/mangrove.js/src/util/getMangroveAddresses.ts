/*
Enumerate distributed mangrove-solidity deployments and copy required contract (one set for each chainkey) to addresses.json.

Warning: since we use foundry's broadcast logs, contract instance names are just their class names. You cannot distinguish two instances of the same contract. If you want to deploy 2 instances of a contract in a single deployment, you must create a new contract in mangrove-solidity, e.g.

  contract SubA is A {}


Args:

  [--debug] Add --debug flag to get debug output.
  [--dry-run] Do not actually update addresses.json.

Example:

  ts-node getMangroveAddresses.ts --dry-run
*/

import fs from "fs";
import path from "path";
import minimist from "minimist";

/* Configuration */

const broadcastDir = path.resolve("../mangrove-solidity/dist/broadcast/");
const addressesFile = path.resolve("src/constants/addresses.json");
const addresses = JSON.parse(fs.readFileSync(addressesFile, "utf8"));
const logName = "run-latest.json";

const chainkeys = {
  maticmum: [
    "Mangrove",
    "MgvCleaner",
    "MgvReader",
    "MgvOracle",
    "MangroveOrder",
    "MangroveOrderEnriched",
  ],
};

/* Argument parsing */
const args = minimist(process.argv.slice(2), {
  boolean: ["debug", "dry-run"],
  unknown: (a) => {
    console.error(`Unexpected argument '${a}'- ignoring.`);
    return false;
  },
});

if (args.debug) {
  console.debug("Args:");
  console.debug(args);
}

/* 
Given a broadcast file and a contract names array, return a name->address
mapping for each contract name. Throws if != 1 address is found for each
contract in the array.

Broadcast logs are the form:

  transactions: [
    { 
      transactionType: "CREATE", // or "CALL"
      contractName: "MyContract", // or null if unknown
      contractAddress: ...
    },
    { 
      <another transaction>
    }
  ]

*/
const readBroadcast = function (
  broadcastLog: any,
  contractNames: string[]
): Record<string, string> | undefined {
  const fullAddressMap: Record<string, string[]> = {};
  const addressMap: Record<string, string> = {};

  for (const tx of broadcastLog.transactions) {
    if (tx.transactionType === "CREATE" && tx.contractName !== null) {
      fullAddressMap[tx.contractName] ??= [];
      fullAddressMap[tx.contractName].push(tx.contractAddress);
    }
  }

  for (const contractName of contractNames) {
    if (!fullAddressMap[contractName]) {
      console.warn(
        `No contract ${contractName} deployed in this broadcast, skipping.`
      );
    } else if (fullAddressMap[contractName].length !== 1) {
      console.error(
        `Error: expected exactly one address for contract ${contractName}. Got: ${fullAddressMap[contractName]}`
      );
      process.exit(1);
    } else {
      addressMap[contractName] = fullAddressMap[contractName][0];
    }
  }
  return addressMap;
};

/* Main program */

for (const [chainkey, requiredContracts] of Object.entries(chainkeys)) {
  const broadcast = path.join(broadcastDir, chainkey, logName);
  let latestData: string;
  try {
    latestData = fs.readFileSync(broadcast, "utf8");
  } catch (e) {
    console.warn(`Could not read ${broadcast} file, skipping`);
    continue;
  }
  const latest = JSON.parse(latestData);
  const chainAddresses = readBroadcast(latest, requiredContracts);
  addresses[chainkey] = { ...addresses[chainkey], ...chainAddresses };
}

if (args.debug || args.dryRun) {
  console.debug(
    `New address file, which ${
      args.dryRun ? "would" : "will"
    } be written to file at ${addressesFile}:`
  );
  console.dir(addresses);
}

if (!args.dryRun) {
  fs.writeFileSync(addressesFile, JSON.stringify(addresses, null, 2) + "\n");
}
