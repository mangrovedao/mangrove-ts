// SPDX-License-Identifier:	AGPL-3.0
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {Mango, IERC20, IMangrove} from "mgv_src/strategies/single_user/market_making/mango/Mango.sol";

/** @notice Shuts down a Mango instance on a given market
 * Retracts all Mango offers, and recovers funds.
 */

/** Usage example (retracting 100 bids and asks from MANGO_WETH_USDC) */

// forge script --fork-url $MUMBAI_NODE_URL \
// --private-key $MUMBAI_TESTER_PRIVATE_KEY \
// --sig "run(address, uint, uint)" \
// --broadcast \
// StopMango \
// 0xe548d5cee04e3308d74f4a0c2a8354538cdb2360 0 100

contract StopMango is Script {
  function run(
    address payable $mgo,
    uint from,
    uint to
  ) public {
    Mango mgo = Mango($mgo);
    uint n = mgo.NSLOTS();
    require(mgo.admin() == msg.sender, "This script requires admin rights");
    require(from < n, "invalid start index");
    to = to >= n ? n - 1 : to;
    vm.broadcast();
    uint collected = mgo.retractOffers(
      2, // both bids and asks
      from, // from
      to
    );
    uint bal = mgo.MGV().balanceOf($mgo);
    if (bal > 0) {
      collected += bal;
      vm.broadcast();
      mgo.withdrawFromMangrove(bal, payable(msg.sender));
    }
    console.log("Retracted", to - from, "offers");
    console.log("Recoverd", collected, "WEIs in doing so");
  }
}
