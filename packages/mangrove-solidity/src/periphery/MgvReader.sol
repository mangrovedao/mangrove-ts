// SPDX-License-Identifier:	AGPL-3.0

// MgvReader.sol

// Copyright (C) 2021 Giry SAS.
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published
// by the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.
pragma solidity ^0.8.10;

pragma abicoder v2;

import {MgvLib, Structs} from "mgv_src/MgvLib.sol";

interface MangroveLike {
  function best(address, address) external view returns (uint);

  function offers(address, address, uint) external view returns (Structs.OfferPacked);

  function offerDetails(address, address, uint) external view returns (Structs.OfferDetailPacked);

  function offerInfo(address, address, uint) external view returns (Structs.OfferUnpacked memory, Structs.OfferDetailUnpacked memory);

  function config(address, address) external view returns (Structs.GlobalPacked, Structs.LocalPacked);
}

contract MgvReader {
  MangroveLike immutable MGV;

  constructor(address mgv) {
    MGV = MangroveLike(payable(mgv));
  }

  /*
   * Returns two uints.
   *
   * `startId` is the id of the best live offer with id equal or greater than
   * `fromId`, 0 if there is no such offer.
   *
   * `length` is 0 if `startId == 0`. Other it is the number of live offers as good or worse than the offer with
   * id `startId`.
   */
  function offerListEndPoints(address outbound_tkn, address inbound_tkn, uint fromId, uint maxOffers)
    public
    view
    returns (uint startId, uint length)
  {
    unchecked {
      if (fromId == 0) {
        startId = MGV.best(outbound_tkn, inbound_tkn);
      } else {
        startId = MGV.offers(outbound_tkn, inbound_tkn, fromId).gives() > 0 ? fromId : 0;
      }

      uint currentId = startId;

      while (currentId != 0 && length < maxOffers) {
        currentId = MGV.offers(outbound_tkn, inbound_tkn, currentId).next();
        length = length + 1;
      }

      return (startId, length);
    }
  }

  // Returns the orderbook for the outbound_tkn/inbound_tkn pair in packed form. First number is id of next offer (0 is we're done). First array is ids, second is offers (as bytes32), third is offerDetails (as bytes32). Array will be of size `min(# of offers in out/in list, maxOffers)`.
  function packedOfferList(address outbound_tkn, address inbound_tkn, uint fromId, uint maxOffers)
    public
    view
    returns (uint, uint[] memory, Structs.OfferPacked[] memory, Structs.OfferDetailPacked[] memory)
  {
    unchecked {
      (uint currentId, uint length) = offerListEndPoints(outbound_tkn, inbound_tkn, fromId, maxOffers);

      uint[] memory offerIds = new uint[](length);
      Structs.OfferPacked[] memory offers = new Structs.OfferPacked[](length);
      Structs.OfferDetailPacked[] memory details = new Structs.OfferDetailPacked[](length);

      uint i = 0;

      while (currentId != 0 && i < length) {
        offerIds[i] = currentId;
        offers[i] = MGV.offers(outbound_tkn, inbound_tkn, currentId);
        details[i] = MGV.offerDetails(outbound_tkn, inbound_tkn, currentId);
        currentId = offers[i].next();
        i = i + 1;
      }

      return (currentId, offerIds, offers, details);
    }
  }

  // Returns the orderbook for the outbound_tkn/inbound_tkn pair in unpacked form. First number is id of next offer (0 if we're done). First array is ids, second is offers (as structs), third is offerDetails (as structs). Array will be of size `min(# of offers in out/in list, maxOffers)`.
  function offerList(address outbound_tkn, address inbound_tkn, uint fromId, uint maxOffers)
    public
    view
    returns (uint, uint[] memory, Structs.OfferUnpacked[] memory, Structs.OfferDetailUnpacked[] memory)
  {
    unchecked {
      (uint currentId, uint length) = offerListEndPoints(outbound_tkn, inbound_tkn, fromId, maxOffers);

      uint[] memory offerIds = new uint[](length);
      Structs.OfferUnpacked[] memory offers = new Structs.OfferUnpacked[](length);
      Structs.OfferDetailUnpacked[] memory details = new Structs.OfferDetailUnpacked[](length);

      uint i = 0;
      while (currentId != 0 && i < length) {
        offerIds[i] = currentId;
        (offers[i], details[i]) = MGV.offerInfo(outbound_tkn, inbound_tkn, currentId);
        currentId = offers[i].next;
        i = i + 1;
      }

      return (currentId, offerIds, offers, details);
    }
  }

  function getProvision(address outbound_tkn, address inbound_tkn, uint ofr_gasreq, uint ofr_gasprice)
    external
    view
    returns (uint)
  {
    unchecked {
      (Structs.GlobalPacked global, Structs.LocalPacked local) = MGV.config(outbound_tkn, inbound_tkn);
      uint _gp;
      uint global_gasprice = global.gasprice();
      if (global_gasprice > ofr_gasprice) {
        _gp = global_gasprice;
      } else {
        _gp = ofr_gasprice;
      }
      return (ofr_gasreq + local.offer_gasbase()) * _gp * 10 ** 9;
    }
  }
}
