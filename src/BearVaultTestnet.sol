// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC4626} from "./lib/IERC4626.sol";
import {Events, SafeERC20, Claimable} from "./lib/Claimable.sol";
import "./lib/DataTypes.sol";
import "./lib/Errors.sol";
import {IRouter} from "./lib/IRouter.sol";
import "./lib/UniswapLibV3.sol";
import "./lib/Utils.sol";
import {ERC20Upgradeable} from "@openzeppelin-contracts-upgradeable/contracts/token/ERC20/ERC20Upgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin-contracts-upgradeable/contracts/utils/PausableUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin-contracts-upgradeable/contracts/access/AccessControlUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin-contracts-upgradeable/contracts/utils/ReentrancyGuardUpgradeable.sol";

/**
 * @title Smart Contract Disclaimer
 *
 * @notice
 * By interacting with this smart contract, you acknowledge and agree that you are engaging with this technology at your own risk.
 * This smart contract is currently a Minimum Viable Product (MVP) and is intended for testing purposes only. It has not undergone
 * any formal security audit, and as such, there may be vulnerabilities that could lead to the loss of assets.
 *
 * No Guarantees and Liability Disclaimer:
 * This smart contract is provided on an "as-is" and "as-available" basis without any warranties of any kind, either express or implied,
 * including but not limited to, the implied warranties of merchantability, fitness for a particular purpose, and non-infringement.
 * We do not guarantee the functionality, security, or reliability of this smart contract. The developers and contributors to this project
 * shall not be liable for any direct, indirect, incidental, special, consequential, or exemplary damages, including but not limited to,
 * damages for loss of profits, goodwill, use, data, or other intangible losses, resulting from the use or inability to use this smart contract.
 *
 * Regulatory Compliance:
 * Using this smart contract does not ensure compliance with any legal or regulatory requirements. It is the user's responsibility to
 * ensure that their use of this smart contract complies with all applicable laws and regulations in their respective jurisdiction.
 *
 * Impermanent Loss:
 * Users should be aware of the risk of impermanent loss, which is a potential loss that can occur when providing liquidity to automated
 * market makers or similar decentralized finance protocols. The value of your assets can fluctuate based on market conditions and
 * the behavior of other users in the ecosystem.
 *
 * Explicit Notice of Non-Audit:
 * Please note that this smart contract has not been audited. As such, there may be unknown vulnerabilities or bugs that could potentially
 * be exploited, leading to the loss of funds. Users are strongly advised to use this contract for testing purposes only and to not deposit
 * significant amounts of assets.
 *
 * Conclusion:
 * By proceeding to interact with this smart contract, you acknowledge that you have read, understood, and agree to all the terms outlined
 * in this disclaimer. You accept the inherent risks involved and agree that you will not hold the developers, contributors, or any
 * associated parties liable for any losses or damages incurred.
 */

/**
 * @dev Bear Vault / Bear Protocol
 * @dev Vault based on ERC-4626
 * @custom:a Bear Protocol Developers Team
 */
