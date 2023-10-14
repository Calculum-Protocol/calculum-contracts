// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract MockUpOracle  {
    uint256 assets;
    address traderBotWallet;
    address _owner;

    constructor(address _wallet, uint256 _initialValue) {
        _owner = msg.sender;
        traderBotWallet = _wallet;
        assets = _initialValue; // Simulate the First Deposit of Alice
    }

    function GetAccount(address _wallet) public view returns (uint256) {
        if (_wallet != traderBotWallet) revert("Not Corresponding Wallet");
        return assets;
    }

    function setAssetValue(uint256 _newValue) public {
        if (msg.sender != _owner) revert("Not authorized");
        assets = _newValue;
    }

    function setWallet(address _wallet) public {
        if (msg.sender != _owner) revert("Not authorized");
        traderBotWallet = _wallet;
    }
}
