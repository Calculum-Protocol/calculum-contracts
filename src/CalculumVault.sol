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
 * @dev Calculum Vault
 * @dev Vault based on ERC-4626
 * @custom:a Calculum Developers Team
 */
/// @custom:oz-upgrades-unsafe-allow external-library-linking
contract CalculumVault is
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
    address payable private openZeppelinDefenderWallet;
    // Trader Bot Wallet in DEX
    address payable public traderBotWallet;
    // Address of Vertex Endpoint
    address private endpointVertex;
    // Treasury Wallet of Calculum
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
    uint256 public EPOCH_DURATION; // 604800 seconds = 1 week
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
    // mapping for whitelist of wallet to access the Vault
    mapping(address => bool) public whitelist;
    // limitter
    DataTypes.Limit public limit;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    // Modifier to check if the caller is whitelisted and is the owner
    // This is crucial for access control in deposit, withdraw, and other sensitive operations
    // It ensures that only authorized users can interact with their own funds in the vault
    modifier whitelisted(address caller, address _owner) {
        if (_owner != caller) {
            revert Errors.CallerIsNotOwner(caller, _owner);
        }
        if (whitelist[caller] == false) {
            revert Errors.NotWhitelisted(caller);
        }
        _;
    }

    /**
     * @dev Initializes the contract with provided parameters.
     * @param _name Name of the vault token.
     * @param _symbol Symbol of the vault token.
     * @param decimals_ Decimals for the vault token.
     * @param _initialAddress Array of initial addresses:
     *        [0]: Trader Bot Wallet
     *        [1]: Treasury Wallet
     *        [2]: OpenZeppelin Defender Wallet
     *        [3]: Uniswap Router
     *        [4]: USDC Token Address
     *        [5]: Vertex Endpoint
     * @param _initialValue Array of initial values:
     *        [0]: Epoch start timestamp
     *        [1]: Minimum deposit amount
     *        [2]: Maximum deposit amount
     *        [3]: Maximum total supply value
     *        [4]: Minimum wallet balance USDC for Transfer Bot
     *        [5]: Target wallet balance USDC for Transfer Bot
     *        [6]: Minimum wallet balance ETH for Transfer Bot
     * @notice Sets up roles, initializes token parameters, and configures vault settings.
     * @notice Implements a limiter for withdrawals and sets initial epoch parameters.
     */
    function initialize(
        string memory _name,
        string memory _symbol,
        uint8 decimals_,
        address[6] memory _initialAddress, // 0: Trader Bot Wallet, 1: Treasury Wallet, 2: OpenZeppelin Defender Wallet, 3: Router Uniswap, 4: USDCToken Address, 5: Vertex Endpoint
        uint256[7] memory _initialValue // 0: Start timestamp, 1: Min Deposit, 2: Max Deposit, 3: Max Total Supply Value, 4: Min Wallet Balance USDC Transfer Bot, 5: Target Wallet Balance USDC Transfer Bot, 6: Min Wallet Balance ETH Transfer Bot
    ) public reinitializer(1) {
        if (
            !isContract(_initialAddress[3]) ||
            !isContract(_initialAddress[4]) ||
            !isContract(_initialAddress[5])
        ) revert Errors.AddressIsNotContract();
        __Ownable_init(_msgSender());
        __ReentrancyGuard_init();
        __AccessControl_init_unchained();
        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
        grantRole(TRANSFER_BOT_ROLE, _initialAddress[2]);
        grantRole(TRANSFER_BOT_ROLE, _msgSender());
        grantRole(TRADER_BOT_ROLE, _msgSender());
        grantRole(TRADER_BOT_ROLE, _initialAddress[0]);
        __ERC20_init(_name, _symbol);
        _asset = IERC20Metadata(_initialAddress[4]);
        _decimals = decimals_;
        router = IRouter(_initialAddress[3]);
        endpointVertex = _initialAddress[5];
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
        EPOCH_DURATION = 2 * 60 minutes; // 4 hours
        MAINTENANCE_PERIOD_PRE_START = 300 seconds; // 5 minutes
        MAINTENANCE_PERIOD_POST_START = 300 seconds; // 5 minutes
        CurrentEpoch();
        MANAGEMENT_FEE_PERCENTAGE = 1 ether / 100; // Represent 1% Maintenance Fee Annually
        PERFORMANCE_FEE_PERCENTAGE = 0; // 15 ether / 100; // Represent 15% Performance Fee Annually
        DECIMAL_FACTOR = 10 ** decimals();

        // Set the Limitter
        limit = DataTypes.Limit({
            percentage: 30, // 30% of the total assets of the Vault can be withdrawn
            timestamp: block.timestamp + (52 weeks * 5) // 5 years
        });
    }

    /**
     * @notice Pauses all vault operations, triggering a stopped state
     * @dev Only callable by the contract owner
     * @dev This function is part of the emergency stop mechanism
     * @dev Integrates with OpenZeppelin's PausableUpgradeable contract
     */
    function pause() external whenNotPaused onlyOwner {
        _pause();
    }

    /**
     * @notice Unpauses the contract, allowing normal operations to resume
     * @dev Only callable by the contract owner when the contract is paused
     * @dev Resumes all vault operations, including deposits, withdrawals, and epoch transitions
     * @dev Does not reset any state variables or epoch counters
     * @dev Integrates with OpenZeppelin's PausableUpgradeable contract
     */
    function unpause() external whenPaused onlyOwner {
        _unpause();
    }

    /**
     * @dev Mints Vault shares to receiver by depositing exactly amount of underlying tokens.
     *
     * @notice This function is part of the ERC4626 standard implementation.
     * @notice It includes additional checks for whitelist, maintenance periods, and deposit limits.
     *
     * @dev Implements the following key features:
     * - Whitelisted access control
     * - Deposit amount validation (min/max limits)
     * - Total supply limit check
     * - Pending claim status verification
     *
     * @dev Important contract states affected:
     * - Updates deposit mapping
     * - Transfers assets from user to vault
     * - Sets transaction flag for Vertex integration
     *
     * @dev MUST emit the PendingDeposit event instead of Deposit.
     * @dev Actual minting of shares occurs in the claimShares function.
     *
     * @param _assets The amount of underlying tokens to deposit
     * @param _receiver The address to receive the minted vault shares
     * @return The amount of vault shares to be minted (claimable)
     */
    function deposit(
        uint256 _assets,
        address _receiver
    )
        external
        override
        whitelisted(_msgSender(), _receiver)
        whenNotPaused
        nonReentrant
        returns (uint256)
    {
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
     * @dev Mints exact Vault shares to receiver by depositing specified amount of underlying tokens.
     *
     * @notice This function is part of the ERC4626 standard implementation.
     * @notice It includes additional checks for whitelist, maintenance periods, and deposit limits.
     *
     * @dev Key features:
     * - Whitelisted access control
     * - Deposit amount validation (min/max limits)
     * - Total supply limit check
     * - Pending claim status verification
     *
     * @dev Important contract states affected:
     * - Updates deposit mapping
     * - Transfers assets from user to vault
     * - Sets transaction flag for Vertex integration
     *
     * @dev MUST emit the Deposit event.
     * @dev MUST revert if shares cannot be minted due to limits, slippage, or insufficient approval.
     *
     * @param _shares The amount of vault shares to mint
     * @param _receiver The address to receive the minted vault shares
     * @return The amount of assets deposited
     */
    function mint(
        uint256 _shares,
        address _receiver
    ) external returns (uint256) {}

    /**
     * @dev Burns shares from owner and sends exactly assets of underlying tokens to receiver.
     *
     * This function is part of the ERC4626 standard implementation and includes additional
     * checks for whitelist, maintenance periods, and withdrawal limits.
     *
     * Key features:
     * - Whitelisted access control
     * - Withdrawal amount validation
     * - Pending claim status verification
     * - Withdrawal limit checks
     *
     * Important contract states affected:
     * - Updates withdrawal mapping
     * - Sets transaction flag for Vertex integration
     *
     * @dev MUST emit the PendingWithdraw event instead of Withdraw.
     * @dev Actual transfer of assets occurs in the claimAssets function.
     * @dev MUST revert if assets cannot be withdrawn due to limits, slippage, or insufficient balance.
     * @param _assets The amount of underlying tokens to withdraw
     * @param _receiver The address to receive the withdrawn assets
     * @param _owner The address of the owner of the shares to burn
     *
     * Note: This implementation requires pre-requesting to the Vault before a withdrawal can be performed.
     */
    function withdraw(
        uint256 _assets,
        address _receiver,
        address _owner
    )
        external
        override
        whitelisted(_msgSender(), _owner)
        whenNotPaused
        nonReentrant
        returns (uint256)
    {
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
     *
     * This function is part of the ERC4626 standard implementation and includes additional
     * checks for whitelist, maintenance periods, and withdrawal limits.
     *
     * Key features:
     * - Whitelisted access control
     * - Withdrawal amount validation
     * - Pending claim status verification
     * - Withdrawal limit checks
     *
     * Important contract states affected:
     * - Updates withdrawal mapping
     * - Sets transaction flag for Vertex integration
     *
     * @dev MUST emit the PendingWithdraw event instead of Withdraw.
     * @dev Actual transfer of assets occurs in the claimAssets function.
     * @dev MUST revert if shares cannot be redeemed due to limits, slippage, or insufficient balance.
     * @param _shares The amount of vault shares to burn
     * @param _receiver The address to receive the withdrawn assets
     * @param _owner The address of the owner of the shares to burn
     *
     * Note: This implementation requires pre-requesting to the Vault before a withdrawal can be performed.
     */
    function redeem(
        uint256 _shares,
        address _receiver,
        address _owner
    )
        external
        override
        whitelisted(_msgSender(), _owner)
        whenNotPaused
        nonReentrant
        returns (uint256)
    {
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
     * @dev Method to claim and mint shares of the Vault for a depositor
     * @param _owner Address of the owner claiming the shares
     * @notice This function is part of the two-step deposit process:
     *         1. User deposits assets (deposit function)
     *         2. User claims shares (this function)
     * @notice Only callable during non-maintenance periods
     * @notice Requires the caller to be whitelisted and the owner of the deposit
     * @notice Updates the Vertex integration flag
     * @notice Emits a Deposit event upon successful minting
     */
    function claimShares(
        address _owner
    ) external whitelisted(_msgSender(), _owner) nonReentrant {
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
     * @dev Method to claim assets from the vault (redeem)
     * @notice This function is part of the two-step withdrawal process:
     *         1. User requests withdrawal (withdraw or redeem function)
     *         2. User claims assets (this function)
     * @notice Only callable during non-maintenance periods
     * @notice Requires the caller to be whitelisted and the owner of the withdrawal
     * @notice Burns shares and transfers assets to the receiver
     * @notice Updates the Vertex integration flag
     * @param _receiver Address to receive the withdrawn assets
     * @param _owner Owner of the vault assets to be claimed
     */
    function claimAssets(
        address _receiver,
        address _owner
    ) external whitelisted(_msgSender(), _owner) nonReentrant {
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
     * @dev Emergency rescue method to withdraw all assets from Vertex and transfer to the contract owner
     * @notice This function can only be called when the contract is paused and by the owner
     * @notice It transfers both ERC20 assets and ETH balance to the owner
     * @notice Emits a Rescued event with details of the transferred amounts
     * @notice This is a last resort function and should be used with extreme caution
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
     * @dev Previews the rescue operation for assets in Vertex
     * @notice Simulates withdrawal of all assets from Vertex without executing the transfer
     * @notice This is an offchain operation and does not affect the contract state
     * @notice Only callable when the contract is paused and by the owner
     * @notice Utilizes the DexWalletBalance function to update the DEX_WALLET_BALANCE
     * @notice Interacts with Vertex through the Utils library
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
     * @dev Updates the epoch duration and maintenance times
     * @notice Recalculates the epoch start to avoid conflicts with the current epoch
     * @notice Only callable by the contract owner during non-maintenance periods
     * @param _epochDuration New epoch duration (between 1 minute and 12 weeks)
     * @param _maintTimeBefore New maintenance time before epoch start
     * @param _maintTimeAfter New maintenance time after epoch end
     * @dev Emits an EpochChanged event with old and new values
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
     * @dev Finalizes the current epoch, updates critical parameters, and prepares for the next epoch
     * @notice This function is a core part of the vault's cycle, handling:
     * - DEX wallet balance updates
     * - Vault token price calculations
     * - Deposit and withdrawal processing
     * - Total supply updates
     * - Net transfer balance calculations
     * @notice Only callable by addresses with TRANSFER_BOT_ROLE
     * @notice Must be called outside of maintenance periods
     */
    function finalizeEpoch() external onlyRole(TRANSFER_BOT_ROLE) {
        /// Follow the Initial Vault Mechanics Define by Simplified Implementation
        _checkVaultOutMaintenance();
        DexWalletBalance();
        // Partial fix if Finalize epoch fail in some point
        unchecked {
            if (CURRENT_EPOCH >= 2) {
                if (VAULT_TOKEN_PRICE[CURRENT_EPOCH - 1] == 0) {
                    VAULT_TOKEN_PRICE[CURRENT_EPOCH - 1] = VAULT_TOKEN_PRICE[
                        CURRENT_EPOCH - 2
                    ];
                }
            }
        }
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
        _swapDAforETH();
    }

    /**
     * @dev Executes transfers to and from the DEX (Vertex) in a two-stage process
     * @param kind Boolean flag to control the stage of the process
     * @notice When kind is true, it initiates the first stage:
     *         - For deposits: Transfers assets to Vertex and links the signer if necessary
     *         - For withdrawals: Initiates the withdrawal from Vertex
     * @notice When kind is false, it executes the second stage:
     *         - Transfers gas reserve to the OpenZeppelin Defender wallet if needed
     *         - Emits a DexTransfer event
     * @notice This two-stage process is necessary due to Vertex's off-chain nature
     * @notice For withdrawals, a minimum 4-minute wait is required between stages
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
     * @dev Executes the transfer of management and performance fees to the treasury wallet
     * @notice Must be called outside of maintenance periods by an address with TRANSFER_BOT_ROLE
     * @notice Calculates fees based on the current epoch and total vault token supply
     * @notice Updates the current epoch and resets the transaction flag
     * @notice Emits a FeesTransfer event with detailed fee information
     */
    function feesTransfer() external onlyRole(TRANSFER_BOT_ROLE) nonReentrant {
        _checkVaultOutMaintenance();
        if (CURRENT_EPOCH == 0) {
            revert Errors.FirstEpochNoFeeTransfer();
        }
        uint256 mgtFeePct = Utils.MgtFeePctVaultToken(address(this));
        uint256 perfFeePct = _tx
            ? Utils.PerfFeePctVaultToken(address(this), address(_asset))
            : 0;
        uint256 totalFees = Utils.getPnLPerVaultToken(
            address(this),
            address(_asset)
        )
            ? (mgtFeePct + perfFeePct).mulDiv(
                TOTAL_VAULT_TOKEN_SUPPLY[CURRENT_EPOCH - 1],
                DECIMAL_FACTOR
            )
            : mgtFeePct.mulDiv(
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
        emit FeesTransfer(
            CURRENT_EPOCH,
            restEvent,
            mgtFeePct,
            perfFeePct,
            totalFees
        );
        // Update Current Epoch
        DexWalletBalance();
        CurrentEpoch();
    }

    /**
     * @dev Function to add or remove a wallet from the whitelist
     * @notice This function is crucial for access control, allowing only whitelisted addresses to interact with the vault
     * @param _wallet Address to be added or removed from the whitelist
     * @param status Boolean indicating whether to add (true) or remove (false) the wallet from the whitelist
     * @notice Only callable by the contract owner, as it's a sensitive operation affecting user access
     */
    function addDropWhitelist(address _wallet, bool status) external onlyOwner {
        whitelist[_wallet] = status;
    }

    /**
     * @dev Updates the TraderBot wallet address and links it to Vertex
     * @notice This function is crucial for maintaining the vault's trading capabilities
     * @param _traderBotWallet The new address for the TraderBot wallet
     * @notice Only callable by the contract owner
     * @notice Emits a TraderBotWalletUpdated event
     * @notice Interacts with Vertex to link the new signer
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
     * @dev Updates the treasury wallet address
     * @notice This function is crucial for managing the vault's fee distribution
     * @param _treasuryWallet The new address for the treasury wallet
     * @notice Only callable by the contract owner
     * @notice Emits a TreasuryWalletUpdated event
     * @notice Affects fee collection and distribution processes
     */
    function setTreasuryWallet(address _treasuryWallet) external onlyOwner {
        treasuryWallet = payable(_treasuryWallet);
        emit TreasuryWalletUpdated(_treasuryWallet);
    }

    /**
     * @dev Updates the OpenZeppelin Defender wallet address
     * @notice This function is crucial for managing automated transactions and gas costs
     * @param _opzWallet The new address for the OpenZeppelin Defender wallet
     * @notice Only callable by the contract owner
     * @notice Emits an OPZWalletUpdated event
     * @notice Affects gas management and automated transaction processes
     */
    function setOPZWallet(address _opzWallet) external onlyOwner {
        openZeppelinDefenderWallet = payable(_opzWallet);
        emit OPZWalletUpdated(_opzWallet);
    }

    /**
     * @dev Updates deposit limits and maximum total supply of the vault
     * @notice This function is crucial for managing the vault's capacity and individual deposit sizes
     * @param _initialValue An array containing [MIN_DEPOSIT, MAX_DEPOSIT, MAX_TOTAL_DEPOSIT]
     * @notice Only callable by the contract owner
     * @notice Affects deposit validation in the deposit function
     * @notice Critical for maintaining the vault's economic balance and risk management
     */
    function setInitialValue(
        uint256[3] memory _initialValue
    ) external onlyOwner {
        MIN_DEPOSIT = _initialValue[0];
        MAX_DEPOSIT = _initialValue[1];
        MAX_TOTAL_DEPOSIT = _initialValue[2];
    }

    /**
     * @dev Sets a withdrawal limit for the vault until a specified timestamp
     * @notice This function is crucial for risk management and liquidity control
     * @param pct Percentage of total assets that can be withdrawn (0-100)
     * @param timestamp Unix timestamp until which the limit is active
     * @notice Only callable by addresses with TRADER_BOT_ROLE
     * @notice Affects the _checkLimit function in withdraw and redeem operations
     */
    function setLimitter(
        uint8 pct,
        uint256 timestamp
    ) external onlyRole(TRADER_BOT_ROLE) {
        if (pct <= 0) revert Errors.InvalidValue();
        if (pct > 100) revert Errors.InvalidValue();
        if (timestamp <= block.timestamp) revert Errors.InvalidValue();
        if (timestamp >= getNextEpoch()) revert Errors.InvalidValue();
        limit.percentage = pct;
        limit.timestamp = timestamp;
    }

    /**
     * @dev Updates the DEX_WALLET_BALANCE with the current balance of the TraderBot wallet in Vertex
     * @notice This function is crucial for maintaining accurate asset valuation in the vault
     * @notice For the initial epoch, it uses newDeposits(); otherwise, it fetches the balance from Vertex
     * @notice The balance is adjusted to match the decimals of the vault's asset
     * @notice This function is called in critical operations like finalizeEpoch and affects totalAssets calculations
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
     * @dev Returns the total amount of the underlying asset managed by the Vault.
     * @notice This function is critical for accurate asset valuation and share calculation.
     * @notice It reflects the real-time value of assets in the TraderBot during trading periods.
     * @notice The returned value:
     * - Includes any yield from compounding.
     * - Accounts for all fees charged against Vault assets.
     * - Is used to determine the number of shares to mint/burn in deposit/withdraw operations.
     * @return The total asset value, which is equal to DEX_WALLET_BALANCE.
     */
    function totalAssets() public view override returns (uint256) {
        return DEX_WALLET_BALANCE;
    }

    /**
     * @dev Updates the current epoch and returns its starting timestamp
     * @notice This function is crucial for the vault's epoch-based operations
     * @notice It increments the CURRENT_EPOCH if the current time has passed the next epoch start
     * @notice Only callable by addresses with TRANSFER_BOT_ROLE
     * @return The starting timestamp of the current epoch
     */
    function CurrentEpoch()
        public
        onlyRole(TRANSFER_BOT_ROLE)
        returns (uint256)
    {
        return NextEpoch() - EPOCH_DURATION;
    }

    /**
     * @dev Calculates and returns the current epoch number and its start timestamp
     * @notice This function is crucial for epoch-based operations in the vault
     * @notice It calculates the current epoch based on the elapsed time since EPOCH_START
     * @notice Unlike CurrentEpoch, this function is view-only and doesn't update state
     * @return The starting timestamp of the current epoch
     */
    function getCurrentEpoch() public view returns (uint256) {
        return getNextEpoch() - EPOCH_DURATION;
    }

    /**
     * @dev Calculates and returns the start timestamp of the next epoch
     * @notice Essential for determining epoch transitions and maintenance periods
     * @notice Uses EPOCH_START, EPOCH_DURATION, and CURRENT_EPOCH to calculate
     * @return The starting timestamp of the next epoch
     */
    function getNextEpoch() public view returns (uint256) {
        return EPOCH_START + (EPOCH_DURATION * (CURRENT_EPOCH + 1));
    }

    /**
     * @dev Converts a given number of shares to the equivalent amount of assets
     * @notice This function is crucial for accurate valuation of user positions
     * @notice For the initial epoch, uses a 1:1 ratio; otherwise, calculates based on current vault token price
     * @notice Implements the IERC4626-convertToAssets standard
     * @param _shares The number of shares to convert
     * @return _assets The equivalent amount of underlying assets
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
     * @dev Converts a given number of shares to the equivalent amount of assets
     * @notice This function is crucial for accurate valuation of user positions
     * @notice Implements the IERC4626-convertToShares standard
     * @notice Adjusts for potential decimal differences between share and asset tokens
     * @param _assets The number of assets to convert
     * @return _shares The equivalent number of vault shares
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
     * @dev Checks if there's a pending DEX transaction in the current epoch
     * @notice This function is crucial for maintaining the integrity of the vault's transaction flow
     * @notice It considers both maintenance periods and pending transactions
     * @return True if there's a pending transaction or the vault is in maintenance, false otherwise
     */
    function isDexTxPending() public view returns (bool) {
        (bool isMant, ) = isMaintenance();
        return isMant && (netTransfer[CURRENT_EPOCH].amount > 0 || _tx);
    }

    /**
     * @dev Checks if the given address has a pending deposit claim.
     * @param _claimer The address to check.
     * @return True if the address has a pending deposit claim, false otherwise.
     */
    function isClaimerMint(address _claimer) public view returns (bool) {
        return DEPOSITS[_claimer].status == DataTypes.Status.Claimet;
    }

    /**
     * @dev Checks if the caller has a pending withdrawal claim.
     * @param _claimer The address to check.
     * @return True if the caller has a pending withdrawal claim, false otherwise.
     */
    function isClaimerWithdraw(address _claimer) public view returns (bool) {
        return WITHDRAWALS[_claimer].status == DataTypes.Status.Claimet;
    }

    /**
     * @dev Checks if a given address is in the list of deposit wallets.
     * @param _wallet The address to check.
     * @return True if the address is in the deposit wallets list, false otherwise.
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
     * @dev Checks if a given address is in the list of withdrawal wallets.
     * @param _wallet The address to check.
     * @return True if the address is in the withdrawal wallets list, false otherwise.
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
     * @dev Calculates the total amount of assets pending deposit.
     * @notice Iterates through all deposit wallets to sum up assets in Pending status.
     * @return _total The total amount of assets pending deposit.
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
     * @dev Calculates the total amount of shares pending deposit.
     * @notice Iterates through all deposit wallets to sum up shares in Pending status.
     * @return _total The total amount of shares pending deposit.
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
     * @dev Calculates the total amount of assets pending withdrawal.
     * @notice Iterates through all withdrawal wallets to sum up assets in PendingRedeem or PendingWithdraw status.
     * @return _total The total amount of assets pending withdrawal.
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
     * @dev Returns the address of the underlying asset.
     * @notice Implements the IERC4626 standard.
     */
    function asset() public view virtual override returns (address) {
        return address(_asset);
    }

    /**
     * @dev Converts a given amount of assets to the equivalent amount of shares.
     * @notice Implements the IERC4626 standard for previewing share amounts.
     * @param _assets The amount of assets to convert.
     * @return The equivalent amount of shares.
     */
    function previewDeposit(uint256 _assets) public view returns (uint256) {
        return convertToShares(_assets);
    }

    /**
     * @dev Previews the amount of assets required to mint a given number of shares.
     * @notice NOTE: This function mint is not implemented in the base contract.
     */
    function previewMint(uint256 shares) public view returns (uint256) {}

    /**
     * @dev Previews the amount of shares needed to withdraw a given amount of assets.
     * @notice Converts the specified asset amount to shares and adjusts for rounding errors.
     * @param assets The amount of assets to withdraw.
     * @return The equivalent amount of shares required for the withdrawal.
     */
    function previewWithdraw(uint256 assets) public view returns (uint256) {
        uint256 shares = convertToShares(assets);
        return shares + (convertToAssets(shares) < assets ? 1 : 0);
    }

    /**
     * @dev Converts a given amount of shares to the equivalent amount of assets.
     * @notice Implements the IERC4626 standard for previewing asset amounts.
     * @param shares The number of shares to convert.
     * @return The equivalent amount of underlying assets.
     */
    function previewRedeem(uint256 shares) public view returns (uint256) {
        return convertToAssets(shares);
    }

    /**
     * @dev Returns the maximum amount of assets that can be deposited by an address.
     * @notice This function is part of the ERC4626 standard.
     * @return The maximum deposit amount allowed.
     */
    function maxDeposit(address) public view override returns (uint256) {
        return MAX_DEPOSIT;
    }

    /**
     * @dev Returns the maximum amount of shares that can be minted.
     * @notice This function is part of the ERC4626 standard.
     * @notice NOTE: Take into account, the vault not implements the mint function.
     */
    function maxMint(address) public pure virtual returns (uint256) {}

    /**
     * @dev Returns the maximum amount of assets that can be withdrawn by the owner.
     * @param _owner The address of the owner whose assets are being queried.
     * @return The maximum amount of assets that can be withdrawn.
     */
    function maxWithdraw(address _owner) public view returns (uint256) {
        return convertToAssets(balanceOf(_owner));
    }

    /**
     * @dev Returns the maximum amount of shares that can be redeemed by the owner.
     * @param _owner The address of the owner whose shares are being queried.
     * @return The balance of shares owned by the specified address.
     */
    function maxRedeem(address _owner) public view returns (uint256) {
        return balanceOf(_owner);
    }

    /**
     * @dev Returns the number of decimals used to get its user representation.
     * @return The number of decimals for the vault token.
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
     * @dev Checks if the vault is in a maintenance period.
     * @return A tuple with a boolean indicating maintenance status and the remaining time until maintenance ends.
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
     * @dev Updates the starting timestamp for the next epoch.
     * @notice Increments the current epoch if the current time has passed the next epoch start.
     * @return The starting timestamp of the next epoch.
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
     * @dev Adds a deposit entry for a wallet.
     * @param _wallet Address of the wallet.
     * @param _shares Amount of shares to mint.
     * @param _assets Amount of assets to deposit.
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
     * @dev Adds a withdrawal request for a wallet, including assets and shares.
     * @param _wallet The address of the wallet making the withdrawal.
     * @param _shares The amount of shares to be withdrawn.
     * @param _assets The amount of assets to be withdrawn.
     * @param _isWithdraw Boolean indicating if it's a withdrawal (true) or redeem (false).
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
     * @dev Updates the total supply of vault tokens for the current epoch.
     * @notice Adjusts for new shares and withdrawals, ensuring no underflow.
     */
    function updateTotalSupply() private {
        if (CURRENT_EPOCH != 0) {
            // Fix for potential finalize epoch failure
            unchecked {
                if (CURRENT_EPOCH >= 2) {
                    if (TOTAL_VAULT_TOKEN_SUPPLY[CURRENT_EPOCH - 1] == 0) {
                        TOTAL_VAULT_TOKEN_SUPPLY[
                            CURRENT_EPOCH - 1
                        ] = TOTAL_VAULT_TOKEN_SUPPLY[CURRENT_EPOCH - 2];
                    }
                }
            }
            // Update total supply to avoid underflow errors
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
     * @dev Swaps USDC for ETH if the OpenZeppelin Defender wallet's ETH balance is below the minimum threshold.
     * @notice This function ensures the OpenZeppelin Defender wallet has enough ETH for gas fees.
     * @notice It checks if the USDC balance in the OpenZeppelin Defender wallet is above the minimum threshold before swapping.
     */
    function _swapDAforETH() private nonReentrant {
        if (
            (openZeppelinDefenderWallet.balance <
                MIN_WALLET_BALANCE_ETH_TRANSFER_BOT) &&
            (_asset.balanceOf(openZeppelinDefenderWallet) >
                MIN_WALLET_BALANCE_USDC_TRANSFER_BOT)
        ) {
            UniswapLibV3._swapTokensForETH(address(_asset), address(router));
        }
    }

    /**
     * @dev Calculates the net transfer balance for the current epoch.
     * @notice Determines whether to deposit or withdraw assets based on net deposits and withdrawals.
     * @notice Considers management and performance fees in the calculation.
     * @notice Sets the transaction direction and amount for the DEX transfer.
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
     * @dev Calculates the total shares pending withdrawal.
     * @notice Iterates through all withdrawal wallets to sum up shares in PendingRedeem or PendingWithdraw status.
     * @return _total The total amount of shares pending withdrawal.
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
     * @dev Ensures the vault is not in a maintenance period.
     * @notice This function checks if the current time falls within the maintenance periods.
     * @notice Maintenance periods are defined as the time before the start and after the end of each epoch.
     * @notice Reverts with an error if the vault is in maintenance.
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
     * @dev Checks if the vault is currently in a maintenance period.
     * @notice This function ensures that certain operations are only performed outside of maintenance periods.
     * @notice Maintenance periods occur before the start and after the end of each epoch.
     * @notice Reverts with an error if the vault is in maintenance.
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
     * @dev Checks if the vault is currently in a maintenance period.
     * @notice This function ensures that certain operations are only performed outside of maintenance periods.
     * @notice Maintenance periods occur before the start and after the end of each epoch.
     * @notice Reverts with an error if the vault is in maintenance.
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
            if (assets > permitWithdraw)
                revert Errors.NotEnoughBalance(assets, permitWithdraw);
        }
    }
}
