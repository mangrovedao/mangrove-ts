// SPDX-License-Identifier:	BSD-2-Clause

// SwingingMarketMaker.sol

// Copyright (c) 2021 Giry SAS. All rights reserved.

// Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

// 1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
// 2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

pragma solidity >=0.8.0;
pragma abicoder v2;
import "./IMangrove.sol";
import "./IEIP20.sol";
import "contracts/Strategies/Routers/AbstractRouter.sol";

interface IOfferLogic is IMaker {
  ///////////////////
  // MangroveOffer //
  ///////////////////

  /** @notice Events */

  // Log incident (during post trade execution)
  event LogIncident(
    IMangrove mangrove,
    IEIP20 indexed outbound_tkn,
    IEIP20 indexed inbound_tkn,
    uint indexed offerId,
    bytes32 reason
  );

  // Logging change of router address
  event SetRouter(AbstractRouter);
  // Logging change in default gasreq
  event SetGasreq(uint);

  // Offer logic default gas required --value is used in update and new offer if maxUint is given
  function ofr_gasreq() external returns (uint);

  // returns missing provision on Mangrove, should `offerId` be reposted using `gasreq` and `gasprice` parameters
  // if `offerId` is not in the `outbound_tkn,inbound_tkn` offer list, the totality of the necessary provision is returned
  function getMissingProvision(
    IEIP20 outbound_tkn,
    IEIP20 inbound_tkn,
    uint gasreq,
    uint gasprice,
    uint offerId
  ) external view returns (uint);

  // Changing ofr_gasreq of the logic
  function set_gasreq(uint gasreq) external;

  // changing liqudity router of the logic
  function set_router(AbstractRouter router, uint gasreq) external;

  // maker contract approves router for push and pull operations
  function approveRouter(IEIP20 token) external;

  // withdraw `amount` `token` form the contract's (owner) reserve and sends them to `receiver`'s balance
  function withdrawToken(
    IEIP20 token,
    address receiver,
    uint amount
  ) external returns (bool success);

  function approveMangrove(IEIP20 outbound_tkn, uint amount) external;

  // pulls available free wei from Mangrove balance to `this`
  function withdrawFromMangrove(uint amount) external;

  struct MakerOrder {
    IEIP20 outbound_tkn; // address of the ERC20 contract managing outbound tokens
    IEIP20 inbound_tkn; // address of the ERC20 contract managing outbound tokens
    uint wants; // amount of `inbound_tkn` required for full delivery
    uint gives; // max amount of `outbound_tkn` promised by the offer
    uint gasreq; // max gas required by the offer when called. If maxUint256 is used here, default `ofr_gasreq` will be considered instead
    uint gasprice; // gasprice that should be consider to compute the bounty (Mangrove's gasprice will be used if this value is lower)
    uint pivotId;
    uint offerId; // 0 if new offer order
  }

  function newOffer(MakerOrder memory mko)
    external
    payable
    returns (uint offerId);

  //returns 0 if updateOffer failed (for instance if offer is underprovisioned) otherwise returns `offerId`
  function updateOffer(MakerOrder memory mko) external payable;

  function retractOffer(
    IEIP20 outbound_tkn,
    IEIP20 inbound_tkn,
    uint offerId,
    bool deprovision // if set to `true`, `this` contract will receive the remaining provision (in WEI) associated to `offerId`.
  ) external returns (uint received);
}
