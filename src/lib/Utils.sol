// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./ICalculumVault.sol";
import "./DataTypes.sol";
import "./Errors.sol";
import "./IEndpoint.sol";
import "./IFQuerier.sol";
import
    "@openzeppelin-contracts-upgradeable/contracts/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";
import "@openzeppelin-contracts-upgradeable/contracts/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin-contracts-upgradeable/contracts/utils/math/MathUpgradeable.sol";
import "@openzeppelin-contracts-upgradeable/contracts/token/ERC20/utils/SafeERC20Upgradeable.sol";

library Utils {
    using SafeMathUpgradeable for uint256;
    using MathUpgradeable for uint256;

    // address public constant OZW =

    address public constant FQuerier = 0x1693273B443699bee277eCbc60e2C8027E91995d; // Arbitrum Mainnet
    // address public constant OZW = 0xB19b03Bf35bBdd30CF154bef41c19621a17068f2; // OpenZeppelin Defender Wallet Arbitrum Mainnet
    address public constant OZW = 0xc6B04026Ad05981840aD6bD77c924c67bAeCf0DC; // OpenZeppelin Defender Wallet Unit Test

    bytes12 private constant defaultSubaccountName = bytes12(abi.encodePacked("default"));
    string constant DEFAULT_REFERRAL_CODE = "-1";

    /**
     * @dev Method to Calculate the Transfer Bot Gas Reserve in USDC in the current epoch
     */
    function CalculateTransferBotGasReserveDA(address calculum, address asset)
        public
        view
        returns (uint256)
    {
        ICalculumVault Calculum = ICalculumVault(calculum);
        uint256 calDecimals = 10 ** Calculum.decimals();
        IERC20MetadataUpgradeable _asset = IERC20MetadataUpgradeable(asset);
        uint256 currentEpoch = Calculum.CURRENT_EPOCH();
        if (currentEpoch == 0) return 0;
        uint256 targetBalance = Calculum.TARGET_WALLET_BALANCE_USDC_TRANSFER_BOT();
        uint256 currentBalance = _asset.balanceOf(OZW);

        // Calculate the missing USDC amount to reach the target balance
        uint256 missingAmount = targetBalance > currentBalance ? targetBalance - currentBalance : 0;

        // Calculate the total fees to be collected for the current epoch
        uint256 totalFees = getPnLPerVaultToken(calculum, asset)
            ? (MgtFeePerVaultToken(calculum).add(PerfFeePerVaultToken(calculum, asset))).mulDiv(
                Calculum.TOTAL_VAULT_TOKEN_SUPPLY(currentEpoch.sub(1)), calDecimals
            )
            : MgtFeePerVaultToken(calculum).mulDiv(
                Calculum.TOTAL_VAULT_TOKEN_SUPPLY(currentEpoch.sub(1)), calDecimals
            );

        // Take the smallest amount between the missing USDC and the total fees
        // Deduct the amount from the fees sent to the protocol Treasury Wallet
        return missingAmount < totalFees ? missingAmount : totalFees;
    }

    /**
     * @dev Method for update Profit/Loss per vault token generated by the trading strategy for the epoch
     * TODO: check the sign of the profit/loss, because it is negative in some cases
     */
    function getPnLPerVaultToken(address calculum, address asset) public view returns (bool) {
        ICalculumVault Calculum = ICalculumVault(calculum);
        IERC20MetadataUpgradeable _asset = IERC20MetadataUpgradeable(asset);
        uint256 assetDecimals = 10 ** _asset.decimals();
        uint256 currentEpoch = Calculum.CURRENT_EPOCH();
        if ((currentEpoch == 0) || (Calculum.TOTAL_VAULT_TOKEN_SUPPLY(currentEpoch.sub(1)) == 0)) {
            return false;
        }
        return (
            Calculum.DEX_WALLET_BALANCE().mulDiv(
                assetDecimals,
                Calculum.TOTAL_VAULT_TOKEN_SUPPLY(currentEpoch.sub(1)).mulDiv(
                    assetDecimals, 10 ** Calculum.decimals()
                )
            ) >= Calculum.VAULT_TOKEN_PRICE(currentEpoch.sub(1))
        );
    }

    function MgtFeePerVaultToken(address calculum) public view returns (uint256) {
        ICalculumVault Calculum = ICalculumVault(calculum);
        uint256 currentEpoch = Calculum.CURRENT_EPOCH();
        if (currentEpoch == 0) {
            return 0;
        } else {
            return Calculum.VAULT_TOKEN_PRICE(currentEpoch.sub(1)).mulDiv(
                Calculum.MANAGEMENT_FEE_PERCENTAGE().mulDiv(Calculum.EPOCH_DURATION(), 31556926), // the constants is the more appropriate way to indicate a years (equivalent 365.24 days)
                10 ** Calculum.decimals(),
                MathUpgradeable.Rounding.Up
            );
        }
    }

    function PerfFeePerVaultToken(address calculum, address asset) public view returns (uint256) {
        ICalculumVault Calculum = ICalculumVault(calculum);
        if (Calculum.CURRENT_EPOCH() == 0) return 0;
        if (getPnLPerVaultToken(calculum, asset)) {
            return PnLPerVaultToken(calculum, asset).mulDiv(
                Calculum.PERFORMANCE_FEE_PERCENTAGE(),
                10 ** Calculum.decimals(),
                MathUpgradeable.Rounding.Up
            );
        } else {
            return 0;
        }
    }

    /**
     * @dev Method for getting Profit/Loss per vault token generated by the trading strategy for the epoch
     */
    function PnLPerVaultToken(address calculum, address asset) public view returns (uint256) {
        ICalculumVault Calculum = ICalculumVault(calculum);
        uint256 CalDecimals = 10 ** Calculum.decimals();
        IERC20MetadataUpgradeable _asset = IERC20MetadataUpgradeable(asset);
        uint256 assetDecimals = 10 ** _asset.decimals();
        uint256 currentEpoch = Calculum.CURRENT_EPOCH();
        if ((currentEpoch == 0) || (Calculum.TOTAL_VAULT_TOKEN_SUPPLY(currentEpoch.sub(1)) == 0)) {
            return 0;
        }
        if (getPnLPerVaultToken(calculum, asset)) {
            return (
                Calculum.DEX_WALLET_BALANCE().mulDiv(
                    assetDecimals,
                    Calculum.TOTAL_VAULT_TOKEN_SUPPLY(currentEpoch.sub(1)).mulDiv(
                        assetDecimals, CalDecimals
                    )
                ).sub(Calculum.VAULT_TOKEN_PRICE(currentEpoch.sub(1)))
            );
        } else {
            return (
                Calculum.VAULT_TOKEN_PRICE(currentEpoch.sub(1)).sub(
                    Calculum.DEX_WALLET_BALANCE().mulDiv(
                        assetDecimals,
                        Calculum.TOTAL_VAULT_TOKEN_SUPPLY(currentEpoch.sub(1)).mulDiv(
                            assetDecimals, CalDecimals
                        )
                    )
                )
            );
        }
    }

    function UpdateVaultPriceToken(address calculum, address asset) public view returns (uint256) {
        uint256 mgtFee = MgtFeePerVaultToken(calculum);
        uint256 perfFee = PerfFeePerVaultToken(calculum, asset);
        uint256 pnLVT = PnLPerVaultToken(calculum, asset);
        ICalculumVault Calculum = ICalculumVault(calculum);
        uint256 tokenPrice = Calculum.VAULT_TOKEN_PRICE(Calculum.CURRENT_EPOCH().sub(1));
        if (getPnLPerVaultToken(calculum, asset)) {
            return (tokenPrice.add(pnLVT)).sub(mgtFee.add(perfFee)).add(1);
        } else {
            return tokenPrice.sub(pnLVT.add(mgtFee.add(perfFee))).add(1);
        }
    }

    /*//////////////////////////////////////////////////////////////
                    COMMAND SHORTCUTS FOR VERTEX
    //////////////////////////////////////////////////////////////*/

    struct LinkSigner {
        bytes32 sender;
        bytes32 signer;
        uint64 nonce;
    }

    struct WithdrawCollateral {
        bytes32 sender;
        uint32 productId;
        uint128 amount;
        uint64 nonce;
    }

    function getVertexBalance(uint32 productId) public returns (uint256 balance) {
        IFQuerier.SpotBalance memory spotBalance = IFQuerier(FQuerier).getSpotBalance(
            bytes32(abi.encodePacked(uint160(address(this)), defaultSubaccountName)), productId
        );
        balance = spotBalance.balance.amount < 0 ? 0 : uint256(uint128(spotBalance.balance.amount));
    }

    function linkVertexSigner(address vertexEndpoint, address asset, address externalAccount)
        public
    {
        _payFeeVertex(vertexEndpoint, asset, 0);
        bytes32 contractSubaccount =
            bytes32(abi.encodePacked(uint160(address(this)), defaultSubaccountName));
        bytes32 externalSubaccount =
            bytes32(abi.encodePacked(uint160(externalAccount), defaultSubaccountName));
        LinkSigner memory linkSigner = LinkSigner(
            contractSubaccount,
            externalSubaccount,
            IEndpoint(vertexEndpoint).getNonce(externalAccount)
        );
        bytes memory txs = abi.encodePacked(uint8(19), abi.encode(linkSigner));
        IEndpoint(vertexEndpoint).submitSlowModeTransaction(txs);
    }

    // TODO: need to add deposit method for Vertex
    function depositCollateralWithReferral(
        address vertexEndpoint,
        address asset,
        uint32 productId,
        uint256 amount
    ) public {
        _payFeeVertex(vertexEndpoint, asset, amount);
        bytes32 addrBytes32 =
            bytes32(abi.encodePacked(uint160(address(this)), defaultSubaccountName));
        IEndpoint(vertexEndpoint).depositCollateralWithReferral(
            addrBytes32, productId, uint128(amount), DEFAULT_REFERRAL_CODE
        );
    }

    function withdrawVertexCollateral(
        address vertexEndpoint,
        address asset,
        uint32 productId,
        uint256 amount
    ) public {
        _payFeeVertex(vertexEndpoint, asset, 0);
        uint64 nonce = IEndpoint(vertexEndpoint).getNonce(address(this));
        WithdrawCollateral memory withdrawal = WithdrawCollateral(
            bytes32(abi.encodePacked(uint160(address(this)), defaultSubaccountName)),
            productId,
            uint128(amount),
            nonce
        );
        bytes memory txs = abi.encodePacked(uint8(2), abi.encode(withdrawal));
        IEndpoint(vertexEndpoint).submitSlowModeTransaction(txs);
    }

    function _payFeeVertex(address vertexEndpoint, address asset, uint256 amount) private {
        IERC20MetadataUpgradeable _asset = IERC20MetadataUpgradeable(asset);
        SafeERC20Upgradeable.safeIncreaseAllowance(
            _asset, vertexEndpoint, amount + 10 ** _asset.decimals()
        );
        SafeERC20Upgradeable.safeTransferFrom(
            _asset, address(OZW), address(this), 10 ** _asset.decimals()
        );
    }
}
