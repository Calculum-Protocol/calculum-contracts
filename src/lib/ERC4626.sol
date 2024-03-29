// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin-contracts-upgradeable/contracts/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin-contracts-upgradeable/contracts/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin-contracts-upgradeable/contracts/utils/ContextUpgradeable.sol";
import "@openzeppelin-contracts-upgradeable/contracts/proxy/utils/Initializable.sol";
import "./IERC4626.sol";

/**
 * @title ERC4626 Method Implementation
 * @dev Implementation of Methods based on standard ERC4626
 * @custom:a Alfredo Lopez / Calculum
 */
abstract contract ERC4626 is
    Initializable,
    ContextUpgradeable,
    ERC20Upgradeable,
    IERC4626
{
    IERC20MetadataUpgradeable internal _asset;
    uint8 private _decimals;

    function __ERC4626_init(
        IERC20MetadataUpgradeable __asset,
        string memory _name,
        string memory _symbol,
        uint8 decimals_
    ) internal onlyInitializing {
        __ERC4626_init_unchained(__asset, _name, _symbol, decimals_);
    }

    function __ERC4626_init_unchained(
        IERC20MetadataUpgradeable asset_,
        string memory _name,
        string memory _symbol,
        uint8 decimals_
    ) internal onlyInitializing {
        __ERC20_init(_name, _symbol);
        _asset = asset_;
        _decimals = decimals_;
    }

    function decimals()
        public
        view
        override(ERC20Upgradeable, IERC20MetadataUpgradeable)
        returns (uint8)
    {
        return _decimals;
    }

    /**
     * @dev See {IERC4262-asset}
     */
    function asset() public view virtual override returns (address) {
        return address(_asset);
    }

    /**
     * @dev Returns the total amount of the underlying asset that is “managed” by Vault.
     *
     * - SHOULD include any compounding that occurs from yield.
     * - MUST be inclusive of any fees that are charged against assets in the Vault.
     * - MUST NOT revert.
     */
    function totalAssets() public view virtual override returns (uint256) {
        return _asset.balanceOf(address(this));
    }

    /**
     * @dev See {IERC4262-convertToShares}
     *
     * Will revert if asserts > 0, totalSupply > 0 and totalAssets = 0. That corresponds to a case where any asset
     * would represent an infinite amout of shares.
     */
    function convertToShares(
        uint256 assets
    ) public view virtual override returns (uint256 shares) {
        uint256 supply = totalSupply();

        return
            (assets == 0 || supply == 0)
                ? (assets * 10 ** decimals()) / 10 ** _asset.decimals()
                : (assets * supply) / totalAssets();
    }

    /**
     * @dev See {IERC4262-convertToAssets}
     */
    function convertToAssets(
        uint256 shares
    ) public view virtual override returns (uint256 assets) {
        uint256 supply = totalSupply();

        return
            (supply == 0)
                ? (shares * 10 ** _asset.decimals()) / 10 ** decimals()
                : (shares * totalAssets()) / supply;
    }

    /**
     * @dev See {IERC4262-maxDeposit}
     */
    function maxDeposit(
        address
    ) public view virtual override returns (uint256) {
        return type(uint256).max;
    }

    /**
     * @dev See {IERC4262-maxMint}
     */
    function maxMint(address) public view virtual returns (uint256) {
        return type(uint256).max;
    }

    /**
     * @dev See {IERC4262-maxWithdraw}
     */
    function maxWithdraw(
        address owner
    ) public view virtual override returns (uint256) {
        return convertToAssets(balanceOf(owner));
    }

    /**
     * @dev See {IERC4262-maxRedeem}
     */
    function maxRedeem(
        address owner
    ) public view virtual override returns (uint256) {
        return balanceOf(owner);
    }

    /**
     * @dev See {IERC4262-previewDeposit}
     */
    function previewDeposit(
        uint256 assets
    ) public view virtual override returns (uint256) {
        return convertToShares(assets);
    }

    /**
     * @dev See {IERC4262-previewMint}
     */
    function previewMint(uint256 shares) public view virtual returns (uint256) {
        uint256 assets = convertToAssets(shares);
        return assets + (convertToShares(assets) < shares ? 1 : 0);
    }

    /**
     * @dev See {IERC4262-previewWithdraw}
     */
    function previewWithdraw(
        uint256 assets
    ) public view virtual override returns (uint256) {
        uint256 shares = convertToShares(assets);
        return shares + (convertToAssets(shares) < assets ? 1 : 0);
    }

    /**
     * @dev See {IERC4262-previewRedeem}
     */
    function previewRedeem(
        uint256 shares
    ) public view virtual override returns (uint256) {
        return convertToAssets(shares);
    }

    /**
     * @dev See {IERC4262-deposit}
     */
    function deposit(
        uint256 assets,
        address receiver
    ) public virtual override returns (uint256) {
        require(
            assets <= maxDeposit(receiver),
            "ERC4626: deposit more then max"
        );

        address caller = _msgSender();
        uint256 shares = previewDeposit(assets);

        // if _asset is ERC777, transferFrom can call reenter BEFORE the transfer happens through
        // the tokensToSend hook, so we need to transfer before we mint to keep the invariants.
        SafeERC20Upgradeable.safeTransferFrom(
            _asset,
            caller,
            address(this),
            assets
        );
        _mint(receiver, shares);

        emit Deposit(caller, receiver, assets, shares);

        return shares;
    }

    /**
     * @dev See {IERC4262-mint}
     */
    // function mint(uint256 shares, address receiver) public virtual override returns (uint256) {
    //     require(shares <= maxMint(receiver), "ERC4626: mint more then max");

    //     address caller = _msgSender();
    //     uint256 assets = previewMint(shares);

    //     // if _asset is ERC777, transferFrom can call reenter BEFORE the transfer happens through
    //     // the tokensToSend hook, so we need to transfer before we mint to keep the invariants.
    //     SafeERC20Upgradeable.safeTransferFrom(_asset, caller, address(this), assets);
    //     _mint(receiver, shares);

    //     emit Deposit(caller, receiver, assets, shares);

    //     return assets;
    // }

    /**
     * @dev See {IERC4262-withdraw}
     */
    function withdraw(
        uint256 assets,
        address receiver,
        address owner
    ) public virtual override returns (uint256) {
        require(
            assets <= maxWithdraw(owner),
            "ERC4626: withdraw more then max"
        );

        address caller = _msgSender();
        uint256 shares = previewWithdraw(assets);

        if (caller != owner) {
            _spendAllowance(owner, caller, shares);
        }

        // if _asset is ERC777, transfer can call reenter AFTER the transfer happens through
        // the tokensReceived hook, so we need to transfer after we burn to keep the invariants.
        _burn(owner, shares);
        SafeERC20Upgradeable.safeTransfer(_asset, receiver, assets);

        emit Withdraw(caller, receiver, owner, assets, shares);

        return shares;
    }

    /**
     * @dev See {IERC4262-redeem}
     */
    function redeem(
        uint256 shares,
        address receiver,
        address owner
    ) public virtual override returns (uint256) {
        require(shares <= maxRedeem(owner), "ERC4626: redeem more then max");

        address caller = _msgSender();
        uint256 assets = previewRedeem(shares);

        if (caller != owner) {
            _spendAllowance(owner, caller, shares);
        }

        // if _asset is ERC777, transfer can call reenter AFTER the transfer happens through
        // the tokensReceived hook, so we need to transfer after we burn to keep the invariants.
        _burn(owner, shares);
        SafeERC20Upgradeable.safeTransfer(_asset, receiver, assets);

        emit Withdraw(caller, receiver, owner, assets, shares);

        return assets;
    }
}
