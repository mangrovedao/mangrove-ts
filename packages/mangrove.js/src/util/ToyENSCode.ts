/* 

This file contains the information needed to create a Toy ENS (Ethereum Name Service) contract from mangrove.js.
The address is pre-agreed to out-of-band, and mangrove.js (see testServer.ts) will use the RPC method 'setCode' to set the code at this address. The abi allows interaction with the contract through ethers.

See ToyENS.sol in mangrove-solidity: this toy ENS contract works as a bus between the deployment (that uses foundry scripts) and the testing contracts (that need to know Mangrove addresses). $

Before deployment, mangrove.js creates a toy ENS at 0xdecaf000..0 and then the deploy script registers each newly created contract that that toy ENS.

Note: since we know which private keys we talk to anvil with, we could compute in advance the address of the first deploy of the deployer address, then store that as the address of the toy ENS. But it seems less stable over time than just deciding once for all (arbitrarily) what the address is.

TODO: a slower but maybe cleaner way would be to: 1) deploy ToyENS to any address 2) copy its code 3) setCode(ensCode) to 0xdecaf. Now the ToyENS code does not have to be stored in mangrove.js.

*/

export const address = "0xdecaf" + "0".repeat(35);

export const abi = [
  "function set(string,address,bool) external ",
  "function set(string[],address[],bool[]) external",
  "function get(string) view external returns (address addr, bool isToken)",
  "function all() view external returns (string[] names, address[] addrs, bool[] isToken)",
];

export const code =
  "0x608060405234801561001057600080fd5b50600436106100575760003560e01c806310c4e8b01461005c578063693ec85e1461007c578063966c3aa7146100ae57806399d0baef146100c3578063a815ff15146100d6575b600080fd5b6100646100e9565b604051610073939291906106f8565b60405180910390f35b61008f61008a3660046107e4565b61034f565b604080516001600160a01b039093168352901515602083015201610073565b6100c16100bc36600461086b565b6103ae565b005b6100c16100d1366004610931565b610449565b6100c16100e4366004610996565b6105a7565b60608060606002805480602002602001604051908101604052809291908181526020016000905b828210156101bc57838290600052602060002001805461012f906109ea565b80601f016020809104026020016040519081016040528092919081815260200182805461015b906109ea565b80156101a85780601f1061017d576101008083540402835291602001916101a8565b820191906000526020600020905b81548152906001019060200180831161018b57829003601f168201915b505050505081526020019060010190610110565b505050509250825167ffffffffffffffff8111156101dc576101dc610a24565b604051908082528060200260200182016040528015610205578160200160208202803683370190505b509150825167ffffffffffffffff81111561022257610222610a24565b60405190808252806020026020018201604052801561024b578160200160208202803683370190505b50905060005b60025481101561034957600084828151811061026f5761026f610a3a565b60200260200101516040516102849190610a50565b9081526040519081900360200190205483516001600160a01b03909116908490839081106102b4576102b4610a3a565b60200260200101906001600160a01b031690816001600160a01b03168152505060018482815181106102e8576102e8610a3a565b60200260200101516040516102fd9190610a50565b90815260405190819003602001902054825160ff9091169083908390811061032757610327610a3a565b911515602092830291909101909101528061034181610a6c565b915050610251565b50909192565b60008060008484604051610364929190610a93565b908152604051908190036020018120546001600160a01b0316925060019061038f9086908690610a93565b90815260405190819003602001902054919460ff909216935090915050565b60005b858110156104405761042e8787838181106103ce576103ce610a3a565b90506020028101906103e09190610aa3565b8787858181106103f2576103f2610a3a565b90506020020160208101906104079190610aea565b86868681811061041957610419610a3a565b90506020020160208101906100d19190610b0c565b8061043881610a6c565b9150506103b1565b50505050505050565b6001600160a01b0382166104af5760405162461bcd60e51b815260206004820152602360248201527f546f79454e533a2063616e6e6f74207265636f72642061206e616d652061732060448201526203078360ec1b606482015260840160405180910390fd5b60006001600160a01b0316600085856040516104cc929190610a93565b908152604051908190036020019020546001600160a01b0316036105295760028054600181018255600091909152610527907f405787fa12a823e0f2b7631cc41b3ba8828b3321ca811111fa75cd3aa3bb5ace0185856105b9565b505b816000858560405161053c929190610a93565b908152602001604051809103902060006101000a8154816001600160a01b0302191690836001600160a01b031602179055508060018585604051610581929190610a93565b908152604051908190036020019020805491151560ff1990921691909117905550505050565b6105b48383836000610449565b505050565b8280546105c5906109ea565b90600052602060002090601f0160209004810192826105e7576000855561062d565b82601f106106005782800160ff1982351617855561062d565b8280016001018555821561062d579182015b8281111561062d578235825591602001919060010190610612565b5061063992915061063d565b5090565b5b80821115610639576000815560010161063e565b60005b8381101561066d578181015183820152602001610655565b8381111561067c576000848401525b50505050565b600081518084526020808501945080840160005b838110156106bb5781516001600160a01b031687529582019590820190600101610696565b509495945050505050565b600081518084526020808501945080840160005b838110156106bb5781511515875295820195908201906001016106da565b6000606082016060835280865180835260808501915060808160051b8601019250602080890160005b8381101561076757878603607f190185528151805180885261074881868a01878501610652565b601f01601f191696909601830195509382019390820190600101610721565b50508584038187015250505061077d8186610682565b9050828103604084015261079181856106c6565b9695505050505050565b60008083601f8401126107ad57600080fd5b50813567ffffffffffffffff8111156107c557600080fd5b6020830191508360208285010111156107dd57600080fd5b9250929050565b600080602083850312156107f757600080fd5b823567ffffffffffffffff81111561080e57600080fd5b61081a8582860161079b565b90969095509350505050565b60008083601f84011261083857600080fd5b50813567ffffffffffffffff81111561085057600080fd5b6020830191508360208260051b85010111156107dd57600080fd5b6000806000806000806060878903121561088457600080fd5b863567ffffffffffffffff8082111561089c57600080fd5b6108a88a838b01610826565b909850965060208901359150808211156108c157600080fd5b6108cd8a838b01610826565b909650945060408901359150808211156108e657600080fd5b506108f389828a01610826565b979a9699509497509295939492505050565b80356001600160a01b038116811461091c57600080fd5b919050565b8035801515811461091c57600080fd5b6000806000806060858703121561094757600080fd5b843567ffffffffffffffff81111561095e57600080fd5b61096a8782880161079b565b909550935061097d905060208601610905565b915061098b60408601610921565b905092959194509250565b6000806000604084860312156109ab57600080fd5b833567ffffffffffffffff8111156109c257600080fd5b6109ce8682870161079b565b90945092506109e1905060208501610905565b90509250925092565b600181811c908216806109fe57607f821691505b602082108103610a1e57634e487b7160e01b600052602260045260246000fd5b50919050565b634e487b7160e01b600052604160045260246000fd5b634e487b7160e01b600052603260045260246000fd5b60008251610a62818460208701610652565b9190910192915050565b600060018201610a8c57634e487b7160e01b600052601160045260246000fd5b5060010190565b8183823760009101908152919050565b6000808335601e19843603018112610aba57600080fd5b83018035915067ffffffffffffffff821115610ad557600080fd5b6020019150368190038213156107dd57600080fd5b600060208284031215610afc57600080fd5b610b0582610905565b9392505050565b600060208284031215610b1e57600080fd5b610b058261092156fea26469706673582212209c5d91631120431cbe1c3747212224c7bdc94721500baf40e5841225c4f1d80764736f6c634300080e0033";
