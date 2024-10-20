// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity ^0.8.19;

/// @title Library Events
abstract contract Events {
    /// Events
    /**
     * @title Helpers Methods
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
     * @dev Emitted when the epoch parameters are updated.
     * @param OldPeriod Previous epoch duration.
     * @param NewPeriod New epoch duration.
     * @param OldEpochStart Previous epoch start time.
     * @param NewEpochStart New epoch start time.
     * @param newMaintTimeBefore Maintenance time before the update.
     * @param newMaintTimeAfter Maintenance time after the update.
     */
    event EpochChanged(
        uint256 OldPeriod,
        uint256 NewPeriod,
        uint256 OldEpochStart,
        uint256 NewEpochStart,
        uint256 newMaintTimeBefore,
        uint256 newMaintTimeAfter
    );
    /**
     * @dev Emitted when fees are transferred.
     * @param epoch The current epoch.
     * @param Amount The total amount transferred.
     * @param mantFee The maintenance fee amount.
     * @param perfFee The performance fee amount.
     * @param totalFee The combined total of all fees.
     */
    event FeesTransfer(
        uint256 indexed epoch,
        uint256 Amount,
        uint256 mantFee,
        uint256 perfFee,
        uint256 totalFee
    );
    /**
     * @dev Emitted when a transfer occurs on the Dex.
     * @param epoch The current epoch.
     * @param Amount The amount transferred.
     */
    event DexTransfer(uint256 indexed epoch, uint256 Amount);

        /**
     * @dev Emitted when a transfer occurs on the Dex.
     * @param epoch The current epoch.
     * @param Amount The amount transferred.
     */
    event ReserveGasTransfer(uint256 indexed epoch, uint256 Amount);

    /**
     * @dev Emitted when emergency funds are rescued.
     * @param owner Address of the owner initiating the rescue.
     * @param amountAssets Amount of assets rescued.
     * @param amountEth Amount of Ether rescued.
     */
    event Rescued(
        address indexed owner,
        uint256 amountAssets,
        uint256 amountEth
    );

    /**
     * @dev Emitted when the Trader Bot address is updated.
     * @param newAddress The new Trader Bot address.
     */
    event TraderBotWalletUpdated(address indexed newAddress);

    /**
     * @dev Emitted when the Treasury wallet address is updated.
     * @param newAddress The new Treasury wallet address.
     */
    event TreasuryWalletUpdated(address indexed newAddress);

    /**
     * @dev Emitted when the OPZ wallet address is updated.
     * @param newAddress The new OPZ wallet address.
     */
    event OPZWalletUpdated(address indexed newAddress);

    /**
     * @dev Emitted when a wallet is whitelisted or unwhitelisted.
     * @param _wallet The wallet address.
     * @param _whitelisted The new whitelisted status.
     */
    event WhitelistedUpdated(address _wallet, bool _whitelisted);
}
