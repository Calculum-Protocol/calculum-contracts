/* eslint-disable prefer-const */
/* eslint-disable camelcase */
// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers, run, network, upgrades } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import "@nomiclabs/hardhat-ethers";
import { getImplementationAddress } from "@openzeppelin/upgrades-core";
import dotenv from "dotenv";
import moment from "moment";
import chai from "chai";
import {
    CalculumVault__factory,
    CalculumVault,
    MockUpOracle,
    MockUpOracle__factory,
    Constants__factory,
    Constants,
    DataTypes,
    DataTypes__factory,
    Errors,
    Errors__factory,
    Events,
    Events__factory,
    TickMath,
    TickMath__factory,
    FullMath,
    FullMath__factory,
    UniswapLibV3,
    UniswapLibV3__factory,
    Utils,
    Utils__factory,
    USDC,
    USDC__factory,
    // eslint-disable-next-line node/no-missing-import
} from "../typechain-types";
import { mockUniswap } from "./mockupUniswap";

dotenv.config();

const { expect } = chai;

const snooze = (ms: any) => new Promise((resolve) => setTimeout(resolve, ms));

let OracleFactory: MockUpOracle__factory;
let Oracle: MockUpOracle;
let dexWallet: SignerWithAddress;
let treasuryWallet: SignerWithAddress;
let transferBotRoleAddress: SignerWithAddress;
let openZeppelinDefenderWallet: SignerWithAddress;
let UniswapLibV3Factory: UniswapLibV3__factory;
let UniswapLibV3: UniswapLibV3;
let UtilsFactory: Utils__factory;
let Utils: Utils;
const name = "CalculumUSDC1";
const symbol = "calcUSDC1";
const decimals = 18;
const epochDuration = 60 * 60 * 24 * 7;
const maintTimeBefore = 60 * 60;
const maintTimeAfter = 30 * 60;
const MIN_DEPOSIT = ethers.utils.parseEther("30");
const MAX_DEPOSIT = ethers.utils.parseEther("250");
const MAX_TOTAL_DEPOSIT = ethers.utils.parseEther("1000");
const MIN_WALLET_BALANCE_USDC_TRANSFER_BOT = ethers.utils.parseEther("5");
const TARGET_WALLET_BALANCE_USDC_TRANSFER_BOT = ethers.utils.parseEther("25");
const MIN_WALLET_BALANCE_ETH_TRANSFER_BOT = ethers.utils.parseEther("0.15");
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const EPOCH_TIME: moment.Moment = moment();
// const UNISWAP_ROUTER2 = "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45";
const KWENTA_ADDRESS = "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45";

