// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC4626} from "./lib/IERC4626.sol";
import {Events, SafeERC20, Claimable} from "./lib/Claimable.sol";
import "./lib/DataTypes.sol";
import "./lib/Errors.sol";
import {IRouter} from "./lib/IRouter.sol";
import "./lib/UniswapLibV3.sol";
import "./lib/Utils.sol";
import {ERC20Upgradeable} from
    "@openzeppelin-contracts-upgradeable/contracts/token/ERC20/ERC20Upgradeable.sol";
import {PausableUpgradeable} from
    "@openzeppelin-contracts-upgradeable/contracts/utils/PausableUpgradeable.sol";
import {AccessControlUpgradeable} from
    "@openzeppelin-contracts-upgradeable/contracts/access/AccessControlUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from
    "@openzeppelin-contracts-upgradeable/contracts/utils/ReentrancyGuardUpgradeable.sol";


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
    // ETH Gas Reserve in USDC in Transfer Bot
    uint256 public ETH_GAS_RESERVE_USDC_TRANSFER_BOT;
    // STABLECOIN Floor in USDC in Transfer Bot (TransferBotFloorWalletBalanceUSDC)
    uint256 public FLOOR_WALLET_BALANCE_USDC_TRANSFER_BOT;
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

    modifier whitelisted(address caller, address _owner) {
        if (_owner != caller) {
            revert Errors.CallerIsNotOwner(caller, _owner);
        }
        if (whitelist[caller] == false) {
            revert Errors.NotWhitelisted(caller);
        }
        _;
    }
    /// TODO: update address of OpenZeppelin Defender Wallet

    function initialize(
        string memory _name,
        string memory _symbol,
        uint8 decimals_,
        address[6] memory _initialAddress, // 0: Trader Bot Wallet, 1: Treasury Wallet, 2: OpenZeppelin Defender Wallet, 3: Router, 4: USDCToken Address, 5: Vertex Endpoint
        uint256[7] memory _initialValue // 0: Start timestamp, 1: Min Deposit, 2: Max Deposit, 3: Max Total Supply Value
    ) public reinitializer(1) {
        if (
            !isContract(_initialAddress[3]) || !isContract(_initialAddress[4])
                || !isContract(_initialAddress[5])
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
        FLOOR_WALLET_BALANCE_USDC_TRANSFER_BOT = 5000000; // 5$ USDC by default
        // EPOCH_DURATION = 1 weeks; // 604800 seconds = 1 week
        // MAINTENANCE_PERIOD_PRE_START = 60 minutes; // 60 minutes
        // MAINTENANCE_PERIOD_POST_START = 30 minutes; // 30 minutes
        EPOCH_DURATION = 60 minutes; // 60 minutes
        MAINTENANCE_PERIOD_PRE_START = 300 seconds; // 5 minutes
        MAINTENANCE_PERIOD_POST_START = 300 seconds; // 5 minutes
        CurrentEpoch();
        MANAGEMENT_FEE_PERCENTAGE = 1 ether / 100; // Represent 1%
        PERFORMANCE_FEE_PERCENTAGE = 15 ether / 100; // Represent 15%
        DECIMAL_FACTOR = 10 ** decimals();
    }

    /**
     * @notice called by the admin to pause, triggers stopped state
     * @dev Callable by admin or operator
     */
    function pause() external whenNotPaused onlyOwner {
        _pause();
    }

    /**
     * @notice called by the admin to unpause, returns to normal state
     * Reset genesis state. Once paused, the rounds would need to be kickstarted by genesis
     */
    function unpause() external whenPaused onlyOwner {
        _unpause();
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
     * Method to Update Next Epoch starting timestamp
     */
    function NextEpoch() private returns (uint256) {
        if (block.timestamp > EPOCH_START + (EPOCH_DURATION * (CURRENT_EPOCH + 1))) {
            ++CURRENT_EPOCH;
        }
        return EPOCH_START + (EPOCH_DURATION * (CURRENT_EPOCH + 1));
    }

    /**
     * @dev Method to Update Current Epoch starting timestamp
     */
    function CurrentEpoch() public onlyRole(TRANSFER_BOT_ROLE) returns (uint256) {
        return NextEpoch() - EPOCH_DURATION;
    }

    function getCurrentEpoch() public view returns (uint256) {
        return getNextEpoch() - EPOCH_DURATION;
    }

    function getNextEpoch() public view returns (uint256) {
        return EPOCH_START + (EPOCH_DURATION * (CURRENT_EPOCH + 1));
    }

    /**
     * @dev Mints Vault shares to receiver by depositing exactly amount of underlying tokens.
     *
     * - MUST emit the Deposit event.
     * - MAY support an additional flow in which the underlying tokens are owned by the Vault contract before the
     *   deposit execution, and are accounted for during deposit.
     * - MUST revert if all of assets cannot be deposited (due to deposit limit being reached, slippage, the user not
     *   approving enough underlying tokens to the Vault contract, etc).
     *
     * NOTE: most implementations will require pre-approval of the Vault with the Vault’s underlying asset token.
     */
    function deposit(uint256 _assets, address _receiver)
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
            revert Errors.CallerIsNotOwnerOrReceiver(caller, _receiver, _receiver);
        }
        if (_assets < MIN_DEPOSIT) {
            revert Errors.DepositAmountTooLow(_receiver, _assets);
        }
        if (_assets > (MAX_DEPOSIT - (depositor.finalAmount + depositor.amountAssets))) {
            // Verify the maximun value per user
            revert Errors.DepositExceededMax(
                _receiver, MAX_DEPOSIT - (depositor.finalAmount + depositor.amountAssets)
            );
        }
        if ((totalAssets() + _assets) > MAX_TOTAL_DEPOSIT) {
            revert Errors.DepositExceedTotalVaultMax(
                _receiver, totalAssets() + _assets, MAX_TOTAL_DEPOSIT
            );
        }
        if (
            depositor.status == DataTypes.Status.Claimet
                || depositor.status == DataTypes.Status.Pending
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
     *
     * - MUST emit the Deposit event.
     * - MAY support an additional flow in which the underlying tokens are owned by the Vault contract before the mint
     *   execution, and are accounted for during mint.
     * - MUST revert if all of shares cannot be minted (due to deposit limit being reached, slippage, the user not
     *   approving enough underlying tokens to the Vault contract, etc).
     *
     * NOTE: most implementations will require pre-approval of the Vault with the Vault’s underlying asset token.
     */
    // function mint(
    //     uint256 _shares,
    //     address _receiver
    // ) external override returns (uint256) {}

    /**
     * @dev Burns shares from owner and sends exactly assets of underlying tokens to receiver.
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
    function withdraw(uint256 _assets, address _receiver, address _owner)
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
            withdrawer.status == DataTypes.Status.Claimet
                || withdrawer.status == DataTypes.Status.PendingRedeem
                || withdrawer.status == DataTypes.Status.PendingWithdraw
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
     * - MUST emit the Withdraw event.
     * - MAY support an additional flow in which the underlying tokens are owned by the Vault contract before the
     *   redeem execution, and are accounted for during redeem.
     * - MUST revert if all of shares cannot be redeemed (due to withdrawal limit being reached, slippage, the owner
     *   not having enough shares, etc).
     *
     * NOTE: some implementations will require pre-requesting to the Vault before a withdrawal may be performed.
     * Those methods should be performed separately.
     */
    function redeem(uint256 _shares, address _receiver, address _owner)
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
            withdrawer.status == DataTypes.Status.Claimet
                || withdrawer.status == DataTypes.Status.PendingRedeem
                || withdrawer.status == DataTypes.Status.PendingWithdraw
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
     * @dev Add deposit wallet, assets and shares
     * @param _wallet address of the wallet
     * @param _shares amount of shares to add for minting
     * @param _assets amount of assets the deposit
     */
    // Add Epoch Time
    function addDeposit(address _wallet, uint256 _shares, uint256 _assets) private {
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
     * @dev Add withdraws wallet, assets and shares
     * @param _wallet address of the wallet
     * @param _shares amount of shares to add for minting
     * @param _assets amount of assets the deposit
     */
    function addWithdraw(address _wallet, uint256 _shares, uint256 _assets, bool _isWithdraw)
        private
    {
        if (!isWithdrawWallet(_wallet)) withdrawWallets.push(_wallet);
        DataTypes.Basics storage withdrawer = WITHDRAWALS[_wallet];
        if (WITHDRAWALS[_wallet].status == DataTypes.Status.Inactive) {
            WITHDRAWALS[_wallet] = DataTypes.Basics({
                status: _isWithdraw ? DataTypes.Status.PendingWithdraw : DataTypes.Status.PendingRedeem,
                amountAssets: _assets,
                amountShares: _shares,
                finalAmount: uint256(0)
            });
        } else {
            withdrawer.status =
                _isWithdraw ? DataTypes.Status.PendingWithdraw : DataTypes.Status.PendingRedeem;
            unchecked {
                withdrawer.amountAssets += _assets;
                withdrawer.amountShares += _shares;
            }
        }
    }

    /**
     * @dev Method to Claim Shares of the Vault (Mint)
     * @param _owner Owner of the Vault Shares to be claimed
     */
    function claimShares(address _owner) external whitelisted(_msgSender(), _owner) nonReentrant {
        _checkVaultInMaintenance();
        address caller = _msgSender();
        DataTypes.Basics storage depositor = DEPOSITS[_owner];
        if (!isClaimerMint(_owner)) {
            revert Errors.CalletIsNotClaimerToDeposit(_owner);
        }
        _mint(_owner, depositor.amountShares);
        // flag to control the transfer to Vertex
        _tx = true;
        emit Deposit(caller, _owner, depositor.finalAmount, depositor.amountShares);
        delete depositor.amountShares;
        depositor.status = DataTypes.Status.Completed;
    }

    /**
     * @dev Method to Claim Assets of the Vault (Redeem)
     * @param _receiver address of the receiver wallet
     * @param _owner Owner of the Vault Assets to be claimed
     */
    function claimAssets(address _receiver, address _owner)
        external
        whitelisted(_msgSender(), _owner)
        nonReentrant
    {
        _checkVaultInMaintenance();
        address caller = _msgSender();
        DataTypes.Basics storage withdrawer = WITHDRAWALS[_owner];
        if (!isClaimerWithdraw(_owner)) {
            revert Errors.CalletIsNotClaimerToRedeem(_owner);
        }
        if (withdrawer.amountAssets >= _asset.balanceOf(address(this))) {
            revert Errors.NotEnoughBalance(withdrawer.amountAssets, _asset.balanceOf(address(this)));
        }
        _burn(_owner, withdrawer.amountShares);
        SafeERC20.safeTransfer(_asset, _receiver, withdrawer.amountAssets);
        // flag to control the transfer to Vertex
        _tx = true;
        emit Withdraw(caller, _receiver, _owner, withdrawer.amountShares, withdrawer.amountAssets);
        delete withdrawer.amountAssets;
        delete withdrawer.amountShares;
        withdrawer.status = DataTypes.Status.Completed;
    }

    /**
     * @dev Rescue method for emergency situation
     * @notice withdraw all assets in Vertex and send to the owner
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
     * @dev Method to Preview the Rescue of the Assets
     */
    function previewRescue() external whenPaused onlyOwner nonReentrant {
        DexWalletBalance();
        // Withdrawl and Adjust assets, because the Valance is in Format 18 decimals
        uint256 assets = DEX_WALLET_BALANCE;
        Utils.withdrawVertexCollateral(endpointVertex, address(_asset), 0, assets);
    }

    /**
     * @dev Setting epoch duration
     * @param _epochDuration New epoch duration
     * @param _maintTimeBefore New maintenance time before start epoch
     * @param _maintTimeAfter New maintenance time after end epoch
     */
    function setEpochDuration(
        uint256 _epochDuration,
        uint256 _maintTimeBefore,
        uint256 _maintTimeAfter,
        uint256 _floorWalletBalanceUSDC
    ) public onlyOwner {
        _checkVaultInMaintenance();
        if (_epochDuration < 1 minutes || _epochDuration > 12 weeks) {
            revert Errors.WrongEpochDuration(_epochDuration);
        }
        uint256 oldEpochDuration = EPOCH_DURATION;
        EPOCH_DURATION = _epochDuration;
        MAINTENANCE_PERIOD_PRE_START = _maintTimeBefore;
        MAINTENANCE_PERIOD_POST_START = _maintTimeAfter;
        FLOOR_WALLET_BALANCE_USDC_TRANSFER_BOT = _floorWalletBalanceUSDC;
        emit EpochChanged(
            oldEpochDuration,
            _epochDuration,
            _maintTimeBefore,
            _maintTimeAfter,
            _floorWalletBalanceUSDC
        );
    }

    /**
     * @dev Contract for Getting Actual Balance of the TraderBot Wallet in Dydx
     */
    function DexWalletBalance() public {
        if ((totalSupply() == 0) && (CURRENT_EPOCH == 0)) {
            DEX_WALLET_BALANCE = newDeposits();
        } else {
            // Get the Balance of the Wallet in the DEX Vertex Through FQuerier Contract of Vertex,
            // and Adjust the Decimals for the Asset of the Vault
            DEX_WALLET_BALANCE = Utils.getVertexBalance(0).mulDiv(10 ** _asset.decimals(), 1 ether);
        }
    }

    /**
     * @dev Method to Finalize the Epoch, and Update all parameters and prepare for start the new Epoch
     */
    function finalizeEpoch() external onlyRole(TRANSFER_BOT_ROLE) {
        /**
         * Follow the Initial Vault Mechanics Define by Simplified Implementation
         */
        _checkVaultOutMaintenance();
        DexWalletBalance();
        // Partial fix if Finalize epoch fail in some point
        unchecked {
            if (CURRENT_EPOCH >= 2) {
                if (VAULT_TOKEN_PRICE[CURRENT_EPOCH - 1] == 0) {
                    VAULT_TOKEN_PRICE[CURRENT_EPOCH - 1] = VAULT_TOKEN_PRICE[CURRENT_EPOCH - 2];
                }
            }
        }
        VAULT_TOKEN_PRICE[CURRENT_EPOCH] = convertToAssets(1 ether);
        // Update Value such Token Price Updated
        for (uint256 i; i < depositWallets.length;) {
            DataTypes.Basics storage depositor = DEPOSITS[depositWallets[i]];
            if (depositor.status == DataTypes.Status.Pending) {
                depositor.amountShares = convertToShares(depositor.amountAssets);
            }
            unchecked {
                ++i;
            }
        }
        for (uint256 i; i < withdrawWallets.length;) {
            DataTypes.Basics storage withdrawer = WITHDRAWALS[withdrawWallets[i]];
            if (withdrawer.status == DataTypes.Status.PendingWithdraw) {
                withdrawer.amountShares = convertToShares(withdrawer.amountAssets);
            }
            if (withdrawer.status == DataTypes.Status.PendingRedeem) {
                withdrawer.amountAssets = convertToAssets(withdrawer.amountShares);
            }
            unchecked {
                ++i;
            }
        }
        updateTotalSupply();
        netTransferBalance();
        // Update State of Assest and Share pending to Claim
        for (uint256 i; i < depositWallets.length;) {
            DataTypes.Basics storage depositor = DEPOSITS[depositWallets[i]];
            if (depositor.status == DataTypes.Status.Pending) {
                depositor.amountShares = convertToShares(depositor.amountAssets);
                depositor.status = DataTypes.Status.Claimet;
                depositor.finalAmount += depositor.amountAssets;
                delete depositor.amountAssets;
            }
            unchecked {
                ++i;
            }
        }
        for (uint256 i; i < withdrawWallets.length;) {
            DataTypes.Basics storage withdrawer = WITHDRAWALS[withdrawWallets[i]];
            if (withdrawer.status == DataTypes.Status.PendingWithdraw) {
                withdrawer.amountShares = convertToShares(withdrawer.amountAssets);
                withdrawer.status = DataTypes.Status.Claimet;
                withdrawer.finalAmount += withdrawer.amountAssets;
            }
            if (withdrawer.status == DataTypes.Status.PendingRedeem) {
                withdrawer.amountAssets = convertToAssets(withdrawer.amountShares);
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
     * @dev  Method for Update Total Supply
     */
    function updateTotalSupply() private {
        if (CURRENT_EPOCH != 0) {
            // Partial fix if Finalize epoch fail in some point
            unchecked {
                if (CURRENT_EPOCH >= 2) {
                    if (TOTAL_VAULT_TOKEN_SUPPLY[CURRENT_EPOCH - 1] == 0) {
                        TOTAL_VAULT_TOKEN_SUPPLY[CURRENT_EPOCH - 1] =
                            TOTAL_VAULT_TOKEN_SUPPLY[CURRENT_EPOCH - 2];
                    }
                }
            }
            // rewrite the total supply of the vault token to avoid underflow errors
            TOTAL_VAULT_TOKEN_SUPPLY[CURRENT_EPOCH] = TOTAL_VAULT_TOKEN_SUPPLY[CURRENT_EPOCH - 1]
                + newShares() > newWithdrawalsShares()
                ? (TOTAL_VAULT_TOKEN_SUPPLY[CURRENT_EPOCH - 1] + newShares()) - newWithdrawalsShares()
                : 0;
        } else {
            TOTAL_VAULT_TOKEN_SUPPLY[CURRENT_EPOCH] = newShares();
        }
    }

    function _swapDAforETH() private nonReentrant {
        if (
            (openZeppelinDefenderWallet.balance < MIN_WALLET_BALANCE_ETH_TRANSFER_BOT)
                && (_asset.balanceOf(openZeppelinDefenderWallet) > MIN_WALLET_BALANCE_USDC_TRANSFER_BOT)
        ) {
            UniswapLibV3._swapTokensForETH(address(_asset), address(router));
        }
    }

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
            uint256 mgtFee = Utils.MgtFeePerVaultToken(address(this));
            uint256 perfFee = Utils.PerfFeePerVaultToken(address(this), address(_asset));
            if (
                deposits
                    > withdrawals
                        + (mgtFee + perfFee).mulDiv(
                            TOTAL_VAULT_TOKEN_SUPPLY[CURRENT_EPOCH - 1], DECIMAL_FACTOR
                        )
            ) {
                actualTx.direction = true;
                actualTx.amount = deposits - withdrawals
                    - (mgtFee + perfFee).mulDiv(
                        TOTAL_VAULT_TOKEN_SUPPLY[CURRENT_EPOCH - 1], DECIMAL_FACTOR
                    );
            } else {
                actualTx.direction = false;
                actualTx.amount = withdrawals
                    + (mgtFee + perfFee).mulDiv(
                        TOTAL_VAULT_TOKEN_SUPPLY[CURRENT_EPOCH - 1], DECIMAL_FACTOR
                    ) - deposits;
            }
        }
    }

    function dexTransfer(bool kind) external onlyRole(TRANSFER_BOT_ROLE) nonReentrant {
        DataTypes.NetTransfer storage actualTx = netTransfer[CURRENT_EPOCH];
        _checkVaultOutMaintenance();
        if (actualTx.pending && kind && (actualTx.amount > 0)) {
            if (actualTx.direction) {
                // Deposit
                Utils.depositCollateralWithReferral(
                    endpointVertex, address(_asset), 0, actualTx.amount
                );
                // LinkSigner with EOA unique execution
                if (!linked) {
                    Utils.linkVertexSigner(
                        endpointVertex, address(_asset), address(traderBotWallet)
                    );
                    linked = true;
                }
            } else {
                // Withdrawl
                Utils.withdrawVertexCollateral(endpointVertex, address(_asset), 0, actualTx.amount);
            }
            actualTx.pending = false;
        }
        uint256 reserveGas = Utils.CalculateTransferBotGasReserveDA(address(this), address(_asset));
        uint256 assetBalance = _asset.balanceOf(address(this));
        if (reserveGas > 0 && !kind && _tx) {
            if (assetBalance < reserveGas) {
                revert Errors.NotEnoughBalance(reserveGas, assetBalance);
            }
            SafeERC20.safeTransfer(_asset, openZeppelinDefenderWallet, reserveGas);
        }
        if (!kind) {
            // Avoid Duplicate Event
            emit DexTransfer(CURRENT_EPOCH, actualTx.amount);
        }
    }

    /**
     * @dev FeesTranfer per Epoch
     */
    function feesTransfer() external onlyRole(TRANSFER_BOT_ROLE) nonReentrant {
        _checkVaultOutMaintenance();
        if (CURRENT_EPOCH == 0) {
            revert Errors.FirstEpochNoFeeTransfer();
        }
        uint256 mgtFee = Utils.MgtFeePerVaultToken(address(this));
        uint256 perfFee = _tx ? Utils.PerfFeePerVaultToken(address(this), address(_asset)) : 0;
        uint256 totalFees = Utils.getPnLPerVaultToken(address(this), address(_asset))
            ? (mgtFee + perfFee).mulDiv(TOTAL_VAULT_TOKEN_SUPPLY[CURRENT_EPOCH - 1], DECIMAL_FACTOR)
            : mgtFee.mulDiv(TOTAL_VAULT_TOKEN_SUPPLY[CURRENT_EPOCH - 1], DECIMAL_FACTOR);
        uint256 rest = totalFees
            > Utils.CalculateTransferBotGasReserveDA(address(this), address(_asset))
            ? totalFees - Utils.CalculateTransferBotGasReserveDA(address(this), address(_asset))
            : 0;
        uint256 assetBalance = _asset.balanceOf(address(this));
        uint256 adjustedBalance =
            assetBalance > FLOOR_WALLET_BALANCE_USDC_TRANSFER_BOT ? assetBalance : 0;
        rest = rest > adjustedBalance
            ? adjustedBalance
            : (rest > FLOOR_WALLET_BALANCE_USDC_TRANSFER_BOT ? rest : 0);
        uint256 restEvent = rest;
        if (rest > FLOOR_WALLET_BALANCE_USDC_TRANSFER_BOT) {
            restEvent = rest - FLOOR_WALLET_BALANCE_USDC_TRANSFER_BOT;
            SafeERC20.safeTransfer(_asset, treasuryWallet, restEvent);
        }
        _tx = false;
        emit FeesTransfer(CURRENT_EPOCH, restEvent);
        // Update Current Epoch
        DexWalletBalance();
        CurrentEpoch();
    }

    /**
     * @dev Fucntion to add wallet in the mapping of whitelist
     */
    function addDropWhitelist(address _wallet, bool status) external onlyOwner {
        whitelist[_wallet] = status;
    }

    /**
     * @dev Setter for the TraderBot Wallet
     */
    function setTraderBotWallet(address _traderBotWallet) external onlyOwner {
        traderBotWallet = payable(_traderBotWallet);
        Utils.linkVertexSigner(endpointVertex, address(_asset), address(traderBotWallet));
        emit TraderBotWalletUpdated(_traderBotWallet);
    }

    /**
     * @dev Setter for the TraderBot Wallet
     */
    function setTreasuryWallet(address _treasuryWallet) external onlyOwner {
        treasuryWallet = payable(_treasuryWallet);
        emit TreasuryWalletUpdated(_treasuryWallet);
    }

    /**
     * @dev Set Limit to Withdraw till timestamp
     * @param pct Percentage to Limit any withdraw
     * @param timestamp block will be enable till timstamp
     */
    function setLimitter(uint8 pct, uint256 timestamp) external onlyRole(TRADER_BOT_ROLE) {
        if (pct <= 0) revert Errors.InvalidValue();
        if (pct > 100) revert Errors.InvalidValue();
        if (timestamp <= block.timestamp) revert Errors.InvalidValue();
        if (timestamp >= getNextEpoch()) revert Errors.InvalidValue();
        limit.amountBlock = totalAssets().mulDiv((100 - pct), 100, Math.Rounding.Ceil);
        limit.timestamp = timestamp;
    }

    /**
     * @dev See {IERC4262-convertToAssets}
     */
    function convertToAssets(uint256 _shares) public view override returns (uint256 _assets) {
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
     * @dev See {IERC4262-convertToAssets}
     */
    function convertToShares(uint256 _assets) public view override returns (uint256 _shares) {
        // decimalsAdjust to fixed the rounding issue with stable coins
        uint256 decimalsAdjust = 10 ** (decimals() - _asset.decimals());
        if (CURRENT_EPOCH == 0) {
            _shares = (_assets * DECIMAL_FACTOR) / 10 ** _asset.decimals();
        } else {
            _shares = (
                _assets.mulDiv(
                    DECIMAL_FACTOR,
                    Utils.UpdateVaultPriceToken(address(this), address(_asset)),
                    Math.Rounding.Ceil
                ) / decimalsAdjust
            ) * decimalsAdjust; // last part is to fixed the rounding issue with stable coins
        }
    }

    function isDexTxPending() public view returns (bool) {
        (bool isMant,) = isMaintenance();
        return isMant && (netTransfer[CURRENT_EPOCH].amount > 0 || _tx);
    }

    /**
     * @dev Method for Verify if any caller is a Claimer of Pending Deposit
     * @param _claimer address of the wallet
     */
    function isClaimerMint(address _claimer) public view returns (bool) {
        return DEPOSITS[_claimer].status == DataTypes.Status.Claimet;
    }

    /**
     * @dev Method for Verify if any caller is a Claimer of Pending Deposit
     * @param _claimer address of the wallet
     */
    function isClaimerWithdraw(address _claimer) public view returns (bool) {
        return WITHDRAWALS[_claimer].status == DataTypes.Status.Claimet;
    }

    function isDepositWallet(address _wallet) public view returns (bool) {
        for (uint256 i; i < depositWallets.length;) {
            if (depositWallets[i] == _wallet) {
                return true;
            }
            unchecked {
                ++i;
            }
        }
        return false;
    }

    function isWithdrawWallet(address _wallet) public view returns (bool) {
        for (uint256 i; i < withdrawWallets.length;) {
            if (withdrawWallets[i] == _wallet) {
                return true;
            }
            unchecked {
                ++i;
            }
        }
        return false;
    }

    function newDeposits() public view returns (uint256 _total) {
        for (uint256 i; i < depositWallets.length;) {
            DataTypes.Basics storage depositor = DEPOSITS[depositWallets[i]];
            if (depositor.status == DataTypes.Status.Pending) {
                _total += depositor.amountAssets;
            }
            unchecked {
                ++i;
            }
        }
    }

    function newShares() private view returns (uint256 _total) {
        for (uint256 i; i < depositWallets.length;) {
            DataTypes.Basics storage depositor = DEPOSITS[depositWallets[i]];
            if (depositor.status == DataTypes.Status.Pending) {
                _total += depositor.amountShares;
            }
            unchecked {
                ++i;
            }
        }
    }

    function newWithdrawals() public view returns (uint256 _total) {
        for (uint256 i; i < withdrawWallets.length;) {
            DataTypes.Basics storage withdrawer = WITHDRAWALS[withdrawWallets[i]];
            if (
                (withdrawer.status == DataTypes.Status.PendingRedeem)
                    || (withdrawer.status == DataTypes.Status.PendingWithdraw)
            ) {
                _total += withdrawer.amountAssets;
            }
            unchecked {
                ++i;
            }
        }
    }

    function newWithdrawalsShares() private view returns (uint256 _total) {
        for (uint256 i; i < withdrawWallets.length;) {
            DataTypes.Basics storage withdrawer = WITHDRAWALS[withdrawWallets[i]];
            if (
                (withdrawer.status == DataTypes.Status.PendingRedeem)
                    || (withdrawer.status == DataTypes.Status.PendingWithdraw)
            ) {
                _total += withdrawer.amountShares;
            }
            unchecked {
                ++i;
            }
        }
    }

    /**
     * @dev See {IERC4262-asset}
     */
    function asset() public view virtual override returns (address) {
        return address(_asset);
    }

    /**
     * @dev See {IERC4262-previewDeposit}
     */
    function previewDeposit(uint256 _assets) public view returns (uint256) {
        return convertToShares(_assets);
    }

    /**
     * @dev See {IERC4262-previewMint}
     */
    // function previewMint(uint256 shares) public view returns (uint256) {}

    /**
     * @dev See {IERC4262-previewWithdraw}
     */
    function previewWithdraw(uint256 assets) public view returns (uint256) {
        uint256 shares = convertToShares(assets);
        return shares + (convertToAssets(shares) < assets ? 1 : 0);
    }

    /**
     * @dev See {IERC4262-previewRedeem}
     */
    function previewRedeem(uint256 shares) public view returns (uint256) {
        return convertToAssets(shares);
    }

    /**
     * @dev See {IERC4262-maxDeposit}
     */
    function maxDeposit(address) public view override returns (uint256) {
        return MAX_DEPOSIT;
    }

    /**
     * @dev Set Min and Max Value of the Deposit and Max Total Supply of Value
     */
    function setInitialValue(uint256[3] memory _initialValue) external onlyOwner {
        MIN_DEPOSIT = _initialValue[0];
        MAX_DEPOSIT = _initialValue[1];
        MAX_TOTAL_DEPOSIT = _initialValue[2];
    }

    /**
     * @dev See {IERC4262-maxMint}
     */
    // function maxMint(address) public pure virtual override returns (uint256) {}

    /**
     * @dev See {IERC4262-maxWithdraw}
     */
    function maxWithdraw(address _owner) public view returns (uint256) {
        return convertToAssets(balanceOf(_owner));
    }

    /**
     * @dev See {IERC4262-maxRedeem}
     */
    function maxRedeem(address _owner) public view returns (uint256) {
        return balanceOf(_owner);
    }

    function decimals() public view override(ERC20Upgradeable, IERC20Metadata) returns (uint8) {
        return _decimals;
    }

    // Creata a function to return a tuple with a boolean is the vault is in maintenance or not and the time for out of maintenance
    function isMaintenance() public view returns (bool, uint256) {
        if (
            (block.timestamp > (getNextEpoch() - MAINTENANCE_PERIOD_PRE_START))
                || (block.timestamp < (getCurrentEpoch() + MAINTENANCE_PERIOD_POST_START))
        ) {
            uint256 pending = block.timestamp > (getNextEpoch() - MAINTENANCE_PERIOD_PRE_START)
                ? block.timestamp - (getNextEpoch() - MAINTENANCE_PERIOD_PRE_START)
                : block.timestamp < (getCurrentEpoch() + MAINTENANCE_PERIOD_POST_START)
                    ? (getCurrentEpoch() + MAINTENANCE_PERIOD_POST_START) - block.timestamp
                    : 0;
            return (true, pending);
        }
        return (false, 0);
    }

    function _checkVaultInMaintenance() private view {
        bool maintenance = (block.timestamp > (getNextEpoch() - MAINTENANCE_PERIOD_PRE_START))
            || (block.timestamp < (getCurrentEpoch() + MAINTENANCE_PERIOD_POST_START));
        if (maintenance) {
            revert Errors.VaultInMaintenance();
        }
    }

    function _checkVaultOutMaintenance() private view {
        bool maintenance = (block.timestamp > (getNextEpoch() - MAINTENANCE_PERIOD_PRE_START))
            || (block.timestamp < (getCurrentEpoch() + MAINTENANCE_PERIOD_POST_START));
        if (!maintenance) {
            revert Errors.VaultOutMaintenance();
        }
    }

    function _checkLimit(uint256 assets) private view {
        uint256 permitWithdraw = totalAssets() + newWithdrawals() > limit.amountBlock
            ? totalAssets() + newWithdrawals() - limit.amountBlock
            : 0;
        if (block.timestamp <= limit.timestamp) {
            if (assets > permitWithdraw) revert Errors.NotEnoughBalance(assets, permitWithdraw);
        }
    }
}
