/* eslint-disable prefer-const */
/* eslint-disable camelcase */
// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers,  run, network, upgrades } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import "@nomiclabs/hardhat-ethers";
import { getImplementationAddress } from "@openzeppelin/upgrades-core";
import dotenv from "dotenv";
import moment from "moment";
import chai from "chai";
import {
    USDC__factory,
    USDC,
    CalculumVault__factory,
    CalculumVault,
    MockUpOracle,
    MockUpOracle__factory,
    UniswapLibV3__factory,
    UniswapLibV3,
    Utils__factory,
    Utils,
    // eslint-disable-next-line node/no-missing-import
} from "../typechain-types";

dotenv.config();

const { expect } = chai;

const snooze = (ms: any) => new Promise((resolve) => setTimeout(resolve, ms));

let OracleFactory: MockUpOracle__factory;
let Oracle: MockUpOracle;
let traderBotWallet: SignerWithAddress;
let treasuryWallet: SignerWithAddress;
let transferBotRoleAddress: SignerWithAddress;
let UniswapLibV3Factory: UniswapLibV3__factory;
let UniswapLibV3: UniswapLibV3;
let UtilsFactory: Utils__factory;
let Utils: Utils;
const name = "CalculumUSDC1";
const symbol = "calcUSDC1";
const decimals = 18;
const EPOCH_TIME: moment.Moment = moment();
const ZERO_ADDRESS = `0x` + `0`.repeat(40);
const epochDuration = 60 * 60 * 24 * 7 * 4; // 4 week
const maintTimeBefore = 60 * 60; // 1 hour
const maintTimeAfter = 60 * 30; // 30 minutes

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
    const contractName: string = "CalculumVault";
    const EPOCH_START = EPOCH_TIME.utc(false).unix();
    console.log(`Contract Name: ${contractName}`);
    // const EPOCH_START = EPOCH_TIME.utc(false).unix();
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
    const CalculumFactory = await ethers.getContractFactory(
        contractName, {
        libraries: {
            UniswapLibV3: "0x7A5Fb3E7700FA3219fcC1a4b066E36bBE11Bb5C8",
            Utils: "0x060B3D11684be38156f129cADDB08fCa1D48db93",
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
                await traderBotWallet.getAddress(),
                await treasuryWallet.getAddress(),
                await transferBotRoleAddress.getAddress(),
                "0x101F443B4d1b059569D643917553c771E1b9663E", // Router Address Arbitrum Sepolia
                "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d", // USDC native in Arbitrum Sepolia
                "0xaDeFDE1A14B6ba4DA3e82414209408a49930E8DC", // Vertex Endpoint Arbitrum Sepolia
                "0x4597CFdd371239a99477Cdabf9cF0B23fDf559B4" // Vertex Spot Engine Arbitrum Sepolia
            ],
            [
                EPOCH_START,
                1 * 10 ** 4,
                1000 * 10 ** 6,
                50000 * 10 ** 6,
                500 * 10 ** 6,
                1000 * 10 ** 6,
                ethers.parseEther("0.5")
            ]
        ]
    );

    console.log("Calculum Vault deployed to:", await Calculum.getAddress());

    // Setting the Value of Epoch Duration and Maintenance Time Before and After
    // await Calculum.connect(deployer).setEpochDuration(
    //     epochDuration,
    //     maintTimeBefore,
    //     maintTimeAfter
    // );

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
        // // USDC Token
        // await run("verify:verify", {
        //     address: USDc.address,
        //     constructorArguments: [],
        //     contract: `contracts/USDC.sol:USDC`,
        // });
        // // Oracle
        // await snooze(60000);
        // await run("verify:verify", {
        //     address: Oracle.address,
        //     constructorArguments: [traderBotWallet.address, USDc.address],
        //     contract: `contracts/mock/MockUpOracle.sol:MockUpOracle`,
        // });
    }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
