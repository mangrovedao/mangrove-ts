// SPDX-License-Identifier:	AGPL-3.0
pragma solidity ^0.8.10;
import {AbstractFork} from "./Abstract.sol";

contract PolygonFork is AbstractFork {
  constructor() {
    fork.CHAIN_ID = 137;
    fork.NAME = "polygon";
    fork.BLOCK_NUMBER = 26416000;

    fork.AAVE = 0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb;
    fork.APOOL = 0x794a61358D6845594F94dc1DB02A252b5b4814aD;
    fork.WETH = 0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619;
    fork.USDC = 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174;
    fork.AWETH = 0xe50fA9b3c56FfB159cB0FCA61F5c9D750e8128c8;
    fork.DAI = 0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063;
    fork.ADAI = 0x82E64f49Ed5EC1bC6e43DAD4FC8Af9bb3A2312EE;
    fork.CDAI = 0x4eCEDdF62277eD78623f9A94995c680f8fd6C00e;
    fork.CUSDC = 0x73CF8c5D14Aa0EbC89f18272A568319F5BAB6cBD;
    fork.CWETH = 0x7ef18d0a9C3Fb1A716FF6c3ED0Edf52a2427F716;
  }
}
