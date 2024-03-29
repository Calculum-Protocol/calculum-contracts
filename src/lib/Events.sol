// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity ^0.8.19;

/// @title Library Events
abstract contract Events {
    /// Events
    /** @title Helpers Methods
     * @dev Events for Vault Contract
     * @custom:a Alfredo Lopez / Calculum
     */

    /**
     * @dev Events of Mint/Deposit Process
     * @param caller Caller of Deposit/Mint Method
     * @param receiver Wallet Address where receive the Assets to Deposit/Mint
     * @param assets Amount of Assets to Deposit/Mint
     * @param estimationOfShares Estimation of Amount of Shares to Mint
     */

    event PendingDeposit(
        address indexed caller,
        address indexed receiver,
        uint256 assets,
        uint256 estimationOfShares
    );

    /**
     * @dev Events of Receive Ether
     * @param sender sender wallet address of the Ether
     * @param value Value of the Ether
     */
    event ValueReceived(address indexed sender, uint256 indexed value);

    /**
     * @dev Events of Withdraw/Redeem Process
     * @param receiver Wallet Address where receive the Assets to Deposit/Mint
     * @param owner Caller of Deposit/Mint Method
     * @param assets Amount of Assets to Deposit/Mint
     * @param estimationOfShares Estimation of Amount of Shares to Mint
     */
    event PendingWithdraw(
        address indexed receiver,
        address indexed owner,
        uint256 assets,
        uint256 estimationOfShares
    );
    /**
     * @dev Epoch Changed
     */
    event EpochChanged(
        uint256 OldPeriod,
        uint256 NewPeriod,
        uint256 newMaintTimeBefore,
        uint256 newMaintTimeAfter
    );
    /**
     * @dev Fees Transfer
     */
    event FeesTransfer(uint256 indexed epoch, uint256 Amount);
    /**
     * @dev Dex Transfer
     */
    event DexTransfer(uint256 indexed epoch, uint256 Amount);
}
