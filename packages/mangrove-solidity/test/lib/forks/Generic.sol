// SPDX-License-Identifier:	AGPL-3.0
pragma solidity ^0.8.10;

import "mgv_test/lib/MangroveTest.sol";
import "forge-std/Vm.sol";

contract GenericFork is Script {
  uint public CHAIN_ID;
  string public NAME;
  uint public BLOCK_NUMBER;

  address public AAVE;
  address public APOOL;
  address public WETH;
  address public USDC;
  address public AWETH;
  address public DAI;
  address public ADAI;
  address public CDAI;
  address public CUSDC;
  address public CWETH;

  function setUp() public virtual {
    vm.label(AAVE, "Aave");
    vm.label(APOOL, "Aave Pool");
    vm.label(WETH, "WETH");
    vm.label(USDC, "USDC");
    vm.label(AWETH, "AWETH");
    vm.label(DAI, "DAI");
    vm.label(ADAI, "ADAI");
    vm.label(CDAI, "CDAI");
    vm.label(CUSDC, "CUSDC");
    vm.label(CWETH, "CWETH");

    vm.makePersistent(address(this));

    if (BLOCK_NUMBER == 0) {
      // 0 means latest
      vm.createSelectFork(vm.rpcUrl(NAME));
    } else {
      vm.createSelectFork(vm.rpcUrl(NAME), BLOCK_NUMBER);
    }

    if (CHAIN_ID == 0) {
      revert(
        "No fork selected: you should pick a subclass of GenericFork with a nonzero CHAIN_ID."
      );
    }

    if (block.chainid != CHAIN_ID) {
      revert(
        string.concat(
          "Chain id should be ",
          vm.toString(CHAIN_ID),
          " (",
          NAME,
          "), is ",
          vm.toString(block.chainid)
        )
      );
    }
  }
}
