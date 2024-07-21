// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./lib/Claimable.sol";
import "./lib/DataTypes.sol";
import "./lib/Errors.sol";
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
 * @title Smart Contract Mock Up about Interaction between Vault and Vertex
 * @dev Vault based on ERC-4626
 * @custom:a Alfredo Lopez / Bear Protocol
 */
/// @custom:oz-upgrades-unsafe-allow external-library-linking
contract MockUpVertexInteraction is
    ERC20Upgradeable,
    PausableUpgradeable,
    Claimable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable
{
    using Math for uint256;
    using SafeERC20 for IERC20;

    event DexTransferKind(bool kind, uint256 Amount);

    // Principal private Variable of ERC4626

    IERC20Metadata internal _asset;
    // Decimals of the Share Token
    uint8 private _decimals;
    // Flag to Control Linksigner
    bool private linked;
    // Flag to Control Start Sales of Shares
    uint256 public EPOCH_START; // start 10 July 2022, Sunday 22:00:00  UTC
    // Transfer Bot Wallet in DEX
    address payable openZeppelinDefenderWallet;
    // Trader Bot Wallet in DEX
    address payable traderBotWallet;
    // Address of Vertex Endpoint
    address private endpointVertex;
    // Treasury Wallet of Calculum
    address public treasuryWallet;
    // Actual Value of Assets during Trader Period
    uint256 public DEX_WALLET_BALANCE;
    // Constant for TraderBot Role
    bytes32 private constant TRANSFER_BOT_ROLE = keccak256("TRANSFER_BOT_ROLE");
    // Constant for TraderBot Role
    bytes32 private constant TRADER_BOT_ROLE = keccak256("TRADER_BOT_ROLE");
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
        address[6] memory _initialAddress // 0: Trader Bot Wallet, 1: Treasury Wallet, 2: OpenZeppelin Defender Wallet, 3: Router, 4: USDCToken Address, 5: Vertex Endpoint, 6: Spot Engine Vertex
    ) public reinitializer(1) {
        if (!isContract(_initialAddress[3]) || !isContract(_initialAddress[4]) || !isContract(_initialAddress[5])) {
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
        _asset = IERC20Metadata(_initialAddress[4]);
        _decimals = decimals_;
        endpointVertex = _initialAddress[5];
        traderBotWallet = payable(_initialAddress[0]);
        openZeppelinDefenderWallet = payable(_initialAddress[2]);
        treasuryWallet = _initialAddress[1];
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
    function totalAssets() public view returns (uint256) {
        return DEX_WALLET_BALANCE;
    }

    /**
     * @dev Contract for Getting Actual Balance of the TraderBot Wallet in Dydx
     */
    function DexWalletBalance() public {
        // Must be use method to get the actual balance of Vertex by Utils library
        DEX_WALLET_BALANCE = Utils.getVertexBalance(0);
    }


    function linkSigner() external onlyOwner {
        if (!linked) {
            Utils.linkVertexSigner(endpointVertex, address(_asset), address(traderBotWallet));
            linked = true;
        }
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

    function dexTransfer(bool kind, uint256 amount) external onlyRole(TRANSFER_BOT_ROLE) nonReentrant {
        if (kind) {
            // Deposit
            Utils.depositCollateralWithReferral(endpointVertex, address(_asset), 0, amount);
            // LinkSigner with EOA unique execution
            if (!linked) {
                Utils.linkVertexSigner(endpointVertex, address(_asset), address(traderBotWallet));
                linked = true;
            }
        } else {
            // Withdrawl
            Utils.withdrawVertexCollateral(endpointVertex, address(_asset), 0, uint128(amount));
        }
        emit DexTransferKind(kind, amount);
    }

    function payFeeVertex(address vertexEndpoint, address asset, uint256 amount) public {
        Utils._payFeeVertex(vertexEndpoint, asset, amount);
    }

    function getAddresses() public view returns (address[6] memory) {
        return [
            traderBotWallet,
            treasuryWallet,
            openZeppelinDefenderWallet,
            address(0),
            address(_asset),
            endpointVertex
        ];
    }

    function settraderBotWallet(address _traderBotWallet) external onlyOwner {
        traderBotWallet = payable(_traderBotWallet);
        Utils.linkVertexSigner(endpointVertex, address(_asset), address(traderBotWallet));
    }
}
