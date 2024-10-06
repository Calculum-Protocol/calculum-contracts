// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// Import the upgradeable version of CalculumVault
import "./CalculumVault.sol";

// Define the Oracle interface
interface IOracle {
    function GetAccount(address account) external view returns (uint256);
}

// Create a new upgradeable contract that inherits from CalculumVault
contract ExtendedVault is CalculumVault {
    IOracle public oracle;

    // Add an initializer function for ExtendedVault
    function initializeExtendedVault(
        address _oracle,
        address[6] memory _initialAddress, // 0: Trader Bot Wallet, 1: Treasury Wallet, etc.
        uint256[7] memory _initialValue, // Epoch start, Min Deposit, etc.
        string memory _name,
        string memory _symbol,
        uint8 decimals_
    ) public initializer {
        // Initialize the parent contract (CalculumVault)
        initialize(_name, _symbol, decimals_, _initialAddress, _initialValue);
        
        // Initialize the oracle for the ExtendedVault
        oracle = IOracle(_oracle);
    }

    // Override the DexWalletBalance method
    function DexWalletBalance() public override {
        if ((totalSupply() == 0) && (CURRENT_EPOCH == 0)) {
            DEX_WALLET_BALANCE = newDeposits();
        } else {
            // Get the balance of the account in the DEX using the oracle
            DEX_WALLET_BALANCE = oracle.GetAccount(traderBotWallet);
        }
    }
}