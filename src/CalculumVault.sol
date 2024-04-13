// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "./lib/IERC4626.sol";
import "./lib/Claimable.sol";
import "./lib/DataTypes.sol";
import "./lib/Errors.sol";
import "./lib/IRouter.sol";
import "./lib/UniswapLibV3.sol";
import "./lib/Utils.sol";
import "./lib/IEndpoint.sol";
import "@openzeppelin-contracts-upgradeable/contracts/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin-contracts-upgradeable/contracts/security/PausableUpgradeable.sol";
import "@openzeppelin-contracts-upgradeable/contracts/access/AccessControlUpgradeable.sol";
import "@openzeppelin-contracts-upgradeable/contracts/security/ReentrancyGuardUpgradeable.sol";
import "@forge-std/src/console.sol";

interface Oracle {
    function GetAccount(address _wallet) external view returns (uint256);
}

/**
 * @title Calculum Vault
 * @dev Vault based on ERC-4626
 * @custom:a Alfredo Lopez / Calculum
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
    using SafeMathUpgradeable for uint256;
    using MathUpgradeable for uint256;
    using AddressUpgradeable for address;
    using SafeERC20Upgradeable for IERC20Upgradeable;
    // Principal private Variable of ERC4626

    IERC20MetadataUpgradeable internal _asset;
    // Decimals of the Share Token
    uint8 private _decimals;
    // Flag to Control Linksigner
    bool private linked;
    // Flag to Control Start Sales of Shares
    uint256 public EPOCH_START; // start 10 July 2022, Sunday 22:00:00  UTC
    // Transfer Bot Wallet in DEX
    address payable private openZeppelinDefenderWallet;
    // Trader Bot Wallet in DEX
    address payable public traderBotWallet;
    // Address of Vertex Endpoint
    address private endpointVertex;
    // Address of Spot Engine of Vertex
    address private spotEngine;
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
    // Interface for Oracle
    Oracle public oracle;
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
    // Mapping of Struct NetTransfer
    mapping(uint256 => DataTypes.NetTransfer) public netTransfer; // Mapping of Struct NetTransfer based on EPOCH
    // mapping for whitelist of wallet to access the Vault
    mapping(address => bool) public whitelist;

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

    function initialize(
        string memory _name,
        string memory _symbol,
        uint8 decimals_,
        address[8] memory _initialAddress, // 0: Trader Bot Wallet, 1: Treasury Wallet, 2: OpenZeppelin Defender Wallet, 3: Router, 4: USDCToken Address, 5: Vertex Endpoint, 6: Spot Engine Vertex
        uint256[7] memory _initialValue // 0: Start timestamp, 1: Min Deposit, 2: Max Deposit, 3: Max Total Supply Value
    ) public reinitializer(1) {
        if (
            !_initialAddress[4].isContract() ||
            !_initialAddress[5].isContract() ||
            !_initialAddress[6].isContract() ||
            !_initialAddress[7].isContract()
        ) revert Errors.AddressIsNotContract();
        __Ownable_init();
        __ReentrancyGuard_init();
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setupRole(TRANSFER_BOT_ROLE, _initialAddress[3]);
        __ERC20_init(_name, _symbol);
        _asset = IERC20MetadataUpgradeable(_initialAddress[5]);
        _decimals = decimals_;
        oracle = Oracle(_initialAddress[0]);
        router = IRouter(_initialAddress[4]);
        endpointVertex = _initialAddress[6];
        spotEngine = _initialAddress[7];
        traderBotWallet = payable(_initialAddress[1]);
        openZeppelinDefenderWallet = payable(_initialAddress[3]);
        treasuryWallet = _initialAddress[2];
        EPOCH_START = _initialValue[0];
        MIN_DEPOSIT = _initialValue[1];
        MAX_DEPOSIT = _initialValue[2];
        MAX_TOTAL_DEPOSIT = _initialValue[3];
        MIN_WALLET_BALANCE_USDC_TRANSFER_BOT = _initialValue[4];
        TARGET_WALLET_BALANCE_USDC_TRANSFER_BOT = _initialValue[5];
        MIN_WALLET_BALANCE_ETH_TRANSFER_BOT = _initialValue[6];
        EPOCH_DURATION = 60 minutes; // 60 minutes
        MAINTENANCE_PERIOD_PRE_START = 5 minutes; // 5 minutes
        MAINTENANCE_PERIOD_POST_START = 5 minutes; // 5 minutes
        CurrentEpoch();
        MANAGEMENT_FEE_PERCENTAGE = 1 ether / 100; // Represent 1%
        PERFORMANCE_FEE_PERCENTAGE = 15 ether / 100; // Represent 15%
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
    function NextEpoch() internal returns (uint256) {
        if (
            block.timestamp >
            EPOCH_START + (EPOCH_DURATION * (CURRENT_EPOCH + 1))
        ) {
            ++CURRENT_EPOCH;
        }
        return EPOCH_START + (EPOCH_DURATION * (CURRENT_EPOCH + 1));
    }

    /**
     * @dev Method to Update Current Epoch starting timestamp
     */
    function CurrentEpoch() public onlyOwner returns (uint256) {
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
        if (_assets < MIN_DEPOSIT) {
            revert Errors.DepositAmountTooLow(_receiver, _assets);
        }
        if (
            _assets >
            (MAX_DEPOSIT.sub(depositor.finalAmount.add(depositor.amountAssets)))
        ) {
            // Verify the maximun value per user
            revert Errors.DepositExceededMax(
                _receiver,
                MAX_DEPOSIT.sub(
                    depositor.finalAmount.add(depositor.amountAssets)
                )
            );
        }
        if (totalAssets().add(_assets) > MAX_TOTAL_DEPOSIT) {
            revert Errors.DepositExceedTotalVaultMax(
                _receiver,
                totalAssets().add(_assets),
                MAX_TOTAL_DEPOSIT
            );
        }

        uint256 shares = previewDeposit(_assets);

        // if _asset is ERC777, transferFrom can call reenter BEFORE the transfer happens through
        // the tokensToSend hook, so we need to transfer before we mint to keep the invariants.
        SafeERC20Upgradeable.safeTransferFrom(
            _asset,
            _receiver,
            address(this),
            _assets
        );
        addDeposit(_receiver, shares, _assets);

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

        uint256 shares = previewWithdraw(_assets);
        console.log("shares", shares);

        // if _asset is ERC777, transfer can call reenter AFTER the transfer happens through
        // the tokensReceived hook, so we need to transfer after we burn to keep the invariants.
        addWithdraw(_receiver, shares, _assets, true);

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

        uint256 assets = previewRedeem(_shares);

        // if _asset is ERC777, transfer can call reenter AFTER the transfer happens through
        // the tokensReceived hook, so we need to transfer after we burn to keep the invariants.
        addWithdraw(_receiver, _shares, assets, false);

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
            depositor.amountAssets += _assets;
            depositor.amountShares += _shares;
        }
    }

    /**
     * @dev Add withdraws wallet, assets and shares
     * @param _wallet address of the wallet
     * @param _shares amount of shares to add for minting
     * @param _assets amount of assets the deposit
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
            withdrawer.amountAssets += _assets;
            withdrawer.amountShares += _shares;
        }
    }

    /**
     * @dev Method to Claim Shares of the Vault (Mint)
     * @param _owner Owner of the Vault Shares to be claimed
     */
    function claimShares(
        address _owner
    ) external whitelisted(_msgSender(), _owner) nonReentrant {
        _checkVaultInMaintenance();
        address caller = _msgSender();
        DataTypes.Basics storage depositor = DEPOSITS[_owner];
        if (!isClaimerMint(_owner))
            revert Errors.CalletIsNotClaimerToDeposit(_owner);
        _mint(_owner, depositor.amountShares);
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
     * @param _receiver address of the receiver wallet
     * @param _owner Owner of the Vault Assets to be claimed
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
        // TODO: add a verification of the amount shares to be redeemed
        if (withdrawer.amountAssets > _asset.balanceOf(address(this))) {
            revert Errors.NotEnoughBalance(
                withdrawer.amountAssets,
                _asset.balanceOf(address(this))
            );
        }
        _burn(_owner, withdrawer.amountShares);
        SafeERC20Upgradeable.safeTransfer(
            _asset,
            _receiver,
            withdrawer.amountAssets
        );
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
     * @dev Setting epoch duration
     * @param _epochDuration New epoch duration
     * @param _maintTimeBefore New maintenance time before start epoch
     * @param _maintTimeAfter New maintenance time after end epoch
     */
    function setEpochDuration(
        uint256 _epochDuration,
        uint256 _maintTimeBefore,
        uint256 _maintTimeAfter
    ) public onlyOwner {
        _checkVaultInMaintenance();
        if (_epochDuration < 1 minutes || _epochDuration > 12 weeks) {
            revert Errors.WrongEpochDuration(_epochDuration);
        }
        if (
            _epochDuration.mod(1 minutes) != 0 &&
            _epochDuration.mod(1 days) != 0 &&
            _maintTimeBefore.mod(1 minutes) != 0 &&
            _maintTimeBefore.mod(1 days) != 0 &&
            _maintTimeAfter.mod(1 minutes) != 0 &&
            _maintTimeAfter.mod(1 days) != 0
        ) {
            revert Errors.WrongEpochDefinition(
                _epochDuration,
                _maintTimeBefore,
                _maintTimeAfter
            );
        }
        uint256 oldEpochDuration = EPOCH_DURATION;
        EPOCH_DURATION = _epochDuration;
        MAINTENANCE_PERIOD_PRE_START = _maintTimeBefore;
        MAINTENANCE_PERIOD_POST_START = _maintTimeAfter;
        emit EpochChanged(
            oldEpochDuration,
            _epochDuration,
            _maintTimeBefore,
            _maintTimeAfter
        );
    }

    /**
     * @dev Contract for Getting Actual Balance of the TraderBot Wallet in Dydx
     */
    function DexWalletBalance() private {
        if ((totalSupply() == 0) && (CURRENT_EPOCH == 0)) {
            DEX_WALLET_BALANCE = newDeposits();
        } else {
            // Must be changed by Get Spot Balance of Spot Engine of Vertex
            // DEX_WALLET_BALANCE = Utils.getVertexBalance(spotEngine, address(this), 0);
            DEX_WALLET_BALANCE = oracle.GetAccount(address(traderBotWallet));
            if (DEX_WALLET_BALANCE == 0) {
                revert Errors.ActualAssetValueIsZero(
                    address(spotEngine),
                    address(this)
                );
            }
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
        VAULT_TOKEN_PRICE[CURRENT_EPOCH] = convertToAssets(1 ether);
        // Update Value such Token Price Updated
        for (uint256 i = 0; i < depositWallets.length; i++) {
            DataTypes.Basics storage depositor = DEPOSITS[depositWallets[i]];
            if (depositor.status == DataTypes.Status.Pending) {
                depositor.amountShares = convertToShares(
                    depositor.amountAssets
                );
            }
        }
        for (uint256 i = 0; i < withdrawWallets.length; i++) {
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
        }
        updateTotalSupply();
        netTransferBalance();
        // Update State of Assest and Share pending to Claim
        for (uint256 i = 0; i < depositWallets.length; i++) {
            DataTypes.Basics storage depositor = DEPOSITS[depositWallets[i]];
            if (depositor.status == DataTypes.Status.Pending) {
                depositor.amountShares = convertToShares(
                    depositor.amountAssets
                );
                depositor.status = DataTypes.Status.Claimet;
                depositor.finalAmount += depositor.amountAssets;
                delete depositor.amountAssets;
            }
        }
        for (uint256 i = 0; i < withdrawWallets.length; i++) {
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
        }
        _swapDAforETH();
    }


    /**
     * @dev  Method for Update Total Supply
     */
    function updateTotalSupply() private {
        if (CURRENT_EPOCH != 0) {
            TOTAL_VAULT_TOKEN_SUPPLY[CURRENT_EPOCH] = TOTAL_VAULT_TOKEN_SUPPLY[
                CURRENT_EPOCH.sub(1)
            ].add(newShares()).sub(newWithdrawalsShares());
        } else {
            TOTAL_VAULT_TOKEN_SUPPLY[CURRENT_EPOCH] = newShares();
        }
    }

    function _swapDAforETH() private {
        if (
            (openZeppelinDefenderWallet.balance <
                MIN_WALLET_BALANCE_ETH_TRANSFER_BOT) &&
            (_asset.balanceOf(openZeppelinDefenderWallet) >
                MIN_WALLET_BALANCE_USDC_TRANSFER_BOT)
        ) {
            UniswapLibV3._swapTokensForETH(address(_asset), address(router));
        }
    }

    function netTransferBalance() private {
        DataTypes.NetTransfer storage actualTx = netTransfer[CURRENT_EPOCH];
        if ((totalSupply() == 0) && (CURRENT_EPOCH == 0)) {
            actualTx.pending = true;
            actualTx.direction = true;
            actualTx.amount = newDeposits();
        } else {
            uint256 deposits = newDeposits();
            uint256 withdrawals = newWithdrawals();
            uint256 mgtFee = Utils.MgtFeePerVaultToken(address(this));
            uint256 perfFee = Utils.PerfFeePerVaultToken(
                address(this),
                address(_asset)
            );
            if (
                deposits >
                withdrawals.add(
                    mgtFee.add(perfFee).mulDiv(
                        TOTAL_VAULT_TOKEN_SUPPLY[CURRENT_EPOCH.sub(1)],
                        10 ** decimals()
                    )
                )
            ) {
                actualTx.pending = true;
                actualTx.direction = true;
                actualTx.amount = deposits.sub(
                    withdrawals.add(
                        mgtFee.add(perfFee).mulDiv(
                            TOTAL_VAULT_TOKEN_SUPPLY[CURRENT_EPOCH.sub(1)],
                            10 ** decimals()
                        )
                    )
                );
            } else {
                actualTx.pending = true;
                actualTx.direction = false;
                actualTx.amount = withdrawals
                    .add(
                        mgtFee.add(perfFee).mulDiv(
                            TOTAL_VAULT_TOKEN_SUPPLY[CURRENT_EPOCH.sub(1)],
                            10 ** decimals()
                        )
                    )
                    .sub(deposits);
            }
        }
    }

    function dexTransfer(bool kind) external onlyRole(TRANSFER_BOT_ROLE) nonReentrant {
        DataTypes.NetTransfer storage actualTx = netTransfer[CURRENT_EPOCH];
        _checkVaultOutMaintenance();
        if (actualTx.pending && kind) {
            if (actualTx.direction) {
                // Deposit
                Utils.depositVertexCollateral(
                    endpointVertex,
                    address(_asset),
                    (address(this)),
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
                    (address(this)),
                    0,
                    uint128(actualTx.amount)
                );
            }
            actualTx.pending = false;
        }
        uint256 reserveGas = Utils.CalculateTransferBotGasReserveDA(
            address(this),
            address(_asset)
        );
        if (reserveGas > 0 && !kind) {
            if (_asset.balanceOf(address(this)) < reserveGas) {
                revert Errors.NotEnoughBalance(
                    reserveGas,
                    _asset.balanceOf(address(this))
                );
            }
            SafeERC20Upgradeable.safeTransfer(
                _asset,
                openZeppelinDefenderWallet,
                reserveGas
            );
        }
        emit DexTransfer(CURRENT_EPOCH, actualTx.amount);
    }

    /**
     * @dev FeesTranfer per Epoch
     */
    function feesTransfer() external onlyRole(TRANSFER_BOT_ROLE) nonReentrant {
        _checkVaultOutMaintenance();
        uint256 mgtFee = Utils.MgtFeePerVaultToken(address(this));
        uint256 perfFee = Utils.PerfFeePerVaultToken(
            address(this),
            address(_asset)
        );
        if (CURRENT_EPOCH == 0) revert Errors.FirstEpochNoFeeTransfer();
        uint256 totalFees = Utils.getPnLPerVaultToken(
            address(this),
            address(_asset)
        )
            ? mgtFee.add(perfFee).mulDiv(
                TOTAL_VAULT_TOKEN_SUPPLY[CURRENT_EPOCH.sub(1)],
                10 ** decimals()
            )
            : mgtFee.mulDiv(
                TOTAL_VAULT_TOKEN_SUPPLY[CURRENT_EPOCH.sub(1)],
                10 ** decimals()
            );
        uint256 rest = totalFees.sub(
            Utils.CalculateTransferBotGasReserveDA(
                address(this),
                address(_asset)
            )
        );
        rest = (rest > (_asset.balanceOf(address(this))) - 1 * 10 ** _asset.decimals())
            ? _asset.balanceOf(address(this)) 
            : (rest > 1 * 10 ** _asset.decimals()) ? rest : 0;
        if (rest > 0)
            SafeERC20Upgradeable.safeTransfer(_asset, treasuryWallet, rest - 1 * 10 ** _asset.decimals());
        emit FeesTransfer(CURRENT_EPOCH, rest);
    }

    /**
     * @dev Fucntion to add wallet in the mapping of whitelist
     */
    function addDropWhitelist(address _wallet, bool status) external onlyOwner {
        whitelist[_wallet] = status;
    }

    /**
     * @dev See {IERC4262-convertToAssets}
     */
    function convertToAssets(
        uint256 _shares
    ) public view override returns (uint256 _assets) {
        uint256 supply = totalSupply();
        if (CURRENT_EPOCH == 0) {
            return
                (supply == 0)
                    ? (_shares * 10 ** _asset.decimals()) / 10 ** decimals()
                    : (_shares * totalAssets()) / supply;
        } else {
            _assets = _shares.mulDiv(
                Utils.UpdateVaultPriceToken(address(this), address(_asset)),
                10 ** decimals(),
                MathUpgradeable.Rounding.Up
            );
        }
    }

    /**
     * @dev See {IERC4262-convertToAssets}
     */
    function convertToShares(
        uint256 _assets
    ) public view override returns (uint256 _shares) {
        uint256 supply = totalSupply();
        if (CURRENT_EPOCH == 0) {
            return
                (_assets == 0 || supply == 0)
                    ? (_assets * 10 ** decimals()) / 10 ** _asset.decimals()
                    : (_assets * supply) / totalAssets();
        } else {
            _shares = _assets.mulDiv(
                10 ** decimals(),
                Utils.UpdateVaultPriceToken(address(this), address(_asset)),
                MathUpgradeable.Rounding.Up
            );
        }
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

    /**
     * @dev Setter for the TraderBot Wallet
     */
    function settraderBotWallet(address _traderBotWallet) external onlyOwner {
        traderBotWallet = payable(_traderBotWallet);
    }

    function isDepositWallet(address _wallet) public view returns (bool) {
        for (uint256 i = 0; i < depositWallets.length; i++) {
            if (depositWallets[i] == _wallet) {
                return true;
            }
        }
        return false;
    }

    function isWithdrawWallet(address _wallet) public view returns (bool) {
        for (uint256 i = 0; i < withdrawWallets.length; i++) {
            if (withdrawWallets[i] == _wallet) {
                return true;
            }
        }
        // TODO: Analyse if need to delete the withdraw wallets
        return false;
    }

    function newDeposits() public view returns (uint256 _total) {
        for (uint256 i = 0; i < depositWallets.length; i++) {
            if (
                DEPOSITS[depositWallets[i]].status == DataTypes.Status.Pending
            ) {
                _total += DEPOSITS[depositWallets[i]].amountAssets;
            }
        }
    }

    function newShares() private view returns (uint256 _total) {
        for (uint256 i = 0; i < depositWallets.length; i++) {
            if (
                DEPOSITS[depositWallets[i]].status == DataTypes.Status.Pending
            ) {
                _total += DEPOSITS[depositWallets[i]].amountShares;
            }
        }
    }

    function newWithdrawals() public view returns (uint256 _total) {
        for (uint256 i = 0; i < withdrawWallets.length; i++) {
            DataTypes.Basics storage withdrawer = WITHDRAWALS[
                withdrawWallets[i]
            ];
            if (
                (withdrawer.status == DataTypes.Status.PendingRedeem) ||
                (withdrawer.status == DataTypes.Status.PendingWithdraw)
            ) {
                _total += withdrawer.amountAssets;
            }
        }
    }

    function newWithdrawalsShares() private view returns (uint256 _total) {
        for (uint256 i = 0; i < withdrawWallets.length; i++) {
            DataTypes.Basics storage withdrawer = WITHDRAWALS[
                withdrawWallets[i]
            ];
            if (
                (withdrawer.status == DataTypes.Status.PendingRedeem) ||
                (withdrawer.status == DataTypes.Status.PendingWithdraw)
            ) {
                _total += withdrawer.amountShares;
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
    function setInitialValue(
        uint256[3] memory _initialValue
    ) external onlyOwner {
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

    function decimals()
        public
        view
        override(ERC20Upgradeable, IERC20MetadataUpgradeable)
        returns (uint8)
    {
        return _decimals;
    }

    function _checkVaultInMaintenance() private view {
        if (
            (block.timestamp >
                (getNextEpoch().sub(MAINTENANCE_PERIOD_PRE_START))) ||
            (block.timestamp <
                (getCurrentEpoch().add(MAINTENANCE_PERIOD_POST_START)))
        ) {
            revert Errors.VaultInMaintenance();
        }
    }

    function _checkVaultOutMaintenance() private view {
        if (
            (block.timestamp <
                (getNextEpoch().sub(MAINTENANCE_PERIOD_PRE_START))) ||
            (block.timestamp > (getNextEpoch()))
        ) {
            revert Errors.VaultOutMaintenance();
        }
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override(ERC20Upgradeable) {
        require(
            !paused(),
            "ERC20 Vault: can't create or transfer any shares or Assets while paused"
        );
        super._beforeTokenTransfer(from, to, tokenId);
    }
}
