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

    function MIN_WALLET_BALANCE_USDC_TRANSFER_BOT() external view returns (uint256);

    function TARGET_WALLET_BALANCE_USDC_TRANSFER_BOT() external view returns (uint256);

    function MIN_WALLET_BALANCE_ETH_TRANSFER_BOT() external view returns (uint256);

    function ETH_GAS_RESERVE_USDC_TRANSFER_BOT() external view returns (uint256);

    function EPOCH_DURATION() external view returns (uint256);

    function CURRENT_EPOCH() external view returns (uint256);

    function MAINTENANCE_PERIOD_PRE_START() external view returns (uint256);

    function MAINTENANCE_PERIOD_POST_START() external view returns (uint256);

    // Methods

    function getPnLPerVaultToken() external view returns (bool);

    // function MgtFeePerVaultToken() external view returns (uint256);

    // function PerfFeePerVaultToken() external view returns (uint256);

    // function PnLPerVaultToken() external view returns (uint256);

    function decimals() external view returns (uint256);

    function newDeposits() external view returns (uint256);
}
