// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity ^0.8.20;

/// @title Library DataTypes
library Errors {
    /// Errors
    /** @title Helpers Methods
     * @dev Errors for Vault Contract
     * @custom:a Alfredo Lopez / Calculum
     */
    /// The User `_claimer` is not allowed to claim this deposit
    error CalletIsNotClaimerToDeposit(address _claimer);
    /// The User `_claimer` is not allowed to redeem the Assets
    error CalletIsNotClaimerToRedeem(address _claimer);
    /// The Caller `_owner` is not the Caller `_caller` of the Method
    error CallerIsNotOwnerOrReceiver(
        address _caller,
        address _owner,
        address _receiver
    );
    /// The Caller `_owner` is not the Caller `_caller` of the Method
    error CallerIsNotOwner(address _caller, address _owner);
    /// The Caller  require amount of assets `_assets` more than Max amount of assets Avaliable `_amountMax`
    error NotEnoughBalance(uint256 _assests, uint256 _amountMax);
    /// The Caller `_receiver` Try to Deposit a Value  over the Max Amount Permitted `_amountMax`
    error DepositExceededMax(address _receiver, uint256 _amountMax);
    /// The Caller `_receiver` Try to Deposit a Value  over the Max Amount Total Supply Permitted `_amountMax`
    error DepositExceedTotalVaultMax(
        address _receiver,
        uint256 _amountExceed,
        uint256 _amountMax
    );
    /// The Caller `_caller` Try to Deposit a Zero Amount
    error AmountMustBeGreaterThanZero(address _caller);
    /// The Oracle `_oracle` getting a wrong answer of the Balance of the Trader Bot Wallet `_traderBotWallet`
    error ActualAssetValueIsZero(address _oracle, address _traderBotWallet);
    /// The Caller `_caller` try to call Principal Method in Maintenance Period
    error VaultInMaintenance();
    /// The Caller `_caller` try to call Principal Method out Maintenance Period
    error VaultOutMaintenance();
    ///	The Owner try to set a wrong value for the Period of the Epoch `_period`
    error WrongEpochDuration(uint256 _epochDuration);
    /// The Owner try to set a wrong value for the Period of the Epoch or Maintenace Period `_period` not multiple of minutes, days or weeks
    error WrongEpochDefinition(
        uint256 _epochDefinition,
        uint256 _maintTimeBefore,
        uint256 _maintTimeAfter
    );
    /// Address is not a Contract
    error AddressIsNotContract();
    /// Transfer to `_to` with the amount `_amount` Fail
    error TransferFail(address _to, uint256 _amount);
    // The Owner try to Execute a Fee Transfer in the Epoch 0
    error FirstEpochNoFeeTransfer();
    /// The User `_caller` try to deposit a value `_amount`, under the Minimal Permitted
    error DepositAmountTooLow(address _caller, uint256 _amount);
    /// The Wallet not whitelisted
    error NotWhitelisted(address _wallet);
    ///  Transfer Faild
    error TransferFailed(address _to, uint256 _amount);
    /// Wrong Config for Uniswap
    error WrongUniswapConfig();
    ///
    error NotZeroAddress();
}
