// SPDX-License-Identifier:	BSD-2-Clause

// Persistent.sol

// Copyright (c) 2021 Giry SAS. All rights reserved.

// Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

// 1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
// 2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
pragma solidity ^0.8.10;
pragma abicoder v2;
import "../OfferLogics/MultiUsers/Persistent.sol";
import "../interfaces/IOrderLogic.sol";
import "contracts/Strategies/Routers/SimpleRouter.sol";

contract MangroveOrder is MultiUserPersistent, IOrderLogic {
  // `blockToLive[token1][token2][offerId]` gives block number beyond which the offer should renege on trade.
  mapping(IEIP20 => mapping(IEIP20 => mapping(uint => uint))) public expiring;

  constructor(IMangrove _MGV, address deployer)
    MultiUserPersistent(_MGV, new SimpleRouter(address(this)))
  {
    console.log("here");
    router().bind(address(this));
    if (deployer != msg.sender) {
      setAdmin(deployer);
      router().setAdmin(deployer);
    }
  }

  // transfer with no revert

  function __lastLook__(ML.SingleOrder calldata order)
    internal
    virtual
    override
    returns (bool)
  {
    uint exp = expiring[IEIP20(order.outbound_tkn)][IEIP20(order.inbound_tkn)][
      order.offerId
    ];
    return (exp == 0 || block.number <= exp);
  }

  // revert when order was partially filled and it is not allowed
  function checkCompleteness(
    TakerOrder calldata tko,
    TakerOrderResult memory res
  ) internal pure returns (bool isPartial) {
    // revert if sell is partial and `partialFillNotAllowed` and not posting residual
    if (tko.selling) {
      return res.takerGave >= tko.gives;
    } else {
      return res.takerGot + res.fee >= tko.wants;
    }
  }

  // `this` contract MUST have approved Mangrove for inbound token transfer
  // `msg.sender` MUST have approved `this` contract for at least the same amount
  // provision for posting a resting order MAY be sent when calling this function
  // gasLimit of this `tx` MUST be at least `(retryNumber+1)*gasForMarketOrder`
  // msg.value SHOULD contain enough native token to cover for the resting order provision
  // msg.value MUST be 0 if `!restingOrder` otherwise tranfered WEIs are burnt.

  function take(TakerOrder calldata tko)
    external
    payable
    returns (TakerOrderResult memory res)
  {
    (IEIP20 outbound_tkn, IEIP20 inbound_tkn) = tko.selling
      ? (tko.quote, tko.base)
      : (tko.base, tko.quote);
    // pulling directly from msg.sender would require caller to approve `this` in addition to the `this.router()`
    // so pulling funds from taker's reserve (note this can be the taker's wallet depending on the router)
    uint pulled = router().pull(inbound_tkn, msg.sender, tko.gives, true);
    require(pulled == tko.gives, "mgvOrder/mo/transferInFail");
    // passing an iterated market order with the transfered funds
    for (uint i = 0; i < tko.retryNumber + 1; i++) {
      if (tko.gasForMarketOrder != 0 && gasleft() < tko.gasForMarketOrder) {
        break;
      }
      (uint takerGot_, uint takerGave_, uint bounty_, uint fee_) = MGV
        .marketOrder({
          outbound_tkn: $(outbound_tkn), // expecting quote (outbound) when selling
          inbound_tkn: $(inbound_tkn),
          takerWants: tko.wants, // `tko.wants` includes user defined slippage
          takerGives: tko.gives,
          fillWants: tko.selling ? false : true // only buy order should try to fill takerWants
        });
      res.takerGot += takerGot_;
      res.takerGave += takerGave_;
      res.bounty += bounty_;
      res.fee += fee_;
      if (takerGot_ == 0 && bounty_ == 0) {
        break;
      }
    }
    bool isComplete = checkCompleteness(tko, res);
    // requiring `partialFillNotAllowed` => `isComplete \/ restingOrder`
    require(
      !tko.partialFillNotAllowed || isComplete || tko.restingOrder,
      "mgvOrder/mo/noPartialFill"
    );

    // sending received tokens to taker's reserve
    if (res.takerGot > 0) {
      router().push(outbound_tkn, msg.sender, res.takerGot);
    }

    // at this points the following invariants hold:
    // 1. taker received `takerGot` outbound tokens
    // 2. `this` contract inbound token balance is now equal to `tko.gives - takerGave`.
    // NB: this amount cannot be redeemed by taker since `creditToken` was not called
    // 3. `this` contract's WEI balance is credited of `msg.value + bounty`

    if (tko.restingOrder && !isComplete) {
      // resting limit order for the residual of the taker order
      // this call will credit offer owner virtual account on Mangrove with msg.value before trying to post the offer
      // `offerId_==0` if mangrove rejects the update because of low density.
      // If user does not have enough funds, call will revert
      res.offerId = newOfferInternal({
        mko: MakerOrder({
          outbound_tkn: inbound_tkn,
          inbound_tkn: outbound_tkn,
          wants: tko.makerWants - (res.takerGot + res.fee), // tko.makerWants is before slippage
          gives: tko.makerGives - res.takerGave,
          gasreq: ofr_gasreq(),
          gasprice: 0,
          pivotId: 0
        }), // offer should be best in the book
        caller: msg.sender, // `msg.sender` will be the owner of the resting order
        provision: msg.value
      });

      // if one wants to maintain an inverse mapping owner => offerIds
      __logOwnerShipRelation__({
        owner: msg.sender,
        outbound_tkn: inbound_tkn,
        inbound_tkn: outbound_tkn,
        offerId: res.offerId
      });

      emit OrderSummary({
        mangrove: MGV,
        base: tko.base,
        quote: tko.quote,
        selling: tko.selling,
        taker: msg.sender,
        takerGot: res.takerGot,
        takerGave: res.takerGave,
        penalty: res.bounty,
        restingOrderId: res.offerId
      });

      if (res.offerId == 0) {
        // unable to post resting order
        // reverting when partial fill is not an option
        require(!tko.partialFillNotAllowed, "mgvOrder/mo/noPartialFill");
        // sending partial fill to taker --when partial fill is allowed
        require(
          TransferLib.transferToken(
            inbound_tkn,
            msg.sender,
            tko.gives - res.takerGave
          ),
          "mgvOrder/mo/transferInFail"
        );
        // msg.value is no longer needed so sending it back to msg.sender along with possible collected bounty
        if (msg.value + res.bounty > 0) {
          (bool noRevert, ) = msg.sender.call{value: msg.value + res.bounty}(
            ""
          );
          require(noRevert, "mgvOrder/mo/refundProvisionFail");
        }
        return res;
      } else {
        // offer was successfully posted
        // crediting caller's balance with amount of offered tokens (transfered from caller at the begining of this function)
        // NB `inbount_tkn` is now the outbound token for the resting order
        router().push(inbound_tkn, msg.sender, tko.gives - res.takerGave);

        // setting a time to live for the resting order
        if (tko.blocksToLiveForRestingOrder > 0) {
          expiring[inbound_tkn][outbound_tkn][res.offerId] =
            block.number +
            tko.blocksToLiveForRestingOrder;
        }
        return res;
      }
    } else {
      // either fill was complete or taker does not want to post residual as a resting order
      // transfering remaining inbound tokens to msg.sender
      router().push(inbound_tkn, msg.sender, tko.gives - res.takerGave);

      // transfering potential bounty and msg.value back to the taker
      if (msg.value + res.bounty > 0) {
        // NB this calls gives reentrancy power to caller
        require(
          router().push_native{value: msg.value + res.bounty}(msg.sender),
          "mgvOrder/mo/refundFail"
        );
      }
      emit OrderSummary({
        mangrove: MGV,
        base: tko.base,
        quote: tko.quote,
        selling: tko.selling,
        taker: msg.sender,
        takerGot: res.takerGot,
        takerGave: res.takerGave,
        penalty: res.bounty,
        restingOrderId: 0
      });
      return res;
    }
  }

  // we need to make sure that if offer is taken and not reposted (because of insufficient provision or density)
  // then remaining provision and outbound tokens are sent back to owner

  function redeemAll(ML.SingleOrder calldata order, address owner)
    internal
    returns (bool success)
  {
    IEIP20 outTkn = IEIP20(order.outbound_tkn);
    IEIP20 inTkn = IEIP20(order.inbound_tkn);
    // Resting order was not reposted, sending out/in tokens to original taker
    // balOut was increased during `take` function and is now possibly empty
    AbstractRouter _router = router();
    success = true;

    if (
      !_router.withdrawToken({
        token: outTkn,
        reserve: owner,
        recipient: owner,
        amount: _router.reserveBalance(outTkn, owner)
      })
    ) {
      emit LogIncident(
        MGV,
        outTkn,
        inTkn,
        order.offerId,
        "mgvOrder/redeemAll/transferOut"
      );
      success = false;
    }

    if (
      !_router.withdrawToken({
        token: inTkn,
        reserve: owner,
        recipient: owner,
        amount: _router.reserveBalance(inTkn, owner)
      })
    ) {
      emit LogIncident(
        MGV,
        outTkn,
        inTkn,
        order.offerId,
        "mgvOrder/redeemAll/transferIn"
      );
      success = false;
    }
  }

  function __posthookSuccess__(ML.SingleOrder calldata order)
    internal
    virtual
    override
    returns (bool)
  {
    IEIP20 outTkn = IEIP20(order.outbound_tkn);
    IEIP20 inTkn = IEIP20(order.inbound_tkn);

    // trying to repost offer remainder
    if (MultiUserPersistent.__posthookSuccess__(order)) {
      // if `success` then offer residual was reposted and nothing needs to be done
      // else we need to send the remaining outbounds tokens to owner and their remaining provision on mangrove (offer was deprovisioned in super call)
      return true;
    }
    address owner = ownerOf(outTkn, inTkn, order.offerId);
    // returning all inbound/outbound tokens that belong to the original taker to their balance
    // ignoring return value because nothing can be done (and logging was already emitted)
    redeemAll(order, owner);
    return false;
  }

  // in case of an offer with a blocks-to-live option enabled, resting order might renege on trade
  // in this case, __posthookFallback__ will be called.
  function __posthookFallback__(
    ML.SingleOrder calldata order,
    ML.OrderResult calldata result
  ) internal virtual override returns (bool) {
    result; //shh
    address owner = ownerOf(
      IEIP20(order.outbound_tkn),
      IEIP20(order.inbound_tkn),
      order.offerId
    );
    return redeemAll(order, owner);
  }

  function __logOwnerShipRelation__(
    address owner,
    IEIP20 outbound_tkn,
    IEIP20 inbound_tkn,
    uint offerId
  ) internal virtual {
    owner; //ssh
    outbound_tkn; //ssh
    inbound_tkn; //ssh
    offerId; //ssh
  }
}
