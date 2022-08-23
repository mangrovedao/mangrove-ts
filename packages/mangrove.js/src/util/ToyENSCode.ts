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
  "0x608060405234801561001057600080fd5b50600436106100575760003560e01c806310c4e8b01461005c578063693ec85e1461007c578063966c3aa7146100ae57806399d0baef146100c3578063a815ff15146100d6575b600080fd5b6100646100e9565b60405161007393929190610653565b60405180910390f35b61008f61008a36600461073f565b61034f565b604080516001600160a01b039093168352901515602083015201610073565b6100c16100bc3660046107c6565b6103ae565b005b6100c16100d136600461088c565b610449565b6100c16100e43660046108f1565b610502565b60608060606002805480602002602001604051908101604052809291908181526020016000905b828210156101bc57838290600052602060002001805461012f90610945565b80601f016020809104026020016040519081016040528092919081815260200182805461015b90610945565b80156101a85780601f1061017d576101008083540402835291602001916101a8565b820191906000526020600020905b81548152906001019060200180831161018b57829003601f168201915b505050505081526020019060010190610110565b505050509250825167ffffffffffffffff8111156101dc576101dc61097f565b604051908082528060200260200182016040528015610205578160200160208202803683370190505b509150825167ffffffffffffffff8111156102225761022261097f565b60405190808252806020026020018201604052801561024b578160200160208202803683370190505b50905060005b60025481101561034957600084828151811061026f5761026f610995565b602002602001015160405161028491906109ab565b9081526040519081900360200190205483516001600160a01b03909116908490839081106102b4576102b4610995565b60200260200101906001600160a01b031690816001600160a01b03168152505060018482815181106102e8576102e8610995565b60200260200101516040516102fd91906109ab565b90815260405190819003602001902054825160ff9091169083908390811061032757610327610995565b9115156020928302919091019091015280610341816109c7565b915050610251565b50909192565b600080600084846040516103649291906109ee565b908152604051908190036020018120546001600160a01b0316925060019061038f90869086906109ee565b90815260405190819003602001902054919460ff909216935090915050565b60005b858110156104405761042e8787838181106103ce576103ce610995565b90506020028101906103e091906109fe565b8787858181106103f2576103f2610995565b90506020020160208101906104079190610a45565b86868681811061041957610419610995565b90506020020160208101906100d19190610a67565b80610438816109c7565b9150506103b1565b50505050505050565b816000858560405161045c9291906109ee565b90815260405190819003602001902080546001600160a01b03929092166001600160a01b0319909216919091179055600280546001810182556000919091526104c8907f405787fa12a823e0f2b7631cc41b3ba8828b3321ca811111fa75cd3aa3bb5ace018585610514565b5080600185856040516104dc9291906109ee565b908152604051908190036020019020805491151560ff1990921691909117905550505050565b61050f8383836000610449565b505050565b82805461052090610945565b90600052602060002090601f0160209004810192826105425760008555610588565b82601f1061055b5782800160ff19823516178555610588565b82800160010185558215610588579182015b8281111561058857823582559160200191906001019061056d565b50610594929150610598565b5090565b5b808211156105945760008155600101610599565b60005b838110156105c85781810151838201526020016105b0565b838111156105d7576000848401525b50505050565b600081518084526020808501945080840160005b838110156106165781516001600160a01b0316875295820195908201906001016105f1565b509495945050505050565b600081518084526020808501945080840160005b83811015610616578151151587529582019590820190600101610635565b6000606082016060835280865180835260808501915060808160051b8601019250602080890160005b838110156106c257878603607f19018552815180518088526106a381868a018785016105ad565b601f01601f19169690960183019550938201939082019060010161067c565b5050858403818701525050506106d881866105dd565b905082810360408401526106ec8185610621565b9695505050505050565b60008083601f84011261070857600080fd5b50813567ffffffffffffffff81111561072057600080fd5b60208301915083602082850101111561073857600080fd5b9250929050565b6000806020838503121561075257600080fd5b823567ffffffffffffffff81111561076957600080fd5b610775858286016106f6565b90969095509350505050565b60008083601f84011261079357600080fd5b50813567ffffffffffffffff8111156107ab57600080fd5b6020830191508360208260051b850101111561073857600080fd5b600080600080600080606087890312156107df57600080fd5b863567ffffffffffffffff808211156107f757600080fd5b6108038a838b01610781565b9098509650602089013591508082111561081c57600080fd5b6108288a838b01610781565b9096509450604089013591508082111561084157600080fd5b5061084e89828a01610781565b979a9699509497509295939492505050565b80356001600160a01b038116811461087757600080fd5b919050565b8035801515811461087757600080fd5b600080600080606085870312156108a257600080fd5b843567ffffffffffffffff8111156108b957600080fd5b6108c5878288016106f6565b90955093506108d8905060208601610860565b91506108e66040860161087c565b905092959194509250565b60008060006040848603121561090657600080fd5b833567ffffffffffffffff81111561091d57600080fd5b610929868287016106f6565b909450925061093c905060208501610860565b90509250925092565b600181811c9082168061095957607f821691505b60208210810361097957634e487b7160e01b600052602260045260246000fd5b50919050565b634e487b7160e01b600052604160045260246000fd5b634e487b7160e01b600052603260045260246000fd5b600082516109bd8184602087016105ad565b9190910192915050565b6000600182016109e757634e487b7160e01b600052601160045260246000fd5b5060010190565b8183823760009101908152919050565b6000808335601e19843603018112610a1557600080fd5b83018035915067ffffffffffffffff821115610a3057600080fd5b60200191503681900382131561073857600080fd5b600060208284031215610a5757600080fd5b610a6082610860565b9392505050565b600060208284031215610a7957600080fd5b610a608261087c56fea264697066735822122094286b5ec4f25d84471c2cb633d0f5a9909a07d47d7eee452803c775be18127664736f6c634300080e0033";
