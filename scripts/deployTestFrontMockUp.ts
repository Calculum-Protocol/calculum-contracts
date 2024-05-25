/* eslint-disable prefer-const */
/* eslint-disable camelcase */
// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers,  run, network, upgrades } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import "@nomiclabs/hardhat-ethers";
import { getImplementationAddress } from "@openzeppelin/upgrades-core";
import dotenv from "dotenv";
import moment from "moment";
import chai from "chai";
import {
    UniswapLibV3__factory,
    UniswapLibV3,
    Utils__factory,
    Utils,
    TestVaultFront__factory,
    TestVaultFront,
    USDC__factory,
    USDC,
    // eslint-disable-next-line node/no-missing-import
} from "../typechain-types";

dotenv.config();

const { expect } = chai;

const snooze = (ms: any) => new Promise((resolve) => setTimeout(resolve, ms));

let traderBotWallet: SignerWithAddress;
let treasuryWallet: SignerWithAddress;
let transferBotRoleAddress: SignerWithAddress;
let UniswapLibV3Factory: UniswapLibV3__factory;
let UniswapLibV3: UniswapLibV3;
let UtilsFactory: Utils__factory;
let Utils: Utils;
const name = "Test USDc Vault 4";
const symbol = "vUSDC4";
const decimals = 18;
const EPOCH_TIME: moment.Moment = moment();
const ZERO_ADDRESS = `0x` + `0`.repeat(40);

async function main() {
    // Hardhat always runs the compile task when running scripts with its command
    // line interface.
    //
    // If this script is run directly using `node` you may want to call compile
    // manually to make sure everything is compiled
    // await run("compile");
    const provider = network.provider;
    // const accounts: SignerWithAddress[] = await ethers.getSigners();
    // Getting from command Line de Contract Name
    // Getting from command Line de Contract Name
    const accounts = await ethers.getSigners();
    const contractName: string = "TestVaultFront";
    const EPOCH_START = EPOCH_TIME.utc(false).unix();
    console.log(`Contract Name: ${contractName}`);
    console.log(`Epoch Start: ${EPOCH_START}`);
    const deployer = accounts[0];
    let USDCFactory: USDC__factory;
    let USDc: USDC;
    // USD Testnet Deployer
    USDCFactory = (await ethers.getContractFactory(
      "USDC",
      accounts[0]
    )) as USDC__factory;
    // Deploy Stable coin Mockup
    USDc = (await USDCFactory.deploy()) as USDC;
    // eslint-disable-next-line no-unused-expressions
    expect(await USDc.getAddress()).to.properAddress;
    console.log(`USDC Address: ${await USDc.getAddress()}`);
    // Deploy Mockup Oracle
    //   OracleFactory = (await ethers.getContractFactory(
    //     "MockUpOracle",
    //     deployer
    //   )) as MockUpOracle__factory;
    //   // Deploy Oracle
    //   Oracle = (await OracleFactory.deploy(
    //     traderBotWallet.address,
    //     USDc.address
    //   )) as MockUpOracle;
    //   await Oracle.deployed();
    // await snooze(10000);
    // eslint-disable-next-line no-unused-expressions
    //   expect(Oracle.address).to.properAddress;
    //   console.log(`Oracle Address: ${Oracle.address}`);
    // Deploy all Libraries of Calculum , with not upgradeable version
    // UniswapLibV3Factory = (await ethers.getContractFactory(
    //     "UniswapLibV3",
    //     deployer
    // )) as UniswapLibV3__factory;
    // UniswapLibV3 = (await UniswapLibV3Factory.deploy()) as UniswapLibV3;
    // // eslint-disable-next-line no-unused-expressions
    // expect(await UniswapLibV3.getAddress()).to.properAddress;
    // console.log(`UniswapLibV3 Address: ${await UniswapLibV3.getAddress()}`);
    // await snooze(10000);
    // UtilsFactory = (await ethers.getContractFactory(
    //     "Utils",
    //     deployer
    // )) as Utils__factory;
    // Utils = (await UtilsFactory.deploy()) as Utils;
    // // eslint-disable-next-line no-unused-expressions
    // expect(await Utils.getAddress()).to.properAddress;
    // console.log(`Utils Address: ${await Utils.getAddress()}`);
    // await snooze(10000);
    // We get the contract to deploy
    const TestVaultFrontBearFactory = await ethers.getContractFactory(
        contractName, {
        signer: deployer
        // libraries: {
        //     Utils: await Utils.getAddress(),
        // }
    }
    );
    console.log("Deploying Test Vault Front Bear...");
    const TestVaultFrontBear = await upgrades.deployProxy(
        TestVaultFrontBearFactory as any,
        [
            name,
            symbol,
            decimals,
            [
                "0x7Ef8114134cCF5dD5346E2d39322194278FFA696", // Auxiliar Wallet (deployer) Calculum Test 0x7Ef8114134cCF5dD5346E2d39322194278FFA696, like trader Bot
                "0x658B13b773b0ceD400eC57cf7C03288d8Aa13805", // alfredolopez80.eth // Treasury Wallet
                "0xe85c385DF8EC6394a17D5773e90B51BAD40873A0", // Open Zeppelin Defender Wallet Transfer Bot Arbitrum Sepolia
                await USDc.getAddress(), // Own USDC test in Arbitrum Sepolia
            ],
            [
                EPOCH_START,
                1 * 10 ** 5, // 0.1 $
                1000 * 10 ** 6, // 1000 $
                1000000000 * 10 ** 6, // 1000.000.000 $
            ]
        ]
    );

    console.log("Test Vault Front Bear deployed to:", await TestVaultFrontBear.getAddress());


    // Verify Process ERC20 Token
    if (network.name !== "hardhat") {
        console.log(`Start verifying the Implementation Smart Contract: ${contractName}`);
        await snooze(60000);
        const currentImplAddress = await getImplementationAddress(
            provider,
            await TestVaultFrontBear.getAddress()
        );
        console.log(`Current Implementation Address: ${currentImplAddress} of Contract: ${contractName}`);
        await snooze(60000);
        await run("verify:verify", {
            address: currentImplAddress,
            constructorArguments: [],
            contract: `src/${contractName}.sol:${contractName}`,
        });
        console.log(`Current USDC Address: ${await USDc.getAddress()} associate to the Contract: ${contractName}`);
        await snooze(60000);
        await run("verify:verify", {
            address: await USDc.getAddress(),
            constructorArguments: [],
            contract: `src/USDC.sol:USDC`,
        });
    }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