async function main() {
    // Hardhat always runs the compile task when running scripts with its command
    // line interface.
    //
    // If this script is run directly using `node` you may want to call compile
    // manually to make sure everything is compiled
    // await run("compile");
    const provider = network.provider;
    const accounts: SignerWithAddress[] = await ethers.getSigners();
    // Getting from command Line de Contract Name
    // Getting from command Line de Contract Name
    const contractName: string = "CalculumVault";
    console.log(`Contract Name: ${contractName}`);
    const EPOCH_START = EPOCH_TIME.utc(false).unix();
    const deployer = accounts[0];
    dexWallet = accounts[1];
    treasuryWallet = accounts[2];
    transferBotRoleAddress = accounts[3];
    openZeppelinDefenderWallet = accounts[4];
    let USDCFactory: USDC__factory;
    let USDc: USDC;
    let CalculumFactory: CalculumVault__factory;
    let Calculum: CalculumVault;
    // USD Testnet Deployer
    USDCFactory = (await ethers.getContractFactory(
        "USDC",
        accounts[0]
    )) as USDC__factory;
    // Deploy Stable coin Mockup
    USDc = (await USDCFactory.deploy()) as USDC;
    await USDc.deployed();
    await snooze(10000);
    // eslint-disable-next-line no-unused-expressions
    expect(USDc.address).to.properAddress;
    console.log(`USDC Address: ${USDc.address}`);
    // Deploy Mockup Oracle
    OracleFactory = (await ethers.getContractFactory(
        "MockUpOracle",
        deployer
    )) as MockUpOracle__factory;
    // Deploy Oracle
    Oracle = (await OracleFactory.deploy(
        dexWallet.address,
        USDc.address
    )) as MockUpOracle;
    await Oracle.deployed();
    // eslint-disable-next-line no-unused-expressions
    expect(Oracle.address).to.properAddress;
    console.log(`Oracle Address: ${Oracle.address}`);
    await snooze(10000);
    // Deploy UniSwap Router Mocked
    const resp: any = await mockUniswap(deployer);
    const UNISWAP_ROUTER2 = resp.uniswapV2Router02.address;
    console.log(`Uniswap Router Address: ${UNISWAP_ROUTER2}`);
    await snooze(10000);
    // Deploy all Libraries of Calculum , with not upgradeable version
    UniswapLibV3Factory = (await ethers.getContractFactory(
        "UniswapLibV3",
        deployer
    )) as UniswapLibV3__factory;
    UniswapLibV3 = (await UniswapLibV3Factory.deploy()) as UniswapLibV3;
    // eslint-disable-next-line no-unused-expressions
    expect(UniswapLibV3.address).to.properAddress;
    console.log(`UniswapLibV3 Address: ${UniswapLibV3.address}`);
    UtilsFactory = (await ethers.getContractFactory(
        "Utils",
        deployer
    )) as Utils__factory;
    Utils = (await UtilsFactory.deploy()) as Utils;
    // eslint-disable-next-line no-unused-expressions
    expect(Utils.address).to.properAddress;
    console.log(`Utils Address: ${Utils.address}`);
    // Calculum Vault Deployer
    CalculumFactory = (await ethers.getContractFactory(
        contractName, {
        libraries: {
            UniswapLibV3: UniswapLibV3.address,
            Utils: Utils.address,
        }
    }
    )) as CalculumVault__factory;
    console.log(`Dex Wallet Address, before: ${dexWallet.address}`);
    // Deploy Calculum Vault
    Calculum = (await upgrades.deployProxy(CalculumFactory, [
        name,
        symbol,
        decimals,
        [
            Oracle.address,
            dexWallet.address,
            treasuryWallet.address,
            openZeppelinDefenderWallet.address,
            UNISWAP_ROUTER2,
            USDc.address,
            KWENTA_ADDRESS
        ],
        [
            EPOCH_START,
            MIN_DEPOSIT,
            MAX_DEPOSIT,
            MAX_TOTAL_DEPOSIT,
            MIN_WALLET_BALANCE_USDC_TRANSFER_BOT,
            TARGET_WALLET_BALANCE_USDC_TRANSFER_BOT,
            MIN_WALLET_BALANCE_ETH_TRANSFER_BOT,
        ],
    ])) as CalculumVault;
    // eslint-disable-next-line no-unused-expressions
    expect(Calculum.address).to.properAddress;
    console.log(`Calculum Address: ${Calculum.address}`);
    console.log(`Dex Wallet Address, after: ${await Calculum.dexWallet()}`);

    //   // Setting the Value of Epoch Duration and Maintenance Time Before and After
    //   await Calculum.connect(deployer).setEpochDuration(
    //     epochDuration,
    //     maintTimeBefore,
    //     maintTimeAfter
    //   );

    // Verify Process ERC20 Token
    console.log("Start verifying the ERC20 Token, network: ", network.name);
    if (network.name !== "hardhat" && network.name !== "local") {
        console.log("Start verifying the Implementation Smart Contract");
        await snooze(60000);
        const currentImplAddress = await getImplementationAddress(
            provider,
            Calculum.address
        );
        console.log(`Current Implementation Address: ${currentImplAddress}`);
        await snooze(60000);
        await run("verify:verify", {
            address: currentImplAddress,
            constructorArguments: [],
            contract: `contracts/${contractName}.sol:${contractName}`,
        });
        // USDC Token
        await run("verify:verify", {
            address: USDc.address,
            constructorArguments: [],
            contract: `contracts/USDC.sol:USDC`,
        });
        // Oracle
        await snooze(60000);
        await run("verify:verify", {
            address: Oracle.address,
            constructorArguments: [dexWallet.address, USDc.address],
            contract: `contracts/mock/MockUpOracle.sol:MockUpOracle`,
        });
    }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
