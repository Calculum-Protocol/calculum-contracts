// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./Errors.sol";
import "./IRouter.sol";
import "./TickMath.sol";
import "./FullMath.sol";
import "@openzeppelin-contracts-upgradeable/contracts/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin-contracts-upgradeable/contracts/utils/math/MathUpgradeable.sol";
import
    "@openzeppelin-contracts-upgradeable/contracts/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";
import "@openzeppelin-contracts-upgradeable/contracts/token/ERC20/utils/SafeERC20Upgradeable.sol";

/// @custom:oz-upgrades-unsafe-allow external-library-linking
library UniswapLibV3 {
    using SafeMathUpgradeable for uint256;
    using MathUpgradeable for uint256;
    using SafeERC20Upgradeable for IERC20Upgradeable;

    uint256 private constant TWAP_INTERVAL = 60 * 15; // 15 minutes twap;
    address public constant OZW = 0xB19b03Bf35bBdd30CF154bef41c19621a17068f2; // OpenZeppelin Defender Wallet Arbitrum Mainnet
    // address public constant OZW = 0xc6B04026Ad05981840aD6bD77c924c67bAeCf0DC; // OpenZeppelin Defender Wallet Unit Test

    /// @dev Method to get the price of 1 token of tokenAddress if swapped for paymentToken
    /// @param tokenAddress ERC20 token address of a whitelisted ERC20 token
    /// @return price Price in payment Token equivalent with its decimals
    function getPriceInPaymentToken(address tokenAddress, address routerAddress)
        public
        view
        returns (uint256 price)
    {
        IRouter router = IRouter(routerAddress);
        if (tokenAddress == address(router.WETH9())) return 1;
        IUniFactory factory = IUniFactory(router.factory());
        IUniPool pool;
        pool = IUniPool(factory.getPool(tokenAddress, address(router.WETH9()), 500));

        if (address(pool) == address(0)) {
            pool = IUniPool(factory.getPool(address(router.WETH9()), tokenAddress, 500));
            if (address(pool) == address(0)) revert Errors.NotZeroAddress();
        }

        address poolToken0 = pool.token0();
        address poolToken1 = pool.token1();

        bool invertPrice;

        if (poolToken0 == tokenAddress && poolToken1 == address(router.WETH9())) {
            invertPrice = false;
        } else if (poolToken0 == address(router.WETH9()) && poolToken1 == tokenAddress) {
            invertPrice = true;
        } else {
            revert Errors.WrongUniswapConfig();
        }

        uint32[] memory secondsAgos = new uint32[](2);
        secondsAgos[0] = uint32(TWAP_INTERVAL);
        secondsAgos[1] = 0;

        (int56[] memory tickCumulatives,) = pool.observe(secondsAgos);

        int56 tickCumulativesDelta = tickCumulatives[1] - tickCumulatives[0];
        int24 tick = int24(tickCumulativesDelta / int56(int256(TWAP_INTERVAL)));

        if (tickCumulativesDelta < 0 && (tickCumulativesDelta % int256(TWAP_INTERVAL) != 0)) {
            tick--;
        }

        uint256 baseAmount = 10 ** IERC20MetadataUpgradeable(tokenAddress).decimals();

        price = uint256(_getQuoteAtTick(tick, baseAmount, tokenAddress, address(router.WETH9())));
    }

    /// @dev Internal method to swap ERC20 whitelisted tokens for payment Token
    /// @param tokenAddress ERC20 token address of the whitelisted address
    /// @param routerAddress Amount of tokens to be swapped with UniSwap v2 router to payment Token
    function _swapTokensForETH(address tokenAddress, address routerAddress) public {
        IRouter router = IRouter(routerAddress);
        IERC20MetadataUpgradeable _asset = IERC20MetadataUpgradeable(tokenAddress);
        uint256 assetsDecimals = 10 ** _asset.decimals();
        uint256 tokenAmount = _asset.balanceOf(OZW) - assetsDecimals; // pay 1 USDc fee for Vertex Protocol
        uint256 expectedAmount = tokenAmount.mulDiv(
            getPriceInPaymentToken(address(_asset), address(router)), assetsDecimals
        );
        SafeERC20Upgradeable.safeTransferFrom(_asset, address(OZW), address(this), tokenAmount);
        uint256 currentAllowance =
            IERC20Upgradeable(tokenAddress).allowance(address(this), address(router));
        if (currentAllowance <= tokenAmount) {
            SafeERC20Upgradeable.safeIncreaseAllowance(
                IERC20Upgradeable(tokenAddress), address(router), tokenAmount - currentAllowance
            );
        }

        IRouter.ExactInputSingleParams memory params = IRouter.ExactInputSingleParams({
            tokenIn: tokenAddress,
            tokenOut: address(router.WETH9()),
            fee: 500,
            recipient: address(this),
            amountIn: tokenAmount,
            amountOutMinimum: expectedAmount.mulDiv(0.95 ether, 1 ether), // 10% slippage
            sqrtPriceLimitX96: 0
        });

        router.exactInputSingle(params);

        // unwrap WETH to ETH
        IWETH9 weth = IWETH9(address(router.WETH9()));
        uint256 balance = weth.balanceOf(address(this));
        weth.withdraw(balance);
        // security way transfer ETH to openZeppelinDefenderWallet
        (bool success,) = OZW.call{value: balance}("");
        if (!success) {
            revert Errors.TransferFailed(OZW, expectedAmount);
        }
    }

    /// @dev Internal method to calculate quote price at a determined Uniswap tick value
    function _getQuoteAtTick(int24 tick, uint256 baseAmount, address baseToken, address quoteToken)
        public
        pure
        returns (uint256 quoteAmount)
    {
        uint160 sqrtRatioX96 = TickMath.getSqrtRatioAtTick(tick);

        // Calculate quoteAmount with better precision if it doesn't overflow when multiplied by itself
        if (sqrtRatioX96 <= type(uint128).max) {
            uint256 ratioX192 = uint256(sqrtRatioX96) * sqrtRatioX96;
            quoteAmount = baseToken < quoteToken
                ? FullMath.mulDiv(ratioX192, baseAmount, 1 << 192)
                : FullMath.mulDiv(1 << 192, baseAmount, ratioX192);
        } else {
            uint256 ratioX128 = FullMath.mulDiv(sqrtRatioX96, sqrtRatioX96, 1 << 64);
            quoteAmount = baseToken < quoteToken
                ? FullMath.mulDiv(ratioX128, baseAmount, 1 << 128)
                : FullMath.mulDiv(1 << 128, baseAmount, ratioX128);
        }
    }
}
