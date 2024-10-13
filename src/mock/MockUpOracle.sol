// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <=0.8.24;

contract MockUpOracle {
    address traderBotWallet;
    address owner;
    uint256 assets;

    constructor(address wallet, uint256 initialValue) {
        owner = msg.sender;
        traderBotWallet = wallet;
        assets = initialValue; // Initialize assets with the first deposit
    }

    function GetAccount(address wallet) public view returns (uint256) {
        // Ensure the provided wallet matches the traderBotWallet
        if (wallet != traderBotWallet) revert("Not Corresponding Wallet");
        // Return the current asset value
        return assets;
    }

    function setAssetValue(uint256 newValue) public {
        // Ensure only the owner can set the asset value
        if (msg.sender != owner) revert("Not authorized");
        // Update the asset value
        assets = newValue;
    }

    function setWallet(address wallet) public {
        // Ensure only the owner can update the traderBotWallet address
        if (msg.sender != owner) revert("Not authorized");
        // Update the traderBotWallet address
        traderBotWallet = wallet;
    }
}
