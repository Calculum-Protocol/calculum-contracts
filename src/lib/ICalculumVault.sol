// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface ICalculumVault {
    // Variables
    function EPOCH_START() external view returns (uint256);

    function MANAGEMENT_FEE_PERCENTAGE() external view returns (uint256);

    function PERFORMANCE_FEE_PERCENTAGE() external view returns (uint256);

    function VAULT_TOKEN_PRICE(uint256 epoch) external view returns (uint256);

    function TOTAL_VAULT_TOKEN_SUPPLY(uint256 epoch) external view returns (uint256);

    function DEX_WALLET_BALANCE() external view returns (uint256);

    function MAX_DEPOSIT() external view returns (uint256);

    function MIN_DEPOSIT() external view returns (uint256);

    function MAX_TOTAL_DEPOSIT() external view returns (uint256);

    function TRANSFER_BOT_MIN_WALLET_BALANCE_USDC() external view returns (uint256);

    function TRANSFER_BOT_TARGET_WALLET_BALANCE_USDC() external view returns (uint256);

    function TRANSFER_BOT_MIN_WALLET_BALANCE_ETH() external view returns (uint256);

    function EPOCH_DURATION() external view returns (uint256);

    function CURRENT_EPOCH() external view returns (uint256);

    function MAINTENANCE_PERIOD_PRE_START() external view returns (uint256);

    function MAINTENANCE_PERIOD_POST_START() external view returns (uint256);

    function openZeppelinDefenderWallet() external view returns (uint256);

    function traderBotWallet() external view returns (uint256);

    function treasuryWallet() external view returns (uint256);

    // Methods

    function getPnLPerVaultToken() external view returns (bool);

    function decimals() external view returns (uint256);
}
