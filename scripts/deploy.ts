/* eslint-disable prefer-const */
/* eslint-disable camelcase */
// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers, run, network, upgrades } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import "@nomiclabs/hardhat-ethers";
import { getImplementationAddress } from "@openzeppelin/upgrades-core";
import dotenv from "dotenv";
import moment from "moment";
import chai from "chai";
import {
    CalculumVault__factory,
    CalculumVault,
    UniswapLibV3__factory,
    UniswapLibV3,
    Utils__factory,
    Utils,
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
const name = "Bear Protocol USDC Vault";
const symbol = "vbUSDc";
const decimals = 18;
const EPOCH_TIME: moment.Moment = moment().utc();
const ZERO_ADDRESS = `0x` + `0`.repeat(40);
const epochDuration = 60 * 60; // 1 hour
const maintTimeBefore = 210; // 3.5 minutes
const maintTimeAfter = 210; // 3.5 minutes

async function main() {
    // Hardhat always runs the compile task when running scripts with its command
    // line interface.

    // Round to the nearest hour in UTC
    let roundedHour = EPOCH_TIME.clone().startOf('hour');
    if (EPOCH_TIME.minutes() >= 30) {
        roundedHour.add(1, 'hour');
    }

    // Calculate the difference in seconds to the rounded hour and one hour before it
    const diffToRoundedHour = Math.abs(EPOCH_TIME.unix() - roundedHour.unix());
    const oneHourBefore = roundedHour.clone().subtract(1, 'hour');

    // Determine the closest hour within a 30-minute difference
    let EPOCH_START;
    if (diffToRoundedHour <= 1800) { // 1800 seconds = 30 minutes
        EPOCH_START = roundedHour.unix();
    } else {
        EPOCH_START = oneHourBefore.unix();
    }
    // If this script is run directly using `node` you may want to call compile
    // manually to make sure everything is compiled
    // await run("compile");
    const provider = network.provider;
    // const accounts: SignerWithAddress[] = await ethers.getSigners();
    // Getting from command Line de Contract Name
    const contractName: string = "CalculumVault";
    console.log(`Contract Name: ${contractName}`);
    console.log(`Epoch Start: ${EPOCH_START}`);
    const accounts = await ethers.getSigners();
    const deployer = accounts[0];
    traderBotWallet = accounts[1];
    treasuryWallet = accounts[2];
    transferBotRoleAddress = accounts[3];
    //   let USDCFactory: USDC__factory;
    //   let USDc: USDC;
    //   // USD Testnet Deployer
    //   USDCFactory = (await ethers.getContractFactory(
    //     "USDC",
    //     accounts[0]
    //   )) as USDC__factory;
    //   // Deploy Stable coin Mockup
    //   USDc = (await USDCFactory.deploy()) as USDC;
    //   await USDc.deployed();
    //   await snooze(10000);
    // eslint-disable-next-line no-unused-expressions
    //   expect(USDc.address).to.properAddress;
    //   console.log(`USDC Address: ${USDc.address}`);
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
    UniswapLibV3Factory = (await ethers.getContractFactory(
        "UniswapLibV3",
        deployer
    )) as UniswapLibV3__factory;
    UniswapLibV3 = (await UniswapLibV3Factory.deploy()) as UniswapLibV3;
    // eslint-disable-next-line no-unused-expressions
    expect(await UniswapLibV3.getAddress()).to.properAddress;
    console.log(`UniswapLibV3 Address: ${await UniswapLibV3.getAddress()}`);
    await snooze(10000);
    UtilsFactory = (await ethers.getContractFactory(
        "Utils",
        deployer
    )) as Utils__factory;
    Utils = (await UtilsFactory.deploy()) as Utils;
    // eslint-disable-next-line no-unused-expressions
    expect(await Utils.getAddress()).to.properAddress;
    console.log(`Utils Address: ${await Utils.getAddress()}`);
    await snooze(10000);
    // We get the contract to deploy
    const CalculumFactory = await ethers.getContractFactory(
        contractName, {
        signer: deployer,
        libraries: {
            UniswapLibV3: await UniswapLibV3.getAddress(),
            Utils: await Utils.getAddress(),
        }
    }
    );
    const Calculum = await upgrades.deployProxy(
        CalculumFactory,
        [
            name,
            symbol,
            decimals,
            [
                "0x0A52D0fAbBE370E8EEcb6C265b574C007Ed0e62a", // Trader Bot Wallet 0x0A52D0fAbBE370E8EEcb6C265b574C007Ed0e62a
                "0x46E9C1B8f65881C9D3333e1461d65275A3ef8647", // Treasury Wallet 0x46E9C1B8f65881C9D3333e1461d65275A3ef8647
                "0xB8df119948e3bb1cf2255EBAfc4b9CE35b11CA22", // Open Zeppelin Defender Wallet Transfer Bot Arbitrum Mainnet
                // "0x101F443B4d1b059569D643917553c771E1b9663E", // Router Address Arbitrum Sepolia
                "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Router Address Arbitrum Mainnet
                // "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d", // USDC native in Arbitrum Sepolia
                "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", // USDC native in Arbitrum Mainnet
                // "0xaDeFDE1A14B6ba4DA3e82414209408a49930E8DC", // Vertex Endpoint Arbitrum Sepolia
                "0xbbEE07B3e8121227AfCFe1E2B82772246226128e", // Vertex Endpoint Arbitrum Mainnet
            ],
            [
                EPOCH_START,
                1 * 10 ** 6, // 1 $
                200 * 10 ** 6, // 200 $
                1000000 * 10 ** 6, // 1000000 $
                3 * 10 ** 6, // 3 $
                5 * 10 ** 6, // 5 $
                ethers.parseEther("0.001")
            ]
        ]
    );

    console.log("Bear Protocol Vault deployed to:", await Calculum.getAddress());

    // Verify Process ERC20 Token
    if (network.name !== "hardhat") {
        console.log("Start verifying the Implementation Smart Contract");
        await snooze(60000);
        const currentImplAddress = await getImplementationAddress(
            provider,
            await Calculum.getAddress()
        );
        console.log(`Current Implementation Address: ${currentImplAddress}`);
        await snooze(60000);
        await run("verify:verify", {
            address: currentImplAddress,
            constructorArguments: [],
            contract: `src/${contractName}.sol:${contractName}`,
        });
    }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
