// SPDX-License-Identifier:	BSD-2-Clause

// Persistent.sol

// Copyright (c) 2021 Giry SAS. All rights reserved.

// Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

// 1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
// 2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
pragma solidity ^0.8.10;
pragma abicoder v2;
import "./MultiUser.sol";

/// MangroveOffer is the basic building block to implement a reactive offer that interfaces with the Mangrove
abstract contract MultiUserPersistent is MultiUser {
  constructor(
    IMangrove _mgv,
    AbstractRouter _router,
    uint gasreq
  ) MultiUser(_mgv, _router, gasreq) {}

  function __residualWants__(ML.SingleOrder calldata order)
    internal
    virtual
    returns (uint)
  {
    return order.offer.wants() - order.gives;
  }

  function __residualGives__(ML.SingleOrder calldata order)
    internal
    virtual
    returns (uint)
  {
    return order.offer.gives() - order.wants;
  }

  ///@dev posthook takes care of reposting offer residual
  ///@param order is a reminder of the taker order that was processed during `makerExecute`
  function __posthookSuccess__(ML.SingleOrder calldata order)
    internal
    virtual
    override
    returns (bool)
  {
    uint new_gives = __residualGives__(order);
    uint new_wants = __residualWants__(order);
    if (new_gives == 0) {
      // gas saving
      return true;
    }
    // if updateOffer fails offer will be retracted
    return
      updateOfferInternal(
        MakerOrder({
          outbound_tkn: IERC20(order.outbound_tkn),
          inbound_tkn: IERC20(order.inbound_tkn),
          wants: new_wants,
          gives: new_gives,
          gasreq: order.offerDetail.gasreq(), // keeping the same gasreq
          gasprice: order.offerDetail.gasprice(), // keeping the same gasprice
          pivotId: order.offer.next(), // best guess for pivotId
          offerId: order.offerId
        }),
        0 // no value
      );
  }
}
