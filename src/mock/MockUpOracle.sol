// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <=0.8.24;

contract MockUpOracle {
    address traderBotWallet;
    address owner;
    uint256 assets;

    constructor(address wallet, uint256 initialValue) {
        owner = msg.sender;
        traderBotWallet = wallet;
        assets = initialValue; // Simulate the First Deposit of Alice
    }

    function GetAccount(address wallet) public view returns (uint256) {
        if (wallet != traderBotWallet) revert("Not Corresponding Wallet");
        return assets;
    }

    function setAssetValue(uint256 newValue) public {
        if (msg.sender != owner) revert("Not authorized");
        assets = newValue;
    }

    function setWallet(address wallet) public {
        if (msg.sender != owner) revert("Not authorized");
        traderBotWallet = wallet;
    }
}
