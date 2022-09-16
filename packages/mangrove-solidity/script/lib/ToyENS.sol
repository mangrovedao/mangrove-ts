// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.13;

contract ToyENS {
  mapping(string => address) _addrs;
  mapping(string => bool) _isToken;
  string[] _names;
  // addresses to not write
  // useful for when only some addresses should be output to a file
  mapping(string => bool) _noWrite;

  function get(string calldata name)
    public
    view
    returns (address payable addr)
  {
    addr = payable(_addrs[name]);
    require(
      addr != address(0),
      string.concat("ToyENS: address not found for ", name)
    );
  }

  function entry(string calldata name)
    external
    view
    returns (address payable addr, bool isToken)
  {
    addr = get(name);
    isToken = _isToken[name];
  }

  function set(string calldata name, address addr) public {
    set(name, addr, false);
  }

  function set(
    string calldata name,
    address addr,
    bool isToken
  ) public {
    // 0 is a strong absence marker, can't lose that invariant
    require(addr != address(0), "ToyENS: cannot record a name as 0x0");
    if (_addrs[name] == address(0)) {
      _names.push(name);
    }
    _noWrite[name] = false;
    _addrs[name] = addr;
    _isToken[name] = isToken;
  }

  function set_no_write(
    string calldata name,
    address addr,
    bool isToken
  ) public {
    // 0 is a strong absence marker, can't lose that invariant
    require(addr != address(0), "ToyENS: cannot record a name as 0x0");
    if (_addrs[name] == address(0)) {
      _names.push(name);
    }
    _noWrite[name] = true;
    _addrs[name] = addr;
    _isToken[name] = isToken;
  }

  function set(
    string[] calldata names,
    address[] calldata addrs,
    bool[] calldata isToken
  ) external {
    for (uint i = 0; i < names.length; i++) {
      set(names[i], addrs[i], isToken[i]);
    }
  }

  function all()
    external
    view
    returns (
      string[] memory names,
      address[] memory addrs,
      bool[] memory isToken,
      bool[] memory noWrite
    )
  {
    names = _names;
    addrs = new address[](names.length);
    isToken = new bool[](names.length);
    noWrite = new bool[](names.length);
    for (uint i = 0; i < _names.length; i++) {
      addrs[i] = _addrs[names[i]];
      isToken[i] = _isToken[names[i]];
      noWrite[i] = _noWrite[names[i]];
    }
  }
}
