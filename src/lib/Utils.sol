// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./ICalculumVault.sol";
import "./DataTypes.sol";
import "./Errors.sol";
import "./IEndpoint.sol";
import "./IFQuerier.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

library Utils {
    using Math for uint256;

    // address public constant OZW =

    // address public constant FQuerier = address(0x1693273B443699bee277eCbc60e2C8027E91995d); // Arbitrum Mainnet
    address public constant FQuerier =
        address(0x2F579046eC1e88Ff580ca5ED9373e91ece8894b0); // Arbitrum Testnet
    // address public constant OZW = address(0xB8df119948e3bb1cf2255EBAfc4b9CE35b11CA22); // OpenZeppelin Defender Wallet Arbitrum Mainnet
    address public constant OZW =
        address(0x60153ec0A8151f11f8c0b32D069782bf0D366a3A); // OpenZeppelin Defender Wallet Arbitrum Testnet

    bytes12 private constant defaultSubaccountName =
        bytes12(abi.encodePacked("default"));
    string constant DEFAULT_REFERRAL_CODE = "-1";

    /**
     * @dev Calculates the required USDC reserve for the Transfer Bot in the current epoch.
     * @param calculum Address of the CalculumVault contract.
     * @param asset Address of the asset (USDC) contract.
     * @return The amount of USDC needed to meet the target balance.
     */
    function CalculateTransferBotGasReserveDA(
        address calculum,
        address asset
    ) public view returns (uint256) {
        ICalculumVault Calculum = ICalculumVault(calculum);
        uint256 calDecimals = 10 ** Calculum.decimals();
        IERC20Metadata _asset = IERC20Metadata(asset);
        uint256 currentEpoch = Calculum.CURRENT_EPOCH();
        if (currentEpoch == 0) return 0;
        uint256 targetBalance = Calculum
            .TRANSFER_BOT_TARGET_WALLET_BALANCE_USDC();
        uint256 currentBalance = _asset.balanceOf(OZW);

        // Calculate the missing USDC amount to reach the target balance
        uint256 missingAmount = targetBalance > currentBalance
            ? targetBalance - currentBalance
            : 0;

        // Calculate the total fees to be collected for the current epoch
        uint256 totalFees = getPnLPerVaultToken(calculum, asset)
            ? (MgtFeePctVaultToken(calculum) +
                PerfFeePctVaultToken(calculum, asset)).mulDiv(
                    Calculum.TOTAL_VAULT_TOKEN_SUPPLY(currentEpoch - 1),
                    calDecimals
                )
            : MgtFeePctVaultToken(calculum).mulDiv(
                Calculum.TOTAL_VAULT_TOKEN_SUPPLY(currentEpoch - 1),
                calDecimals
            );

        // Return the smaller amount between the missing USDC and the total fees
        return missingAmount < totalFees ? missingAmount : totalFees;
    }

    /**
     * @dev Determines if the profit per vault token for the current epoch is positive.
     * Returns false if the current epoch is 0 or if there are no vault tokens in the previous epoch.
     */
    function getPnLPerVaultToken(
        address calculum,
        address asset
    ) public view returns (bool) {
        ICalculumVault Calculum = ICalculumVault(calculum);
        IERC20Metadata _asset = IERC20Metadata(asset);
        uint256 assetDecimals = 10 ** _asset.decimals();
        uint256 currentEpoch = Calculum.CURRENT_EPOCH();
        if (
            (currentEpoch == 0) ||
            (Calculum.TOTAL_VAULT_TOKEN_SUPPLY(currentEpoch - 1) == 0)
        ) {
            return false;
        }
        return (Calculum.DEX_WALLET_BALANCE().mulDiv(
            assetDecimals,
            Calculum.TOTAL_VAULT_TOKEN_SUPPLY(currentEpoch - 1).mulDiv(
                assetDecimals,
                10 ** Calculum.decimals()
            )
        ) >= Calculum.VAULT_TOKEN_PRICE(currentEpoch - 1));
    }

    /**
     * @dev Calculates the management fee per vault token for the current epoch.
     * Returns 0 if the current epoch is 0.
     */
    function MgtFeePctVaultToken(
        address calculum
    ) public view returns (uint256) {
        ICalculumVault Calculum = ICalculumVault(calculum);
        uint256 currentEpoch = Calculum.CURRENT_EPOCH();
        if (currentEpoch == 0) {
            return 0;
        } else {
            return
                Calculum.VAULT_TOKEN_PRICE(currentEpoch - 1).mulDiv(
                    Calculum.MANAGEMENT_FEE_PERCENTAGE().mulDiv(
                        Calculum.EPOCH_DURATION(),
                        31556926
                    ), // 31556926 represents the number of seconds in a year (365.24 days)
                    10 ** Calculum.decimals(),
                    Math.Rounding.Ceil
                );
        }
    }

    /**
     * @dev Calculates the performance fee per vault token for the current epoch.
     * Returns 0 if the current epoch is 0 or if there is no profit.
     */
    function PerfFeePctVaultToken(
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
                    Math.Rounding.Ceil
                );
        } else {
            return 0;
        }
    }

    /**
     * @dev Calculates the Profit/Loss per vault token for the current epoch.
     * Returns the difference between the DEX wallet balance per vault token and the previous vault token price.
     */
    function PnLPerVaultToken(
        address calculum,
        address asset
    ) public view returns (uint256) {
        ICalculumVault Calculum = ICalculumVault(calculum);
        uint256 CalDecimals = 10 ** Calculum.decimals();
        IERC20Metadata _asset = IERC20Metadata(asset);
        uint256 assetDecimals = 10 ** _asset.decimals();
        uint256 currentEpoch = Calculum.CURRENT_EPOCH();
        if (
            (currentEpoch == 0) ||
            (Calculum.TOTAL_VAULT_TOKEN_SUPPLY(currentEpoch - 1) == 0)
        ) {
            return 0;
        }
        if (getPnLPerVaultToken(calculum, asset)) {
            return (Calculum.DEX_WALLET_BALANCE().mulDiv(
                assetDecimals,
                Calculum.TOTAL_VAULT_TOKEN_SUPPLY(currentEpoch - 1).mulDiv(
                    assetDecimals,
                    CalDecimals
                )
            ) - (Calculum.VAULT_TOKEN_PRICE(currentEpoch - 1)));
        } else {
            return (Calculum.VAULT_TOKEN_PRICE(currentEpoch - 1) -
                (
                    Calculum.DEX_WALLET_BALANCE().mulDiv(
                        assetDecimals,
                        Calculum
                            .TOTAL_VAULT_TOKEN_SUPPLY(currentEpoch - 1)
                            .mulDiv(assetDecimals, CalDecimals)
                    )
                ));
        }
    }

    /**
     * @dev Updates the vault token price for the current epoch.
     * @param calculum Address of the CalculumVault contract.
     * @param asset Address of the asset (USDC) contract.
     * @return The updated vault token price.
     */
    function UpdateVaultPriceToken(
        address calculum,
        address asset
    ) public view returns (uint256) {
        uint256 mgtFee = MgtFeePctVaultToken(calculum);
        uint256 perfFee = PerfFeePctVaultToken(calculum, asset);
        uint256 pnLVT = PnLPerVaultToken(calculum, asset);
        ICalculumVault Calculum = ICalculumVault(calculum);
        uint256 tokenPrice = Calculum.VAULT_TOKEN_PRICE(
            Calculum.CURRENT_EPOCH() - 1
        );
        if (getPnLPerVaultToken(calculum, asset)) {
            return (tokenPrice + pnLVT) - (mgtFee + perfFee) + 1;
        } else {
            return tokenPrice - (pnLVT + (mgtFee + perfFee)) + 1;
        }
    }

    /*//////////////////////////////////////////////////////////////
                    COMMAND SHORTCUTS FOR VERTEX
    //////////////////////////////////////////////////////////////*/

    struct LinkSigner {
        bytes32 sender; // Subaccount of the contract
        bytes32 signer; // Subaccount of the external account
        uint64 nonce; // Unique transaction identifier
    }

    struct WithdrawCollateral {
        bytes32 sender; // Subaccount initiating the withdrawal
        uint32 productId; // ID of the product to withdraw from
        uint128 amount; // Amount of collateral to withdraw
        uint64 nonce; // Unique transaction identifier
    }

    /**
     * @dev Retrieves the Vertex balance by calling the getUnhealthBalance function.
     * @return balance The current balance from the Vertex subaccount.
     */
    function getVertexBalance() public returns (uint256 balance) {
        (, balance) = getUnhealthBalance();
    }

    // Retrieves the subaccount information and calculates the balance based on health status
    function getUnhealthBalance()
        public
        returns (IFQuerier.SubaccountInfo memory unhBalance, uint256 balance)
    {
        // Fetch subaccount information from the FQuerier contract
        unhBalance = IFQuerier(FQuerier).getSubaccountInfo(
            bytes32(
                abi.encodePacked(uint160(address(this)), defaultSubaccountName)
            )
        );
        // Calculate balance based on health status
        balance = unhBalance.healths[2].health < 0
            ? 0
            : uint256(uint128(unhBalance.healths[2].health));
    }

    /**
     * @dev Links an external account's subaccount to the contract's subaccount on the Vertex platform.
     * @param vertexEndpoint Address of the Vertex endpoint contract.
     * @param asset Address of the asset (USDC) contract.
     * @param externalAccount Address of the external account to link.
     */
    function linkVertexSigner(
        address vertexEndpoint,
        address asset,
        address externalAccount
    ) public {
        _payFeeVertex(vertexEndpoint, asset, 0);
        bytes32 contractSubaccount = bytes32(
            abi.encodePacked(uint160(address(this)), defaultSubaccountName)
        );
        bytes32 externalSubaccount = bytes32(
            abi.encodePacked(uint160(externalAccount), defaultSubaccountName)
        );
        LinkSigner memory linkSigner = LinkSigner(
            contractSubaccount,
            externalSubaccount,
            IEndpoint(vertexEndpoint).getNonce(externalAccount)
        );
        bytes memory txs = abi.encodePacked(uint8(19), abi.encode(linkSigner));
        IEndpoint(vertexEndpoint).submitSlowModeTransaction(txs);
    }

    /**
     * @dev Deposits collateral into the Vertex platform with a referral code.
     * @param vertexEndpoint Address of the Vertex endpoint contract.
     * @param asset Address of the asset (USDC) contract.
     * @param productId ID of the product to deposit into.
     * @param amount Amount of collateral to deposit.
     */
    function depositCollateralWithReferral(
        address vertexEndpoint,
        address asset,
        uint32 productId,
        uint256 amount
    ) public {
        _payFeeVertex(vertexEndpoint, asset, amount);
        bytes32 addrBytes32 = bytes32(
            abi.encodePacked(uint160(address(this)), defaultSubaccountName)
        );
        IEndpoint(vertexEndpoint).depositCollateralWithReferral(
            addrBytes32,
            productId,
            uint128(amount),
            DEFAULT_REFERRAL_CODE
        );
    }

    /**
     * @dev Withdraws collateral from the Vertex platform.
     * @param vertexEndpoint Address of the Vertex endpoint contract.
     * @param asset Address of the asset (USDC) contract.
     * @param productId ID of the product to withdraw from.
     * @param amount Amount of collateral to withdraw.
     */
    function withdrawVertexCollateral(
        address vertexEndpoint,
        address asset,
        uint32 productId,
        uint256 amount
    ) public {
        _payFeeVertex(vertexEndpoint, asset, 0);
        uint64 nonce = IEndpoint(vertexEndpoint).getNonce(address(this));
        WithdrawCollateral memory withdrawal = WithdrawCollateral(
            bytes32(
                abi.encodePacked(uint160(address(this)), defaultSubaccountName)
            ),
            productId,
            uint128(amount),
            nonce
        );
        bytes memory txs = abi.encodePacked(uint8(2), abi.encode(withdrawal));
        IEndpoint(vertexEndpoint).submitSlowModeTransaction(txs);
    }

    /**
     * @dev Handles the fee payment for Vertex transactions.
     * @param vertexEndpoint Address of the Vertex endpoint contract.
     * @param asset Address of the asset (USDC) contract.
     * @param amount Amount of collateral to deposit.
     */
    function _payFeeVertex(
        address vertexEndpoint,
        address asset,
        uint256 amount
    ) internal {
        IERC20Metadata _asset = IERC20Metadata(asset);
        SafeERC20.safeIncreaseAllowance(
            _asset,
            vertexEndpoint,
            amount + 10 ** _asset.decimals()
        );
        SafeERC20.safeTransferFrom(
            _asset,
            address(OZW),
            address(this),
            10 ** _asset.decimals()
        );
    }
}
