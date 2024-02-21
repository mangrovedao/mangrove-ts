// Generate JSON file with version ranges for compatible versions of contracts from
// mangrove-core and mangrove-strats.
import path from "path";
import fs from "fs";
import semver from "semver";

import * as mgvDeployments from "@mangrovedao/mangrove-deployments";

import mangroveCorePackageJson from "@mangrovedao/mangrove-core/package.json";
import mangroveStratsPackageJson from "@mangrovedao/mangrove-strats/package.json";

async function main() {
  const outFile = path.join(
    process.cwd(),
    "src/constants",
    "contractVersionRanges.json",
  );

  // For mangrove-core, nothing relevant to this SDK will change from v2.0.1 to v2.1.0:
  // Only BLAST functions will be added, which are not used by the SDK.
  // Therefore, we can safely assume that versions between v2.0.0 and v2.2.0 (exclusive)
  // are compatible with the SDK. So as long as the core dependency is within this range,
  // we can use the SDK with it.
  const mgvCorePackageVersion = mangroveCorePackageJson.version;
  let mgvCoreVersionRange = ">=2.0.0 <2.2.0";
  // Once the package version moves out the range, we'll log a warning and revert to the
  // default behavior of using mangrove-deployments to generate the pattern.
  if (!semver.satisfies(mgvCorePackageVersion, mgvCoreVersionRange)) {
    console.warn(
      `NB: The mangrove-core version ${mgvCorePackageVersion} is outside the hardcoded version range for compatible deployments: ${mgvCoreVersionRange}.`,
    );
    mgvCoreVersionRange = mgvDeployments.createContractVersionPattern(
      mgvCorePackageVersion,
    );
    console.warn(
      `  Using the standard pattern derived from the package version instead: ${mgvCoreVersionRange}`,
    );
    console.warn(
      `  Consider whether this is appropriate and update this logic accordingly.`,
    );
  }

  // For mangrove-strats, a similar situation applies: Nothing relevant to this SDK
  // will change from v2.0.1 to v2.1.0: Only BLAST functions will be added, which are not
  // used by the SDK.
  // Therefore, we can safely assume that versions after v2.0.0 and before v2.2.0
  // are compatible with the SDK. So as long as the strats dependency is within this range,
  // we can use the SDK with it.
  //
  // There was a breaking change in MangroveAmplifier from v2.0.0-b1.3 to v2.0.1-0,
  // so deployments of these are not compatible.
  // These two pre-releases should both have been pre-releases of v2.0.0, but by mistake
  // a minor version bump was introduced, so v2.0.0 was never released.
  const mgvStratsPackageVersion = mangroveStratsPackageJson.version;
  let mgvStratsVersionRange = ">2.0.0 <2.2.0";
  // Once the package version moves out the range, we'll log a warning and revert to the
  // default behavior of using mangrove-deployments to generate the pattern.
  if (!semver.satisfies(mgvStratsPackageVersion, mgvStratsVersionRange)) {
    console.warn(
      `NB: The mangrove-strats version ${mgvStratsPackageVersion} is outside the hardcoded version range for compatible deployments: ${mgvStratsVersionRange}.`,
    );
    mgvStratsVersionRange = mgvDeployments.createContractVersionPattern(
      mgvStratsPackageVersion,
    );
    console.warn(
      `  Using the standard pattern derived from the package version instead: ${mgvStratsVersionRange}`,
    );
    console.warn(
      `  Consider whether this is appropriate and update this logic accordingly.`,
    );
  }

  fs.writeFileSync(
    outFile,
    JSON.stringify(
      {
        COMMENT:
          "This file is generated by the build system. Do not modify it manually.",
        "mangrove-core": mgvCoreVersionRange,
        "mangrove-strats": mgvStratsVersionRange,
      },
      null,
      2,
    ),
  );
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch(console.error);
