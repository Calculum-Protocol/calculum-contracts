// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "forge-std/Test.sol";
import {
    Helpers,
    CalculumVault,
    IUniswapV2Router02,
    IERC20MetadataUpgradeable
} from "../../src/CalculumVault.sol";
import {USDC} from "../../src/USDC.sol";
import {MockUpOracle} from "../../src/mock/MockUpOracle.sol";
import {UUPSProxy} from "OZ-Upgradeable-Foundry/src/UpgradeUUPS.sol";
import {BasicTest} from "./BasicTest.t.sol";

contract WorkFlowTest is BasicTest {
    event PendingDeposit(
        address indexed caller, address indexed receiver, uint256 assets, uint256 estimationOfShares
    );

    event Transfer(address indexed from, address indexed to, uint256 amount);

    function testEpoch1() public {
        vm.startPrank(deployer);
        // Move to after the Maintenance Time Post Maintenance
        vm.warp(block.timestamp + MAINT_TIME_AFTER * 6);
        vault.setEpochDuration(EPOCH_DURATION, MAINT_TIME_AFTER, MAINT_TIME_BEFORE);
        vault.setInitialValue([MIN_DEPOSIT_PER_ADDR, MAX_DEPOSIT_PER_ADDR, TOKEN_MAX_TOTAL_DEPOSIT]);
        vm.stopPrank();

        // Test investor0: alice
        address alice = investors[0];
        vm.startPrank(alice);
        uint256 depositAmount = MAX_DEPOSIT_PER_ADDR + 1;
        vm.expectRevert(
            abi.encodeWithSelector(Helpers.DepositExceededMax.selector, alice, MAX_DEPOSIT_PER_ADDR)
        );
        vault.deposit(depositAmount, alice);
        depositAmount = MIN_DEPOSIT_PER_ADDR - 1;
        vm.expectRevert(
            abi.encodeWithSelector(Helpers.DepositAmountTooLow.selector, alice, depositAmount)
        );
        vault.deposit(depositAmount, alice);

        // before Alice
        uint256 balanceBefore = usdc.balanceOf(alice);
        (Helpers.Status statusBefore,,,) = vault.DEPOSITS(alice);
        assertTrue(
            statusBefore == Helpers.Status.Inactive,
            "epoch 0: deposit status should be 0 before deposit"
        );
        depositAmount = _usdc(1500);
        vm.expectEmit(true, true, false, true);
        emit Transfer(alice, address(vault), depositAmount);
        vm.expectEmit(true, true, false, true);
        emit PendingDeposit(alice, alice, depositAmount, 1500 ether);
        vault.deposit(depositAmount, alice);

        (Helpers.Status status, uint256 amountAssets, uint256 amountShares, uint256 finalAmount) =
            vault.DEPOSITS(alice);
        assertTrue(
            status == Helpers.Status.Pending, "epoch 0: deposit status should be 1 when pending"
        );
        assertEq(amountAssets, _usdc(1500), "epoch 0: wrong assets amount in vault");
        assertEq(amountShares, 1500 ether, "epoch 0: wrong shares amount in vault");
        assertEq(finalAmount, 0, "epoch 0: wrong final amount in vault");
        assertEq(vault.balanceOf(alice), 0, "epoch 0: wrong token balance when pending");
        assertEq(vault.balanceOf(alice), 0, "epoch 0: wrong token balance");
        assertEq(
            usdc.balanceOf(alice) + depositAmount,
            balanceBefore,
            "epoch 0: wrong balance of usdc after deposit"
        );

        uint256 nextEpochTime = vault.getNextEpoch();
        vm.warp(nextEpochTime - 70 minutes);
        vm.stopPrank();
        vm.expectRevert(
            abi.encodeWithSelector(
                Helpers.VaultOutMaintenance.selector, transferBotRoleAddress, block.timestamp
            )
        );
        hoax(transferBotRoleAddress);
        vault.finalizeEpoch();
        vm.warp(block.timestamp + 55 minutes);
        hoax(transferBotRoleAddress);
        vm.warp(block.timestamp + 1 minutes);
        vault.finalizeEpoch();

        (status, amountAssets, amountShares, finalAmount) = vault.DEPOSITS(alice);
        assertTrue(
            status == Helpers.Status.Claimet,
            "epoch 1: deposit status should be 2 after finalize previous epoch"
        );
    }
}
