// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "forge-std/Test.sol";
import {Helpers} from "../../src/CalculumVault.sol";
import {USDC} from "../../src/USDC.sol";
import {MockUpOracle} from "../../src/mock/MockUpOracle.sol";
import {UUPSProxy} from "OZ-Upgradeable-Foundry/UpgradeUUPS.sol";
import {BasicTest} from "./BasicTest.t.sol";

contract WorkFlowTest is BasicTest {

    event PendingDeposit(
        address indexed caller, address indexed receiver, uint256 assets, uint256 estimationOfShares
    );

    event PendingWithdraw(
        address indexed receiver, address indexed owner, uint256 assets, uint256 estimationOfShares
    );

    event Deposit(address indexed sender, address indexed owner, uint256 assets, uint256 shares);

    event Withdraw(
        address indexed sender, address indexed receiver, address indexed owner, uint256 assets, uint256 shares
    );

    event Transfer(address indexed from, address indexed to, uint256 amount);

    event FeesTransfer(uint256 indexed epoch, uint256 Amount);

    event DexTransfer(uint256 indexed epoch, uint256 Amount);

    function testEpoch0() public returns (uint256, uint256) {
        vm.startPrank(deployer);
        // Move to after the Maintenance Time Post Maintenance
        vm.warp(block.timestamp + MAINT_TIME_AFTER + MAINT_TIME_BEFORE);
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
        vm.stopPrank();

        vm.startPrank(alice);
        uint256 balanceBefore = usdc.balanceOf(alice);
        (Helpers.Status statusBefore,,,) = vault.DEPOSITS(alice);
        assertTrue(
            statusBefore == Helpers.Status.Inactive,
            "epoch 0: deposit status should be 0 before deposit"
        );
        depositAmount = _usdc(150_000);
        vm.expectEmit(true, true, false, true, address(usdc));
        emit Transfer(alice, address(vault), depositAmount);
        vm.expectEmit(true, true, false, true, address(vault));
        emit PendingDeposit(alice, alice, depositAmount, 150_000 ether);
        vault.deposit(depositAmount, alice);
        vm.stopPrank();

        (Helpers.Status status, uint256 amountAssets, uint256 amountShares, uint256 finalAmount) =
            vault.DEPOSITS(alice);
        assertTrue(
            status == Helpers.Status.Pending, "epoch 0: deposit status should be 1 when pending"
        );
        assertEq(amountAssets, _usdc(150_000), "epoch 0: wrong assets amount in vault");
        assertEq(amountShares, 150_000 ether, "epoch 0: wrong shares amount in vault");
        assertEq(finalAmount, 0, "epoch 0: wrong final amount in vault");
        assertEq(vault.balanceOf(alice), 0, "epoch 0: wrong token balance when pending");
        assertEq(vault.balanceOf(alice), 0, "epoch 0: wrong token balance");
        assertEq(
            usdc.balanceOf(alice) + depositAmount,
            balanceBefore,
            "epoch 0: wrong balance of usdc after deposit"
        );

        hoax(deployer);
        oracle.setAssetValue(_usdc(150_000));

        vm.startPrank(transferBotRoleAddress);
        vm.expectRevert(abi.encodeWithSelector(Helpers.VaultOutMaintenance.selector, transferBotRoleAddress, block.timestamp));
        vault.finalizeEpoch();
        vm.warp(vault.getNextEpoch() + MAINT_TIME_AFTER - 43 minutes);
        vault.finalizeEpoch();

        (status, amountAssets , amountShares, finalAmount) = vault.DEPOSITS(alice);
        assertTrue(status == Helpers.Status.Claimet, "epoch 0: deposit status should be 2 after finalize previous epoch");
        uint256 currentEpoch = vault.CURRENT_EPOCH();
        assertEq(currentEpoch, 0, "epoch 0: should be epoch 0");
        assertEq(amountAssets, 0, "epoch 0: wrong assets amount in vault");
        assertEq(amountShares, 150_000 ether, "epoch 0: wrong shares amount in vault");
        assertEq(finalAmount, _usdc(150_000), "epoch 0: wrong final amount in vault");
        uint256 vaultBalanceBefore = usdc.balanceOf(address(vault));
        vm.expectEmit(true, true, false, true, address(usdc));
        emit Transfer(address(vault), transferBotWallet, _usdc(150_000));
        vault.dexTransfer();
        uint256 vaultBalanceAfter = usdc.balanceOf(address(vault));
        assertEq(vaultBalanceAfter + _usdc(150_000), vaultBalanceBefore, "epoch 0: wrong USDC balance change of vault");
        assertEq(vaultBalanceAfter, 0, "epoch 0: USDC balance in vault should be 0");
        assertEq(usdc.balanceOf(transferBotWallet), _usdc(150_000), "epoch 0: wrong USDC balance of tranfer bot");

        vm.expectRevert(Helpers.FirstEpochNoFeeTransfer.selector);
        vault.feesTransfer();
        vm.stopPrank();

        vm.warp(vault.getNextEpoch() + 1);
        hoax(deployer);
        vault.CurrentEpoch();

        return (usdc.balanceOf(address(vault)), usdc.balanceOf(transferBotWallet));
    }

    function testEpoch1() public returns (uint256, uint256) {
        (, uint256 transferBotBalance) = testEpoch0();
        assertEq(vault.CURRENT_EPOCH(), 1, "epoch 1: already in epoch 1");

        address alice = investors[0];
        address bob = investors[1];

        vm.expectRevert(abi.encodeWithSelector(Helpers.VaultInMaintenance.selector, deployer, block.timestamp));
        hoax(deployer);
        vault.setEpochDuration(EPOCH_DURATION, MAINT_TIME_AFTER, MAINT_TIME_BEFORE);
        
        vm.expectRevert(abi.encodeWithSelector(Helpers.VaultInMaintenance.selector, alice, block.timestamp));
        hoax(alice);
        vault.claimShares(alice);

        vm.warp(vault.getCurrentEpoch() + MAINT_TIME_AFTER + MAINT_TIME_BEFORE);
        vm.startPrank(bob);
        vm.expectRevert(abi.encodeWithSelector(Helpers.CallerIsNotOwner.selector, bob, alice));
        vault.claimShares(alice);
        vm.expectRevert(abi.encodeWithSelector(Helpers.CalletIsNotClaimerToDeposit.selector, bob));
        vault.claimShares(bob);
        vm.stopPrank();

        vm.expectEmit(true, true, false, true, address(vault));
        emit Transfer(address(0), alice, 150_000 ether);
        hoax(alice);
        vault.claimShares(alice);
        assertEq(vault.balanceOf(alice), 150_000 ether, "epoch 1: wrong balance of shares");
        (Helpers.Status status,, uint256 amountShares, uint256 finalAmount) = vault.DEPOSITS(alice);
        assertTrue(uint8(status) == 3, "epoch 1: deposit status should be 3");
        assertEq(amountShares, 0, "epoch 1: wrong balance of shares in vault");
        assertEq(finalAmount, _usdc(150_000), "epoch 1: wrong balance of final shares");
    
        hoax(deployer);
        oracle.setAssetValue(146_250_000_000);
        vm.startPrank(transferBotRoleAddress);
        vm.expectRevert(abi.encodeWithSelector(Helpers.VaultOutMaintenance.selector, transferBotRoleAddress, block.timestamp));
        vault.finalizeEpoch();
        vm.warp(vault.getNextEpoch() + MAINT_TIME_AFTER - 43 minutes);
        vault.finalizeEpoch();

        (,, uint256 transferAmount) = vault.netTransfer(vault.CURRENT_EPOCH());

        uint256 expectedGasReserve = 28_800_000;
        assertEq(usdc.balanceOf(address(vault)), 0, "epoch 1: wrong vault balance before dex transfer");
        assertEq(transferAmount, expectedGasReserve, "epoch 1: wrong dex transfer amount");

        vm.expectEmit(true, true, false, true, address(usdc));
        emit Transfer(transferBotWallet, address(vault), transferAmount);
        vm.expectEmit(true, true, false, true, address(usdc));
        emit Transfer(address(vault), transferBotRoleAddress, transferAmount);
        vm.expectEmit(true, false, false, true, address(vault));
        emit DexTransfer(vault.CURRENT_EPOCH(), transferAmount);
        vault.dexTransfer();

        assertEq(usdc.balanceOf(address(vault)), 0, "epoch 1: wrong vault balance after dex transfer");
        assertEq(usdc.balanceOf(transferBotWallet), transferBotBalance - transferAmount, "epoch 1: wrong transfer bot balance after dex transfer");
        assertEq(vault.CalculateTransferBotGasReserveDA(), expectedGasReserve, "epoch 1: wrong gas reserve");

        vm.expectEmit(true, false, false, true, address(vault));
        emit FeesTransfer(vault.CURRENT_EPOCH(), 0);
        vault.feesTransfer();
        vm.stopPrank();

        vm.warp(vault.getNextEpoch() + 1);
        hoax(deployer);
        vault.CurrentEpoch();

        return (usdc.balanceOf(address(vault)), usdc.balanceOf(transferBotWallet));
    }

    function testEpoch2() public returns (uint256, uint256) {
        (uint256 vaultBalance, uint256 transferBotBalance) = testEpoch1();
        assertEq(vault.CURRENT_EPOCH(), 2, "epoch 2: already in epoch 2");

        address bob = investors[1];
        uint256 depositAmount = _usdc(50_000);
        uint256 expectedShares = 51_293.362126007273398750 ether;

        vm.startPrank(bob);
        vm.expectRevert(abi.encodeWithSelector(Helpers.VaultInMaintenance.selector, bob, block.timestamp));
        vault.deposit(depositAmount, bob);

        vm.warp(vault.getCurrentEpoch() + MAINT_TIME_AFTER + MAINT_TIME_BEFORE);
        vm.expectEmit(true, true, false, true, address(usdc));
        emit Transfer(bob, address(vault), depositAmount);
        vm.expectEmit(true, true, false, true, address(vault));
        emit PendingDeposit(bob, bob, depositAmount, expectedShares);
        vault.deposit(depositAmount, bob);
        vm.stopPrank();

        (Helpers.Status status, uint256 amountAssets, uint256 amountShares, uint256 finalAmount) = vault.DEPOSITS(bob);
        assertTrue(status == Helpers.Status.Pending, "epoch 2: deposit status should be 0 before deposit");
        assertEq(amountAssets, _usdc(50_000), "epoch 2: wrong asset amount in vault");
        assertEq(amountShares, expectedShares, "epoch 2: wrong shares amount in vault");
        assertEq(finalAmount, 0, "epoch 2: wrong shares amount in vault");

        assertEq(usdc.balanceOf(address(vault)), vaultBalance + _usdc(50_000), "epoch 2: wrong vault balance after deposit");

        hoax(deployer);
        oracle.setAssetValue(143_296_800_000);
        vm.warp(vault.getNextEpoch() + MAINT_TIME_AFTER - 43 minutes);
        hoax(transferBotRoleAddress);
        vault.finalizeEpoch();

        expectedShares = 52_349.114148290382630146 ether;
        (status, amountAssets, amountShares, finalAmount) = vault.DEPOSITS(bob);
        assertEq(amountShares, expectedShares, "epoch 2: wrong shares amount after finalize");

        (,, uint256 transferAmount) = vault.netTransfer(vault.CURRENT_EPOCH());

        uint256 expectedTransferAmount = 499_719_500_00;
        assertEq(transferAmount, expectedTransferAmount, "epoch 2: wrong net transfer amount");

        uint256 expectedGasReserve = 28_050_000;
        assertEq(vault.CalculateTransferBotGasReserveDA(), expectedGasReserve, "epoch 2: wrong gas reserve");

        vm.startPrank(transferBotRoleAddress);
        vm.expectEmit(true, true, false, true, address(usdc));
        emit Transfer(address(vault), transferBotWallet, transferAmount);
        vm.expectEmit(true, false, false, true, address(vault));
        emit DexTransfer(vault.CURRENT_EPOCH(), transferAmount);
        vault.dexTransfer();

        assertEq(usdc.balanceOf(address(vault)), 0, "epoch 2: wrong vault balance after dex transfer");
        assertEq(usdc.balanceOf(transferBotWallet), transferBotBalance + expectedTransferAmount, "epoch 2: wrong transfer bot balance after dex transfer");

        vm.expectEmit(true, false, false, true, address(vault));
        emit FeesTransfer(vault.CURRENT_EPOCH(), 0);
        vault.feesTransfer();
        vm.stopPrank();

        assertEq(usdc.balanceOf(treasuryWallet), 0, "epoch 2: wrong treasury balance");

        vm.warp(vault.getNextEpoch() + 1);
        hoax(deployer);
        vault.CurrentEpoch();

        return (usdc.balanceOf(address(vault)), usdc.balanceOf(transferBotWallet));
    }

    function testEpoch3() public returns (uint256, uint256) {
        (uint256 vaultBalance, uint256 transferBotBalance) = testEpoch2();
        assertEq(vault.CURRENT_EPOCH(), 3, "epoch 3: already in epoch 3");

        address alice = investors[0];
        address bob = investors[1];
        address carla = investors[2];
        uint256 aliceDepositAmount = _usdc(100_000);
        uint256 carlaDepositAmount = _usdc(30_000);
        uint256 bobExpectedShares = 52_349.114148290382630146 ether;
        uint256 aliceExpectedShares = 141_246.329361015730603701 ether;
        uint256 carlaExpectedShares = 42_373.898808304719181111 ether;

        vm.startPrank(carla);
        vm.expectRevert(abi.encodeWithSelector(Helpers.VaultInMaintenance.selector, carla, block.timestamp));
        vault.deposit(carlaDepositAmount, carla);

        vm.warp(vault.getCurrentEpoch() + MAINT_TIME_AFTER + MAINT_TIME_BEFORE);

        vm.expectRevert(abi.encodeWithSelector(Helpers.CallerIsNotOwner.selector, carla, alice));
        vault.claimShares(alice);
        vm.expectRevert(abi.encodeWithSelector(Helpers.CalletIsNotClaimerToDeposit.selector, carla));
        vault.claimShares(carla);
        vm.stopPrank();

        //
        // Bob
        //
        vm.startPrank(bob);
        (Helpers.Status status, uint256 amountAssets, uint256 amountShares, uint256 finalAmount) = vault.DEPOSITS(bob);
        assertTrue(status == Helpers.Status.Claimet, "epoch 3: wrong status of bob's deposit before claiming");
        assertEq(finalAmount, _usdc(50_000), "epoch 3: wrong amount of assets for bob before claiming");
        assertEq(bobExpectedShares, amountShares, "epoch 3: wrong amount of shares for bob before claiming");

        vm.expectEmit(true, true, false, true, address(vault));
        emit Transfer(address(0), bob, bobExpectedShares);
        vault.claimShares(bob);
        assertEq(vault.balanceOf(bob), bobExpectedShares, "epoch 3: wrong amount of balance for bob after claiming");

        (status,, amountShares, finalAmount) = vault.DEPOSITS(bob);
        assertEq(uint8(status), 3, "epoch 3: wrong status of bob's deposit after claiming");
        assertEq(finalAmount, _usdc(50_000), "epoch 3: wrong amount of assets for bob after claiming");
        assertEq(amountShares, 0 ether, "epoch 3: wrong amount of shares for bob after claiming");
        vm.stopPrank();

        vm.expectRevert(abi.encodeWithSelector(Helpers.VaultOutMaintenance.selector, transferBotRoleAddress, block.timestamp));
        hoax(transferBotRoleAddress);
        vault.finalizeEpoch();

        //
        // Alice
        //
        uint256 aliceUsdcBalanceBefore = usdc.balanceOf(alice);
        (status,,,) = vault.DEPOSITS(alice);
        assertTrue(uint8(status) == 3, "epoch 3: wrong status of alice's deposit before depositing");

        vm.startPrank(alice);
        vm.expectEmit(true, true, false, true, address(usdc));
        emit Transfer(alice, address(vault), aliceDepositAmount);
        vm.expectEmit(true, true, false, true, address(vault));
        emit PendingDeposit(alice, alice, aliceDepositAmount, aliceExpectedShares);
        vault.deposit(aliceDepositAmount, alice);
        vm.stopPrank();

        (status, amountAssets, amountShares, finalAmount) = vault.DEPOSITS(alice);
        assertTrue(status == Helpers.Status.Pending, "epoch 3: wrong status of alice's deposit after depositing");
        assertEq(amountAssets, aliceDepositAmount, "epoch 3: wrong alice's assets in vault after depositing");
        assertEq(amountShares, aliceExpectedShares, "epoch 3: wrong alice's shares in vault after depositing");
        assertEq(finalAmount, _usdc(150_000), "epoch 3: wrong alice's final amount after depositing");
        assertEq(aliceUsdcBalanceBefore - usdc.balanceOf(alice), aliceDepositAmount, "epoch 3: wrong change of alice's USDC balance");

        // Carla
        uint256 carlaUsdcBalanceBefore = usdc.balanceOf(carla);
        (status,,,) = vault.DEPOSITS(carla);
        assertTrue(status == Helpers.Status.Inactive, "epoch 3: wrong status of carla's deposit before depositing");

        vm.startPrank(carla);
        vm.expectEmit(true, true, false, true, address(usdc));
        emit Transfer(carla, address(vault), carlaDepositAmount);
        vm.expectEmit(true, true, false, true, address(vault));
        emit PendingDeposit(carla, carla, carlaDepositAmount, carlaExpectedShares);
        vault.deposit(carlaDepositAmount, carla);
        vm.stopPrank();

        (status, amountAssets, amountShares, finalAmount) = vault.DEPOSITS(carla);
        assertTrue(status == Helpers.Status.Pending, "epoch 3: wrong status of carla's deposit after depositing");
        assertEq(amountAssets, carlaDepositAmount, "epoch 3: wrong carla's assets in vault after depositing");
        assertEq(amountShares, carlaExpectedShares, "epoch 3: wrong carla's shares in vault after depositing");
        assertEq(finalAmount, 0 ether, "epoch 3: wrong carla's final amount after depositing");
        assertEq(carlaUsdcBalanceBefore - usdc.balanceOf(carla), carlaDepositAmount, "epoch 3: wrong change of carla's USDC balance");

        hoax(deployer);
        oracle.setAssetValue(200_999_500_000);

        vm.warp(vault.getNextEpoch() + MAINT_TIME_AFTER - 43 minutes);
        hoax(transferBotRoleAddress);
        vault.finalizeEpoch();

        aliceExpectedShares = 101_274.437521774004067182 ether;
        carlaExpectedShares = 30_382.331256532201220155 ether;

        (,amountAssets, amountShares,) = vault.DEPOSITS(alice);
        assertEq(amountAssets, 0, "epoch 3: wrong alice's assets in vault after finalize");
        assertEq(amountShares, aliceExpectedShares, "epoch 3: wrong alice's shares in vault after finalize");

        (,amountAssets, amountShares,) = vault.DEPOSITS(carla);
        assertEq(amountAssets, 0, "epoch 3: wrong alice's assets in vault after finalize");
        assertEq(amountShares, carlaExpectedShares, "epoch 3: wrong alice's shares in vault after finalize");

        (,, uint256 transferAmount) = vault.netTransfer(vault.CURRENT_EPOCH());

        uint256 expectedTransferAmount = 128_803_104_990;
        assertEq(transferAmount, expectedTransferAmount, "epoch 3: wrong net transfer amount");

        uint256 expectedGasReserve = 743_150_000;
        assertEq(vault.CalculateTransferBotGasReserveDA(), expectedGasReserve, "epoch 3: wrong gas reserve");

        vm.startPrank(transferBotRoleAddress);
        vm.expectEmit(true, true, false, true, address(usdc));
        emit Transfer(address(vault), transferBotWallet, transferAmount);
        vm.expectEmit(true, false, false, true, address(vault));
        emit DexTransfer(vault.CURRENT_EPOCH(), transferAmount);
        vault.dexTransfer();

        assertEq(
            usdc.balanceOf(address(vault)),
                vaultBalance + aliceDepositAmount + carlaDepositAmount - transferAmount - expectedGasReserve,
                "epoch 3: wrong vault balance after dex transfer"
        );
        assertEq(usdc.balanceOf(transferBotWallet), transferBotBalance + transferAmount, "epoch 3: wrong transfer bot balance after dex transfer");

        // Mock swap USDC to ETH for gas
        usdc.transfer(makeAddr("uniswap v2"), usdc.balanceOf(transferBotRoleAddress));

        uint256 expectedFeeAmount = 453_745_010;
        vm.expectEmit(true, true, false, true, address(usdc));
        emit Transfer(address(vault), treasuryWallet, expectedFeeAmount);
        vm.expectEmit(true, false, false, true, address(vault));
        emit FeesTransfer(vault.CURRENT_EPOCH(), expectedFeeAmount);
        vault.feesTransfer();
        vm.stopPrank();

        vm.warp(vault.getNextEpoch() + 1);
        hoax(deployer);
        vault.CurrentEpoch();

        return (usdc.balanceOf(address(vault)), usdc.balanceOf(transferBotWallet));
    }

    function testEpoch4() public returns (uint256, uint256) {
        (uint256 vaultBalance, uint256 transferBotBalance) = testEpoch3();
        assertEq(vault.CURRENT_EPOCH(), 4, "epoch 4: already in epoch 4");

        address alice = investors[0];
        address carla = investors[2];
        uint256 aliceExpectedShares = 101_274.437521774004067182 ether;
        uint256 carlaExpectedShares = 30_382.331256532201220155 ether;

        uint256 aliceShareBalanceBefore = vault.balanceOf(alice);
        uint256 carlaShareBalanceBefore = vault.balanceOf(carla);

        vm.warp(vault.getCurrentEpoch() + MAINT_TIME_AFTER + MAINT_TIME_BEFORE);

        (Helpers.Status status, uint256 amountAssets, uint256 amountShares, uint256 finalAmount) = vault.DEPOSITS(alice);
        assertTrue(status == Helpers.Status.Claimet, "epoch 4: wrong status of alice's deposit");
        assertEq(amountShares, aliceExpectedShares, "epoch 4: wrong amount of alice's shares");
        assertEq(finalAmount, _usdc(250_000), "epoch 4: wrong final amount of alice");

        (status,, amountShares, finalAmount) = vault.DEPOSITS(carla);
        assertTrue(status == Helpers.Status.Claimet, "epoch 4: wrong status of carla's deposit");
        assertEq(amountShares, carlaExpectedShares, "epoch 4: wrong amount of carla's shares");
        assertEq(finalAmount, _usdc(30_000), "epoch 4: wrong final amount of carla");

        vm.startPrank(alice);
        vm.expectEmit(true, true, false, true, address(vault));
        emit Transfer(address(0), address(alice), aliceExpectedShares);
        vault.claimShares(alice);
        (status, amountAssets, amountShares, finalAmount) = vault.DEPOSITS(alice);
        assertTrue(uint8(status) == 3, "epoch 4: wrong status of alice desposit after claiming");
        assertEq(amountShares, 0, "epoch 4: wrong amount of alice shares after claiming");
        assertEq(finalAmount, _usdc(250_000), "epoch 4: wrong final amount of alice after claiming");
        assertEq(aliceShareBalanceBefore + aliceExpectedShares, vault.balanceOf(alice), "epoch 4: wrong alice balance of vault token");
        vm.stopPrank();

        vm.startPrank(carla);
        vm.expectEmit(true, true, false, true, address(vault));
        emit Transfer(address(0), address(carla), carlaExpectedShares);
        vault.claimShares(carla);
        (status, amountAssets, amountShares, finalAmount) = vault.DEPOSITS(carla);
        assertTrue(uint8(status) == 3, "epoch 4: wrong status of carla desposit after claiming");
        assertEq(amountShares, 0, "epoch 4: wrong amount of carla shares after claiming");
        assertEq(finalAmount, _usdc(30_000), "epoch 4: wrong final amount of carla after claiming");
        assertEq(carlaShareBalanceBefore + carlaExpectedShares, vault.balanceOf(carla), "epoch 4: wrong carla balance of vault token");
        vm.stopPrank();

        hoax(deployer);
        oracle.setAssetValue(339_696_900_000);

        vm.warp(vault.getNextEpoch() + MAINT_TIME_AFTER - 43 minutes);
        hoax(transferBotRoleAddress);
        vault.finalizeEpoch();

        (,, uint256 transferAmount) = vault.netTransfer(vault.CURRENT_EPOCH());

        uint256 expectedTransferAmount = 1_547_783_261;
        assertEq(transferAmount, expectedTransferAmount, "epoch 4: wrong net transfer amount");

        uint256 expectedGasReserve = 1_000_000_000;
        assertEq(vault.CalculateTransferBotGasReserveDA(), expectedGasReserve, "epoch 4: wrong gas reserve");

        vm.startPrank(transferBotRoleAddress);
        vm.expectEmit(true, true, false, true, address(usdc));
        emit Transfer(transferBotWallet, address(vault), transferAmount);
        vm.expectEmit(true, false, false, true, address(vault));
        emit DexTransfer(vault.CURRENT_EPOCH(), transferAmount);
        vault.dexTransfer();

        assertEq(usdc.balanceOf(address(vault)), vaultBalance + expectedTransferAmount - expectedGasReserve, "epoch 4: wrong vault balance after dex transfer");
        assertEq(usdc.balanceOf(transferBotWallet), transferBotBalance - transferAmount, "epoch 4: wrong transfer bot balance after dex transfer");
        assertEq(usdc.balanceOf(transferBotRoleAddress), expectedGasReserve, "epoch 4: wrong usdc balance of bot role");

        uint256 feeAmount = 547_783_261;
        vm.expectEmit(true, true, false, true, address(usdc));
        emit Transfer(address(vault), treasuryWallet, feeAmount);
        vm.expectEmit(true, false, false, true, address(vault));
        emit FeesTransfer(vault.CURRENT_EPOCH(), feeAmount);
        vault.feesTransfer();
        vm.stopPrank();

        vm.warp(vault.getNextEpoch() + 1);
        hoax(deployer);
        vault.CurrentEpoch();

        return (usdc.balanceOf(address(vault)), usdc.balanceOf(transferBotWallet));
    }

    function testEpoch5() public returns (uint256, uint256) {
        (uint256 vaultBalance, uint256 transferBotBalance) = testEpoch4();
        assertEq(vault.CURRENT_EPOCH(), 5, "epoch 5: already in epoch 5");

        address alice = investors[0];
        uint256 withdrawAmount = _usdc(130_000);
        uint256 aliceExpectedShares = 127_933.993931992257041045 ether;

        vm.warp(vault.getCurrentEpoch() + MAINT_TIME_AFTER + MAINT_TIME_BEFORE);

        vm.expectEmit(true, true, false, true, address(vault));
        emit PendingWithdraw(alice, alice, withdrawAmount, aliceExpectedShares);
        hoax(alice);
        emit log_uint(vault.withdraw(withdrawAmount, alice, alice));

        (Helpers.Status status, uint256 amountAssets, uint256 amountShares, uint256 finalAmount) = vault.WITHDRAWALS(alice);
        assertTrue(status == Helpers.Status.Pending, "epoch 5: wrong status of alice's withdrawal");
        assertEq(amountAssets, withdrawAmount, "epoch 5: wrong assets of alice after withdrawal");
        assertEq(amountShares, aliceExpectedShares, "epoch 5: wrong shares of alice after withdrawal");
        assertEq(finalAmount, 0, "epoch 5: wrong final amount of alice after withdrawal");

        hoax(deployer);
        oracle.setAssetValue(346_603_500_000);

        vm.warp(vault.getNextEpoch() + MAINT_TIME_AFTER - 43 minutes);
        hoax(transferBotRoleAddress);
        vault.finalizeEpoch();

        aliceExpectedShares = 125_758.784976662071634139 ether;
        (status, amountAssets, amountShares, finalAmount) = vault.WITHDRAWALS(alice);
        assertTrue(status == Helpers.Status.Claimet, "epoch 5: wrong status of alice's withdrawal after finalizing");
        assertEq(amountAssets, 0, "epoch 5: wrong assets of alice after finalizing");
        assertEq(amountShares, aliceExpectedShares, "epoch 5: wrong shares of alice after finalizing");
        assertEq(finalAmount, withdrawAmount, "epoch 5: wrong final amount of alice after finalizing");

        (,, uint256 transferAmount) = vault.netTransfer(vault.CURRENT_EPOCH());

        uint256 expectedTransferAmount = 0;
        assertEq(transferAmount, expectedTransferAmount, "epoch 5: wrong net transfer amount");

        vm.startPrank(transferBotRoleAddress);
        vm.expectEmit(true, true, false, true, address(usdc));
        emit Transfer(transferBotWallet, address(vault), transferAmount);
        vm.expectEmit(true, false, false, true, address(vault));
        emit DexTransfer(vault.CURRENT_EPOCH(), transferAmount);
        vault.dexTransfer();

        assertEq(usdc.balanceOf(address(vault)), vaultBalance + transferAmount, "epoch 5: wrong vault balance after dex transfer");
        assertEq(usdc.balanceOf(transferBotWallet), transferBotBalance - transferAmount, "epoch 5: wrong transfer bot balance after dex transfer");

        vm.expectEmit(true, true, false, true, address(usdc));
        emit Transfer(address(vault), treasuryWallet, 0);
        vm.expectEmit(true, false, false, true, address(vault));
        emit FeesTransfer(vault.CURRENT_EPOCH(), 0);
        vault.feesTransfer();
        vm.stopPrank();

        vm.warp(vault.getNextEpoch() + 1);
        hoax(deployer);
        vault.CurrentEpoch();

        return (usdc.balanceOf(address(vault)), usdc.balanceOf(transferBotWallet));
    }

    function testEpoch6() public returns (uint256, uint256) {
        (uint256 vaultBalance, uint256 transferBotBalance) = testEpoch5();
        assertEq(vault.CURRENT_EPOCH(), 6, "epoch 6: already in epoch 6");

        address alice = investors[0];
        address bob = investors[1];
        address carla = investors[2];
        uint256 aliceExpectedShares = 1311.256553699520755879 ether;

        vm.warp(vault.getCurrentEpoch() + MAINT_TIME_AFTER + MAINT_TIME_BEFORE);

        vm.expectRevert(abi.encodeWithSelector(Helpers.CalletIsNotClaimerToRedeem.selector, bob));
        hoax(bob);
        vault.claimAssets(alice, bob);

        (Helpers.Status status, uint256 amountAssets, uint256 amountShares, uint256 finalAmount) = vault.WITHDRAWALS(alice);
        assertTrue(status == Helpers.Status.Claimet, "epoch 6: wrong status of alice's withdrawal after finalizing");
        assertEq(amountAssets, 0, "epoch 6: wrong assets of alice after finalizing");
        assertEq(amountShares, aliceExpectedShares, "epoch 6: wrong shares of alice after finalizing");
        assertEq(finalAmount, _usdc(1269), "epoch 6: wrong final amount of alice after finalizing");

        vm.expectEmit(true, true, false, true, address(usdc));
        emit Transfer(address(vault), alice, _usdc(1269));
        vm.expectEmit(true, true, true, true, address(vault));
        emit Withdraw(alice, alice, alice, _usdc(1269), aliceExpectedShares);
        hoax(alice);
        vault.claimAssets(alice, alice);

        (status, amountAssets, amountShares, finalAmount) = vault.WITHDRAWALS(alice);
        assertTrue(uint8(status) == 3, "epoch 6: wrong status of alice's withdrawal after finalizing");
        assertEq(amountAssets, 0, "epoch 6: wrong assets of alice after finalizing");
        assertEq(amountShares, 0, "epoch 6: wrong shares of alice after finalizing");
        assertEq(finalAmount, _usdc(1269), "epoch 6: wrong final amount of alice after finalizing");

        uint256 carlaRedeemAssets = 166800001;
        uint256 carlaRedeemShares = 114.227563494569054603 ether;

        vm.expectEmit(true, true, false, true, address(vault));
        emit PendingWithdraw(carla, carla, carlaRedeemAssets, carlaRedeemShares);
        hoax(carla);
        vault.redeem(carlaRedeemShares, carla, carla);

        hoax(deployer);
        oracle.setAssetValue(2222042863);

        vm.warp(vault.getNextEpoch() + MAINT_TIME_AFTER - 43 minutes);
        hoax(transferBotRoleAddress);
        vault.finalizeEpoch();

        (,, uint256 transferAmount) = vault.netTransfer(vault.CURRENT_EPOCH());

        vm.startPrank(transferBotRoleAddress);
        vm.expectEmit(true, true, false, true, address(usdc));
        emit Transfer(transferBotWallet, address(vault), transferAmount);
        vault.dexTransfer();

        assertEq(usdc.balanceOf(address(vault)), vaultBalance - _usdc(1269) + transferAmount, "epoch 6: wrong vault balance after dex transfer");
        assertEq(usdc.balanceOf(transferBotWallet), transferBotBalance - transferAmount, "epoch 6: wrong transfer bot balance after dex transfer");

        vm.expectEmit(true, true, false, true, address(usdc));
        emit Transfer(address(vault), treasuryWallet, 0);
        vm.expectEmit(true, false, false, true, address(vault));
        emit FeesTransfer(vault.CURRENT_EPOCH(), 0);
        vault.feesTransfer();
        vm.stopPrank();

        vm.warp(vault.getNextEpoch() + 1);
        hoax(deployer);
        vault.CurrentEpoch();

        return (usdc.balanceOf(address(vault)), usdc.balanceOf(transferBotWallet));
    }

    function testEpoch7() public returns (uint256, uint256) {
        (uint256 vaultBalance, uint256 transferBotBalance) = testEpoch6();
        assertEq(vault.CURRENT_EPOCH(), 7, "epoch 6: already in epoch 7");

        address bob = investors[1];
        address carla = investors[2];
        uint256 carlaExpectedAssets = 166800001;
        uint256 carlaExpectedShares = 168.356116585600707338 ether;

        vm.warp(vault.getCurrentEpoch() + MAINT_TIME_AFTER + MAINT_TIME_BEFORE);

        (Helpers.Status status, uint256 amountAssets, uint256 amountShares, uint256 finalAmount) = vault.WITHDRAWALS(carla);
        assertTrue(status == Helpers.Status.Claimet, "epoch 7: wrong status of carla's withdrawal after finalizing");
        assertEq(amountAssets, 0, "epoch 7: wrong assets of carla after finalizing");
        assertEq(amountShares, carlaExpectedShares, "epoch 7: wrong shares of carla after finalizing");
        assertEq(finalAmount, carlaExpectedAssets, "epoch 7: wrong final amount of carla after finalizing");

        vm.expectEmit(true, true, false, true, address(usdc));
        emit Transfer(address(vault), carla, carlaExpectedAssets);
        vm.expectEmit(true, true, true, true, address(vault));
        emit Withdraw(carla, carla, carla, carlaExpectedAssets, carlaExpectedShares);
        hoax(carla);
        vault.claimAssets(carla, carla);

        (status, amountAssets, amountShares, finalAmount) = vault.WITHDRAWALS(carla);
        assertTrue(uint8(status) == 3, "epoch 7: wrong status of carla's withdrawal after finalizing");
        assertEq(amountAssets, 0, "epoch 7: wrong assets of carla after finalizing");
        assertEq(amountShares, 0, "epoch 7: wrong shares of carla after finalizing");
        assertEq(finalAmount, carlaExpectedAssets, "epoch 7: wrong final amount of carla after finalizing");

        uint256 bobDepositAmount = _usdc(50_000);
        uint256 bobSharesAmount = 470.295213711551014804 ether;

        vm.expectEmit(true, true, false, true, address(usdc));
        emit Transfer(bob, address(vault), bobDepositAmount);
        vm.expectEmit(true, true, false, true, address(vault));
        emit PendingDeposit(bob, bob, bobDepositAmount, bobSharesAmount);
        hoax(bob);
        vault.deposit(bobDepositAmount, bob);
        vm.stopPrank();

        hoax(deployer);
        oracle.setAssetValue(2107028453);

        vm.warp(vault.getNextEpoch() + MAINT_TIME_AFTER - 43 minutes);
        hoax(transferBotRoleAddress);
        vault.finalizeEpoch();

        (,, uint256 transferAmount) = vault.netTransfer(vault.CURRENT_EPOCH());

        vm.startPrank(transferBotRoleAddress);
        vm.expectEmit(true, true, false, true, address(usdc));
        emit Transfer(address(vault), transferBotWallet, transferAmount);
        vault.dexTransfer();

        assertEq(usdc.balanceOf(address(vault)), vaultBalance - carlaExpectedAssets + bobDepositAmount - transferAmount, "epoch 6: wrong vault balance after dex transfer");
        assertEq(usdc.balanceOf(transferBotWallet), transferBotBalance + transferAmount, "epoch 6: wrong transfer bot balance after dex transfer");

        vm.expectEmit(true, true, false, true, address(usdc));
        emit Transfer(address(vault), treasuryWallet, 0);
        vm.expectEmit(true, false, false, true, address(vault));
        emit FeesTransfer(vault.CURRENT_EPOCH(), 0);
        vault.feesTransfer();
        vm.stopPrank();

        vm.warp(vault.getNextEpoch() + 1);
        hoax(deployer);
        vault.CurrentEpoch();

        return (usdc.balanceOf(address(vault)), usdc.balanceOf(transferBotWallet));
    }

    function testFinalEpoch() public {
        (uint256 vaultBalance, uint256 transferBotBalance) = testEpoch7();
        assertEq(vault.CURRENT_EPOCH(), 8, "epoch 8: already in final epoch");

        address bob = investors[1];
        uint256 bobExpectedShares = 492.216094678750243647 ether;

        vm.warp(vault.getCurrentEpoch() + MAINT_TIME_AFTER + MAINT_TIME_BEFORE);

        (Helpers.Status status, uint256 amountAssets, uint256 amountShares, uint256 finalAmount) = vault.DEPOSITS(bob);
        assertTrue(status == Helpers.Status.Claimet, "epoch 8: wrong status of bob's withdrawal after finalizing");
        assertEq(amountAssets, 0, "epoch 8: wrong assets of bob after finalizing");
        assertEq(amountShares, bobExpectedShares, "epoch 8: wrong shares of bob after finalizing");
        assertEq(finalAmount, _usdc(1000), "epoch 8: wrong final amount of bob after finalizing");

        vm.expectEmit(true, true, false, true, address(vault));
        emit Transfer(address(0), bob, bobExpectedShares);
        vm.expectEmit(true, true, false, true, address(vault));
        emit Deposit(bob, bob, _usdc(1000), bobExpectedShares);
        hoax(bob);
        vault.claimShares(bob);

        (status, amountAssets, amountShares, finalAmount) = vault.DEPOSITS(bob);
        assertTrue(uint8(status) == 3, "epoch 8: wrong status of bob's withdrawal after finalizing");
        assertEq(amountAssets, 0, "epoch 8: wrong assets of bob after finalizing");
        assertEq(amountShares, 0, "epoch 8: wrong shares of bob after finalizing");
        assertEq(finalAmount, _usdc(1000), "epoch 8: wrong final amount of bob after finalizing");

        hoax(deployer);
        oracle.setAssetValue(2660984944);

        vm.warp(vault.getNextEpoch() + MAINT_TIME_AFTER - 43 minutes);
        hoax(transferBotRoleAddress);
        vault.finalizeEpoch();

        (,, uint256 transferAmount) = vault.netTransfer(vault.CURRENT_EPOCH());

        vm.startPrank(transferBotRoleAddress);
        vm.expectEmit(true, true, false, true, address(usdc));
        emit Transfer(transferBotWallet, address(vault), transferAmount);
        vault.dexTransfer();

        assertEq(usdc.balanceOf(address(vault)), vaultBalance + transferAmount, "epoch 8: wrong vault balance after dex transfer");
        assertEq(usdc.balanceOf(transferBotWallet), transferBotBalance - transferAmount, "epoch 8: wrong transfer bot balance after dex transfer");

        vm.expectEmit(true, true, false, true, address(usdc));
        emit Transfer(address(vault), treasuryWallet, 0);
        vm.expectEmit(true, false, false, true, address(vault));
        emit FeesTransfer(vault.CURRENT_EPOCH(), 0);
        vault.feesTransfer();
        vm.stopPrank();
    }

}
