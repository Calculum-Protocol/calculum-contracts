// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./ICalculumVault.sol";
import "./DataTypes.sol";
import "./IEndpoint.sol";
import "@openzeppelin-contracts-upgradeable/contracts/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";
import "@openzeppelin-contracts-upgradeable/contracts/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin-contracts-upgradeable/contracts/utils/math/MathUpgradeable.sol";
import "@openzeppelin-contracts-upgradeable/contracts/token/ERC20/utils/SafeERC20Upgradeable.sol";

library Utils {
    using SafeMathUpgradeable for uint256;
    using MathUpgradeable for uint256;

    address public constant OZW = 0x3194E6AFB431d12b79A398Cf4788ebf9213b8Cc7;

    /**
     * @dev Method to Calculate the Transfer Bot Gas Reserve in USDC in the current epoch
     */
    function CalculateTransferBotGasReserveDA(
        address calculum,
        address asset
    ) public view returns (uint256) {
        ICalculumVault Calculum = ICalculumVault(calculum);
        IERC20MetadataUpgradeable _asset = IERC20MetadataUpgradeable(asset);
        uint256 currentEpoch = Calculum.CURRENT_EPOCH();
        if (currentEpoch == 0) return 0;
        uint256 targetBalance = Calculum
            .TARGET_WALLET_BALANCE_USDC_TRANSFER_BOT();
        uint256 currentBalance = _asset.balanceOf(OZW);

        // Calculate the missing USDC amount to reach the target balance
        uint256 missingAmount = targetBalance > currentBalance
            ? targetBalance - currentBalance
            : 0;

        // Calculate the total fees to be collected for the current epoch
        uint256 totalFees = getPnLPerVaultToken(calculum, asset)
            ? (
                MgtFeePerVaultToken(calculum).add(
                    PerfFeePerVaultToken(calculum, asset)
                )
            ).mulDiv(
                    Calculum.TOTAL_VAULT_TOKEN_SUPPLY(currentEpoch.sub(1)),
                    10 ** Calculum.decimals()
                )
            : MgtFeePerVaultToken(calculum).mulDiv(
                Calculum.TOTAL_VAULT_TOKEN_SUPPLY(currentEpoch.sub(1)),
                10 ** Calculum.decimals()
            );

        // Take the smallest amount between the missing USDC and the total fees
        // Deduct the amount from the fees sent to the protocol Treasury Wallet
        return missingAmount < totalFees ? missingAmount : totalFees;
    }

    /**
     * @dev Method for update Profit/Loss per vault token generated by the trading strategy for the epoch
     * TODO: check the sign of the profit/loss, because it is negative in some cases
     */
    function getPnLPerVaultToken(
        address calculum,
        address asset
    ) public view returns (bool) {
        ICalculumVault Calculum = ICalculumVault(calculum);
        IERC20MetadataUpgradeable _asset = IERC20MetadataUpgradeable(asset);
        uint256 currentEpoch = Calculum.CURRENT_EPOCH();
        if (currentEpoch == 0) return false;
        return (Calculum.DEX_WALLET_BALANCE().mulDiv(
            10 ** _asset.decimals(),
            Calculum.TOTAL_VAULT_TOKEN_SUPPLY(currentEpoch.sub(1)).mulDiv(
                10 ** _asset.decimals(),
                10 ** Calculum.decimals()
            )
        ) >= Calculum.VAULT_TOKEN_PRICE(currentEpoch.sub(1)));
    }

    function MgtFeePerVaultToken(
        address calculum
    ) public view returns (uint256) {
        ICalculumVault Calculum = ICalculumVault(calculum);
        uint256 currentEpoch = Calculum.CURRENT_EPOCH();
        if (currentEpoch == 0) {
            return 0;
        } else {
            return
                Calculum.VAULT_TOKEN_PRICE(currentEpoch.sub(1)).mulDiv(
                    Calculum.MANAGEMENT_FEE_PERCENTAGE().mulDiv(
                        Calculum.EPOCH_DURATION(),
                        31556926
                    ), // the constants is the more appropriate way to indicate a years (equivalent 365.24 days)
                    10 ** Calculum.decimals(),
                    MathUpgradeable.Rounding.Up
                );
        }
    }

    function PerfFeePerVaultToken(
        address calculum,
        address asset
    ) public view returns (uint256) {
        ICalculumVault Calculum = ICalculumVault(calculum);
        if (Calculum.CURRENT_EPOCH() == 0) return 0;
        if (getPnLPerVaultToken(calculum, asset)) {
            return
                PnLPerVaultToken(calculum, asset).mulDiv(
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
    function PnLPerVaultToken(
        address calculum,
        address asset
    ) public view returns (uint256) {
        ICalculumVault Calculum = ICalculumVault(calculum);
        IERC20MetadataUpgradeable _asset = IERC20MetadataUpgradeable(asset);
        uint256 currentEpoch = Calculum.CURRENT_EPOCH();
        if (currentEpoch == 0) return 0;
        if (getPnLPerVaultToken(calculum, asset)) {
            return (
                Calculum
                    .DEX_WALLET_BALANCE()
                    .mulDiv(
                        10 ** _asset.decimals(),
                        Calculum
                            .TOTAL_VAULT_TOKEN_SUPPLY(currentEpoch.sub(1))
                            .mulDiv(
                                10 ** _asset.decimals(),
                                10 ** Calculum.decimals()
                            )
                    )
                    .sub(Calculum.VAULT_TOKEN_PRICE(currentEpoch.sub(1)))
            );
        } else {
            return (
                Calculum.VAULT_TOKEN_PRICE(currentEpoch.sub(1)).sub(
                    Calculum.DEX_WALLET_BALANCE().mulDiv(
                        10 ** _asset.decimals(),
                        Calculum
                            .TOTAL_VAULT_TOKEN_SUPPLY(currentEpoch.sub(1))
                            .mulDiv(
                                10 ** _asset.decimals(),
                                10 ** Calculum.decimals()
                            )
                    )
                )
            );
        }
    }

    function UpdateVaultPriceToken(
        address calculum,
        address asset
    ) public view returns (uint256) {
        uint256 mgtFee = MgtFeePerVaultToken(calculum);
        uint256 perfFee = PerfFeePerVaultToken(calculum, asset);
        uint256 pnLVT = PnLPerVaultToken(calculum, asset);
        ICalculumVault Calculum = ICalculumVault(calculum);
        uint256 tokenPrice = Calculum.VAULT_TOKEN_PRICE(
            Calculum.CURRENT_EPOCH().sub(1)
        );
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

    struct DepositCollateral {
        // last 12 bytes of the subaccount bytes32
        bytes12 subaccountName;
        uint32 productId;
        // raw amount of the ERC20 contract; i.e. 
        // if USDC has 6 decimals and you want to deposit 1 USDC
        // provide 1e6; if wETH has 18 decimals and you want to
        // deposit 1 wETH, provide 1e18
        uint128 amount;
    }

    struct WithdrawCollateral {
        bytes32 sender;
        uint32 productId;
        uint128 amount;
        uint64 nonce;
    }

    function linkVertexSigner(
        address vertexEndpoint,
        address externalAccount
    ) internal {
        bytes12 defaultSubaccountName = bytes12(abi.encodePacked("default"));
        bytes32 contractSubaccount = bytes32(
            abi.encodePacked(uint160(address(this)), defaultSubaccountName)
        );
        bytes32 externalSubaccount = bytes32(
            uint256(uint160(externalAccount)) << 96
        );
        LinkSigner memory linkSigner = LinkSigner(
            contractSubaccount,
            externalSubaccount,
            IEndpoint(vertexEndpoint).getNonce(externalAccount)
        );
        bytes memory txs = abi.encodePacked(
            uint8(DataTypes.TransactionType.LinkSigner),
            abi.encode(linkSigner)
        );
        IEndpoint(vertexEndpoint).submitSlowModeTransaction(txs);
    }

    // TODO: need to add deposit method for Vertex
    function depositVertexCollateral(
        address vertexEndpoint,
        address subaccount,
        uint32 productId,
        uint128 amount
    ) internal {
        bytes32 addrBytes32 = bytes32(uint256(uint160(subaccount)));
        bytes12 result;
        assembly {
            mstore(result, addrBytes32)
        }
        IEndpoint(vertexEndpoint).depositCollateral(
            result,
            productId,
            amount);
    }

    function withdrawVertexCollateral(
        address vertexEndpoint,
        address sender,
        uint32 productId,
        uint128 amount
    ) internal {
        WithdrawCollateral memory withdrawal = WithdrawCollateral(
            bytes32(uint256(uint160(sender)) << 96),
            productId,
            amount,
            IEndpoint(vertexEndpoint).getNonce(sender)
        );
        bytes memory txs = abi.encodePacked(uint8(DataTypes.TransactionType.WithdrawCollateral), abi.encode(withdrawal));
        IEndpoint(vertexEndpoint).submitSlowModeTransaction(txs);
    }
}
