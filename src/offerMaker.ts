import * as ethers from "ethers";
import { typechain } from "./types";

const SimpleMakerGasreq = 20000;

/**
 * The OfferMaker class connects to a simple OfferMaker contract
 */
class OfferMaker {
  static async deploy(
    mgvAddress: string,
    signer: ethers.Signer,
    gasreq?: number
  ): Promise<string> {
    const contract = await new typechain[`OfferMaker__factory`](signer).deploy(
      mgvAddress,
      ethers.constants.AddressZero, // no router
      await signer.getAddress(),
      gasreq ? gasreq : SimpleMakerGasreq,
      ethers.constants.AddressZero
    );
    await contract.deployTransaction.wait();
    return contract.address;
  }
}

export default OfferMaker;
