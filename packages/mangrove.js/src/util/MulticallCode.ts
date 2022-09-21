/* 

This file contains the information needed to create a Multicall contract from mangrove.js.
The address is pre-agreed to out-of-band, and mangrove.js (see testServer.ts) will use the RPC method 'setCode' to set the code at this address. The abi allows interaction with the contract through ethers.

*/

export const address = "0xdecaf1" + "0".repeat(34);

export const abi = [
  "function aggregate(tuple(address, bytes)[]) returns (bool[], bytes[])"
];

export const code = "0x608060405234801561001057600080fd5b506004361061002b5760003560e01c8063252dba4214610030575b600080fd5b61004361003e36600461025e565b61005a565b6040516100519291906103fb565b60405180910390f35b606080825167ffffffffffffffff811115610077576100776101ee565b6040519080825280602002602001820160405280156100a0578160200160208202803683370190505b509150825167ffffffffffffffff8111156100bd576100bd6101ee565b6040519080825280602002602001820160405280156100f057816020015b60608152602001906001900390816100db5790505b50905060005b83518110156101e857600080858381518110610114576101146104ad565b6020026020010151600001516001600160a01b031686848151811061013b5761013b6104ad565b60200260200101516020015160405161015491906104c3565b6000604051808303816000865af19150503d8060008114610191576040519150601f19603f3d011682016040523d82523d6000602084013e610196565b606091505b5091509150818584815181106101ae576101ae6104ad565b602002602001019015159081151581525050808484815181106101d3576101d36104ad565b602090810291909101015250506001016100f6565b50915091565b634e487b7160e01b600052604160045260246000fd5b6040805190810167ffffffffffffffff81118282101715610227576102276101ee565b60405290565b604051601f8201601f1916810167ffffffffffffffff81118282101715610256576102566101ee565b604052919050565b6000602080838503121561027157600080fd5b823567ffffffffffffffff8082111561028957600080fd5b818501915085601f83011261029d57600080fd5b8135818111156102af576102af6101ee565b8060051b6102be85820161022d565b91825283810185019185810190898411156102d857600080fd5b86860192505b838310156103be578235858111156102f65760008081fd5b86016040601f19828d03810182131561030f5760008081fd5b610317610204565b838b01356001600160a01b03811681146103315760008081fd5b815283830135898111156103455760008081fd5b8085019450508d603f85011261035b5760008081fd5b8a8401358981111561036f5761036f6101ee565b61037f8c84601f8401160161022d565b92508083528e848287010111156103965760008081fd5b808486018d85013760009083018c0152808b01919091528452505091860191908601906102de565b9998505050505050505050565b60005b838110156103e65781810151838201526020016103ce565b838111156103f5576000848401525b50505050565b604080825283519082018190526000906020906060840190828701845b82811015610436578151151584529284019290840190600101610418565b50505083810382850152845180825282820190600581901b8301840187850160005b8381101561049e57601f198087850301865282518051808652610480818b88018c85016103cb565b96890196601f01909116939093018701925090860190600101610458565b50909998505050505050505050565b634e487b7160e01b600052603260045260246000fd5b600082516104d58184602087016103cb565b919091019291505056fea2646970667358221220b64c8523b66c1b2271140e15ef4f8840b38506cb00d6ad255facfe8f5517fe0864736f6c634300080e0033";