/// @custom:oz-upgrades-unsafe-allow external-library-linking
contract BearVaultTestnet is
    IERC4626,
    ERC20Upgradeable,
    PausableUpgradeable,
    Claimable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable
{
    using Math for uint256;
    using SafeERC20 for IERC20;
    // Principal private Variable of ERC4626

    IERC20Metadata internal _asset;
    // Decimals of the Share Token
    uint8 private _decimals;
    // Flag to Control Linksigner
    bool private linked;
    // flag no transfer to Vertez
    bool private _tx;
    // Flag to Control Start Sales of Shares
    uint256 public EPOCH_START; // start 10 July 2022, Sunday 22:00:00  UTC
    // Transfer Bot Wallet in DEX
    address payable public openZeppelinDefenderWallet;
    // Trader Bot Wallet in DEX
    address payable public traderBotWallet;
    // Address of Vertex Endpoint
    address private endpointVertex;
    // Treasury Wallet of Bear Protocol
    address public treasuryWallet;
    // Management Fee percentage , e.g. 1% = 1 / 100
    uint256 public MANAGEMENT_FEE_PERCENTAGE;
    // Performace Fee percentage , e.g. 15% = 15 / 100
    uint256 public PERFORMANCE_FEE_PERCENTAGE;
    // Vault Token Price per EPOCH
    mapping(uint256 => uint256) public VAULT_TOKEN_PRICE;
    // Total Supply per EPOCH
    mapping(uint256 => uint256) public TOTAL_VAULT_TOKEN_SUPPLY;
    /// @dev Address of Uniswap v3 router to swap whitelisted ERC20 tokens to router.WETH()
    IRouter public router;
    // Period
    uint256 public EPOCH_DURATION; // 3600 seconds = 1 hours
    // Number of Periods
    uint256 public CURRENT_EPOCH; // Number of epochs since the start
    // Maintenance Period Before Start (in seconds)
    uint256 public MAINTENANCE_PERIOD_PRE_START;
    // Maintenance Period After Start (in seconds)
    uint256 public MAINTENANCE_PERIOD_POST_START;
    // Actual Value of Assets during Trader Period
    uint256 public DEX_WALLET_BALANCE;
    // Max Deposit
    uint256 public MAX_DEPOSIT;
    // Min Deposit
    uint256 public MIN_DEPOSIT;
    // Max Total Assets
    uint256 public MAX_TOTAL_DEPOSIT;
    // Minimal Wallet Ballance USDC in Transfer Bot
    uint256 public MIN_WALLET_BALANCE_USDC_TRANSFER_BOT;
    // Wallet Target Balance USDC in Transfer Bot
    uint256 public TARGET_WALLET_BALANCE_USDC_TRANSFER_BOT;
    // Minimal Wallet Balance of ETH in Transfer Bot
    uint256 public MIN_WALLET_BALANCE_ETH_TRANSFER_BOT;
    // Factor Adjust for Decimals of the Share Token
    uint256 public DECIMAL_FACTOR; // 10^decimals()
    // Array of Wallet Addresses with Deposit
    address[] private depositWallets;
    // Mapping Deposits
    mapping(address => DataTypes.Basics) public DEPOSITS; // Mapping of Deposits Realized
    // Array of Wallet Addresses with Withdraw
    address[] private withdrawWallets;
    // Mapping Withdrawals
    mapping(address => DataTypes.Basics) public WITHDRAWALS; // Mapping of Withdrawals Realized
    // Constant for TraderBot Role
    bytes32 private constant TRANSFER_BOT_ROLE = keccak256("TRANSFER_BOT_ROLE");
    // Constant for TraderBot Role
    bytes32 private constant TRADER_BOT_ROLE = keccak256("TRADER_BOT_ROLE");
    // Mapping of Struct NetTransfer
    mapping(uint256 => DataTypes.NetTransfer) public netTransfer; // Mapping of Struct NetTransfer based on EPOCH
    // limitter
    DataTypes.Limit public limit;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initializes the Vault with initial parameters.
     * @param _name Name of the ERC20 Share / Vault Token.
     * @param _symbol Symbol of the ERC20 Share / Vault Token.
     * @param decimals_ Decimals of the ERC20 Share / Vault Token.
     * @param _initialAddress Array of initial addresses:
     *        0: Trader Bot Wallet,
     *        1: Treasury Wallet,
     *        2: OpenZeppelin Defender Wallet,
     *        3: USDCToken Address,
     *        4: Vertex Endpoint.
     * @param _initialValue Array of initial values:
     *        0: Start timestamp,
     *        1: Min Deposit,
     *        2: Max Deposit,
     *        3: Max Total Supply Value,
     *        4: Min Wallet Balance USDC Transfer Bot,
     *        5: Target Wallet Balance USDC Transfer Bot,
     *        6: Min Wallet Balance ETH Transfer Bot.
     */
    function initialize(
        string memory _name,
        string memory _symbol,
        uint8 decimals_,
        address[5] memory _initialAddress, // 0: Trader Bot Wallet, 1: Treasury Wallet, 2: OpenZeppelin Defender Wallet, 3: USDCToken Address, 4: Vertex Endpoint
        uint256[7] memory _initialValue // 0: Start timestamp, 1: Min Deposit, 2: Max Deposit, 3: Max Total Supply Value
    ) public reinitializer(1) {
        if (
            !isContract(_initialAddress[3]) || !isContract(_initialAddress[4])
        ) {
            revert Errors.AddressIsNotContract();
        }
        __Ownable_init(_msgSender());
        __ReentrancyGuard_init();
        __AccessControl_init_unchained();
        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
        grantRole(TRANSFER_BOT_ROLE, _initialAddress[2]);
        grantRole(TRANSFER_BOT_ROLE, _msgSender());
        grantRole(TRADER_BOT_ROLE, _msgSender());
        grantRole(TRADER_BOT_ROLE, _initialAddress[0]);
        __ERC20_init(_name, _symbol);
        _asset = IERC20Metadata(_initialAddress[3]);
        _decimals = decimals_;
        endpointVertex = _initialAddress[4];
        traderBotWallet = payable(_initialAddress[0]);
        openZeppelinDefenderWallet = payable(_initialAddress[2]);
        treasuryWallet = _initialAddress[1];
        EPOCH_START = _initialValue[0];
        MIN_DEPOSIT = _initialValue[1];
        MAX_DEPOSIT = _initialValue[2];
        MAX_TOTAL_DEPOSIT = _initialValue[3];
        MIN_WALLET_BALANCE_USDC_TRANSFER_BOT = _initialValue[4];
        TARGET_WALLET_BALANCE_USDC_TRANSFER_BOT = _initialValue[5];
        MIN_WALLET_BALANCE_ETH_TRANSFER_BOT = _initialValue[6];
        EPOCH_DURATION = 1 * 60 minutes; // 2 hours
        MAINTENANCE_PERIOD_PRE_START = 300 seconds; // 5 minutes
        MAINTENANCE_PERIOD_POST_START = 300 seconds; // 5 minutes
        CurrentEpoch();
        MANAGEMENT_FEE_PERCENTAGE = 1 ether / 100; // Represent 1%
        PERFORMANCE_FEE_PERCENTAGE = 15 ether / 100; // Represent 15%
        DECIMAL_FACTOR = 10 ** decimals();

        // Set the Limitter
        limit = DataTypes.Limit({
            percentage: 30, // 30% of the total assets of the Vault can be withdrawn
            timestamp: block.timestamp + (52 weeks * 5) // 5 years
        });
    }

    /**
     * @notice called by the admin to pause, triggers stopped state  - onlyOwner
     * @dev Callable by admin or operator
     */
    function pause() external whenNotPaused onlyOwner {
        _pause();
    }

    /**
     * @notice called by the admin to unpause, returns to normal state  - onlyOwner
     * @dev Reset genesis state. Once paused, the rounds would need to be kickstarted by genesis
     */
    function unpause() external whenPaused onlyOwner {
        _unpause();
    }

    /**
     * @dev Mints Vault shares to receiver by depositing exactly amount of underlying tokens.
     * @param _assets Amount of underlying tokens to deposit.
     * @param _receiver Address of the receiver wallet.
     *
     * - MUST emit the Deposit event.
     * - MAY support an additional flow in which the underlying tokens are owned by the Vault contract before the
     *   deposit execution, and are accounted for during deposit.
     * - MUST revert if all of assets cannot be deposited (due to deposit limit being reached, slippage, the user not
     *   approving enough underlying tokens to the Vault contract, etc).
     *
     * NOTE: most implementations will require pre-approval of the Vault with the Vault’s underlying asset token.
     */
    function deposit(
        uint256 _assets,
        address _receiver
    ) external override whenNotPaused nonReentrant returns (uint256) {
        _checkVaultInMaintenance();
        address caller = _msgSender();
        DataTypes.Basics storage depositor = DEPOSITS[_receiver];
        if (_receiver != caller) {
            revert Errors.CallerIsNotOwnerOrReceiver(
                caller,
                _receiver,
                _receiver
            );
        }
        if (_assets < MIN_DEPOSIT) {
            revert Errors.DepositAmountTooLow(_receiver, _assets);
        }
        if (
            _assets >
            (MAX_DEPOSIT - (depositor.finalAmount + depositor.amountAssets))
        ) {
            // Verify the maximun value per user
            revert Errors.DepositExceededMax(
                _receiver,
                MAX_DEPOSIT - (depositor.finalAmount + depositor.amountAssets)
            );
        }
        if ((totalAssets() + _assets) > MAX_TOTAL_DEPOSIT) {
            revert Errors.DepositExceedTotalVaultMax(
                _receiver,
                totalAssets() + _assets,
                MAX_TOTAL_DEPOSIT
            );
        }
        if (
            depositor.status == DataTypes.Status.Claimet ||
            depositor.status == DataTypes.Status.Pending
        ) {
            revert Errors.DepositPendingClaim(_receiver);
        }

        uint256 shares = previewDeposit(_assets);

        // if _asset is ERC777, transferFrom can call reenter BEFORE the transfer happens through
        // the tokensToSend hook, so we need to transfer before we mint to keep the invariants.
        SafeERC20.safeTransferFrom(_asset, _receiver, address(this), _assets);
        addDeposit(_receiver, shares, _assets);

        // flag to control the transfer to Vertex
        _tx = true;
        emit PendingDeposit(caller, _receiver, _assets, shares);

        return shares;
    }

    /**
     * @dev Mints exactly Vault shares to receiver by depositing amount of underlying tokens.
     * @param _shares Amount of Vault shares to mint.
     * @param _receiver Address of the receiver wallet.
     *
     * - MUST emit the Deposit event.
     * - MAY support an additional flow in which the underlying tokens are owned by the Vault contract before the mint
     *   execution, and are accounted for during mint.
     * - MUST revert if all of shares cannot be minted (due to deposit limit being reached, slippage, the user not
     *   approving enough underlying tokens to the Vault contract, etc).
     *
     * NOTE: most implementations will require pre-approval of the Vault with the Vault’s underlying asset token.
     */
    function mint(
        uint256 _shares,
        address _receiver
    ) external returns (uint256) {}

    /**
     * @dev Burns shares from owner and sends exactly assets of underlying tokens to receiver.
     * @param _assets Amount of underlying (assets) tokens to withdraw.
     * @param _receiver Address of the receiver wallet.
     * @param _owner Owner of the Vault Shares to be claimed
     *
     * - MUST emit the Withdraw event.
     * - MAY support an additional flow in which the underlying tokens are owned by the Vault contract before the
     *   withdraw execution, and are accounted for during withdraw.
     * - MUST revert if all of assets cannot be withdrawn (due to withdrawal limit being reached, slippage, the owner
     *   not having enough shares, etc).
     *
     * Note that some implementations will require pre-requesting to the Vault before a withdrawal may be performed.
     * Those methods should be performed separately.
     */
    function withdraw(
        uint256 _assets,
        address _receiver,
        address _owner
    ) external override whenNotPaused nonReentrant returns (uint256) {
        _checkVaultInMaintenance();
        address caller = _msgSender();
        if ((_owner != caller) || (_receiver != caller)) {
            revert Errors.CallerIsNotOwnerOrReceiver(caller, _owner, _receiver);
        }
        if (_assets == 0) revert Errors.AmountMustBeGreaterThanZero(caller);
        if (_assets > maxWithdraw(_owner)) {
            revert Errors.NotEnoughBalance(_assets, maxWithdraw(_owner));
        }
        DataTypes.Basics storage withdrawer = WITHDRAWALS[_owner];
        if (
            withdrawer.status == DataTypes.Status.Claimet ||
            withdrawer.status == DataTypes.Status.PendingRedeem ||
            withdrawer.status == DataTypes.Status.PendingWithdraw
        ) {
            revert Errors.WithdrawPendingClaim(_owner);
        }
        _checkLimit(_assets);
        uint256 shares = previewWithdraw(_assets);

        // if _asset is ERC777, transfer can call reenter AFTER the transfer happens through
        // the tokensReceived hook, so we need to transfer after we burn to keep the invariants.
        addWithdraw(_receiver, shares, _assets, true);
        // flag to control the transfer to Vertex
        _tx = true;
        emit PendingWithdraw(_receiver, _owner, _assets, shares);

        return shares;
    }

    /**
     * @dev Burns exactly shares from owner and sends assets of underlying tokens to receiver.
     * @param _shares Amount of Vault shares to burn, and convert to assets to send to receiver.
     * @param _receiver Address of the receiver wallet.
     * @param _owner Owner of the Vault Assets to be claimed
     *
     * - MUST emit the Withdraw event.
     * - MAY support an additional flow in which the underlying tokens are owned by the Vault contract before the
     *   redeem execution, and are accounted for during redeem.
     * - MUST revert if all of shares cannot be redeemed (due to withdrawal limit being reached, slippage, the owner
     *   not having enough shares, etc).
     *
     * NOTE: some implementations will require pre-requesting to the Vault before a withdrawal may be performed.
     * Those methods should be performed separately.
     */
    function redeem(
        uint256 _shares,
        address _receiver,
        address _owner
    ) external override whenNotPaused nonReentrant returns (uint256) {
        _checkVaultInMaintenance();
        address caller = _msgSender();
        if ((_owner != caller) || (_receiver != caller)) {
            revert Errors.CallerIsNotOwnerOrReceiver(caller, _owner, _receiver);
        }
        if (_shares == 0) revert Errors.AmountMustBeGreaterThanZero(caller);
        if (_shares > maxRedeem(_owner)) {
            revert Errors.NotEnoughBalance(_shares, maxRedeem(_owner));
        }
        DataTypes.Basics storage withdrawer = WITHDRAWALS[_owner];
        if (
            withdrawer.status == DataTypes.Status.Claimet ||
            withdrawer.status == DataTypes.Status.PendingRedeem ||
            withdrawer.status == DataTypes.Status.PendingWithdraw
        ) {
            revert Errors.WithdrawPendingClaim(_owner);
        }

        uint256 assets = previewRedeem(_shares);
        _checkLimit(assets);

        // if _asset is ERC777, transfer can call reenter AFTER the transfer happens through
        // the tokensReceived hook, so we need to transfer after we burn to keep the invariants.
        addWithdraw(_receiver, _shares, assets, false);
        // flag to control the transfer to Vertex
        _tx = true;
        emit PendingWithdraw(_receiver, _owner, assets, _shares);

        return assets;
    }

    /**
     * @dev Method to Claim Shares of the Vault (Mint)
     * @dev This function allows the owner to claim their pending shares after a deposit
     * @dev It checks if the vault is not in maintenance, verifies the claimer, mints shares, and updates deposit status
     * @dev The function also emits a Deposit event and controls the transfer to Vertex
     * @param _owner Address of the owner claiming the shares
     * @notice This function can only be called when the deposit is in the Claimet status
     * @notice It will revert if called during the maintenance period or if the caller is not eligible to claim
     */
    function claimShares(address _owner) external nonReentrant {
        _checkVaultInMaintenance();
        address caller = _msgSender();
        DataTypes.Basics storage depositor = DEPOSITS[_owner];
        if (!isClaimerMint(_owner)) {
            revert Errors.CalletIsNotClaimerToDeposit(_owner);
        }
        _mint(_owner, depositor.amountShares);
        // flag to control the transfer to Vertex
        _tx = true;
        emit Deposit(
            caller,
            _owner,
            depositor.finalAmount,
            depositor.amountShares
        );
        delete depositor.amountShares;
        depositor.status = DataTypes.Status.Completed;
    }

    /**
     * @dev Method to Claim Assets of the Vault (Redeem)
     * @dev Allows claiming of withdrawn assets, checking maintenance status and claimer eligibility
     * @dev Burns shares from owner, transfers assets to receiver, and updates withdrawal status
     * @dev Emits a Withdraw event and controls transfer to Vertex
     * @param _receiver Address to receive the claimed assets
     * @param _owner Owner of the Vault Assets to be claimed
     * @notice Can only be called when withdrawal is in Claimet status and vault is not in maintenance
     */
    function claimAssets(
        address _receiver,
        address _owner
    ) external nonReentrant {
        _checkVaultInMaintenance();
        address caller = _msgSender();
        DataTypes.Basics storage withdrawer = WITHDRAWALS[_owner];
        if (!isClaimerWithdraw(_owner)) {
            revert Errors.CalletIsNotClaimerToRedeem(_owner);
        }
        if (withdrawer.amountAssets >= _asset.balanceOf(address(this))) {
            revert Errors.NotEnoughBalance(
                withdrawer.amountAssets,
                _asset.balanceOf(address(this))
            );
        }
        _burn(_owner, withdrawer.amountShares);
        SafeERC20.safeTransfer(_asset, _receiver, withdrawer.amountAssets);
        // flag to control the transfer to Vertex
        _tx = true;
        emit Withdraw(
            caller,
            _receiver,
            _owner,
            withdrawer.amountShares,
            withdrawer.amountAssets
        );
        delete withdrawer.amountAssets;
        delete withdrawer.amountShares;
        withdrawer.status = DataTypes.Status.Completed;
    }

    /**
     * @dev Emergency rescue method to withdraw all assets from Vertex and the contract
     * @notice Transfers all ERC20 assets from Vertex to the contract, then to the owner
     * @notice Also transfers any ETH balance to the owner
     * @notice Can only be called by the owner when the contract is paused
     * @notice Emits a Rescued event with details of transferred assets
     */
    function rescue() external whenPaused onlyOwner nonReentrant {
        uint256 assets = _asset.balanceOf(address(this));
        // Safe Transfer of the Assets to the Owner
        SafeERC20.safeTransfer(_asset, _msgSender(), assets);
        // Transfer all Eth to the Owner
        uint256 amount = address(this).balance;
        claimValues(address(0), _msgSender());
        emit Events.Rescued(_msgSender(), assets, amount);
    }

    /**
     * @dev Previews asset rescue from Vertex when contract is paused - onlyOwner
     * @dev Updates DEX wallet balance and initiates withdrawal of all assets from Vertex
     * @dev Note: Actual asset transfer occurs off-chain and may take time to complete
     */
    function previewRescue() external whenPaused onlyOwner nonReentrant {
        DexWalletBalance();
        // Withdrawl and Adjust assets, because the Valance is in Format 18 decimals
        uint256 assets = DEX_WALLET_BALANCE;
        Utils.withdrawVertexCollateral(
            endpointVertex,
            address(_asset),
            0,
            assets
        );
    }

    /**
     * @dev Sets epoch duration and maintenance times - onlyOwner
     * @dev Checks if vault is in maintenance, validates new epoch duration
     * @dev Updates EPOCH_DURATION, EPOCH_START, and maintenance periods
     * @dev Emits EpochChanged event with old and new values
     * @param _epochDuration New epoch duration (1 min to 12 weeks)
     * @param _maintTimeBefore New maintenance time before epoch start
     * @param _maintTimeAfter New maintenance time after epoch end
     */
    function setEpochDuration(
        uint256 _epochDuration,
        uint256 _maintTimeBefore,
        uint256 _maintTimeAfter
    ) external onlyOwner {
        _checkVaultInMaintenance();
        if (_epochDuration < 1 minutes || _epochDuration > 12 weeks) {
            revert Errors.WrongEpochDuration(_epochDuration);
        }
        uint256 oldEpochDuration = EPOCH_DURATION;
        uint256 oldEpochStart = EPOCH_START;
        EPOCH_DURATION = _epochDuration;
        // Permit to Readjust Periods
        EPOCH_START = block.timestamp - (EPOCH_DURATION * CURRENT_EPOCH);
        MAINTENANCE_PERIOD_PRE_START = _maintTimeBefore;
        MAINTENANCE_PERIOD_POST_START = _maintTimeAfter;
        emit EpochChanged(
            oldEpochDuration,
            _epochDuration,
            oldEpochStart,
            EPOCH_START,
            _maintTimeBefore,
            _maintTimeAfter
        );
    }

    /**
     * @dev Method to finalize the current epoch, update all parameters, and prepare for the new epoch
     * @notice This function performs critical end-of-epoch operations:
     * - Updates vault token prices
     * - Processes pending deposits and withdrawals
     * - Updates total supply
     * - Calculates net transfers for Vertex integration
     * - Prepares for the next epoch
     * @dev Can only be called by accounts with TRANSFER_BOT_ROLE (e.g., OpenZeppelin Defender)
     * @dev Should be called during the maintenance period at the end of each epoch
     */
    function finalizeEpoch() external onlyRole(TRANSFER_BOT_ROLE) {
        /**
         * Follow the Initial Vault Mechanics Define by Simplified Implementation
         */
        _checkVaultOutMaintenance();
        DexWalletBalance();
        // Partial fix if Finalize epoch failed at some point
        if (CURRENT_EPOCH >= 1) {
            uint256 lastEpoch = CURRENT_EPOCH - 1;
            if (VAULT_TOKEN_PRICE[lastEpoch] <= 10) {
                bool found = false;
                // Iterate backward to find the last non-zero token price
                while (true) {
                    if (VAULT_TOKEN_PRICE[lastEpoch] >= 10) {
                        // Found a non-zero price
                        VAULT_TOKEN_PRICE[
                            CURRENT_EPOCH - 1
                        ] = VAULT_TOKEN_PRICE[lastEpoch];
                        found = true;
                        break;
                    }
                    if (lastEpoch == 0) {
                        // Reached the earliest epoch
                        break;
                    }
                    lastEpoch--;
                }
                if (!found) {
                    // All previous prices are zero; initialize the first epoch price
                    uint256 initialPrice = convertToAssets(1 ether);
                    VAULT_TOKEN_PRICE[0] = initialPrice;
                    VAULT_TOKEN_PRICE[CURRENT_EPOCH - 1] = initialPrice;
                }
            }
        }

        // Update the Vault Token Price
        VAULT_TOKEN_PRICE[CURRENT_EPOCH] = convertToAssets(1 ether);
        // Update Value such Token Price Updated
        for (uint256 i; i < depositWallets.length; ) {
            DataTypes.Basics storage depositor = DEPOSITS[depositWallets[i]];
            if (depositor.status == DataTypes.Status.Pending) {
                depositor.amountShares = convertToShares(
                    depositor.amountAssets
                );
            }
            unchecked {
                ++i;
            }
        }
        for (uint256 i; i < withdrawWallets.length; ) {
            DataTypes.Basics storage withdrawer = WITHDRAWALS[
                withdrawWallets[i]
            ];
            if (withdrawer.status == DataTypes.Status.PendingWithdraw) {
                withdrawer.amountShares = convertToShares(
                    withdrawer.amountAssets
                );
            }
            if (withdrawer.status == DataTypes.Status.PendingRedeem) {
                withdrawer.amountAssets = convertToAssets(
                    withdrawer.amountShares
                );
            }
            unchecked {
                ++i;
            }
        }
        updateTotalSupply();
        netTransferBalance();
        // Update State of Assest and Share pending to Claim
        for (uint256 i; i < depositWallets.length; ) {
            DataTypes.Basics storage depositor = DEPOSITS[depositWallets[i]];
            if (depositor.status == DataTypes.Status.Pending) {
                depositor.amountShares = convertToShares(
                    depositor.amountAssets
                );
                depositor.status = DataTypes.Status.Claimet;
                depositor.finalAmount += depositor.amountAssets;
                delete depositor.amountAssets;
            }
            unchecked {
                ++i;
            }
        }
        for (uint256 i; i < withdrawWallets.length; ) {
            DataTypes.Basics storage withdrawer = WITHDRAWALS[
                withdrawWallets[i]
            ];
            if (withdrawer.status == DataTypes.Status.PendingWithdraw) {
                withdrawer.amountShares = convertToShares(
                    withdrawer.amountAssets
                );
                withdrawer.status = DataTypes.Status.Claimet;
                withdrawer.finalAmount += withdrawer.amountAssets;
            }
            if (withdrawer.status == DataTypes.Status.PendingRedeem) {
                withdrawer.amountAssets = convertToAssets(
                    withdrawer.amountShares
                );
                withdrawer.status = DataTypes.Status.Claimet;
                withdrawer.finalAmount += withdrawer.amountAssets;
            }
            unchecked {
                ++i;
            }
        }
    }

    /**
     * @dev Transfers assets to or from Vertex, handling both deposits and withdrawals.
     * @dev This method is called twice for each transfer due to Vertex's off-chain withdrawal process:
     *      1. First call initiates the transfer.
     *      2. Second call completes the withdrawal of assets from Vertex.
     * @dev After the transfer, it recalculates the gas reserve and emits a Transfer event.
     * @dev Can only be called by accounts with TRANSFER_BOT_ROLE.
     * @param kind Direction of transfer: true for Deposit, false for Withdrawal.
     */
    function dexTransfer(
        bool kind
    ) external onlyRole(TRANSFER_BOT_ROLE) nonReentrant {
        DataTypes.NetTransfer storage actualTx = netTransfer[CURRENT_EPOCH];
        _checkVaultOutMaintenance();
        if (actualTx.pending && kind && (actualTx.amount > 0)) {
            if (actualTx.direction) {
                // Deposit
                Utils.depositCollateralWithReferral(
                    endpointVertex,
                    address(_asset),
                    0,
                    actualTx.amount
                );
                // LinkSigner with EOA unique execution
                if (!linked) {
                    Utils.linkVertexSigner(
                        endpointVertex,
                        address(_asset),
                        address(traderBotWallet)
                    );
                    linked = true;
                }
            } else {
                // Withdrawl
                Utils.withdrawVertexCollateral(
                    endpointVertex,
                    address(_asset),
                    0,
                    actualTx.amount
                );
            }
            actualTx.pending = false;
        }
        uint256 reserveGas = Utils.CalculateTransferBotGasReserveDA(
            address(this),
            address(_asset)
        );
        uint256 assetBalance = _asset.balanceOf(address(this));
        if (reserveGas > 0 && !kind && _tx) {
            if (assetBalance < reserveGas) {
                revert Errors.NotEnoughBalance(reserveGas, assetBalance);
            }
            SafeERC20.safeTransfer(
                _asset,
                openZeppelinDefenderWallet,
                reserveGas
            );
        }
        if (!kind) {
            // Avoid Duplicate Event
            emit DexTransfer(CURRENT_EPOCH, actualTx.amount);
        }
    }

    /**
     * @dev Calculates and transfers fees for the current epoch to the Treasury Wallet
     * @dev Computes management and performance fees based on current vault state
     * @dev Updates epoch-related parameters and transfers fees if applicable
     * @dev Can only be called by accounts with TRANSFER_BOT_ROLE during maintenance period
     * @dev Emits FeesTransfer event with fee details
     */
    function feesTransfer() external onlyRole(TRANSFER_BOT_ROLE) nonReentrant {
        _checkVaultOutMaintenance();
        if (CURRENT_EPOCH == 0) {
            revert Errors.FirstEpochNoFeeTransfer();
        }
        uint256 mgtFee = Utils.MgtFeePctVaultToken(address(this));
        uint256 perfFee = _tx
            ? Utils.PerfFeePctVaultToken(address(this), address(_asset))
            : 0;
        uint256 totalFees = Utils.getPnLPerVaultToken(
            address(this),
            address(_asset)
        )
            ? (mgtFee + perfFee).mulDiv(
                TOTAL_VAULT_TOKEN_SUPPLY[CURRENT_EPOCH - 1],
                DECIMAL_FACTOR
            )
            : mgtFee.mulDiv(
                TOTAL_VAULT_TOKEN_SUPPLY[CURRENT_EPOCH - 1],
                DECIMAL_FACTOR
            );
        uint256 rest = totalFees >
            Utils.CalculateTransferBotGasReserveDA(
                address(this),
                address(_asset)
            )
            ? totalFees -
                Utils.CalculateTransferBotGasReserveDA(
                    address(this),
                    address(_asset)
                )
            : 0;
        uint256 assetBalance = _asset.balanceOf(address(this));
        rest = rest > assetBalance ? assetBalance : rest;
        uint256 restEvent;
        if (rest > 0) {
            restEvent = rest;
            SafeERC20.safeTransfer(_asset, treasuryWallet, restEvent);
        }
        _tx = false;
        emit FeesTransfer(CURRENT_EPOCH, restEvent, mgtFee, perfFee, totalFees);
        // Update Current Epoch
        DexWalletBalance();
        CurrentEpoch();
    }

    /**
     * @dev Updates the TraderBot wallet address and links it to the Vertex signer
     * @param _traderBotWallet New address for the TraderBot wallet
     * @notice Only callable by the contract owner
     * @notice Emits a TraderBotWalletUpdated event
     */
    function setTraderBotWallet(address _traderBotWallet) external onlyOwner {
        traderBotWallet = payable(_traderBotWallet);
        Utils.linkVertexSigner(
            endpointVertex,
            address(_asset),
            address(traderBotWallet)
        );
        emit TraderBotWalletUpdated(_traderBotWallet);
    }

    /**
     * @dev Updates the Treasury Wallet address
     * @param _treasuryWallet New address for the Treasury Wallet
     * @notice Only callable by the contract owner
     * @notice Emits a TreasuryWalletUpdated event
     */
    function setTreasuryWallet(address _treasuryWallet) external onlyOwner {
        treasuryWallet = payable(_treasuryWallet);
        emit TreasuryWalletUpdated(_treasuryWallet);
    }

    /**
     * @dev Updates the OpenZeppelin Defender Wallet address
     * @param _opzWallet New address for the OpenZeppelin Defender Wallet
     * @notice Only callable by the contract owner
     * @notice Emits an OPZWalletUpdated event
     */
    function setOPZWallet(address _opzWallet) external onlyOwner {
        openZeppelinDefenderWallet = payable(_opzWallet);
        emit OPZWalletUpdated(_opzWallet);
    }

    /**
     * @dev Links the TraderBot wallet as a signer on the Vertex Endpoint
     * @notice Only callable by the contract owner
     * @notice Utilizes Utils.linkVertexSigner to establish the link
     * @notice Uses the current endpointVertex, asset address, and traderBotWallet
     */
    function linkSigner() external onlyOwner {
        Utils.linkVertexSigner(
            endpointVertex,
            address(_asset),
            address(traderBotWallet)
        );
    }

    /**
     * @dev Retrieves and updates the current balance of the TraderBot wallet in Vertex
     * @notice If total supply is zero and it's the first epoch, sets balance to new deposits
     * @notice Otherwise, fetches balance from Vertex and adjusts for asset decimals
     * @notice Updates DEX_WALLET_BALANCE with the calculated value
     */
    function DexWalletBalance() public {
        if ((totalSupply() == 0) && (CURRENT_EPOCH == 0)) {
            DEX_WALLET_BALANCE = newDeposits();
        } else {
            // Get the Balance of the Wallet in the DEX Vertex Through FQuerier Contract of Vertex,
            // and Adjust the Decimals for the Asset of the Vault
            DEX_WALLET_BALANCE = Utils.getVertexBalance().mulDiv(
                10 ** _asset.decimals(),
                1 ether
            );
        }
    }

    /**
     * @dev Returns the total amount of the underlying asset that is “managed” by Vault.
     * TODO: About this guys the point is how reflect the real value of the asset in the Trader Bot during the  Trading Period,
     * TODO: Because from this depend the amount of shares that can be mint/burn in the Deposit or Withdraw methods
     * - SHOULD include any compounding that occurs from yield.
     * - MUST be inclusive of any fees that are charged against assets in the Vault.
     * - MUST NOT revert.
     */
    function totalAssets() public view override returns (uint256) {
        return DEX_WALLET_BALANCE;
    }

    /**
     * @dev Updates the current epoch timestamp and increments CURRENT_EPOCH if necessary
     * @dev Called by TRANSFER_BOT_ROLE only
     * @return The starting timestamp of the next epoch
     */
    function CurrentEpoch()
        public
        onlyRole(TRANSFER_BOT_ROLE)
        returns (uint256)
    {
        return NextEpoch() - EPOCH_DURATION;
    }

    /**
     * @dev Returns the starting timestamp of the current epoch
     * @notice Calculates the current epoch by subtracting one epoch duration from the next epoch's start time
     * @return uint256 The starting timestamp of the current epoch
     */
    function getCurrentEpoch() public view returns (uint256) {
        return getNextEpoch() - EPOCH_DURATION;
    }

    /**
     * @dev Calculates and returns the starting timestamp of the next epoch
     * @notice This function adds one epoch duration to the current epoch's start time
     * @return uint256 The starting timestamp of the next epoch
     */
    function getNextEpoch() public view returns (uint256) {
        return EPOCH_START + (EPOCH_DURATION * (CURRENT_EPOCH + 1));
    }

    /**
     * @dev Converts Vault shares to underlying assets.
     * @dev Uses different calculation methods based on current epoch:
     *      - For epoch 0: Simple conversion based on decimals.
     *      - For later epochs: Uses UpdateVaultPriceToken for dynamic pricing.
     * @param _shares Amount of Vault shares to convert to assets.
     * @return _assets Amount of underlying assets that can be withdrawn.
     */
    function convertToAssets(
        uint256 _shares
    ) public view override returns (uint256 _assets) {
        if (CURRENT_EPOCH == 0) {
            _assets = (_shares * 10 ** _asset.decimals()) / DECIMAL_FACTOR;
        } else {
            _assets = _shares.mulDiv(
                Utils.UpdateVaultPriceToken(address(this), address(_asset)),
                DECIMAL_FACTOR,
                Math.Rounding.Ceil
            );
        }
    }

    /**
     * @dev Converts underlying assets to Vault shares.
     * @dev Uses different calculation methods based on current epoch:
     *      - For epoch 0: Simple conversion based on decimals.
     *      - For later epochs: Uses dynamic pricing from UpdateVaultPriceToken.
     * @dev Adjusts for potential rounding issues with stable coins.
     * @param _assets Amount of underlying assets to convert to shares.
     * @return _shares Amount of Vault shares equivalent to assets.
     */
    function convertToShares(
        uint256 _assets
    ) public view override returns (uint256 _shares) {
        // decimalsAdjust to fixed the rounding issue with stable coins
        uint256 decimalsAdjust = 10 ** (decimals() - _asset.decimals());
        if (CURRENT_EPOCH == 0) {
            _shares = (_assets * DECIMAL_FACTOR) / 10 ** _asset.decimals();
        } else {
            _shares =
                (_assets.mulDiv(
                    DECIMAL_FACTOR,
                    Utils.UpdateVaultPriceToken(address(this), address(_asset)),
                    Math.Rounding.Ceil
                ) / decimalsAdjust) *
                decimalsAdjust; // last part is to fixed the rounding issue with stable coins
        }
    }

    /**
     * @dev Checks for pending transactions in the Vault during maintenance periods
     * @dev Prevents additional transactions during epoch maintenance
     * @return bool True if there are pending transactions or a flag is set, false otherwise
     * @notice Combines maintenance status check with transaction amount and flag status
     */
    function isDexTxPending() public view returns (bool) {
        (bool isMant, ) = isMaintenance();
        return isMant && (netTransfer[CURRENT_EPOCH].amount > 0 || _tx);
    }

    /**
     * @dev Checks if an address has a pending deposit ready to be claimed
     * @param _claimer Address to check for claimable deposit status
     * @return bool True if the address has a pending deposit in 'Claimet' status, false otherwise
     * @notice This method is used to verify eligibility for claiming shares after a deposit
     */
    function isClaimerMint(address _claimer) public view returns (bool) {
        return DEPOSITS[_claimer].status == DataTypes.Status.Claimet;
    }

    /**
     * @dev Checks if an address has a pending withdrawal ready to be claimed
     * @param _claimer Address to check for claimable withdrawal status
     * @return bool True if the address has a pending withdrawal in 'Claimet' status, false otherwise
     * @notice This method is used to verify eligibility for claiming assets after a withdrawal request
     */
    function isClaimerWithdraw(address _claimer) public view returns (bool) {
        return WITHDRAWALS[_claimer].status == DataTypes.Status.Claimet;
    }

    /**
     * @dev Checks if a given wallet address is registered as a deposit wallet
     * @param _wallet Address to check
     * @return bool True if the wallet is registered as a deposit wallet, false otherwise
     * @notice Iterates through the depositWallets array to find a match
     */
    function isDepositWallet(address _wallet) public view returns (bool) {
        for (uint256 i; i < depositWallets.length; ) {
            if (depositWallets[i] == _wallet) {
                return true;
            }
            unchecked {
                ++i;
            }
        }
        return false;
    }

    /**
     * @dev Checks if a given wallet address is registered as a withdrawal wallet
     * @param _wallet Address to check
     * @return bool True if the wallet is registered as a withdrawal wallet, false otherwise
     * @notice Iterates through the withdrawWallets array to find a match
     */
    function isWithdrawWallet(address _wallet) public view returns (bool) {
        for (uint256 i; i < withdrawWallets.length; ) {
            if (withdrawWallets[i] == _wallet) {
                return true;
            }
            unchecked {
                ++i;
            }
        }
        return false;
    }

    /**
     * @dev Calculates the total amount of pending deposits in the current epoch
     * @dev Iterates through all deposit wallets, summing up 'Pending' deposits
     * @return _total The total amount of pending deposits in asset tokens
     * @notice This method is used to determine new deposits before finalizing the epoch
     */
    function newDeposits() public view returns (uint256 _total) {
        for (uint256 i; i < depositWallets.length; ) {
            DataTypes.Basics storage depositor = DEPOSITS[depositWallets[i]];
            if (depositor.status == DataTypes.Status.Pending) {
                _total += depositor.amountAssets;
            }
            unchecked {
                ++i;
            }
        }
    }

    /**
     * @dev Calculates the total amount of pending withdrawals in the current epoch
     * @dev Iterates through all withdrawal wallets, summing up 'PendingRedeem' and 'PendingWithdraw' amounts
     * @return _total The total amount of pending withdrawals in asset tokens
     * @notice This method is used to determine new withdrawals before finalizing the epoch
     */
    function newWithdrawals() public view returns (uint256 _total) {
        for (uint256 i; i < withdrawWallets.length; ) {
            DataTypes.Basics storage withdrawer = WITHDRAWALS[
                withdrawWallets[i]
            ];
            if (
                (withdrawer.status == DataTypes.Status.PendingRedeem) ||
                (withdrawer.status == DataTypes.Status.PendingWithdraw)
            ) {
                _total += withdrawer.amountAssets;
            }
            unchecked {
                ++i;
            }
        }
    }

    /**
     * @dev Returns the address of the underlying asset used by the Vault.
     * @dev This method implements the IERC4262-asset interface.
     * @dev The underlying asset is stored in the private _asset variable.
     * @return address The address of the ERC20 token used as the Vault's underlying asset.
     */
    function asset() public view virtual override returns (address) {
        return address(_asset);
    }

    /**
     * @dev Previews the number of Vault shares to be minted for a given asset deposit
     * @dev This function directly converts assets to shares using the current conversion rate
     * @dev Note: The actual minted shares may differ after epoch finalization due to price changes
     * @param _assets Amount of underlying tokens to deposit
     * @return Amount of Vault shares that would be minted for the given asset amount
     */
    function previewDeposit(uint256 _assets) public view returns (uint256) {
        return convertToShares(_assets);
    }

    /**
     * @dev Previews the amount of underlying assets needed to mint a given number of Vault shares
     * @dev Converts shares to assets using the current conversion rate
     * @dev Note: The actual implementation, not using this method, may differ after epoch finalization due to price changes
     * @param shares Amount of Vault shares to mint
     * @return Amount of underlying tokens required to mint the given shares
     */
    function previewMint(uint256 shares) public view returns (uint256) {}

    /**
     * @dev Previews the number of shares that would be burned for a given asset withdrawal
     * @dev Converts assets to shares and adds 1 if there's a rounding discrepancy
     * @param assets Amount of underlying tokens to withdraw
     * @return Number of Vault shares that would be burned for the given asset amount
     * @notice This method accounts for potential rounding issues to ensure full asset withdrawal
     */
    function previewWithdraw(uint256 assets) public view returns (uint256) {
        uint256 shares = convertToShares(assets);
        return shares + (convertToAssets(shares) < assets ? 1 : 0);
    }

    /**
     * @dev Previews the amount of underlying assets that would be received for redeeming a given number of shares
     * @param shares The number of shares to be redeemed
     * @return The amount of underlying assets that would be received
     * @notice This method uses the current conversion rate and does not account for potential price changes during epoch finalization
     */
    function previewRedeem(uint256 shares) public view returns (uint256) {
        return convertToAssets(shares);
    }

    /**
     * @dev Returns the maximum amount of assets that can be deposited for a given address
     * @return The maximum deposit amount, which is the MAX_DEPOSIT constant
     * @notice This method implements the IERC4262-maxDeposit interface
     */
    function maxDeposit(address) public view override returns (uint256) {
        return MAX_DEPOSIT;
    }

    /**
     * @dev Sets minimum and maximum deposit limits, and maximum total supply for the vault
     * @param _initialValue Array containing [MIN_DEPOSIT, MAX_DEPOSIT, MAX_TOTAL_DEPOSIT]
     * @notice This function can only be called by the owner
     * @notice Updates critical vault parameters that affect deposit restrictions
     */
    function setInitialValue(
        uint256[3] memory _initialValue
    ) external onlyOwner {
        MIN_DEPOSIT = _initialValue[0];
        MAX_DEPOSIT = _initialValue[1];
        MAX_TOTAL_DEPOSIT = _initialValue[2];
    }

    /**
     * @dev Returns the maximum amount of shares that can be minted for a given address
     * @return The maximum number of shares that can be minted, which is effectively unlimited
     * @dev Note: The actual implementation, not using this method, may differ after epoch finalization due to price changes
     * @notice This method implements the IERC4626-maxMint interface
     * @notice In this implementation, there's no specific limit on minting, so it returns the maximum uint256 value
     */
    function maxMint(address) public pure virtual returns (uint256) {}

    /**
     * @dev Returns the maximum amount of assets that can be withdrawn by the specified owner
     * @param _owner The address of the account to check
     * @return The maximum withdrawable amount in underlying assets
     * @notice Converts the owner's entire balance to assets using the current conversion rate
     * @notice This amount may change after epoch finalization due to price fluctuations
     */
    function maxWithdraw(address _owner) public view returns (uint256) {
        return convertToAssets(balanceOf(_owner));
    }

    /**
     * @dev Returns the maximum amount of shares that can be redeemed by the specified owner
     * @param _owner The address of the account to check
     * @return The maximum redeemable amount in shares
     * @notice This method returns the entire balance of the owner
     * @notice Implements the IERC4626-maxRedeem interface
     * @notice Unlike maxWithdraw, this returns shares directly without conversion to assets
     */
    function maxRedeem(address _owner) public view returns (uint256) {
        return balanceOf(_owner);
    }

    /**
     * @dev Returns the number of decimals used for the vault's shares.
     * @notice This function overrides both ERC20Upgradeable and IERC20Metadata.
     * @return The number of decimals for the vault's shares, stored in _decimals.
     * @dev This value may differ from the underlying asset's decimals.
     */
    function decimals()
        public
        view
        override(ERC20Upgradeable, IERC20Metadata)
        returns (uint8)
    {
        return _decimals;
    }

    /**
     * @dev Checks if the vault is currently in maintenance mode
     * @notice Considers pre-start and post-start maintenance periods
     * @return A tuple containing:
     *         - bool: True if in maintenance, false otherwise
     *         - uint256: Time remaining in maintenance (in seconds), or 0 if not in maintenance
     */
    function isMaintenance() public view returns (bool, uint256) {
        if (
            (block.timestamp >
                (getNextEpoch() - MAINTENANCE_PERIOD_PRE_START)) ||
            (block.timestamp <
                (getCurrentEpoch() + MAINTENANCE_PERIOD_POST_START))
        ) {
            uint256 pending = block.timestamp >
                (getNextEpoch() - MAINTENANCE_PERIOD_PRE_START)
                ? block.timestamp -
                    (getNextEpoch() - MAINTENANCE_PERIOD_PRE_START)
                : block.timestamp <
                    (getCurrentEpoch() + MAINTENANCE_PERIOD_POST_START)
                ? (getCurrentEpoch() + MAINTENANCE_PERIOD_POST_START) -
                    block.timestamp
                : 0;
            return (true, pending);
        }
        return (false, 0);
    }

    /**
     * @dev Updates the Next Epoch's starting timestamp
     * @notice Increments CURRENT_EPOCH if the current timestamp has passed the next epoch's start time
     * @return The starting timestamp of the next epoch
     * @dev This function is crucial for maintaining the vault's epoch-based timing mechanism
     */
    function NextEpoch() private returns (uint256) {
        if (
            block.timestamp >
            EPOCH_START + (EPOCH_DURATION * (CURRENT_EPOCH + 1))
        ) {
            ++CURRENT_EPOCH;
        }
        return EPOCH_START + (EPOCH_DURATION * (CURRENT_EPOCH + 1));
    }

    /**
     * @dev Adds or updates a deposit entry for a wallet
     * @param _wallet Address of the depositor
     * @param _shares Amount of shares to be minted
     * @param _assets Amount of assets being deposited
     * @notice Updates depositWallets array and DEPOSITS mapping
     * @notice Sets deposit status to Pending and accumulates assets/shares
     * @notice Critical for maintaining accurate deposit records in the vault
     */
    function addDeposit(
        address _wallet,
        uint256 _shares,
        uint256 _assets
    ) private {
        DataTypes.Basics storage depositor = DEPOSITS[_wallet];
        if (!isDepositWallet(_wallet)) depositWallets.push(_wallet);
        if (DEPOSITS[_wallet].status == DataTypes.Status.Inactive) {
            DEPOSITS[_wallet] = DataTypes.Basics({
                status: DataTypes.Status.Pending,
                amountAssets: _assets,
                amountShares: _shares,
                finalAmount: uint256(0)
            });
        } else {
            depositor.status = DataTypes.Status.Pending;
            unchecked {
                depositor.amountAssets += _assets;
                depositor.amountShares += _shares;
            }
        }
    }

    /**
     * @dev Adds or updates a withdrawal entry for a wallet
     * @param _wallet Address of the withdrawer
     * @param _shares Amount of shares to be burned
     * @param _assets Amount of assets being withdrawn
     * @param _isWithdraw True if it's a withdrawal, false if it's a redemption
     * @notice Updates withdrawWallets array and WITHDRAWALS mapping
     * @notice Sets withdrawal status to PendingWithdraw or PendingRedeem
     * @notice Critical for maintaining accurate withdrawal records in the vault
     */
    function addWithdraw(
        address _wallet,
        uint256 _shares,
        uint256 _assets,
        bool _isWithdraw
    ) private {
        if (!isWithdrawWallet(_wallet)) withdrawWallets.push(_wallet);
        DataTypes.Basics storage withdrawer = WITHDRAWALS[_wallet];
        if (WITHDRAWALS[_wallet].status == DataTypes.Status.Inactive) {
            WITHDRAWALS[_wallet] = DataTypes.Basics({
                status: _isWithdraw
                    ? DataTypes.Status.PendingWithdraw
                    : DataTypes.Status.PendingRedeem,
                amountAssets: _assets,
                amountShares: _shares,
                finalAmount: uint256(0)
            });
        } else {
            withdrawer.status = _isWithdraw
                ? DataTypes.Status.PendingWithdraw
                : DataTypes.Status.PendingRedeem;
            unchecked {
                withdrawer.amountAssets += _assets;
                withdrawer.amountShares += _shares;
            }
        }
    }

    /**
     * @dev Updates the total supply of vault tokens for the current epoch
     * @notice This function is crucial for maintaining accurate token supply across epochs
     * @notice It handles potential issues from failed epoch finalizations
     * @notice Calculates new supply based on deposits, withdrawals, and previous epoch's supply
     * @notice Ensures non-negative supply by using conditional logic
     */
    function updateTotalSupply() private {
        if (CURRENT_EPOCH != 0) {
            // Partial fix if Finalize epoch fail in some point
            unchecked {
                if (CURRENT_EPOCH >= 1) {
                    if (TOTAL_VAULT_TOKEN_SUPPLY[CURRENT_EPOCH - 1] == 0) {
                        TOTAL_VAULT_TOKEN_SUPPLY[
                            CURRENT_EPOCH - 1
                        ] = totalSupply();
                    }
                }
            }
            // rewrite the total supply of the vault token to avoid underflow errors
            TOTAL_VAULT_TOKEN_SUPPLY[CURRENT_EPOCH] = TOTAL_VAULT_TOKEN_SUPPLY[
                CURRENT_EPOCH - 1
            ] +
                newShares() >
                newWithdrawalsShares()
                ? (TOTAL_VAULT_TOKEN_SUPPLY[CURRENT_EPOCH - 1] + newShares()) -
                    newWithdrawalsShares()
                : 0;
        } else {
            TOTAL_VAULT_TOKEN_SUPPLY[CURRENT_EPOCH] = newShares();
        }
    }

    /**
     * @dev Updates the net transfer balance for the current epoch
     * @notice Calculates the direction and amount of transfer between the vault and Vertex
     * @notice Handles initial deposits, fee calculations, and balance adjustments
     * @notice Critical for maintaining accurate asset allocation and fee distribution
     * @notice Sets the pending flag for transfer execution in dexTransfer function
     */
    function netTransferBalance() private {
        DataTypes.NetTransfer storage actualTx = netTransfer[CURRENT_EPOCH];
        actualTx.pending = true;
        if ((totalSupply() == 0) && (CURRENT_EPOCH == 0)) {
            actualTx.direction = true;
            actualTx.amount = newDeposits();
        } else if (!_tx) {
            actualTx.pending = false;
        } else {
            uint256 deposits = newDeposits();
            uint256 withdrawals = newWithdrawals();
            uint256 mgtFee = Utils.MgtFeePctVaultToken(address(this));
            uint256 perfFee = Utils.PerfFeePctVaultToken(
                address(this),
                address(_asset)
            );
            if (
                deposits >
                withdrawals +
                    (mgtFee + perfFee).mulDiv(
                        TOTAL_VAULT_TOKEN_SUPPLY[CURRENT_EPOCH - 1],
                        DECIMAL_FACTOR
                    )
            ) {
                actualTx.direction = true;
                actualTx.amount =
                    deposits -
                    withdrawals -
                    (mgtFee + perfFee).mulDiv(
                        TOTAL_VAULT_TOKEN_SUPPLY[CURRENT_EPOCH - 1],
                        DECIMAL_FACTOR
                    );
            } else {
                actualTx.direction = false;
                actualTx.amount =
                    withdrawals +
                    (mgtFee + perfFee).mulDiv(
                        TOTAL_VAULT_TOKEN_SUPPLY[CURRENT_EPOCH - 1],
                        DECIMAL_FACTOR
                    ) -
                    deposits;
            }
        }
    }

    /**
     * @dev Helper functions for calculating new shares and withdrawals
     * @notice These functions are crucial for maintaining accurate token supply
     * and managing deposit/withdrawal processes across epochs
     * @notice They iterate through all wallets to sum up pending transactions
     * @notice Used in updateTotalSupply and netTransferBalance functions
     */
    function newShares() private view returns (uint256 _total) {
        for (uint256 i; i < depositWallets.length; ) {
            DataTypes.Basics storage depositor = DEPOSITS[depositWallets[i]];
            if (depositor.status == DataTypes.Status.Pending) {
                _total += depositor.amountShares;
            }
            unchecked {
                ++i;
            }
        }
    }

    /**
     * @dev Calculates the total amount of new deposits for the current epoch
     * @notice Iterates through all deposit wallets, summing up 'Pending' deposits
     * @return _total The total amount of new deposits in shares
     * @notice This method is crucial for accurate token supply calculations and deposit management
     * @notice Used in updateTotalSupply and potentially in other supply-related functions
     */
    function newWithdrawalsShares() private view returns (uint256 _total) {
        for (uint256 i; i < withdrawWallets.length; ) {
            DataTypes.Basics storage withdrawer = WITHDRAWALS[
                withdrawWallets[i]
            ];
            if (
                (withdrawer.status == DataTypes.Status.PendingRedeem) ||
                (withdrawer.status == DataTypes.Status.PendingWithdraw)
            ) {
                _total += withdrawer.amountShares;
            }
            unchecked {
                ++i;
            }
        }
    }

    /**
     * @dev Checks if the vault is currently in maintenance mode
     * @notice Determines if the current time falls within pre-start or post-start maintenance periods
     * @notice Used to restrict certain operations during maintenance
     * @dev if in maintenance, reverts with VaultInMaintenance error
     * @dev Time remaining in maintenance (seconds), or 0 if not in maintenance
     */
    function _checkVaultInMaintenance() private view {
        bool maintenance = (block.timestamp >
            (getNextEpoch() - MAINTENANCE_PERIOD_PRE_START)) ||
            (block.timestamp <
                (getCurrentEpoch() + MAINTENANCE_PERIOD_POST_START));
        if (maintenance) {
            revert Errors.VaultInMaintenance();
        }
    }

    /**
     * @dev Checks if the vault is currently out of maintenance mode
     * @notice Verifies that the current time is outside both pre-start and post-start maintenance periods
     * @notice Used to ensure certain operations are only performed during active trading periods
     * @dev If not in maintenance, reverts with VaultOutMaintenance error
     * @notice Critical for maintaining the integrity of epoch-based operations and preventing unauthorized actions
     */
    function _checkVaultOutMaintenance() private view {
        bool maintenance = (block.timestamp >
            (getNextEpoch() - MAINTENANCE_PERIOD_PRE_START)) ||
            (block.timestamp <
                (getCurrentEpoch() + MAINTENANCE_PERIOD_POST_START));
        if (!maintenance) {
            revert Errors.VaultOutMaintenance();
        }
    }

    /**
     * @dev Checks if a withdrawal request exceeds the permitted limit
     * @param assets Amount of assets to be withdrawn
     * @notice Implements a time-based withdrawal limit to prevent large sudden outflows
     * @notice Calculates permitted withdrawal based on total assets, current withdrawals, and limit percentage
     * @notice Reverts if withdrawal amount exceeds the permitted amount during the limit period
     * @dev Critical for maintaining vault stability and protecting against potential attacks
     */
    function _checkLimit(uint256 assets) private view {
        uint256 amountBlock = totalAssets().mulDiv(
            (100 - limit.percentage),
            100,
            Math.Rounding.Ceil
        );
        uint256 permitWithdraw = totalAssets() - newWithdrawals() > amountBlock
            ? totalAssets() - newWithdrawals() - amountBlock
            : 0;
        if (block.timestamp <= limit.timestamp) {
            if (assets > permitWithdraw) {
                revert Errors.NotEnoughBalance(assets, permitWithdraw);
            }
        }
    }
}
