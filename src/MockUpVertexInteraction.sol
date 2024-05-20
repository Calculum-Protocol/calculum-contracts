// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "./lib/Claimable.sol";
import "./lib/DataTypes.sol";
import "./lib/Errors.sol";
import "./lib/Utils.sol";
import "@openzeppelin-contracts-upgradeable/contracts/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin-contracts-upgradeable/contracts/security/PausableUpgradeable.sol";
import "@openzeppelin-contracts-upgradeable/contracts/security/ReentrancyGuardUpgradeable.sol";

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
    // Actual Value of Assets during Trader Period
    uint256 public DEX_WALLET_BALANCE;
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
        address[7] memory _initialAddress // 0: Trader Bot Wallet, 1: Treasury Wallet, 2: OpenZeppelin Defender Wallet, 3: Router, 4: USDCToken Address, 5: Vertex Endpoint, 6: Spot Engine Vertex
    ) public reinitializer(1) {
            if (
            !_initialAddress[4].isContract() ||
            !_initialAddress[5].isContract() ||
            !_initialAddress[6].isContract()
        ) revert Errors.AddressIsNotContract();
        __Ownable_init();
        __ReentrancyGuard_init();
        __ERC20_init(_name, _symbol);
        _asset = IERC20MetadataUpgradeable(_initialAddress[4]);
        _decimals = decimals_;
        endpointVertex = _initialAddress[5];
        spotEngine = _initialAddress[6];
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
    function DexWalletBalance() external {
        // Must be changed by Get Spot Balance of Spot Engine of Vertex
        DEX_WALLET_BALANCE = Utils.getVertexBalance(0);
        // DEX_WALLET_BALANCE = oracle.GetAccount(address(traderBotWallet));
        if (DEX_WALLET_BALANCE == 0) {
            revert Errors.ActualAssetValueIsZero(
                address(spotEngine),
                address(this)
            );
        }
    }

    function approveDEX() external {
        _asset.approve(endpointVertex, type(uint256).max);
    }

    function linkSigner() external onlyOwner {
        if (!linked) {
            Utils.linkVertexSigner(
                endpointVertex,
                address(_asset),
                address(traderBotWallet)
            );
            linked = true;
        }
    }

    function dexTransfer(bool kind, uint256 amount) external nonReentrant {
        if (kind) {
            // Deposit
            Utils.depositCollateralWithReferral(
                endpointVertex,
                address(_asset),
                0,
                amount
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
                uint128(amount)
            );
        }
        emit DexTransfer(kind ? 1 : 0, amount);
    }

    function getAddresses() public view returns (address[7] memory) {
        return [
            traderBotWallet,
            treasuryWallet,
            openZeppelinDefenderWallet,
            address(0),
            address(_asset),
            endpointVertex,
            spotEngine
        ];
    }

}