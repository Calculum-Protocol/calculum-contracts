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

contract BasicFeaturesTest is Test {
    CalculumVault public implementation;
    CalculumVault public vault;
    USDC public usdc;
    MockUpOracle public oracle;
    IUniswapV2Router02 public router;
    UUPSProxy public proxy;

    address public deployer;
    address public traderBotAddress;
    address public transferBotWallet;
    address public transferBotRoleAddress;
    address public treasuryWallet;
    address[3] public investors;
    uint256 public startTime;

    string public constant TOKEN_NAME = "CalculumUSDC1";
    string public constant TOKEN_SYMBOL = "calcUSDC1";
    uint8 public constant TOKEN_DECIMALS = 18;
    uint256 public constant EPOCH_DURATION = 1 weeks;
    uint256 public constant MAINT_TIME_BEFORE = 60 minutes;
    uint256 public constant MAINT_TIME_AFTER = 30 minutes;
    uint256 public constant MIN_DEPOSIT_PER_ADDR = 300 * 10 ** 6;
    uint256 public constant MAX_DEPOSIT_PER_ADDR = 10000 * 10 ** 6;
    uint256 public constant TOKEN_MAX_TOTAL_DEPOSIT = 50000 ether;

    uint256[4] public initialValues;

    function setUp() public {
        deployer = makeAddr("deployer");
        traderBotAddress = makeAddr("traderBotAddress");
        transferBotWallet = makeAddr("transferBot");
        transferBotRoleAddress = makeAddr("transferBotRole");
        treasuryWallet = makeAddr("treasury");

        startTime = block.timestamp;
        initialValues[0] = startTime;
        initialValues[1] = MIN_DEPOSIT_PER_ADDR;
        initialValues[2] = MAX_DEPOSIT_PER_ADDR;
        initialValues[3] = TOKEN_MAX_TOTAL_DEPOSIT;
        // investors[0] = _setUpAddress("investor0");
        // investors[1] = _setUpAddress("investor1");
        // investors[2] = _setUpAddress("investor2");

        startTime = block.timestamp;

        vm.startPrank(deployer);
        usdc = new USDC();
        IERC20MetadataUpgradeable iusdc = IERC20MetadataUpgradeable(address(usdc));
        oracle = new MockUpOracle(traderBotAddress, iusdc);
        implementation = new CalculumVault();
        proxy = new UUPSProxy(address(implementation), "");
        vault = CalculumVault(payable(address(proxy)));
        vault.initialize(
            TOKEN_NAME,
            TOKEN_SYMBOL,
            TOKEN_DECIMALS,
            iusdc,
            address(oracle),
            transferBotWallet,
            treasuryWallet,
            transferBotRoleAddress,
            address(router),
            initialValues
        );
        vm.stopPrank();
    }

    function testInitialValues() public {
        assertEq(vault.owner(), deployer, "init: wrong deployer address");
        assertEq(
            abi.encodePacked(vault.name()), abi.encodePacked(TOKEN_NAME), "init: wrong token name"
        );
        assertEq(
            abi.encodePacked(vault.symbol()),
            abi.encodePacked(TOKEN_SYMBOL),
            "init: wrong token symbol"
        );
        assertEq(vault.decimals(), TOKEN_DECIMALS, "init: wrong token symbol");
        assertEq(vault.asset(), address(usdc), "init: wrong asset address");
        assertEq(vault.treasuryWallet(), treasuryWallet, "init: wrong treasury address");
        assertEq(address(vault.oracle()), address(oracle), "init: wrong oracle address");
        assertEq(
            vault.transferBotWallet(), transferBotWallet, "init: wrong trader bot wallet address"
        );
        assertEq(vault.MANAGEMENT_FEE_PERCENTAGE(), 0.01 ether, "init: wrong management fee");
        assertEq(vault.PERFORMANCE_FEE_PERCENTAGE(), 0.15 ether, "init: wrong performance fee");
        assertEq(vault.EPOCH_START(), startTime, "init: wrong epoch start timestamp");
        assertEq(vault.EPOCH_DURATION(), 7 days, "init: wrong epoch duration");
        assertEq(
            vault.MAINTENANCE_PERIOD_PRE_START(), 60 minutes, "init: wrong maintenance pre start"
        );
        assertEq(
            vault.MAINTENANCE_PERIOD_POST_START(), 30 minutes, "init: wrong maintenance post start"
        );
        assertEq(vault.MIN_DEPOSIT(), initialValues[1], "init: wrong min deposit amount");
        assertEq(vault.MAX_DEPOSIT(), initialValues[2], "init: wrong max deposit amount");
        assertEq(vault.MAX_TOTAL_DEPOSIT(), initialValues[3], "init: wrong max total supply");
    }

    function _setUpAddress(string memory name) private returns (address account) {
        account = makeAddr(name);
        uint256 amount = 1_000_000 * 10 ** 6;
        hoax(account);
        usdc.mint(account, amount);
        hoax(account);
        usdc.approve(address(vault), amount);
    }
}
