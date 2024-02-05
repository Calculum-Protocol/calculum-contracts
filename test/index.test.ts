/* eslint-disable no-unused-vars */
/* eslint-disable camelcase */
import { ethers, run, network, upgrades } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers"
import {
    setBalance,
    impersonateAccount,
} from "@nomicfoundation/hardhat-network-helpers";
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
} from "../typechain-types";
import { USDC_ABI } from "../files/USDC.json";
import { BigNumber } from "ethers";

dotenv.config();

const { expect } = chai;

// General Vars
let deployer: SignerWithAddress;
let treasuryWallet: SignerWithAddress;
let traderBotWallet: SignerWithAddress;
let openZeppelinDefenderWallet: SignerWithAddress;
let alice: SignerWithAddress;
let bob: SignerWithAddress;
let carla: SignerWithAddress;
let lastdeployer: SignerWithAddress;
let OracleFactory: MockUpOracle__factory;
let Oracle: MockUpOracle;
let USDc: any;
let CalculumFactory: CalculumVault__factory;
let Calculum: CalculumVault;
let ConstantsFactory: Constants__factory;
let Constants: Constants;
let DataTypesFactory: DataTypes__factory;
let DataTypes: DataTypes;
let ErrorsFactory: Errors__factory;
let Errors: Errors;
let EventsFactory: Events__factory;
let Events: Events;
let TickMathFactory: TickMath__factory;
let TickMath: TickMath;
let FullMathFactory: FullMath__factory;
let FullMath: FullMath;
let UniswapLibV3Factory: UniswapLibV3__factory;
let UniswapLibV3: UniswapLibV3;
let UtilsFactory: Utils__factory;
let Utils: Utils;
// eslint-disable-next-line prefer-const
const name = "CalculumUSDC1";
const symbol = "calcUSDC1";
const decimals = 18;
const epochDuration = 60 * 60 * 24 * 7;
const maintTimeBefore = 60 * 60;
const maintTimeAfter = 30 * 60;
const MIN_DEPOSIT = 30000 * 10 ** 6;
const MAX_DEPOSIT = 250000 * 10 ** 6;
const MAX_TOTAL_DEPOSIT = 1000000 * 10 ** 6;
const MIN_WALLET_BALANCE_USDC_TRANSFER_BOT = 500 * 10 ** 6;
const TARGET_WALLET_BALANCE_USDC_TRANSFER_BOT = 1000 * 10 ** 6;
const MIN_WALLET_BALANCE_ETH_TRANSFER_BOT = ethers.parseEther("0.5");
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const USDC_ARB_ADDRESS = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const UNISWAP_ARB_ROUTER3 = "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45";
const USDCe_ARB_BIG_HOLDER = "0xa656f7d2A93A6F5878AA768f24eB38Ec8C827fE2";
const VERTEX_ENDPOINT = "0xbbEE07B3e8121227AfCFe1E2B82772246226128e";
const CLEARING_HOUSE = "0xAE1ec28d6225dCE2ff787dcb8CE11cF6D3AE064f";
const SPOT_ENGINE = "0x32d91Af2B17054D575A7bF1ACfa7615f41CCEfaB";

const snooze = (ms: any) => new Promise((resolve) => setTimeout(resolve, ms));

// describe("Verification of Basic Value and Features", function () {
//     const EPOCH_TIME: moment.Moment = moment();
//     const EPOCH_START = EPOCH_TIME.utc(false).unix();
//     let currentEpoch: moment.Moment;
//     let nextEpoch: moment.Moment;
//     before(async () => {
//         [
//             deployer,
//             treasuryWallet,
//             traderBotWallet,
//             openZeppelinDefenderWallet,
//             alice,
//             bob,
//             carla,
//             lastdeployer,
//         ] = await ethers.getSigners();
//         await run("compile");
//         // Getting from command Line de Contract Name
//         const contractName: string = "CalculumVault";

//         console.log(`Contract Name: ${contractName}`);
//         const accounts = await ethers.getSigners();

//         // Deploy USDC in real World
//         // Impersonate USDC Account of Polygon Bridge and Transfer USDC to Owner
//         await impersonateAccount(USDCe_ARB_BIG_HOLDER);
//         const polygonBridge: SignerWithAddress = await ethers.getSigner(
//             USDCe_ARB_BIG_HOLDER
//         );
//         await setBalance(USDCe_ARB_BIG_HOLDER, "0x56bc75e2d63100000");

//         // Create Instance of USDC
//         USDc = await ethers.getContractAt(USDC_ABI, USDC_ARB_ADDRESS);
//         expect(await USDc.getAddress()).to.be.properAddress;
//         expect(await USDc.getAddress()).to.be.equal(USDC_ARB_ADDRESS);
//         expect(await USDc.decimals()).to.be.equal(6);
//         console.log("Deployer Address: ", deployer.address);
//         console.log("OpenZeppelin Address: ", openZeppelinDefenderWallet.address);
//         const initialBalance = await USDc.balanceOf(deployer.address);

//         // Transfer USDC to Owner
//         await expect(
//             USDc.connect(polygonBridge).transfer(
//                 deployer.address,
//                 ethers.parseUnits("1000000000000", "wei")
//             )
//         )
//             .to.emit(USDc, "Transfer")
//             .withArgs(
//                 USDCe_ARB_BIG_HOLDER,
//                 deployer.address,
//                 ethers.parseUnits("1000000000000", "wei")
//             );
//         expect(await USDc.balanceOf(deployer.address)).to.be.equal(
//             ethers.parseUnits("1000000000000", "wei").add(initialBalance)
//         );

//         // eslint-disable-next-line no-unused-expressions
//         expect(await USDc.getAddress()).to.properAddress;
//         console.log(`USDC Address: ${await USDc.getAddress()}`);
//         // Mint 100 K Stable coin to deployer, user1, user2, user3
//         console.log("Deployer UDC Balance: ", parseInt((await USDc.balanceOf(deployer.address)).toString()) / 10 ** 6);
//         await USDc.transfer(alice.address, 250000 * 10 ** 6);
//         await USDc.transfer(bob.address, 100000 * 10 ** 6);
//         await USDc.transfer(carla.address, 30000 * 10 ** 6);
//         // Deploy Mockup Oracle
//         OracleFactory = (await ethers.getContractFactory(
//             "MockUpOracle",
//             deployer
//         )) as MockUpOracle__factory;
//         // Deploy Oracle
//         const Balance = await USDc.balanceOf(traderBotWallet.address);
//         Oracle = (await OracleFactory.deploy(
//             traderBotWallet.address,
//             Balance
//         )) as MockUpOracle;
//         // eslint-disable-next-line no-unused-expressions
//         expect(Oracle.address).to.properAddress;
//         console.log(`Oracle Address: ${Oracle.address}`);
//         // Deploy all Libraries of Calculum , with not upgradeable version
//         DataTypesFactory = (await ethers.getContractFactory(
//             "DataTypes",
//             deployer
//         )) as DataTypes__factory;
//         DataTypes = (await DataTypesFactory.deploy()) as DataTypes;
//         // eslint-disable-next-line no-unused-expressions
//         expect(DataTypes.address).to.properAddress;
//         console.log(`DataTypes Address: ${DataTypes.address}`);
//         ErrorsFactory = (await ethers.getContractFactory(
//             "Errors",
//             deployer
//         )) as Errors__factory;
//         Errors = (await ErrorsFactory.deploy()) as Errors;
//         // eslint-disable-next-line no-unused-expressions
//         expect(Errors.address).to.properAddress;
//         console.log(`Errors Address: ${Errors.address}`);
//         FullMathFactory = (await ethers.getContractFactory(
//             "FullMath",
//             deployer
//         )) as FullMath__factory;
//         FullMath = (await FullMathFactory.deploy()) as FullMath;
//         // eslint-disable-next-line no-unused-expressions
//         expect(FullMath.address).to.properAddress;
//         console.log(`FullMath Address: ${FullMath.address}`);
//         TickMathFactory = (await ethers.getContractFactory(
//             "TickMath",
//             deployer
//         )) as TickMath__factory;
//         TickMath = (await TickMathFactory.deploy()) as TickMath;
//         // eslint-disable-next-line no-unused-expressions
//         expect(TickMath.address).to.properAddress;
//         console.log(`TickMath Address: ${TickMath.address}`);
//         UniswapLibV3Factory = (await ethers.getContractFactory(
//             "UniswapLibV3",
//             deployer
//         )) as UniswapLibV3__factory;
//         UniswapLibV3 = (await UniswapLibV3Factory.deploy()) as UniswapLibV3;
//         // eslint-disable-next-line no-unused-expressions
//         expect(UniswapLibV3.address).to.properAddress;
//         console.log(`UniswapLibV3 Address: ${UniswapLibV3.address}`);
//         UtilsFactory = (await ethers.getContractFactory(
//             "Utils",
//             deployer
//         )) as Utils__factory;
//         Utils = (await UtilsFactory.deploy()) as Utils;
//         // eslint-disable-next-line no-unused-expressions
//         expect(Utils.address).to.properAddress;
//         console.log(`Utils Address: ${Utils.address}`);
//         // Calculum Vault Deployer
//         CalculumFactory = (await ethers.getContractFactory(
//             contractName, {
//             libraries: {
//                 UniswapLibV3: UniswapLibV3.address,
//                 Utils: Utils.address,
//             }
//         }
//         )) as CalculumVault__factory;
//         // Deploy Calculum Vault
//         Calculum = (await upgrades.deployProxy(CalculumFactory, [
//             name,
//             symbol,
//             decimals,
//             [
//                 Oracle.address,
//                 traderBotWallet.address,
//                 treasuryWallet.address,
//                 openZeppelinDefenderWallet.address,
//                 UNISWAP_ARB_ROUTER3,
//                 await USDc.getAddress(),
//                 VERTEX_ENDPOINT,
//                 SPOT_ENGINE
//             ],
//             [
//                 EPOCH_START,
//                 MIN_DEPOSIT,
//                 MAX_DEPOSIT,
//                 MAX_TOTAL_DEPOSIT,
//                 MIN_WALLET_BALANCE_USDC_TRANSFER_BOT,
//                 TARGET_WALLET_BALANCE_USDC_TRANSFER_BOT,
//                 MIN_WALLET_BALANCE_ETH_TRANSFER_BOT,
//             ],
//         ])) as CalculumVault;
//         // eslint-disable-next-line no-unused-expressions
//         expect(await Calculum.getAddress()).to.properAddress;
//         console.log(`Calculum Address: ${await Calculum.getAddress()}`);
//         // Allowance the Contract in Stable Coin
//         await USDc.connect(deployer).approve(await Calculum.getAddress(), 100000 * 10 ** 6);
//         await USDc.connect(alice).approve(await Calculum.getAddress(), 250000 * 10 ** 6);
//         await USDc.connect(bob).approve(await Calculum.getAddress(), 100000 * 10 ** 6);
//         await USDc.connect(carla).approve(await Calculum.getAddress(), 30000 * 10 ** 6);
//         await USDc.connect(openZeppelinDefenderWallet).approve(
//             await Calculum.getAddress(),
//             2000000 * 10 ** 6
//         );
//         await USDc.connect(traderBotWallet).approve(
//             await Calculum.getAddress(),
//             2000000 * 10 ** 6
//         );
//         // Add deployer, alice, bob and carla wallet in the whitelist
//         await Calculum.connect(deployer).addDropWhitelist(deployer.address, true);
//         await Calculum.connect(deployer).addDropWhitelist(alice.address, true);
//         await Calculum.connect(deployer).addDropWhitelist(bob.address, true);
//         await Calculum.connect(deployer).addDropWhitelist(carla.address, true);
//         // Mint 200 USDc to the Transfer Bot Role  Wallet
//         await USDc.connect(deployer).transfer(
//             openZeppelinDefenderWallet.address,
//             200 * 10 ** 6
//         );
//         // Transfer 0.5 ETh from deployer to Contract Vault Address
//         await openZeppelinDefenderWallet.sendTransaction({
//             to: deployer.address,
//             value: (
//                 await openZeppelinDefenderWallet.getBalance()
//             ).sub(ethers.parseEther("0.5")),
//         });
//         console.log(`EPOCH_START : ${EPOCH_START}`);
//         console.log(
//             "Epoch Start Full Date: " +
//             moment(EPOCH_TIME.utc(false).unix() * 1000)
//                 .utc(false)
//                 .format("dddd, MMMM Do YYYY, h:mm:ss a")
//         );
//     });

//     beforeEach(async () => {
//         const time = Math.floor(
//             (await ethers.provider.getBlock("latest")).timestamp
//         );
//         console.log(
//             "Verify TimeStamp: ",
//             time,
//             " Full Date: ",
//             moment(time * 1000)
//                 .utc(false)
//                 .format("dddd, MMMM Do YYYY, h:mm:ss a")
//         );
//         currentEpoch = moment(
//             parseInt((await Calculum.getCurrentEpoch()).toString()) * 1000
//         );
//         console.log("TimeStamp Current Epoch: ", currentEpoch.utc(false));
//         nextEpoch = moment(
//             parseInt((await Calculum.getNextEpoch()).toString()) * 1000
//         );
//     });

//     //   ** Validate Initial Value */
//     //   ** 1. Validate Initial Value */
//     //   ** t1. Validate Initial Value*/
//     it("1.- Validate Initial Value", async () => {
//         console.log("Validate Initial Values");
//         // Verify Owner
//         expect(await Calculum.owner()).to.equal(deployer.address);
//         // Verify name ERC Vault
//         expect(await Calculum.name()).to.equal(name);
//         // Verify symbol ERC Vault
//         expect(await Calculum.symbol()).to.equal(symbol);
//         // Verify decimals ERC Vault
//         expect(await Calculum.decimals()).to.equal(decimals);
//         // Verify assets of Vault
//         expect(await Calculum.asset()).to.equal(await USDc.getAddress());
//         // Verify Treasury Address
//         expect(await Calculum.treasuryWallet()).to.equal(treasuryWallet.address);
//         // Verify Oracle Address
//         expect(await Calculum.oracle()).to.equal(Oracle.address);
//         // Verify Initial Value of Percentage Maintenance Fee
//         expect(await Calculum.MANAGEMENT_FEE_PERCENTAGE()).to.equal(
//             ethers.parseEther("0.01")
//         );
//         // Verify Initial Value of Percentage Performance Fee
//         expect(await Calculum.PERFORMANCE_FEE_PERCENTAGE()).to.equal(
//             ethers.parseEther("0.15")
//         );
//         // Verify Epoch Start
//         expect(await Calculum.EPOCH_START()).to.equal(EPOCH_START);
//         // Verify Epoch Duration
//         expect(await Calculum.EPOCH_DURATION()).to.equal(epochDuration);
//         // Verify Maint Time Before
//         expect(await Calculum.MAINTENANCE_PERIOD_PRE_START()).to.equal(
//             maintTimeBefore
//         );
//         // Verify Maint Time After
//         expect(await Calculum.MAINTENANCE_PERIOD_POST_START()).to.equal(
//             maintTimeAfter
//         );
//         // Verify Min Deposit
//         expect(await Calculum.MIN_DEPOSIT()).to.equal(MIN_DEPOSIT);
//         // Verify Max Deposit
//         expect(await Calculum.MAX_DEPOSIT()).to.equal(MAX_DEPOSIT);
//         // Verify Max Total Deposit into Vault
//         expect(await Calculum.MAX_TOTAL_DEPOSIT()).to.equal(MAX_TOTAL_DEPOSIT);
//         // Verify Min USDC in Vault
//         expect(await Calculum.MIN_WALLET_BALANCE_USDC_TRANSFER_BOT()).to.equal(
//             MIN_WALLET_BALANCE_USDC_TRANSFER_BOT
//         );
//         // Verify Target USDC in Vault
//         expect(await Calculum.TARGET_WALLET_BALANCE_USDC_TRANSFER_BOT()).to.equal(
//             TARGET_WALLET_BALANCE_USDC_TRANSFER_BOT
//         );
//         // Verify Min ETH in Vault
//         expect(await Calculum.MIN_WALLET_BALANCE_ETH_TRANSFER_BOT()).to.equal(
//             MIN_WALLET_BALANCE_ETH_TRANSFER_BOT
//         );
//         // Verify router address Uniswap V2
//         expect(await Calculum.router()).to.equal(UNISWAP_ARB_ROUTER3);
//         // Verify Balance of ERC20 USDc of the Contract Vault
//         expect(await USDc.balanceOf(openZeppelinDefenderWallet.address)).to.equal(
//             200 * 10 ** 6
//         );
//         // Verify Balance in USDc of alice
//         expect(await USDc.balanceOf(alice.address)).to.equal(250000 * 10 ** 6);
//         // Verify Balance in USDc of bob
//         expect(await USDc.balanceOf(bob.address)).to.equal(100000 * 10 ** 6);
//         // Verify Balance in USDc of carla
//         expect(await USDc.balanceOf(carla.address)).to.equal(30000 * 10 ** 6);
//         // Verify Balance of 0.5 ETH in ethereum of Contract Vault
//         expect(
//             await ethers.provider.getBalance(openZeppelinDefenderWallet.address)
//         ).to.lessThanOrEqual(ethers.parseEther("0.5"));
//     });

//     //   ** Verification of Sequence of Epoch */
//     //   ** 2. Verification of Sequence of Epoch */
//     //   ** t1. Verification of Sequence of Epoch*/
//     it("2.- Verification of Sequence of Epoch", async () => {
//         const timestamp: number = Math.floor(
//             (await ethers.provider.getBlock("latest")).timestamp
//         );
//         await expect(
//             Calculum.connect(deployer).setEpochDuration(
//                 epochDuration,
//                 maintTimeBefore,
//                 maintTimeAfter
//             )
//         )
//             .to.revertedWithCustomError(Calculum, "VaultInMaintenance");
//         // Move to after the Maintenance Time Post Maintenance
//         const move1: moment.Moment = moment(
//             Math.floor((await ethers.provider.getBlock("latest")).timestamp) * 1000
//         );
//         await network.provider.send("evm_setNextBlockTimestamp", [
//             parseInt(move1.add(maintTimeAfter + 60, "s").format("X")),
//         ]);
//         await network.provider.send("evm_mine", []);
//         console.log(
//             `Verify TimeStamp after Add ${maintTimeAfter} seconds for Maintenance Window: `,
//             moment(move1.unix() * 1000).utc(false),
//             " Full Date: ",
//             moment(move1.unix() * 1000)
//                 .utc(false)
//                 .format("dddd, MMMM Do YYYY, h:mm:ss a")
//         );
//         // Getting Current Epoch and Next Epoch
//         console.log(
//             `Number of Current Epoch: ${parseInt(
//                 (await Calculum.CURRENT_EPOCH()).toString()
//             )}`
//         );
//         let currentEpoch: moment.Moment = moment(
//             parseInt((await Calculum.getCurrentEpoch()).toString()) * 1000
//         );
//         console.log("TimeStamp Current Epoch: ", currentEpoch.utc(false));
//         let nextEpoch: moment.Moment = moment(
//             parseInt((await Calculum.getNextEpoch()).toString()) * 1000
//         );
//         console.log("TimeStamp Next Epoch: ", nextEpoch.utc(false));
//         // Setting the Value of Epoch Duration and Maintenance Time Before and After
//         await Calculum.connect(deployer).setEpochDuration(
//             epochDuration,
//             maintTimeBefore,
//             maintTimeAfter
//         );
//         console.log("Epoch time Before to Move 2nd Epoch: ", EPOCH_TIME.utc(false));
//         // Move to after Finalize the Next Epoch (2nd Epoch)
//         // EPoch Time changes when adding the Epoch Duration
//         await network.provider.send("evm_setNextBlockTimestamp", [
//             parseInt(EPOCH_TIME.utc(false).add(epochDuration, "s").format("X")),
//         ]);
//         await network.provider.send("evm_mine", []);
//         const move2: moment.Moment = moment(
//             Math.floor((await ethers.provider.getBlock("latest")).timestamp) * 1000
//         );
//         console.log(
//             `Verify TimeStamp after Add ${epochDuration} seconds for Next Epoch: `,
//             moment(move2.unix() * 1000).utc(false),
//             " Full Date: ",
//             moment(move2.unix() * 1000)
//                 .utc(false)
//                 .format("dddd, MMMM Do YYYY, h:mm:ss a")
//         );
//         console.log(
//             `Number of Current Epoch Before: ${parseInt(
//                 (await Calculum.CURRENT_EPOCH()).toString()
//             )}`
//         );
//         await Calculum.CurrentEpoch();
//         // Getting Current Epoch and Next Epoch
//         console.log(
//             `Number of Current Epoch After: ${parseInt(
//                 (await Calculum.CURRENT_EPOCH()).toString()
//             )}`
//         );
//         await Calculum.CurrentEpoch();
//         console.log(
//             `Number of Current Epoch Second Time (Verification not Changes): ${parseInt(
//                 (await Calculum.CURRENT_EPOCH()).toString()
//             )}`
//         );
//         await Calculum.CurrentEpoch();
//         console.log(
//             `Number of Current Epoch Third Time (Verification not Changes): ${parseInt(
//                 (await Calculum.CURRENT_EPOCH()).toString()
//             )}`
//         );
//         await Calculum.CurrentEpoch();
//         console.log(
//             `Number of Current Epoch Forth Time (Verification not Changes): ${parseInt(
//                 (await Calculum.CURRENT_EPOCH()).toString()
//             )}`
//         );
//         currentEpoch = moment(
//             parseInt((await Calculum.getCurrentEpoch()).toString()) * 1000
//         );
//         console.log(
//             "TimeStamp Current Epoch (2nd): ",
//             currentEpoch,
//             "Number Epoch:",
//             parseInt((await Calculum.CURRENT_EPOCH()).toString())
//         );
//         nextEpoch = moment(
//             parseInt((await Calculum.getNextEpoch()).toString()) * 1000
//         );
//         console.log(
//             "TimeStamp Next Epoch (3rd): ",
//             nextEpoch,
//             "Number Epoch:",
//             parseInt((await Calculum.CURRENT_EPOCH()).toString()) + 1
//         );
//         console.log("Epoch time Before to Move 3rd Epoch: ", EPOCH_TIME.utc(false));
//         // Move to after Finalize the Next Epoch (3rd Epoch)
//         // EPoch Time changes when adding the Epoch Duration
//         await network.provider.send("evm_setNextBlockTimestamp", [
//             parseInt(
//                 EPOCH_TIME.utc(false)
//                     .add(epochDuration + 30, "s")
//                     .format("X")
//             ),
//         ]);
//         await network.provider.send("evm_mine", []);
//         const move3: moment.Moment = moment(
//             Math.floor((await ethers.provider.getBlock("latest")).timestamp) * 1000
//         );
//         console.log(
//             `Verify TimeStamp after Add ${epochDuration} seconds: `,
//             moment(move3.unix() * 1000).utc(false),
//             " Full Date: ",
//             moment(move3.unix() * 1000)
//                 .utc(false)
//                 .format("dddd, MMMM Do YYYY, h:mm:ss a")
//         );
//         await Calculum.CurrentEpoch();
//         console.log(
//             "Verification of Current Epoch (3rd): ",
//             parseInt((await Calculum.CURRENT_EPOCH()).toString())
//         );
//         currentEpoch = moment(
//             parseInt((await Calculum.getCurrentEpoch()).toString()) * 1000
//         );
//         console.log("TimeStamp Current Epoch: ", currentEpoch.utc(false));
//         await Calculum.CurrentEpoch();
//         console.log(
//             "Verification of Current Epoch (3rd): (Verification not changes): ",
//             parseInt((await Calculum.CURRENT_EPOCH()).toString())
//         );
//         currentEpoch = moment(
//             parseInt((await Calculum.getCurrentEpoch()).toString()) * 1000
//         );
//         console.log("TimeStamp Current Epoch: ", currentEpoch.utc(false));
//         await Calculum.CurrentEpoch();
//         console.log(
//             "Verification of Current Epoch (3rd): (Verification not changes): ",
//             parseInt((await Calculum.CURRENT_EPOCH()).toString())
//         );
//         currentEpoch = moment(
//             parseInt((await Calculum.getCurrentEpoch()).toString()) * 1000
//         );
//         console.log("TimeStamp Current Epoch: ", currentEpoch.utc(false));
//         nextEpoch = moment(
//             parseInt((await Calculum.getNextEpoch()).toString()) * 1000
//         );
//         console.log("TimeStamp Next Epoch: ", nextEpoch.utc(false));
//     });

//     //   ** Transfer / Renounce OwnerShip */
//     //   ** 3. Transfer / Renounce OwnerShip */
//     //   ** t1. Transfer / Renounce OwnerShip */
//     it("3.- Transfer / Renounce OwnerShip", async () => {
//         await Calculum.connect(deployer).transferOwnership(lastdeployer.address);
//         expect(await Calculum.owner()).to.equal(lastdeployer.address);
//         await Calculum.connect(lastdeployer).renounceOwnership();
//         expect(await Calculum.owner()).to.equal(ZERO_ADDRESS);
//     });

//     after(async () => {
//         await network.provider.send("evm_mine", []);
//         const time = Math.floor(
//             (await ethers.provider.getBlock("latest")).timestamp
//         );
//         console.log(
//             "Verify TimeStamp: ",
//             time,
//             " Full Date: ",
//             moment(time * 1000)
//                 .utc(false)
//                 .format("dddd, MMMM Do YYYY, h:mm:ss a")
//         );
//     });
// });

describe("Verification of Basic Value and Features 2", function () {
    let EPOCH_START: number;
    let EPOCH_TIME: moment.Moment;
    let CURRENT_EPOCH: number = 0;
    let currentEpoch: moment.Moment;
    let nextEpoch: moment.Moment;
    let lastBalanceOfVault: BigInt = BigInt(0);
    before(async () => {
        [
            deployer,
            treasuryWallet,
            traderBotWallet,
            openZeppelinDefenderWallet,
            alice,
            bob,
            carla,
            lastdeployer,
        ] = await ethers.getSigners();
        await run("compile");
        // get satrt time
        EPOCH_START = Math.floor(
            (await ethers.provider.getBlock("latest")).timestamp
        );
        EPOCH_TIME = moment(EPOCH_START * 1000);
        // Getting from command Line de Contract Name
        const contractName: string = "CalculumVault";

        console.log(`Contract Name: ${contractName}`);

        // Deploy USDC in real World
        // Impersonate USDC Account of Polygon Bridge and Transfer USDC to Owner
        await impersonateAccount(USDCe_ARB_BIG_HOLDER);
        const polygonBridge: SignerWithAddress = await ethers.getSigner(
            USDCe_ARB_BIG_HOLDER
        );
        await setBalance(USDCe_ARB_BIG_HOLDER, "0x56bc75e2d63100000");

        // Create Instance of USDC
        USDc = await ethers.getContractAt(USDC_ABI, USDC_ARB_ADDRESS);
        expect(await USDc.getAddress()).to.be.properAddress;
        expect(await USDc.getAddress()).to.be.equal(USDC_ARB_ADDRESS);
        expect(await USDc.decimals()).to.be.equal(6);
        console.log(`USDC Address: ${await USDc.getAddress()}`);
        console.log("Deployer Address: ", deployer.address);
        console.log("OpenZeppelin Address: ", openZeppelinDefenderWallet.address);
        const initialBalance = await USDc.balanceOf(deployer.address);

        // Transfer USDC to Owner
        await expect(
            USDc.connect(polygonBridge).transfer(
                deployer.address,
                ethers.parseUnits("1000000000000", "wei")
            )
        )
            .to.emit(USDc, "Transfer")
            .withArgs(
                USDCe_ARB_BIG_HOLDER,
                deployer.address,
                ethers.parseUnits("1000000000000", "wei")
            );
        expect(await USDc.balanceOf(deployer.address)).to.be.equal(
            ethers.parseUnits("1000000000000", "wei") + initialBalance
        );

        // Mint 100 K Stable coin to deployer, user1, user2, user3
        console.log("Deployer USDC Balance: ", parseInt((await USDc.balanceOf(deployer.address)).toString()) / 10 ** 6);
        await USDc.transfer(alice.address, 250000 * 10 ** 6);
        await USDc.transfer(bob.address, 100000 * 10 ** 6);
        await USDc.transfer(carla.address, 30000 * 10 ** 6);
        // Deploy Mockup Oracle
        OracleFactory = (await ethers.getContractFactory(
            "MockUpOracle",
            deployer
        )) as MockUpOracle__factory;
        // Deploy Oracle
        const Balance = await USDc.balanceOf(traderBotWallet.address);
        console.log("Balance of Dex Wallet: ", Balance);
        Oracle = (await OracleFactory.connect(deployer).deploy(
            traderBotWallet.address,
            Balance
        )) as MockUpOracle;
        // eslint-disable-next-line no-unused-expressions
        expect(await Oracle.getAddress()).to.properAddress;
        console.log(`Oracle Address: ${await Oracle.getAddress()}`);
        // Deploy all Libraries of Calculum , with not upgradeable version
        DataTypesFactory = (await ethers.getContractFactory(
            "DataTypes",
            deployer
        )) as DataTypes__factory;
        DataTypes = (await DataTypesFactory.deploy()) as DataTypes;
        // eslint-disable-next-line no-unused-expressions
        expect(await DataTypes.getAddress()).to.properAddress;
        console.log(`DataTypes Address: ${await DataTypes.getAddress()}`);
        ErrorsFactory = (await ethers.getContractFactory(
            "Errors",
            deployer
        )) as Errors__factory;
        Errors = (await ErrorsFactory.deploy()) as Errors;
        // eslint-disable-next-line no-unused-expressions
        expect(await Errors.getAddress()).to.properAddress;
        console.log(`Errors Address: ${await Errors.getAddress()}`);
        FullMathFactory = (await ethers.getContractFactory(
            "FullMath",
            deployer
        )) as FullMath__factory;
        FullMath = (await FullMathFactory.deploy()) as FullMath;
        // eslint-disable-next-line no-unused-expressions
        expect(await FullMath.getAddress()).to.properAddress;
        console.log(`FullMath Address: ${await FullMath.getAddress()}`);
        TickMathFactory = (await ethers.getContractFactory(
            "TickMath",
            deployer
        )) as TickMath__factory;
        TickMath = (await TickMathFactory.deploy()) as TickMath;
        // eslint-disable-next-line no-unused-expressions
        expect(await TickMath.getAddress()).to.properAddress;
        console.log(`TickMath Address: ${await TickMath.getAddress()}`);
        UniswapLibV3Factory = (await ethers.getContractFactory(
            "UniswapLibV3",
            deployer
        )) as UniswapLibV3__factory;
        UniswapLibV3 = (await UniswapLibV3Factory.deploy()) as UniswapLibV3;
        // eslint-disable-next-line no-unused-expressions
        expect(await UniswapLibV3.getAddress()).to.properAddress;
        console.log(`UniswapLibV3 Address: ${await UniswapLibV3.getAddress()}`);
        UtilsFactory = (await ethers.getContractFactory(
            "Utils",
            deployer
        )) as Utils__factory;
        Utils = (await UtilsFactory.deploy()) as Utils;
        // eslint-disable-next-line no-unused-expressions
        expect(await Utils.getAddress()).to.properAddress;
        console.log(`Utils Address: ${await Utils.getAddress()}`);
        // Calculum Vault Deployer
        CalculumFactory = (await ethers.getContractFactory(
            contractName, {
            libraries: {
                UniswapLibV3: await UniswapLibV3.getAddress(),
                Utils: await Utils.getAddress(),
            }
        }
        )) as CalculumVault__factory;
        // Deploy Calculum Vault
        Calculum = (await upgrades.deployProxy(CalculumFactory, [
            name,
            symbol,
            decimals,
            [
                await Oracle.getAddress(),
                traderBotWallet.address,
                treasuryWallet.address,
                openZeppelinDefenderWallet.address,
                UNISWAP_ARB_ROUTER3,
                await USDc.getAddress(),
                VERTEX_ENDPOINT,
                SPOT_ENGINE
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
        expect(await Calculum.getAddress()).to.properAddress;
        console.log(`Calculum Address: ${await Calculum.getAddress()}`);
        // Allowance the Contract in Stable Coin
        await USDc.connect(deployer).approve(await Calculum.getAddress(), 100000 * 10 ** 6);
        await USDc.connect(alice).approve(await Calculum.getAddress(), 250000 * 10 ** 6);
        await USDc.connect(bob).approve(await Calculum.getAddress(), 100000 * 10 ** 6);
        await USDc.connect(carla).approve(await Calculum.getAddress(), 30000 * 10 ** 6);
        await USDc.connect(openZeppelinDefenderWallet).approve(
            await Calculum.getAddress(),
            2000000 * 10 ** 6
        );
        await USDc.connect(traderBotWallet).approve(
            await Calculum.getAddress(),
            2000000 * 10 ** 6
        );
        // Add deployer, alice, bob and carla wallet in the whitelist
        await Calculum.connect(deployer).addDropWhitelist(deployer.address, true);
        await Calculum.connect(deployer).addDropWhitelist(alice.address, true);
        await Calculum.connect(deployer).addDropWhitelist(bob.address, true);
        await Calculum.connect(deployer).addDropWhitelist(carla.address, true);
        await Calculum.connect(deployer).addDropWhitelist(lastdeployer.address, true);
        // Mint 200 USDc to the Transfer Bot Role  Wallet
        await USDc.connect(deployer).transfer(
            openZeppelinDefenderWallet.address,
            202 * 10 ** 6 // 200 + 2 for pay the first deposit and link signer to the Vertex Smart Contract
        );
        // Transfer 0.5 ETh from deployer to Contract Vault Address
        await openZeppelinDefenderWallet.sendTransaction({
            to: deployer.address,
            value: (
                await ethers.provider.getBalance(await openZeppelinDefenderWallet.getAddress())
                - ethers.parseEther("0.5")),
        });

        console.log(`EPOCH_START : ${EPOCH_START}`);
        console.log(
            "Epoch Start Full Date: " +
            moment(EPOCH_TIME.utc(false).unix() * 1000)
                .utc(false)
                .format("dddd, MMMM Do YYYY, h:mm:ss a")
        );
    });

    beforeEach(async () => {
        const time = Math.floor(
            (await ethers.provider.getBlock("latest")).timestamp
        );
        console.log(
            "Verify TimeStamp: ",
            time,
            " Full Date: ",
            moment(time * 1000)
                .utc(false)
                .format("dddd, MMMM Do YYYY, h:mm:ss a")
        );
        currentEpoch = moment(
            parseInt((await Calculum.getCurrentEpoch()).toString()) * 1000
        );
        console.log("TimeStamp Current Epoch: ", currentEpoch.utc(false));
        nextEpoch = moment(
            parseInt((await Calculum.getNextEpoch()).toString()) * 1000
        );
        console.log("TimeStamp Next Epoch: ", nextEpoch.utc(false));
    });

    //   ** Validate Initial Value */
    //   ** 1. Validate Initial Value */
    //   ** t1. Validate Initial Value*/
    it("1.- Validate Initial Value", async () => {
        console.log("Validate Initial Values");
        // Verify Owner
        expect(await Calculum.owner()).to.equal(deployer.address);
        // Verify name ERC Vault
        expect(await Calculum.name()).to.equal(name);
        // Verify symbol ERC Vault
        expect(await Calculum.symbol()).to.equal(symbol);
        // Verify decimals ERC Vault
        expect(await Calculum.decimals()).to.equal(decimals);
        // Verify assets of Vault
        expect(await Calculum.asset()).to.equal(await USDc.getAddress());
        // Verify Treasury Address
        expect(await Calculum.treasuryWallet()).to.equal(treasuryWallet.address);
        // Verify Oracle Address
        expect(await Calculum.oracle()).to.equal(await Oracle.getAddress());
        // Verify Initial Value of Percentage Maintenance Fee
        expect(await Calculum.MANAGEMENT_FEE_PERCENTAGE()).to.equal(
            ethers.parseEther("0.01")
        );
        // Verify Initial Value of Percentage Performance Fee
        expect(await Calculum.PERFORMANCE_FEE_PERCENTAGE()).to.equal(
            ethers.parseEther("0.15")
        );
        // Verify Epoch Start
        expect(await Calculum.EPOCH_START()).to.equal(EPOCH_START);
        // Verify Epoch Duration
        expect(await Calculum.EPOCH_DURATION()).to.equal(epochDuration);
        // Verify Maint Time Before
        expect(await Calculum.MAINTENANCE_PERIOD_PRE_START()).to.equal(
            maintTimeBefore
        );
        // Verify Maint Time After
        expect(await Calculum.MAINTENANCE_PERIOD_POST_START()).to.equal(
            maintTimeAfter
        );
        // Verify Min Deposit
        expect(await Calculum.MIN_DEPOSIT()).to.equal(MIN_DEPOSIT);
        // Verify Max Deposit
        expect(await Calculum.MAX_DEPOSIT()).to.equal(MAX_DEPOSIT);
        // Verify Max Total Deposit into Vault
        expect(await Calculum.MAX_TOTAL_DEPOSIT()).to.equal(MAX_TOTAL_DEPOSIT);
        // Verify Min USDC in Vault
        expect(await Calculum.MIN_WALLET_BALANCE_USDC_TRANSFER_BOT()).to.equal(
            MIN_WALLET_BALANCE_USDC_TRANSFER_BOT
        );
        // Verify Target USDC in Vault
        expect(await Calculum.TARGET_WALLET_BALANCE_USDC_TRANSFER_BOT()).to.equal(
            TARGET_WALLET_BALANCE_USDC_TRANSFER_BOT
        );
        // Verify Min ETH in Vault
        expect(await Calculum.MIN_WALLET_BALANCE_ETH_TRANSFER_BOT()).to.equal(
            MIN_WALLET_BALANCE_ETH_TRANSFER_BOT
        );
        // Verify router address Uniswap V2
        expect(await Calculum.router()).to.equal(UNISWAP_ARB_ROUTER3);
        // Verify Balance of ERC20 USDc of the Contract Vault
        expect(await USDc.balanceOf(openZeppelinDefenderWallet.address)).to.equal(
            202 * 10 ** 6
        );
        // Verify Balance in USDc of alice
        expect(await USDc.balanceOf(alice.address)).to.equal(250000 * 10 ** 6);
        // Verify Balance in USDc of bob
        expect(await USDc.balanceOf(bob.address)).to.equal(100000 * 10 ** 6);
        // Verify Balance in USDc of carla
        expect(await USDc.balanceOf(carla.address)).to.equal(30000 * 10 ** 6);
        // Verify Balance of 0.5 ETH in ethereum of Contract Vault
        expect(
            await ethers.provider.getBalance(openZeppelinDefenderWallet.address)
        ).to.lessThanOrEqual(ethers.parseEther("0.5"));
    });

    //   ** Verification of Sequence of Epoch based on Excel */
    //   ** 2. Verification of Sequence Preview Epoch */
    //   ** t1. Zero Epoch / Epoch 0 */
    it("2.- Verification of Sequence of Epoch 0", async () => {
        const timestamp: number = Math.floor(
            (await ethers.provider.getBlock("latest")).timestamp
        );
        await expect(
            Calculum.connect(deployer).setEpochDuration(
                epochDuration,
                maintTimeBefore,
                maintTimeAfter
            )
        )
            .to.revertedWithCustomError(Calculum, "VaultInMaintenance");
        // reassing Dex Wallet
        await Oracle.setWallet(await traderBotWallet.getAddress());
        console.log("Balance of Vault + Future Refund SM Account: ", (await USDc.balanceOf(await Calculum.getAddress())) / BigInt("1000000"));
        // Move to after the Maintenance Time Post Maintenance
        const move1: moment.Moment = moment(
            Math.floor((await ethers.provider.getBlock("latest")).timestamp) * 1000
        );
        console.log("Actual TimeStamp: ", move1.utc(false).unix());
        await network.provider.send("evm_setNextBlockTimestamp", [
            parseInt(move1.add(maintTimeAfter, "s").format("X")),
        ]);
        await network.provider.send("evm_mine", []);
        console.log(
            `Verify TimeStamp after Add ${maintTimeAfter} seconds for Maintenance Window: `,
            moment(move1.unix() * 1000)
                .utc(false)
                .unix(),
            " Full Date: ",
            moment(move1.unix() * 1000)
                .utc(false)
                .format("dddd, MMMM Do YYYY, h:mm:ss a")
        );
        // Getting Current Epoch and Next Epoch
        await Calculum.CurrentEpoch();
        const Current_Epoch = parseInt((await Calculum.CURRENT_EPOCH()).toString());
        console.log(`Number of Current Epoch: ${Current_Epoch}`);
        expect(CURRENT_EPOCH).to.equal(Current_Epoch);
        let currentEpoch: moment.Moment = moment(
            parseInt((await Calculum.getCurrentEpoch()).toString()) * 1000
        );
        console.log(
            "TimeStamp Current Epoch: ",
            currentEpoch.utc(false),
            " TiemStamp Format: ",
            currentEpoch.utc(false).unix()
        );
        expect(currentEpoch.utc(false).unix()).to.equal(
            (await Calculum.EPOCH_START()) + (
                (await Calculum.EPOCH_DURATION()) * BigInt(0)
            )
        );
        let nextEpoch: moment.Moment = moment(
            parseInt((await Calculum.getNextEpoch()).toString()) * 1000
        );
        expect(nextEpoch.utc(false).unix()).to.equal(
            currentEpoch.add(epochDuration, "s").utc(false).unix()
        );
        console.log("TimeStamp Next Epoch: ", nextEpoch.utc(false));
        // time before to set Epoch Duration
        const move2: moment.Moment = moment(
            Math.floor((await ethers.provider.getBlock("latest")).timestamp) * 1000
        );
        console.log(
            "TimeStamp Before to Set Epoch Duration: ",
            move2.utc(false).unix()
        );
        // Setting the Value of Epoch Duration and Maintenance Time Before and After
        await Calculum.connect(deployer).setEpochDuration(
            epochDuration,
            maintTimeBefore,
            maintTimeAfter
        );
        // Verify Epoch Duration
        expect(await Calculum.EPOCH_DURATION()).to.equal(epochDuration);
        // Verify Maint Time Before
        expect(await Calculum.MAINTENANCE_PERIOD_PRE_START()).to.equal(
            maintTimeBefore
        );
        // Verify Maint Time After
        expect(await Calculum.MAINTENANCE_PERIOD_POST_START()).to.equal(
            maintTimeAfter
        );
        // start Real Test of Epoch
        // Verify the maximal setting of deposit
        await expect(
            Calculum.connect(alice).deposit(250001 * 10 ** 6, alice.address)
        )
            .to.revertedWithCustomError(Calculum, "DepositExceededMax")
            .withArgs(alice.address, MAX_DEPOSIT);
        // Verify the minimal setting of deposit
        await expect(
            Calculum.connect(alice).deposit(29999 * 10 ** 6, alice.address)
        )
            .to.revertedWithCustomError(Calculum, "DepositAmountTooLow")
            .withArgs(alice.address, 29999 * 10 ** 6);
        // Alice Introduces the Asset to the Vault
        const balanceAliceBefore =
            (await USDc.balanceOf(alice.address)) / BigInt("1000000");
        console.log(
            "Balance of Alice Before to Deposit in the Vault: ",
            balanceAliceBefore
        );
        // Verify deposits status of alice
        let depositsAlice = await Calculum.DEPOSITS(alice.address);
        expect(depositsAlice.status).to.equal(0);
        // Validate all Event Fire after Alice Deposit in the Vault
        expect(
            await Calculum.connect(alice).deposit(150000 * 10 ** 6, alice.address)
        )
            .to.emit(Calculum, "PendingDeposit")
            .withArgs(
                alice.address,
                alice.address,
                150000 * 10 ** 6,
                150000 * 10 ** 6
            )
            .to.emit(USDc, "Transfer")
            .withArgs(alice.address, await Calculum.getAddress(), 150000 * 10 ** 6);
        console.log(`Alice deposits 150000 tokens os USDc`);
        // update alice deposits
        depositsAlice = await Calculum.DEPOSITS(alice.address);
        // Validate Deposit in the Vault
        expect(depositsAlice.status).to.equal(1);
        expect(depositsAlice.amountAssets).to.equal(
            150000 * 10 ** 6
        );
        expect(depositsAlice.amountShares).to.equal(
            ethers.parseEther("150000")
        );
        expect(depositsAlice.finalAmount).to.equal(0);
        const balanceAliceVault =
            parseInt((await Calculum.balanceOf(alice.address)).toString()) / 10 ** 18;
        console.log("Verify of Balance of Alice in the Vault: ", balanceAliceVault);
        // Verify Alice don't have any Vault token in your wallet
        expect(balanceAliceVault).to.equal(0);
        const balanceAliceAfter =
            (await USDc.balanceOf(alice.address)) / BigInt("1000000");
        console.log(
            "Balance of Alice After to Deposit in the Vault: ",
            balanceAliceAfter
        );
        // Validate the Amount transferred from Alice to the Vault
        expect(balanceAliceBefore - balanceAliceAfter).to.equal(150000);
        // Validate actual balance of ETH in the Calculum contract
        const balanceETH = (await ethers.provider.getBalance(await Calculum.getAddress())) / BigInt("1000000000000000000");

        expect(balanceETH).to.equal(0);
        // Validate actual balance of USDc in the Calculum contract (Minimal more deposit of Alice) more paymant of link signer in the first deposit
        const balanceUSDc: BigNumber =
            (await USDc.balanceOf(await Calculum.getAddress())) / BigInt("1000000");
        expect(balanceUSDc).to.equal(150000);
        // Amount of Oracle is Cero, because is the Zero Epoch
        const move3: moment.Moment = moment(
            Math.floor((await ethers.provider.getBlock("latest")).timestamp) * 1000
        );
        // Move to Finalize Epoch
        console.log(
            "Actual TimeStamp: ",
            move3.utc(false).unix(),
            " Full Date: ",
            move3.utc(false).utc(false).format("dddd, MMMM Do YYYY, h:mm:ss a")
        );
        // Fail Try to Finalize the Epoch Before to Start Maintenance Window
        await expect(Calculum.connect(openZeppelinDefenderWallet).finalizeEpoch())
            .to.revertedWithCustomError(Calculum, "VaultOutMaintenance");
        // Move to Start Maintenance Window Pre Start
        const move4: moment.Moment = move3.add(
            epochDuration - (maintTimeBefore + maintTimeAfter),
            "s"
        );
        await network.provider.send("evm_setNextBlockTimestamp", [
            parseInt(move4.format("X")),
        ]);
        await network.provider.send("evm_mine", []);
        console.log(
            `Verify TimeStamp before to Start the Second Maintenance Window: `,
            move4.utc(false).unix(),
            " Full Date: ",
            moment(move4.unix() * 1000)
                .utc(false)
                .format("dddd, MMMM Do YYYY, h:mm:ss a")
        );
        // Setting actual value of Assets
        await Oracle.connect(deployer).setAssetValue(0);
        const newDeposits: BigNumber = (await Calculum.newDeposits());
        const newWithdrawalsShares: BigNumber = (await Calculum.newWithdrawals());
        // Finalize the Epoch
        await Calculum.connect(openZeppelinDefenderWallet).finalizeEpoch();
        console.log("Finalize the Zero Epoch Successfully");
        depositsAlice = await Calculum.DEPOSITS(alice.address);
        // Verify changes in Alice Deposit
        expect(depositsAlice.status).to.equal(2);
        expect(parseInt(depositsAlice.amountAssets.toString())).to.equal(0);
        expect(depositsAlice.amountShares).to.equal(
            ethers.parseEther("150000")
        );
        expect(depositsAlice.finalAmount).to.equal(
            150000 * 10 ** 6
        );
        // Getting netTransfer Object
        const netTransfer: any = await Calculum.netTransfer(
            await Calculum.CURRENT_EPOCH()
        );
        expect(netTransfer.pending).to.be.true;
        expect(netTransfer.direction).to.be.true;
        const netTransferAmount = netTransfer.amount;
        expect(netTransferAmount / BigInt("1000000")).to.equal(150000);
        console.log("Vault Token Price: ", parseInt((await Calculum.VAULT_TOKEN_PRICE(await Calculum.CURRENT_EPOCH()))) / 10 ** 6);
        expect((await Calculum.VAULT_TOKEN_PRICE(await Calculum.CURRENT_EPOCH())) / BigInt("1000000")).to.equal(1);
        // Call dexTransfer to transfer the amount of USDc to the Vault
        await expect(Calculum.connect(openZeppelinDefenderWallet).dexTransfer(true))
            .to.emit(USDc, "Transfer")
            .withArgs(await Calculum.getAddress(), VERTEX_ENDPOINT, 150000 * 10 ** 6)
            .to.emit(USDc, "Transfer")
            .withArgs(VERTEX_ENDPOINT, CLEARING_HOUSE, 150000 * 10 ** 6)
            .to.emit(USDc, "Transfer")
            .withArgs(
                await Calculum.getAddress(),
                VERTEX_ENDPOINT,
                1 * 10 ** 6) // cost for link Signer
            .to.emit(Calculum, "DexTransfer")
            .withArgs(await Calculum.CURRENT_EPOCH(), 150000 * 10 ** 6);
        await Calculum.connect(openZeppelinDefenderWallet).dexTransfer(false)
        console.log(
            "Transfer USDc from the Vault Successfully,to Dex Wallet, Dex Transfer: ",
            netTransfer.amount / BigInt("1000000")
        );
        // Verify the Transfer Bot Gas Reserve in USD is Zero
        expect(
            (await Utils.CalculateTransferBotGasReserveDA(await Calculum.getAddress(), await USDc.getAddress()))
        ).to.equal(0);
        const feeKept = (await Utils.CalculateTransferBotGasReserveDA(await Calculum.getAddress(), await USDc.getAddress()));
        // Call FeeTransfer to transfer the amount of USDc to the Fee Address
        await expect(
            Calculum.connect(openZeppelinDefenderWallet).feesTransfer()
        ).to.revertedWithCustomError(Calculum, "FirstEpochNoFeeTransfer");
        console.log(
            "Transfer USDc to the Treasury Successfully,Fees Transfer: ",
            0
        );
        // Start summarize the Epoch
        console.log('\x1b[32m%s\x1b[0m', 'Start Summarize the Epoch');
        console.log('\x1b[32m%s\x1b[0m', "Epoch Number: ", (await Calculum.CURRENT_EPOCH()).toString());
        const DexWalletBeginningBalance: BigNumber = (await Oracle.connect(traderBotWallet).GetAccount(traderBotWallet.address));
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance Beginning : ", (DexWalletBeginningBalance / BigInt("1000000")).toString());
        console.log('\x1b[32m%s\x1b[0m', "(+/-) Strategy(ies) P/L : -2.5% -", 0);
        console.log('\x1b[32m%s\x1b[0m', "Management Fee per Vault Token: ", parseInt((await Utils.MgtFeePerVaultToken(await Calculum.getAddress()))));
        console.log('\x1b[32m%s\x1b[0m', "Performance Fee per Vault Token: ", parseInt((await Utils.PerfFeePerVaultToken(await Calculum.getAddress(), await USDc.getAddress()))));
        console.log('\x1b[32m%s\x1b[0m', "Fees kept in TransferBot Wallet as gas reserves: ", (feeKept));
        console.log('\x1b[32m%s\x1b[0m', "Deposit (Mint New Wallet): ", newDeposits / BigInt("1000000"));
        console.log('\x1b[32m%s\x1b[0m', "Withdrawal (Burn Wallet): ", newWithdrawalsShares / BigInt("1000000"));
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance End Period: ", (DexWalletBeginningBalance + newDeposits - newWithdrawalsShares - feeKept) / BigInt("1000000"));
        console.log('\x1b[32m%s\x1b[0m', "Treasury Balance : ", (await USDc.balanceOf(treasuryWallet.address)) / BigInt("1000000"));
        console.log('\x1b[32m%s\x1b[0m', "Vault Token Price: ", parseInt((await Calculum.VAULT_TOKEN_PRICE(await Calculum.CURRENT_EPOCH()))) / 10 ** 6);
        console.log('\x1b[32m%s\x1b[0m', "Net Transfer Amount: ", parseInt(netTransferAmount) / 10 ** 6);

        console.log("Balance USDc of Dex Wallet: ", (await USDc.balanceOf(traderBotWallet.address)) / BigInt("1000000"));
        console.log("Preview to Modify the Account Margin of Dex Wallet, specifically deposit 15K USDc")
        // Validate the USDc into the Open Zeppelin Wallet
        expect(
            (await USDc.balanceOf(openZeppelinDefenderWallet.address)) / BigInt("1000000")
        ).to.equal(200);
        console.log("Balance USDc of Open Zeppellin Wallet: ", parseInt((await USDc.balanceOf(openZeppelinDefenderWallet.address))) / 1000000);
        // Validate the ETH into the Vautl (the minimal amount of Vault)
        expect(
            (await ethers.provider.getBalance(await Calculum.getAddress())) / BigInt("1000000000000000000")
        ).to.equal(0);
        console.log(
            "Transfer USDc to the Treasury Successfully,Fees Transfer: ",
            0
        );
        // Move to Start Maintenance Window Pre start next Epoch
        await network.provider.send("evm_setNextBlockTimestamp", [
            parseInt(move4.add(60, "m").format("X")),
        ]);
        await network.provider.send("evm_mine", []);
        // Update Epoch
        await Calculum.CurrentEpoch();
        expect(await Calculum.CURRENT_EPOCH()).to.equal(1);
    });

    //   ** Verification of Sequence of Epoch based on Excel */
    //   ** 3. Verification of Sequence of Epoch */
    //   ** t1. First Epoch / Epoch 1 */
    it("3.- Verification of Sequence of Epoch 1", async () => {
        const timestamp: number = Math.floor(
            (await ethers.provider.getBlock("latest")).timestamp
        );
        await expect(
            Calculum.connect(deployer).setEpochDuration(
                epochDuration,
                maintTimeBefore,
                maintTimeAfter
            )
        )
            .to.revertedWithCustomError(Calculum, "VaultInMaintenance");
        // Revert if alice Try to Claim Her Shares in the Vault Maintenance Window
        await expect(Calculum.connect(alice).claimShares(alice.address))
            .to.revertedWithCustomError(Calculum, "VaultInMaintenance");
        // Move to after the Maintenance Time Post Maintenance
        const move1: moment.Moment = moment(
            Math.floor((await ethers.provider.getBlock("latest")).timestamp) * 1000
        );
        console.log("Actual TimeStamp: ", move1.utc(false).unix());
        await network.provider.send("evm_setNextBlockTimestamp", [
            parseInt(move1.add(maintTimeAfter, "s").format("X")),
        ]);
        await network.provider.send("evm_mine", []);
        console.log(
            `Verify TimeStamp after Add ${maintTimeAfter} seconds for Maintenance Window: `,
            moment(move1.unix() * 1000)
                .utc(false)
                .unix(),
            " Full Date: ",
            moment(move1.unix() * 1000)
                .utc(false)
                .format("dddd, MMMM Do YYYY, h:mm:ss a")
        );
        // Getting Current Epoch and Next Epoch
        CURRENT_EPOCH = 1;
        const Current_Epoch = parseInt((await Calculum.CURRENT_EPOCH()).toString());
        console.log(`Number of Current Epoch: ${Current_Epoch}`);
        expect(CURRENT_EPOCH).to.equal(Current_Epoch);
        let currentEpoch: moment.Moment = moment(
            parseInt((await Calculum.getCurrentEpoch()).toString()) * 1000
        );
        console.log(
            "TimeStamp Current Epoch: ",
            currentEpoch.utc(false),
            " TiemStamp Format: ",
            currentEpoch.utc(false).unix()
        );
        expect(currentEpoch.utc(false).unix()).to.equal(
            (await Calculum.EPOCH_START()) + (
                (await Calculum.EPOCH_DURATION()) * BigInt(1)
            )
        );
        let nextEpoch: moment.Moment = moment(
            parseInt((await Calculum.getNextEpoch()).toString()) * 1000
        );
        expect(nextEpoch.utc(false).unix()).to.equal(
            currentEpoch.add(epochDuration, "s").utc(false).unix()
        );
        console.log("TimeStamp Next Epoch: ", nextEpoch.utc(false));
        // time before to set Epoch Duration
        const move2: moment.Moment = moment(
            Math.floor((await ethers.provider.getBlock("latest")).timestamp) * 1000
        );
        console.log(
            "TimeStamp Before to Set Epoch Duration: ",
            move2.utc(false).unix()
        );
        // Setting the Value of Epoch Duration and Maintenance Time Before and After
        await Calculum.connect(deployer).setEpochDuration(
            epochDuration,
            maintTimeBefore,
            maintTimeAfter
        );
        // Verify Epoch Duration
        expect(await Calculum.EPOCH_DURATION()).to.equal(epochDuration);
        // Verify Maint Time Before
        expect(await Calculum.MAINTENANCE_PERIOD_PRE_START()).to.equal(
            maintTimeBefore
        );
        // Verify Maint Time After
        expect(await Calculum.MAINTENANCE_PERIOD_POST_START()).to.equal(
            maintTimeAfter
        );
        // Revert if Bob Try to Claim the Alice Shares
        await expect(Calculum.connect(bob).claimShares(alice.address))
            .to.revertedWithCustomError(Calculum, "CallerIsNotOwner")
            .withArgs(bob.address, alice.address);
        // Revert if Bob Try to Claim Something
        await expect(Calculum.connect(bob).claimShares(bob.address))
            .to.revertedWithCustomError(Calculum, "CalletIsNotClaimerToDeposit")
            .withArgs(bob.address);
        // Verify the Alice Status
        expect((await Calculum.DEPOSITS(alice.address)).status).to.equal(2);
        expect((await Calculum.DEPOSITS(alice.address)).amountAssets).to.equal(0);
        expect(
            (await Calculum.DEPOSITS(alice.address)).finalAmount
        ).to.equal(150000 * 10 ** 6);
        expect(
            (await Calculum.DEPOSITS(alice.address)).amountShares
        ).to.equal(
            ethers.parseEther("150000")
        );
        // Alice try to Claim your Vault tokens  (Shares)
        await expect(Calculum.connect(alice).claimShares(alice.address))
            .to.emit(Calculum, "Transfer")
            .withArgs(ZERO_ADDRESS, alice.address, ethers.parseEther("150000"))
            .to.emit(Calculum, "Deposit")
            .withArgs(
                alice.address,
                alice.address,
                150000 * 10 ** 6,
                ethers.parseEther("150000")
            );
        console.log("Alice Claimed her Shares Successfully");
        // Verify all Storage Correctly in the Smart Contract
        expect(await Calculum.balanceOf(alice.address)).to.equal(
            ethers.parseEther("150000")
        );
        expect(
            (await Calculum.DEPOSITS(alice.address)).finalAmount
        ).to.equal(150000 * 10 ** 6);
        expect(
            (await Calculum.DEPOSITS(alice.address)).amountShares
        ).to.equal(0);
        expect((await Calculum.DEPOSITS(alice.address)).status).to.equal(3);
        expect(
            (await Calculum.DEPOSITS(alice.address)).amountAssets
        ).to.equal(0);
        expect(await Calculum.balanceOf(alice.address)).to.equal(
            ethers.parseEther("150000")
        );
        // Try to Finalize the Epoch before the Finalization Time
        const time = Math.floor(
            (await ethers.provider.getBlock("latest")).timestamp
        );
        const newDeposits: BigNumber = (await Calculum.newDeposits());
        const newWithdrawalsShares: BigNumber = (await Calculum.newWithdrawals());
        // Store the Value of assets in Mockup Oracle Smart Contract
        // with initial value
        await expect(Calculum.connect(openZeppelinDefenderWallet).finalizeEpoch())
            .to.revertedWithCustomError(Calculum, "VaultOutMaintenance");
        // Move before to Maintenance Windows Pre Start
        await network.provider.send("evm_setNextBlockTimestamp", [
            parseInt(move1.add(epochDuration - maintTimeBefore, "s").format("X")),
        ]);
        await network.provider.send("evm_mine", []);
        // Setting actual value of Assets
        await Oracle.connect(deployer).setAssetValue(146250 * 10 ** 6);
        console.log("Set Value of Assets in the Oracle: ", (await Oracle.connect(deployer).GetAccount(traderBotWallet.address)) / BigInt("1000000"));
        // sub
        const sub = (150000 - 146250) * 10 ** 6;
        // Adjust Balance of Dex Wallet to Real Value
        // await Calculum.connect(deployer).modifyAcctMargin(sub.mul(-1));
        // TODO: need to fix the smart contract of the vault, to handle the transfer to the dex wallet (deposit or withdraw)
        console.log("Adjust Balance of Dex Wallet to Real Value: ", (150000 - 146250));
        // Finalize the Epoch
        await Calculum.connect(openZeppelinDefenderWallet).finalizeEpoch();
        console.log("Finalize the First Epoch Successfully");
        // Getting netTransfer Object
        const netTransfer: any = await Calculum.netTransfer(
            await Calculum.CURRENT_EPOCH()
        );
        expect(netTransfer.pending).to.be.true;
        expect(netTransfer.direction).to.be.false;
        const netTransferAmount = netTransfer.amount;
        console.log("Net Transfer Amount: ", netTransferAmount / BigInt("1000000"));
        expect(netTransferAmount / BigInt("100000")).to.equal(288);
        console.log("Vault Token Price: ", parseInt((await Calculum.VAULT_TOKEN_PRICE(await Calculum.CURRENT_EPOCH())).toString()) / 10 ** 6);
        expect((await Calculum.VAULT_TOKEN_PRICE(await Calculum.CURRENT_EPOCH()))).to.equal(974809);
        // Call dexTransfer to transfer the amount of USDc to the Vault (Withdrawal) without mode reserve
        await expect(Calculum.connect(openZeppelinDefenderWallet).dexTransfer(true))
            .to.emit(Calculum, "DexTransfer")
            .withArgs(
                await Calculum.CURRENT_EPOCH(),
                netTransfer.amount
            );
        console.log("Execute First Dex Transfer Successfully");
        // execute a simulation of the transfer to the dex wallet
        await USDc.connect(deployer).transfer(await Calculum.getAddress(), netTransfer.amount);
        // Call dexTransfer to transfer the amount of USDc to reserve becuase previous execution an Withdrawal was without reserve
        await expect(Calculum.connect(openZeppelinDefenderWallet).dexTransfer(false))
            .to.emit(USDc, "Transfer")
            .withArgs(
                await Calculum.getAddress(),
                openZeppelinDefenderWallet.address,
                netTransfer.amount
            )
        // Validate Last Balance of Vault in USDc, comparring with value in the Excel Spread Sheet
        lastBalanceOfVault += (await USDc.balanceOf(await Calculum.getAddress())) / BigInt("1000000");
        console.log(
            "Last Balance of Vault in USDc: ",
            (await USDc.balanceOf(await Calculum.getAddress())) / BigInt("1000000")
        );
        console.log(
            "Transfer USDc from Dex Wallet to the Vault Successfully,Dex Transfer: ",
            parseInt(netTransfer.amount) / 10 ** 6
        );
        // Verify the Transfer Bot Gas Reserve in USD is Zero
        expect(
            parseInt((await Utils.CalculateTransferBotGasReserveDA(await Calculum.getAddress(), await USDc.getAddress()))) / 10 ** 6
        ).to.equal(288 / 10);
        const feeKept = await Utils.CalculateTransferBotGasReserveDA(await Calculum.getAddress(), await USDc.getAddress());
        // Call FeeTransfer to transfer the amount of USDc to the Fee Address
        await expect(Calculum.connect(openZeppelinDefenderWallet).feesTransfer())
            .to.emit(Calculum, "FeesTransfer")
            .withArgs(await Calculum.CURRENT_EPOCH(), 0);
        // Start summarize the Epoch
        console.log('\x1b[32m%s\x1b[0m', 'Start Summarize the Epoch');
        console.log('\x1b[32m%s\x1b[0m', "Epoch Number: ", (await Calculum.CURRENT_EPOCH()).toString());
        const DexWalletBeginningBalance: BigNumber = (await Oracle.connect(traderBotWallet).GetAccount(traderBotWallet.address));
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance Beginning : ", DexWalletBeginningBalance / BigInt("1000000"));
        console.log('\x1b[32m%s\x1b[0m', "(+/-) Strategy(ies) P/L : -2.5% -", sub / 10 ** 6);
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance EoP before Fees : ", BigInt((150000 - 3750)).toString());
        console.log('\x1b[32m%s\x1b[0m', "Management Fee per Vault Token: ", parseInt((await Utils.MgtFeePerVaultToken(await Calculum.getAddress()))));
        console.log('\x1b[32m%s\x1b[0m', "Performance Fee per Vault Token: ", parseInt((await Utils.PerfFeePerVaultToken(await Calculum.getAddress(), await USDc.getAddress()))));
        console.log('\x1b[32m%s\x1b[0m', "Fees kept in TransferBot Wallet as gas reserves: ", (feeKept));
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance EoP after Fees :", DexWalletBeginningBalance - feeKept);
        console.log('\x1b[32m%s\x1b[0m', "Deposit (Mint New Wallet): ", newDeposits / BigInt("1000000"));
        console.log('\x1b[32m%s\x1b[0m', "Withdrawal (Burn Wallet): ", newWithdrawalsShares / BigInt("1000000"));
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance End Period: ", (DexWalletBeginningBalance + newDeposits - newWithdrawalsShares - feeKept) / BigInt("1000000"));
        console.log('\x1b[32m%s\x1b[0m', "Treasury Balance : ", (await USDc.balanceOf(treasuryWallet.address)) / BigInt("1000000"));
        console.log('\x1b[32m%s\x1b[0m', "Vault Token Price: ", parseInt((await Calculum.VAULT_TOKEN_PRICE(await Calculum.CURRENT_EPOCH()))) / 10 ** 6);
        console.log('\x1b[32m%s\x1b[0m', "Net Transfer Amount: ", parseInt(netTransferAmount) / 10 ** 6);
        // Validate the USDc into the Vautl (the minimal amount of Vault)
        expect(
            parseInt((await USDc.balanceOf(openZeppelinDefenderWallet.address))) / 10 ** 6
        ).to.equal(2278 / 10);
        console.log("Balance USDc of Open Zeppellin Wallet: ", parseInt((await USDc.balanceOf(openZeppelinDefenderWallet.address))) / 10 ** 6);
        // Verify the Balance of USDc of treasury in the Vault
        expect(
            parseInt((await USDc.balanceOf(treasuryWallet.address)).toString())
        ).to.equal(0);
        console.log(
            "Transfer USDc to the Treasury Successfully,Fees Transfer: ",
            0
        );
    });

    //   ** Verification of Sequence of Epoch based on Excel */
    //   ** 4. Verification of Sequence of Epoch */
    //   ** t1. Second Epoch / Epoch 2 */
    it("4.- Verification of Sequence of Epoch 2", async () => {
        const timestamp: number = Math.floor(
            (await ethers.provider.getBlock("latest")).timestamp
        );
        await expect(
            Calculum.connect(deployer).setEpochDuration(
                epochDuration,
                maintTimeBefore,
                maintTimeAfter
            )
        )
            .to.revertedWithCustomError(Calculum, "VaultInMaintenance");
        // Revert if bob Try to Claim Her Shares in the Vault Maintenance Window
        await expect(Calculum.connect(bob).deposit(ethers.parseEther("1000"), bob.address))
            .to.revertedWithCustomError(Calculum, "VaultInMaintenance");
        // Move to after the Maintenance Time Post Maintenance
        const move1: moment.Moment = moment(
            parseInt((await Calculum.getNextEpoch()).toString()) * 1000
        );
        console.log("Actual TimeStamp: ", move1.utc(false).unix());
        await network.provider.send("evm_setNextBlockTimestamp", [
            parseInt(move1.add(maintTimeAfter, "s").format("X")),
        ]);
        await network.provider.send("evm_mine", []);
        console.log(
            `Verify TimeStamp after Add ${maintTimeAfter} seconds for Maintenance Window: `,
            moment(move1.unix() * 1000)
                .utc(false)
                .unix(),
            " Full Date: ",
            moment(move1.unix() * 1000)
                .utc(false)
                .format("dddd, MMMM Do YYYY, h:mm:ss a")
        );
        // Getting Current Epoch and Next Epoch
        await Calculum.connect(deployer).CurrentEpoch();
        CURRENT_EPOCH = 2;
        const Current_Epoch = parseInt((await Calculum.CURRENT_EPOCH()).toString());
        console.log(`Number of Current Epoch: ${Current_Epoch}`);
        expect(CURRENT_EPOCH).to.equal(Current_Epoch);
        let currentEpoch: moment.Moment = moment(
            parseInt((await Calculum.getCurrentEpoch()).toString()) * 1000
        );
        console.log(
            "TimeStamp Current Epoch: ",
            currentEpoch.utc(false),
            " TiemStamp Format: ",
            currentEpoch.utc(false).unix()
        );
        expect(currentEpoch.utc(false).unix()).to.equal(
            (await Calculum.EPOCH_START()) + (
                (await Calculum.EPOCH_DURATION()) * BigInt(2)
            )
        );
        let nextEpoch: moment.Moment = moment(
            parseInt((await Calculum.getNextEpoch()).toString()) * 1000
        );
        expect(nextEpoch.utc(false).unix()).to.equal(
            currentEpoch.add(epochDuration, "s").utc(false).unix()
        );
        console.log("TimeStamp Next Epoch: ", nextEpoch.utc(false));
        // time before to set Epoch Duration
        const move2: moment.Moment = moment(
            Math.floor((await ethers.provider.getBlock("latest")).timestamp) * 1000
        );
        console.log(
            "TimeStamp Before to Set Epoch Duration: ",
            move2.utc(false).unix()
        );
        // Setting the Value of Epoch Duration and Maintenance Time Before and After
        await Calculum.connect(deployer).setEpochDuration(
            epochDuration,
            maintTimeBefore,
            maintTimeAfter
        );
        // Verify Epoch Duration
        expect(await Calculum.EPOCH_DURATION()).to.equal(epochDuration);
        // Verify Maint Time Before
        expect(await Calculum.MAINTENANCE_PERIOD_PRE_START()).to.equal(
            maintTimeBefore
        );
        // Verify Maint Time After
        expect(await Calculum.MAINTENANCE_PERIOD_POST_START()).to.equal(
            maintTimeAfter
        );
        // Verify status of bob in DEPOSITS before deposit
        expect((await Calculum.DEPOSITS(bob.address)).status).to.equal(0);
        // Add deposit to the Vault from Bob
        await expect(Calculum.connect(bob).deposit(50000 * 10 ** 6, bob.address))
            .to.emit(USDc, "Transfer")
            .withArgs(bob.address, await Calculum.getAddress(), 50000 * 10 ** 6)
            .to.emit(Calculum, "PendingDeposit")
            .withArgs(
                bob.address,
                bob.address,
                50000 * 10 ** 6,
                ethers.parseUnits("51293362126007273398750", "wei")
            );
        // Verify the Balance of USDc of Bob in the Vault
        expect((await USDc.balanceOf(bob.address))).to.equal(
            50000 * 10 ** 6
        );
        // Verify the Balance of USDc of Calculum in the Vault
        lastBalanceOfVault += BigInt("50000");
        console.log("Last Balance of Vault in USDc: ", lastBalanceOfVault);
        expect(
            (await USDc.balanceOf(await Calculum.getAddress())) / BigInt("1000000")
        ).to.equal(lastBalanceOfVault);
        // Verify the status of Bob in DEPOSITS after deposit
        expect((await Calculum.DEPOSITS(bob.address)).status).to.equal(1);
        // Verify the amount of assets of Bob in DEPOSITS after deposit
        expect((await Calculum.DEPOSITS(bob.address)).amountAssets).to.equal(
            50000 * 10 ** 6
        );
        // Verify the amount of shares of Bob in DEPOSITS after deposit
        expect(
            (await Calculum.DEPOSITS(bob.address)).amountShares.toString()
        ).to.equal(
            ethers.parseUnits("51293362126007273398750", "wei").toString()
        );
        // Verify the final amount of Bob in DEPOSITS after deposit
        expect((await Calculum.DEPOSITS(bob.address)).finalAmount).to.equal(0);
        // Try to Finalize the Epoch before the Finalization Time
        const time = Math.floor(
            (await ethers.provider.getBlock("latest")).timestamp
        );
        // Store the Value of assets in Mockup Oracle Smart Contract
        // with initial value
        await expect(Calculum.connect(openZeppelinDefenderWallet).finalizeEpoch())
            .to.revertedWithCustomError(Calculum, "VaultOutMaintenance");
        // Move before to Maintenance Windows Pre Start
        await network.provider.send("evm_setNextBlockTimestamp", [
            parseInt(move1.add(epochDuration - maintTimeBefore, "s").format("X")),
        ]);
        await network.provider.send("evm_mine", []);
        // Setting actual value of Assets
        await Oracle.connect(deployer).setAssetValue(143296.8 * 10 ** 6);
        console.log("Set Value of Assets in the Oracle: ", 1432968 / 10);
        // sub
        const sub = (146221.2 - 143296.8) * 10 ** 6;
        // TODO: need to fix the smart contract of the vault, to handle the transfer to the dex wallet (deposit or withdraw)
        console.log("Adjust Balance of Dex Wallet to Real Value: ", sub / 10 ** 6);
        // expect(await USDc.balanceOf(traderBotWallet.address)).to.equal(1432968);
        // Adjust Balance of Dex Wallet to Real Value
        const newDeposits: BigNumber = (await Calculum.newDeposits());
        const newWithdrawalsShares: BigNumber = (await Calculum.newWithdrawals());
        // Finalize the Epoch
        await Calculum.connect(openZeppelinDefenderWallet).finalizeEpoch();
        console.log("Finalize the Second Epoch Successfully");
        // Getting netTransfer Object
        const netTransfer: any = await Calculum.netTransfer(
            await Calculum.CURRENT_EPOCH()
        );
        expect(netTransfer.pending).to.be.true;
        expect(netTransfer.direction).to.be.true;
        const netTransferAmount = netTransfer.amount;
        console.log("Net Transfer Amount: ", parseInt(netTransferAmount) / 10 ** 6);
        expect(parseInt(netTransferAmount) / 10 ** 6).to.equal(
            4997195 / 100
        );
        console.log("Vault Token Price: ", parseInt((await Calculum.VAULT_TOKEN_PRICE(await Calculum.CURRENT_EPOCH()))) / 10 ** 6);
        expect((await Calculum.VAULT_TOKEN_PRICE(await Calculum.CURRENT_EPOCH()))).to.equal(955126);
        // Verify status of bob in DEPOSITS after finalize epoch
        expect((await Calculum.DEPOSITS(bob.address)).status).to.equal(2); // 2 = Claimet
        expect((await Calculum.DEPOSITS(bob.address)).amountAssets).to.equal(0);
        expect((await Calculum.DEPOSITS(bob.address)).amountShares.toString()).to.equal(
            ethers.parseUnits("52349114148290382630146", "wei").toString()
        );
        expect((await Calculum.DEPOSITS(bob.address)).finalAmount).to.equal(
            50000 * 10 ** 6
        );
        // Call dexTransfer to transfer the amount of USDc to the Vault (Deposit) without mode reserve
        await expect(Calculum.connect(openZeppelinDefenderWallet).dexTransfer(true))
            .to.emit(Calculum, "DexTransfer")
            .withArgs(
                await Calculum.CURRENT_EPOCH(),
                netTransfer.amount
            );
        console.log("Execute First Dex Transfer Successfully");
        // Call dexTransfer to transfer the amount of USDc to reserve becuase previous execution an Deposit was without reserve
        await expect(Calculum.connect(openZeppelinDefenderWallet).dexTransfer(false))
            .to.emit(USDc, "Transfer")
            .withArgs(
                await Calculum.getAddress(),
                openZeppelinDefenderWallet.address,
                await Utils.CalculateTransferBotGasReserveDA(await Calculum.getAddress(), await USDc.getAddress())
            )
        console.log(
            "Transfer USDc from the Vault to Dex Wallet Successfully,Dex Transfer: ",
            netTransfer.amount / BigInt("1000000")
        );
        // Verify the Transfer Bot Gas Reserve in USD is Zero
        expect(
            parseInt((await Utils.CalculateTransferBotGasReserveDA(await Calculum.getAddress(), await USDc.getAddress()))) / 10 ** 6
        ).to.equal(2805 / 100);
        // Call FeeTransfer to transfer the amount of USDc to the Fee Address
        const feeKept = await Utils.CalculateTransferBotGasReserveDA(await Calculum.getAddress(), await USDc.getAddress());
        // Call FeeTransfer to transfer the amount of USDc to the Fee Address
        await expect(Calculum.connect(openZeppelinDefenderWallet).feesTransfer())
            .to.emit(Calculum, "FeesTransfer")
            .withArgs(await Calculum.CURRENT_EPOCH(), 0);
        // Start summarize the Epoch
        console.log('\x1b[32m%s\x1b[0m', 'Start Summarize the Epoch');
        console.log('\x1b[32m%s\x1b[0m', "Epoch Number: ", (await Calculum.CURRENT_EPOCH()).toString());
        const DexWalletBeginningBalance: BigNumber = (await Oracle.connect(traderBotWallet).GetAccount(traderBotWallet.address));
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance Beginning : ", DexWalletBeginningBalance / BigInt("1000000"));
        console.log('\x1b[32m%s\x1b[0m', "(+/-) Strategy(ies) P/L : -2.5% -", sub / 10 ** 6);
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance EoP before Fees : ", BigInt((150000 - 3750)).toString());
        console.log('\x1b[32m%s\x1b[0m', "Management Fee per Vault Token: ", parseInt((await Utils.MgtFeePerVaultToken(await Calculum.getAddress()))));
        console.log('\x1b[32m%s\x1b[0m', "Performance Fee per Vault Token: ", parseInt((await Utils.PerfFeePerVaultToken(await Calculum.getAddress(), await USDc.getAddress()))));
        console.log('\x1b[32m%s\x1b[0m', "Fees kept in TransferBot Wallet as gas reserves: ", (feeKept));
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance EoP after Fees :", DexWalletBeginningBalance - feeKept);
        console.log('\x1b[32m%s\x1b[0m', "Deposit (Mint New Wallet): ", newDeposits / BigInt("1000000"));
        console.log('\x1b[32m%s\x1b[0m', "Withdrawal (Burn Wallet): ", newWithdrawalsShares / BigInt("1000000"));
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance End Period: ", (DexWalletBeginningBalance + newDeposits - newWithdrawalsShares - feeKept) / BigInt("1000000"));
        console.log('\x1b[32m%s\x1b[0m', "Treasury Balance : ", (await USDc.balanceOf(treasuryWallet.address)) / BigInt("1000000"));
        console.log('\x1b[32m%s\x1b[0m', "Vault Token Price: ", parseInt((await Calculum.VAULT_TOKEN_PRICE(await Calculum.CURRENT_EPOCH()))) / 10 ** 6);
        console.log('\x1b[32m%s\x1b[0m', "Net Transfer Amount: ", parseInt(netTransferAmount) / 10 ** 6);
        // The Amount of USDc in the Dex Wallet is 1500000 USDc minus the last fee
        // expect(
        //     parseInt((await USDc.balanceOf(traderBotWallet.address))) / 10 ** 6
        // ).to.equal(19326882 / 100);
        console.log("Balance USDc of Dex Wallet: ", parseInt((await USDc.balanceOf(traderBotWallet.address))) / 10 ** 6);
        // Verify the Balance of USDc of treasury in the Vault
        expect(
            parseInt((await USDc.balanceOf(treasuryWallet.address)).toString())
        ).to.equal(0);
        console.log(
            "Transfer USDc to the Treasury Successfully,Fees Transfer: ",
            0
        );
        // Validate Last Balance of TransferBot Role Wallet in USDc, comparring with value in the Excel Spread Sheet
        expect(
            parseInt((await USDc.balanceOf(openZeppelinDefenderWallet.address))) / 10 ** 6
        ).to.equal(25485 / 100);
        console.log("Balance USDc of Open Zeppellin Wallet: ", parseInt((await USDc.balanceOf(openZeppelinDefenderWallet.address))) / 10 ** 6);
    });

    //   ** Verification of Sequence of Epoch based on Excel */
    //   ** 5. Verification of Sequence of Epoch */
    //   ** t1. Third Epoch / Epoch 3 */
    it("5.- Verification of Sequence of Epoch 3", async () => {
        const timestamp: number = Math.floor(
            (await ethers.provider.getBlock("latest")).timestamp
        );
        await expect(
            Calculum.connect(deployer).setEpochDuration(
                epochDuration,
                maintTimeBefore,
                maintTimeAfter
            )
        )
            .to.revertedWithCustomError(Calculum, "VaultInMaintenance");
        // Revert if alice Try to Claim Her Shares in the Vault Maintenance Window
        await expect(
            Calculum.connect(alice).deposit(100000 * 10 ** 6, alice.address)
        )
            .to.revertedWithCustomError(Calculum, "VaultInMaintenance");
        // Move to after the Maintenance Time Post Maintenance
        const move1: moment.Moment = moment(
            parseInt((await Calculum.getNextEpoch()).toString()) * 1000
        );
        console.log("Actual TimeStamp: ", move1.utc(false).unix());
        await network.provider.send("evm_setNextBlockTimestamp", [
            parseInt(move1.add(maintTimeAfter, "s").format("X")),
        ]);
        await network.provider.send("evm_mine", []);
        console.log(
            `Verify TimeStamp after Add ${maintTimeAfter} seconds for Maintenance Window: `,
            moment(move1.unix() * 1000)
                .utc(false)
                .unix(),
            " Full Date: ",
            moment(move1.unix() * 1000)
                .utc(false)
                .format("dddd, MMMM Do YYYY, h:mm:ss a")
        );
        // Getting Current Epoch and Next Epoch
        await Calculum.connect(deployer).CurrentEpoch();
        CURRENT_EPOCH = 3;
        const Current_Epoch = parseInt((await Calculum.CURRENT_EPOCH()).toString());
        console.log(`Number of Current Epoch: ${Current_Epoch}`);
        expect(CURRENT_EPOCH).to.equal(Current_Epoch);
        let currentEpoch: moment.Moment = moment(
            parseInt((await Calculum.getCurrentEpoch()).toString()) * 1000
        );
        console.log(
            "TimeStamp Current Epoch: ",
            currentEpoch.utc(false),
            " TiemStamp Format: ",
            currentEpoch.utc(false).unix()
        );
        expect(currentEpoch.utc(false).unix()).to.equal(
            (await Calculum.EPOCH_START()) + (
                (await Calculum.EPOCH_DURATION()) * BigInt(3)
            )
        );
        let nextEpoch: moment.Moment = moment(
            parseInt((await Calculum.getNextEpoch()).toString()) * 1000
        );
        expect(nextEpoch.utc(false).unix()).to.equal(
            currentEpoch.add(epochDuration, "s").utc(false).unix()
        );
        console.log("TimeStamp Next Epoch: ", nextEpoch.utc(false));
        // time before to set Epoch Duration
        const move2: moment.Moment = moment(
            Math.floor((await ethers.provider.getBlock("latest")).timestamp) * 1000
        );
        console.log(
            "TimeStamp Before to Set Epoch Duration: ",
            move2.utc(false).unix()
        );
        // Setting the Value of Epoch Duration and Maintenance Time Before and After
        await Calculum.connect(deployer).setEpochDuration(
            epochDuration,
            maintTimeBefore,
            maintTimeAfter
        );
        // Verify Epoch Duration
        expect(await Calculum.EPOCH_DURATION()).to.equal(epochDuration);
        // Verify Maint Time Before
        expect(await Calculum.MAINTENANCE_PERIOD_PRE_START()).to.equal(
            maintTimeBefore
        );
        // Verify Maint Time After
        expect(await Calculum.MAINTENANCE_PERIOD_POST_START()).to.equal(
            maintTimeAfter
        );
        // Verify status of alice in DEPOSITS before deposit
        expect((await Calculum.DEPOSITS(alice.address)).status).to.equal(
            3 // 3 = Completed
        );
        expect((await Calculum.DEPOSITS(alice.address)).amountAssets).to.equal(0);
        expect((await Calculum.DEPOSITS(alice.address)).finalAmount).to.equal(
            150000 * 10 ** 6
        );
        console.log(
            "Amount of Share before to new Deposit: ",
            (await Calculum.DEPOSITS(alice.address)).amountShares.toString()

        );
        // Verify status of bob in DEPOSITS before claim his shares
        expect((await Calculum.DEPOSITS(bob.address)).status).to.equal(2); // 2 = Claimet
        expect((await Calculum.DEPOSITS(bob.address)).amountAssets).to.equal(0);
        expect((await Calculum.DEPOSITS(bob.address)).amountShares.toString()).to.equal(
            ethers.parseUnits("52349114148290382630146", "wei").toString()
        );
        expect((await Calculum.DEPOSITS(bob.address)).finalAmount).to.equal(
            50000 * 10 ** 6
        );
        // Claim Shares from bob
        await expect(Calculum.connect(bob).claimShares(bob.address))
            .to.emit(Calculum, "Transfer")
            .withArgs(
                ZERO_ADDRESS,
                bob.address,
                ethers.parseUnits("52349114148290382630146", "wei")
            )
            .to.emit(Calculum, "Deposit")
            .withArgs(
                bob.address,
                bob.address,
                50000 * 10 ** 6,
                ethers.parseUnits("52349114148290382630146", "wei")
            );
        // Verify status of bob in DEPOSITS after claim his shares
        expect((await Calculum.DEPOSITS(bob.address)).status).to.equal(3); // 3 = Completed
        expect((await Calculum.DEPOSITS(bob.address)).amountAssets).to.equal(0);
        expect((await Calculum.DEPOSITS(bob.address)).amountShares).to.equal(0);
        expect((await Calculum.DEPOSITS(bob.address)).finalAmount).to.equal(
            50000 * 10 ** 6
        );
        expect((await Calculum.balanceOf(bob.address)).toString()).to.equal(
            ethers.parseUnits("52349114148290382630146", "wei").toString()
        );
        // Verify status of carla in DEPOSITS before deposit
        expect((await Calculum.DEPOSITS(carla.address)).status).to.equal(0); // 0 = Inactive
        // Add deposit to the Vault from alice
        await expect(
            Calculum.connect(alice).deposit(100000 * 10 ** 6, alice.address)
        )
            .to.emit(USDc, "Transfer")
            .withArgs(alice.address, await Calculum.getAddress(), 100000 * 10 ** 6)
            .to.emit(Calculum, "PendingDeposit")
            .withArgs(
                alice.address,
                alice.address,
                100000 * 10 ** 6,
                ethers.parseUnits("141246329361015730603701", "wei")
            );
        // Add deposit to the Vault from carla
        await expect(
            Calculum.connect(carla).deposit(30000 * 10 ** 6, carla.address)
        )
            .to.emit(USDc, "Transfer")
            .withArgs(carla.address, await Calculum.getAddress(), 30000 * 10 ** 6)
            .to.emit(Calculum, "PendingDeposit")
            .withArgs(
                carla.address,
                carla.address,
                30000 * 10 ** 6,
                ethers.parseUnits("42373898808304719181111", "wei")
            );
        // Verify status of alice in DEPOSITS after deposit
        expect((await Calculum.DEPOSITS(alice.address)).status).to.equal(1); // 1 = Pending
        expect((await Calculum.DEPOSITS(alice.address)).amountAssets).to.equal(
            100000 * 10 ** 6
        );
        expect((await Calculum.DEPOSITS(alice.address)).amountShares).to.equal(
            ethers.parseUnits("141246329361015730603701", "wei")
        );
        expect((await Calculum.DEPOSITS(alice.address)).finalAmount).to.equal(
            150000 * 10 ** 6
        );
        // Verify status of carla in DEPOSITS after deposit
        expect((await Calculum.DEPOSITS(carla.address)).status).to.equal(1); // 1 = Pending
        expect((await Calculum.DEPOSITS(carla.address)).amountAssets).to.equal(
            30000 * 10 ** 6
        );
        expect((await Calculum.DEPOSITS(carla.address)).amountShares).to.equal(
            ethers.parseUnits("42373898808304719181111", "wei")
        );
        expect((await Calculum.DEPOSITS(carla.address)).finalAmount).to.equal(0); // Zero because is a new user
        console.log("Balance of Calculum in USDc After Deposit: ", parseInt((await USDc.balanceOf(await Calculum.getAddress()))) / 10 ** 6);
        // Verify the Balance of USDc of Calculum in the Vault
        lastBalanceOfVault = 100000 + 30000 + 2; // 2 is the amount available to pays the fees of submitSlowModeTransaction
        console.log("Last Balance of Vault in USDc: ", lastBalanceOfVault);
        expect(
            (await USDc.balanceOf(await Calculum.getAddress())) / BigInt("1000000")
        ).to.equal(lastBalanceOfVault);
        // Try to Finalize the Epoch before the Finalization Time
        const time = Math.floor(
            (await ethers.provider.getBlock("latest")).timestamp
        );
        await expect(Calculum.connect(openZeppelinDefenderWallet).finalizeEpoch())
            .to.revertedWithCustomError(Calculum, "VaultOutMaintenance");
        // Move before to Maintenance Windows Pre Start
        await network.provider.send("evm_setNextBlockTimestamp", [
            parseInt(move1.add(epochDuration - maintTimeBefore, "s").format("X")),
        ]);
        await network.provider.send("evm_mine", []);
        // Setting actual value of Assets
        await Oracle.connect(deployer).setAssetValue(200999.48 * 10 ** 6);
        console.log("Set Value of Assets in the Oracle: ", 200999.55);
        // sub
        const sub = (200999.48 - 193268.73) * 10 ** 6;

        // TODO: need to fix the smart contract of the vault, to handle the transfer to the dex wallet (deposit or withdraw)
        console.log("Adjust Balance of Dex Wallet to Real Value: ", sub / 10 ** 6);
        const newDeposits: BigNumber = (await Calculum.newDeposits());
        const newWithdrawalsShares: BigNumber = (await Calculum.newWithdrawals());
        // Finalize the Epoch
        await Calculum.connect(openZeppelinDefenderWallet).finalizeEpoch();
        console.log("Finalize the Third Epoch Successfully");
        // Getting netTransfer Object
        const netTransfer: any = await Calculum.netTransfer(
            await Calculum.CURRENT_EPOCH()
        );
        expect(netTransfer.pending).to.be.true;
        expect(netTransfer.direction).to.be.true;
        const netTransferAmount = netTransfer.amount;
        expect(netTransferAmount / BigInt("100000")).to.equal(1288031);
        console.log("Vault Token Price: ", (await Calculum.VAULT_TOKEN_PRICE(await Calculum.CURRENT_EPOCH())));
        expect((await Calculum.VAULT_TOKEN_PRICE(await Calculum.CURRENT_EPOCH()))).to.equal(987416);
        console.log("Net Transfer Amount:", parseInt(netTransferAmount) / 10 ** 6)
        console.log("Balance of Calculum in USDc: ", parseInt((await USDc.balanceOf(await Calculum.getAddress()))) / 10 ** 6);
        console.log("Reserve of Gas: ", parseInt((await Utils.CalculateTransferBotGasReserveDA(await Calculum.getAddress(), await USDc.getAddress()))) / 10 ** 6);
        // Verify the Transfer Bot Gas Reserve in USD is Zero
        expect(
            parseInt((await Utils.CalculateTransferBotGasReserveDA(await Calculum.getAddress(), await USDc.getAddress()))) / 10 ** 6
        ).to.equal(74515 / 100);
        const feeKept = await Utils.CalculateTransferBotGasReserveDA(await Calculum.getAddress(), await USDc.getAddress());
        // Verify Dex Wallet Balance
        // Call dexTransfer to transfer the amount of USDc to the Vault
        await expect(Calculum.connect(openZeppelinDefenderWallet).dexTransfer(true))
            .to.emit(Calculum, "DexTransfer")
            .withArgs(
                await Calculum.CURRENT_EPOCH(),
                netTransfer.amount
            );
        console.log("Execute First Dex Transfer Successfully");
        // Call dexTransfer to transfer the amount of USDc to reserve becuase previous execution an Deposit was without reserve
        await expect(Calculum.connect(openZeppelinDefenderWallet).dexTransfer(false))
            .to.emit(USDc, "Transfer")
            .withArgs(
                await Calculum.getAddress(),
                openZeppelinDefenderWallet.address,
                await Utils.CalculateTransferBotGasReserveDA(await Calculum.getAddress(), await USDc.getAddress())
            )
        console.log(
            "Transfer USDc from the Vault to Dex Wallet Successfully,Dex Transfer: ",
            parseInt(netTransfer.amount) / 10 ** 6
        );
        // Validate Last Balance of Vault in USDc, compare with value in the Excel Spread Sheet
        console.log(
            "Last Balance of Contract in USDc before Fees Transfer: ",
            parseInt((await USDc.balanceOf(await Calculum.getAddress()))) / 10 ** 6
        );
        expect(
            parseInt((await USDc.balanceOf(await Calculum.getAddress()))) / 10 ** 6
        ).to.equal(453.74501);
        // Call FeeTransfer to transfer the amount of USDc to the Fee Address
        await expect(Calculum.connect(openZeppelinDefenderWallet).feesTransfer())
            .to.emit(Calculum, "FeesTransfer")
            .withArgs(await Calculum.CURRENT_EPOCH(), ethers.parseUnits("453745010", "wei"));
        // Start summarize the Epoch
        console.log('\x1b[32m%s\x1b[0m', 'Start Summarize the Epoch');
        console.log('\x1b[32m%s\x1b[0m', "Epoch Number: ", (await Calculum.CURRENT_EPOCH()).toString());
        const DexWalletBeginningBalance: BigNumber = (await Oracle.connect(traderBotWallet).GetAccount(traderBotWallet.address));
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance Beginning : ", DexWalletBeginningBalance / BigInt("1000000"));
        console.log('\x1b[32m%s\x1b[0m', "(+/-) Strategy(ies) P/L : -2.5% -", sub / 10 ** 6);
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance EoP before Fees : ", BigInt((150000 - 3750)).toString());
        console.log('\x1b[32m%s\x1b[0m', "Management Fee per Vault Token: ", parseInt((await Utils.MgtFeePerVaultToken(await Calculum.getAddress()))));
        console.log('\x1b[32m%s\x1b[0m', "Performance Fee per Vault Token: ", parseInt((await Utils.PerfFeePerVaultToken(await Calculum.getAddress(), await USDc.getAddress()))));
        console.log('\x1b[32m%s\x1b[0m', "Fees kept in TransferBot Wallet as gas reserves: ", (feeKept));
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance EoP after Fees :", DexWalletBeginningBalance - feeKept);
        console.log('\x1b[32m%s\x1b[0m', "Deposit (Mint New Wallet): ", newDeposits / BigInt("1000000"));
        console.log('\x1b[32m%s\x1b[0m', "Withdrawal (Burn Wallet): ", newWithdrawalsShares / BigInt("1000000"));
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance End Period: ", (DexWalletBeginningBalance + newDeposits - newWithdrawalsShares - feeKept) / BigInt("1000000"));
        console.log('\x1b[32m%s\x1b[0m', "Treasury Balance : ", (await USDc.balanceOf(treasuryWallet.address)) / BigInt("1000000"));
        console.log('\x1b[32m%s\x1b[0m', "Vault Token Price: ", parseInt((await Calculum.VAULT_TOKEN_PRICE(await Calculum.CURRENT_EPOCH()))) / 10 ** 6);
        console.log('\x1b[32m%s\x1b[0m', "Net Transfer Amount: ", parseInt(netTransferAmount) / 10 ** 6);
        // The Amount of USDc in the Dex Wallet is 1500000 USDc minus the last fee
        // expect(
        //     parseInt((await USDc.balanceOf(traderBotWallet.address))) / 10 ** 6
        // ).to.equal(32980295 / 100);
        console.log("Balance USDc of Dex Wallet: ", parseInt((await USDc.balanceOf(traderBotWallet.address))) / 10 ** 6);
        // Verify the Balance of USDc of treasury in the Vault
        expect(
            parseInt((await USDc.balanceOf(treasuryWallet.address))) /
            10 ** 6
        ).to.equal(452.74501);
        console.log(
            "Transfer USDc to the Treasury Successfully,Fees Transfer: ",
            parseInt((await USDc.balanceOf(treasuryWallet.address))) /
            10 ** 6
        );
        // Validate Last Balance of TransferBot Role Wallet in USDc, comparring with value in the Excel Spread Sheet
        expect(
            (await USDc.balanceOf(openZeppelinDefenderWallet.address)) / BigInt("1000000")
        ).to.equal(1000);
        console.log("Balance USDc of Open Zeppellin Wallet: ", parseInt((await USDc.balanceOf(openZeppelinDefenderWallet.address))) / 10 ** 6);
    });

    //   ** Verification of Sequence of Epoch based on Excel */
    //   ** 6. Verification of Sequence of Epoch */
    //   ** t1. Fourth Epoch / Epoch 3 */
    it("6.- Verification of Sequence of Epoch 4", async () => {
        const timestamp: number = Math.floor(
            (await ethers.provider.getBlock("latest")).timestamp
        );
        await expect(
            Calculum.connect(deployer).setEpochDuration(
                epochDuration,
                maintTimeBefore,
                maintTimeAfter
            )
        )
            .to.revertedWithCustomError(Calculum, "VaultInMaintenance");
        // Revert if alice Try to Claim Her Shares in the Vault Maintenance Window
        await expect(
            Calculum.connect(alice).deposit(ethers.parseEther("100000"), alice.address)
        )
            .to.revertedWithCustomError(Calculum, "VaultInMaintenance");
        // Move to after the Maintenance Time Post Maintenance
        const move1: moment.Moment = moment(
            parseInt((await Calculum.getNextEpoch()).toString()) * 1000
        );
        console.log("Actual TimeStamp: ", move1.utc(false).unix());
        await network.provider.send("evm_setNextBlockTimestamp", [
            parseInt(move1.add(maintTimeAfter, "s").format("X")),
        ]);
        await network.provider.send("evm_mine", []);
        console.log(
            `Verify TimeStamp after Add ${maintTimeAfter} seconds for Maintenance Window: `,
            moment(move1.unix() * 1000)
                .utc(false)
                .unix(),
            " Full Date: ",
            moment(move1.unix() * 1000)
                .utc(false)
                .format("dddd, MMMM Do YYYY, h:mm:ss a")
        );
        // Getting Current Epoch and Next Epoch
        await Calculum.connect(deployer).CurrentEpoch();
        CURRENT_EPOCH = 4;
        const Current_Epoch = parseInt((await Calculum.CURRENT_EPOCH()).toString());
        console.log(`Number of Current Epoch: ${Current_Epoch}`);
        expect(CURRENT_EPOCH).to.equal(Current_Epoch);
        let currentEpoch: moment.Moment = moment(
            parseInt((await Calculum.getCurrentEpoch()).toString()) * 1000
        );
        console.log(
            "TimeStamp Current Epoch: ",
            currentEpoch.utc(false),
            " TiemStamp Format: ",
            currentEpoch.utc(false).unix()
        );
        expect(currentEpoch.utc(false).unix()).to.equal(
            (await Calculum.EPOCH_START()) + (
                (await Calculum.EPOCH_DURATION()) * BigInt(4)
            )
        );
        let nextEpoch: moment.Moment = moment(
            parseInt((await Calculum.getNextEpoch()).toString()) * 1000
        );
        expect(nextEpoch.utc(false).unix()).to.equal(
            currentEpoch.add(epochDuration, "s").utc(false).unix()
        );
        console.log("TimeStamp Next Epoch: ", nextEpoch.utc(false));
        // time before to set Epoch Duration
        const move2: moment.Moment = moment(
            Math.floor((await ethers.provider.getBlock("latest")).timestamp) * 1000
        );
        console.log(
            "TimeStamp Before to Set Epoch Duration: ",
            move2.utc(false).unix()
        );
        // Setting the Value of Epoch Duration and Maintenance Time Before and After
        await Calculum.connect(deployer).setEpochDuration(
            epochDuration,
            maintTimeBefore,
            maintTimeAfter
        );
        // Verify Epoch Duration
        expect(await Calculum.EPOCH_DURATION()).to.equal(epochDuration);
        // Verify Maint Time Before
        expect(await Calculum.MAINTENANCE_PERIOD_PRE_START()).to.equal(
            maintTimeBefore
        );
        // Verify Maint Time After
        expect(await Calculum.MAINTENANCE_PERIOD_POST_START()).to.equal(
            maintTimeAfter
        );
        // Verify status of alice in DEPOSITS before claim her shares
        expect((await Calculum.DEPOSITS(alice.address)).status).to.equal(2); // 2 = Claimet
        expect((await Calculum.DEPOSITS(alice.address)).amountAssets).to.equal(0);
        expect((await Calculum.DEPOSITS(alice.address)).amountShares).to.equal(
            ethers.parseUnits("101274437521774004067182", "wei")
        );
        expect((await Calculum.DEPOSITS(alice.address)).finalAmount).to.equal(
            250000 * 10 ** 6
        );
        // Verify status of carla in DEPOSITS before claim her shares
        expect((await Calculum.DEPOSITS(carla.address)).status).to.equal(2); // 2 = Claimet
        expect((await Calculum.DEPOSITS(carla.address)).amountAssets).to.equal(0);
        expect((await Calculum.DEPOSITS(carla.address)).amountShares).to.equal(
            ethers.parseUnits("30382331256532201220155", "wei")
        );
        expect((await Calculum.DEPOSITS(carla.address)).finalAmount).to.equal(
            30000 * 10 ** 6
        );
        // Claim Shares of Alice
        await expect(Calculum.connect(alice).claimShares(alice.address))
            .to.emit(Calculum, "Transfer")
            .withArgs(
                ZERO_ADDRESS,
                alice.address,
                ethers.parseUnits("101274437521774004067182", "wei")
            )
            .to.emit(Calculum, "Deposit")
            .withArgs(
                alice.address,
                alice.address,
                250000 * 10 ** 6,
                ethers.parseUnits("101274437521774004067182", "wei")
            );
        // Claim Shares of Carla
        await expect(Calculum.connect(carla).claimShares(carla.address))
            .to.emit(Calculum, "Transfer")
            .withArgs(
                ZERO_ADDRESS,
                carla.address,
                ethers.parseUnits("30382331256532201220155", "wei")
            )
            .to.emit(Calculum, "Deposit")
            .withArgs(
                carla.address,
                carla.address,
                30000 * 10 ** 6,
                ethers.parseUnits("30382331256532201220155", "wei")
            );
        // Verify status of alice in DEPOSITS after claim her shares
        expect((await Calculum.DEPOSITS(alice.address)).status).to.equal(3); // 3 = Completed
        expect((await Calculum.DEPOSITS(alice.address)).amountAssets).to.equal(0);
        expect((await Calculum.DEPOSITS(alice.address)).amountShares).to.equal(0);
        expect((await Calculum.DEPOSITS(alice.address)).finalAmount).to.equal(
            250000 * 10 ** 6
        );
        expect((await Calculum.balanceOf(alice.address)).toString()).to.equal(
            ethers.parseUnits("251274437521774004067182", "wei").toString()
        );
        // Verify status of carla in DEPOSITS after claim her shares
        expect((await Calculum.DEPOSITS(carla.address)).status).to.equal(3); // 3 = Completed
        expect((await Calculum.DEPOSITS(carla.address)).amountAssets).to.equal(0);
        expect((await Calculum.DEPOSITS(carla.address)).amountShares).to.equal(0);
        expect((await Calculum.DEPOSITS(carla.address)).finalAmount).to.equal(
            30000 * 10 ** 6
        );
        expect((await Calculum.balanceOf(carla.address)).toString()).to.equal(
            ethers.parseUnits("30382331256532201220155", "wei").toString()
        );
        // Try to Finalize the Epoch before the Finalization Time
        const time = Math.floor(
            (await ethers.provider.getBlock("latest")).timestamp
        );
        // fail if try to finalize the epoch before the time
        await expect(Calculum.connect(openZeppelinDefenderWallet).finalizeEpoch())
            .to.revertedWithCustomError(Calculum, "VaultOutMaintenance");
        // Move before to Maintenance Windows Pre Start
        await network.provider.send("evm_setNextBlockTimestamp", [
            parseInt(move1.add(epochDuration - maintTimeBefore, "s").format("X")),
        ]);
        await network.provider.send("evm_mine", []);
        // Setting actual value of Assets
        await Oracle.connect(deployer).setAssetValue(494704.17 * 10 ** 6);
        console.log("Set Value of Assets in the Oracle: ", 494704.17);
        // sub
        const sub = (494704.17 - 329802.78) * 10 ** 6;
        // TODO: need to fix the smart contract of the vault, to handle the transfer to the dex wallet (deposit or withdraw)
        console.log("Adjust Balance of Dex Wallet to Real Value: ", sub / 10 ** 6);
        const newDeposits: BigNumber = (await Calculum.newDeposits());
        const newWithdrawalsShares: BigNumber = (await Calculum.newWithdrawals());
        // Try to hack Vault through the UniswapV3 Library
        // Finalize the Epoch
        console.log("Finalize the Fourth Epoch Started");
        await expect(Calculum.connect(openZeppelinDefenderWallet).finalizeEpoch())
            .to.emit(USDc, "Transfer")
            .withArgs(
                openZeppelinDefenderWallet.address,
                await Calculum.getAddress(),
                999 * 10 ** 6
            )
            .to.emit(USDc, "Approval")
            .withArgs(
                await Calculum.getAddress(),
                await Calculum.router(),
                999 * 10 ** 6)
            .to.emit(Calculum, "ValueReceived")
        console.log("Finalize the Fourth Epoch Successfully");
        // Verify the Balance of Transfer Bot Role Address in USDc
        expect(
            (await USDc.balanceOf(openZeppelinDefenderWallet.address))
        ).to.equal(1000000);
        //** Verify the Balance of Transfer Bot Role Address in Eth is minor than 1 ETH **/
        expect(
            parseInt(
                (
                    await ethers.provider.getBalance(openZeppelinDefenderWallet.address)
                ).toString()
            )
        ).to.approximately(10 ** 18, 2 * 10 ** 17);
        console.log(
            "Transfer Bot Role Address Balance in Eth: ",
            parseInt(
                (
                    await ethers.provider.getBalance(openZeppelinDefenderWallet.address)
                ).toString()
            ) / 10 ** 18
        );
        // Getting netTransfer Object
        const netTransfer: any = await Calculum.netTransfer(
            await Calculum.CURRENT_EPOCH()
        );
        expect(netTransfer.pending).to.be.true;
        expect(netTransfer.direction).to.be.false;
        const netTransferAmount = netTransfer.amount;
        console.log("Net Transfer Amount:", parseInt(netTransferAmount) / 10 ** 6)
        expect(netTransferAmount).to.equal(24798934789);
        console.log("Vault Token Price: ", parseInt(await Calculum.VAULT_TOKEN_PRICE(await Calculum.CURRENT_EPOCH())) / 10 ** 6);
        expect((await Calculum.VAULT_TOKEN_PRICE(await Calculum.CURRENT_EPOCH()))).to.equal(1406878);
        // Verify the Transfer Bot Gas Reserve in USD is Zero
        expect(
            (await Utils.CalculateTransferBotGasReserveDA(await Calculum.getAddress(), await USDc.getAddress()))
        ).to.equal(999 * 10 ** 6);
        const feeKept = await Utils.CalculateTransferBotGasReserveDA(await Calculum.getAddress(), await USDc.getAddress());
        // Verify USDc of Open Zeppelin Wallet
        expect(
            (await USDc.balanceOf(openZeppelinDefenderWallet.address)) / BigInt("1000000")
        ).to.equal(1);
        // Call dexTransfer to transfer the amount of USDc to the Vault
        await expect(Calculum.connect(openZeppelinDefenderWallet).dexTransfer(true))
            .to.emit(Calculum, "DexTransfer")
            .withArgs(
                await Calculum.CURRENT_EPOCH(),
                netTransfer.amount
            );
        console.log("Execute First Dex Transfer Successfully");
        // Simulate a Withdrawal to the Vault
        await USDc.transfer(await Calculum.getAddress(), netTransfer.amount);
        // Call dexTransfer to transfer the amount of USDc to reserve becuase previous execution an Withdrawal was without reserve
        await expect(Calculum.connect(openZeppelinDefenderWallet).dexTransfer(false))
            .to.emit(USDc, "Transfer")
            .withArgs(
                await Calculum.getAddress(),
                openZeppelinDefenderWallet.address,
                await Utils.CalculateTransferBotGasReserveDA(await Calculum.getAddress(), await USDc.getAddress())
            )
        console.log(
            "Transfer USDc from Dex Wallet to the Vault Successfully,Dex Transfer: ",
            parseInt(netTransfer.amount.toString()) / 10 ** 6
        );
        // Validate Last Balance of Vault in USDc, compare with value in the Excel Spread Sheet
        console.log(
            "Last Balance of Contract in USDc before Fees Transfer: ",
            parseInt((await USDc.balanceOf(await Calculum.getAddress())).toString()) / 10 ** 6
        );
        expect(
            parseInt((await USDc.balanceOf(await Calculum.getAddress()))) / 10 ** 6
        ).to.equal(23799.934789);
        // Call FeeTransfer to transfer the amount of USDc to the Fee Address
        await expect(Calculum.connect(openZeppelinDefenderWallet).feesTransfer())
            .to.emit(Calculum, "FeesTransfer")
            .withArgs(await Calculum.CURRENT_EPOCH(), ethers.parseUnits("23799934789", "wei"));
        // Start summarize the Epoch
        console.log('\x1b[32m%s\x1b[0m', 'Start Summarize the Epoch');
        console.log('\x1b[32m%s\x1b[0m', "Epoch Number: ", (await Calculum.CURRENT_EPOCH()).toString());
        const DexWalletBeginningBalance: BigNumber = (await Oracle.connect(traderBotWallet).GetAccount(traderBotWallet.address));
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance Beginning : ", DexWalletBeginningBalance / BigInt("1000000"));
        console.log('\x1b[32m%s\x1b[0m', "(+/-) Strategy(ies) P/L : -2.5% -", sub / 10 ** 6);
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance EoP before Fees : ", BigInt((150000 - 3750)).toString());
        console.log('\x1b[32m%s\x1b[0m', "Management Fee per Vault Token: ", parseInt((await Utils.MgtFeePerVaultToken(await Calculum.getAddress()))));
        console.log('\x1b[32m%s\x1b[0m', "Performance Fee per Vault Token: ", parseInt((await Utils.PerfFeePerVaultToken(await Calculum.getAddress(), await USDc.getAddress()))));
        console.log('\x1b[32m%s\x1b[0m', "Fees kept in TransferBot Wallet as gas reserves: ", (feeKept));
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance EoP after Fees :", DexWalletBeginningBalance - feeKept);
        console.log('\x1b[32m%s\x1b[0m', "Deposit (Mint New Wallet): ", newDeposits / BigInt("1000000"));
        console.log('\x1b[32m%s\x1b[0m', "Withdrawal (Burn Wallet): ", newWithdrawalsShares / BigInt("1000000"));
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance End Period: ", (DexWalletBeginningBalance + newDeposits - newWithdrawalsShares - feeKept) / BigInt("1000000"));
        console.log('\x1b[32m%s\x1b[0m', "Treasury Balance : ", (await USDc.balanceOf(treasuryWallet.address)) / BigInt("1000000"));
        console.log('\x1b[32m%s\x1b[0m', "Vault Token Price: ", parseInt((await Calculum.VAULT_TOKEN_PRICE(await Calculum.CURRENT_EPOCH()))) / 10 ** 6);
        console.log('\x1b[32m%s\x1b[0m', "Net Transfer Amount: ", parseInt(netTransferAmount) / 10 ** 6);
        // Verify the Balance of USDc of treasury in the Vault
        expect(
            parseInt((await USDc.balanceOf(treasuryWallet.address)).toString()) /
            10 ** 6
        ).to.equal(24251.679799);
        console.log(
            "Transfer USDc to the Treasury Successfully,Fees Transfer: ",
            parseInt((await USDc.balanceOf(treasuryWallet.address)).toString()) /
            10 ** 6
        );
        // Validate Last Balance of TransferBot Role Wallet in USDc, comparring with value in the Excel Spread Sheet
        expect(
            parseInt(await USDc.balanceOf(openZeppelinDefenderWallet.address)) / 10 ** 6
        ).to.equal(1000);
        console.log("Balance USDc of Open Zeppellin Wallet: ", parseInt((await USDc.balanceOf(openZeppelinDefenderWallet.address))) / 10 ** 6);
    });

    //   ** Verification of Sequence of Epoch based on Excel */
    //   ** 7. Verification of Sequence of Epoch */
    //   ** t1. Fifth Epoch / Epoch 5 */
    it("7.- Verification of Sequence of Epoch 5", async () => {
        const timestamp: number = Math.floor(
            (await ethers.provider.getBlock("latest")).timestamp
        );
        await expect(
            Calculum.connect(deployer).setEpochDuration(
                epochDuration,
                maintTimeBefore,
                maintTimeAfter
            )
        )
            .to.revertedWithCustomError(Calculum, "VaultInMaintenance");
        // Revert if alice Try to Claim Her Shares in the Vault Maintenance Window
        await expect(
            Calculum.connect(alice).deposit(ethers.parseEther("100000"), alice.address)
        )
            .to.revertedWithCustomError(Calculum, "VaultInMaintenance");
        // Move to after the Maintenance Time Post Maintenance
        const move1: moment.Moment = moment(
            parseInt((await Calculum.getNextEpoch()).toString()) * 1000
        );
        console.log("Actual TimeStamp: ", move1.utc(false).unix());
        await network.provider.send("evm_setNextBlockTimestamp", [
            parseInt(move1.add(maintTimeAfter, "s").format("X")),
        ]);
        await network.provider.send("evm_mine", []);
        console.log(
            `Verify TimeStamp after Add ${maintTimeAfter} seconds for Maintenance Window: `,
            moment(move1.unix() * 1000)
                .utc(false)
                .unix(),
            " Full Date: ",
            moment(move1.unix() * 1000)
                .utc(false)
                .format("dddd, MMMM Do YYYY, h:mm:ss a")
        );
        // Getting Current Epoch and Next Epoch
        await Calculum.connect(deployer).CurrentEpoch();
        CURRENT_EPOCH = 5;
        const Current_Epoch = parseInt((await Calculum.CURRENT_EPOCH()).toString());
        console.log(`Number of Current Epoch: ${Current_Epoch}`);
        expect(CURRENT_EPOCH).to.equal(Current_Epoch);
        let currentEpoch: moment.Moment = moment(
            parseInt((await Calculum.getCurrentEpoch()).toString()) * 1000
        );
        console.log(
            "TimeStamp Current Epoch: ",
            currentEpoch.utc(false),
            " TiemStamp Format: ",
            currentEpoch.utc(false).unix()
        );
        expect(currentEpoch.utc(false).unix()).to.equal(
            (await Calculum.EPOCH_START()) + (
                (await Calculum.EPOCH_DURATION()) * BigInt(5)
            )
        );
        let nextEpoch: moment.Moment = moment(
            parseInt((await Calculum.getNextEpoch()).toString()) * 1000
        );
        expect(nextEpoch.utc(false).unix()).to.equal(
            currentEpoch.add(epochDuration, "s").utc(false).unix()
        );
        console.log("TimeStamp Next Epoch: ", nextEpoch.utc(false));
        // time before to set Epoch Duration
        const move2: moment.Moment = moment(
            Math.floor((await ethers.provider.getBlock("latest")).timestamp) * 1000
        );
        console.log(
            "TimeStamp Before to Set Epoch Duration: ",
            move2.utc(false).unix()
        );
        // Setting the Value of Epoch Duration and Maintenance Time Before and After
        await Calculum.connect(deployer).setEpochDuration(
            epochDuration,
            maintTimeBefore,
            maintTimeAfter
        );
        // Verify Epoch Duration
        expect(await Calculum.EPOCH_DURATION()).to.equal(epochDuration);
        // Verify Maint Time Before
        expect(await Calculum.MAINTENANCE_PERIOD_PRE_START()).to.equal(
            maintTimeBefore
        );
        // Verify Maint Time After
        expect(await Calculum.MAINTENANCE_PERIOD_POST_START()).to.equal(
            maintTimeAfter
        );
        // Validate WITHDRAWALS VALUE before withdraw
        expect((await Calculum.WITHDRAWALS(alice.address)).status).to.equal(0); // 3 = Completed
        expect((await Calculum.WITHDRAWALS(alice.address)).amountAssets).to.equal(0);
        expect((await Calculum.WITHDRAWALS(alice.address)).amountShares).to.equal(0);
        expect((await Calculum.WITHDRAWALS(alice.address)).finalAmount).to.equal(
            0
        );
        // Try withdraw of Alice
        await expect(Calculum.connect(alice).redeem(ethers.parseEther("90497.4"), alice.address, alice.address))
            .to.emit(Calculum, "PendingWithdraw")
            .withArgs(alice.address, alice.address, 133005657734, ethers.parseEther("90497.4"));
        // Validate WITHDRAWALS VALUE after withdraw
        expect((await Calculum.WITHDRAWALS(alice.address)).status).to.equal(4); // 4 = PendingRedeem
        expect((await Calculum.WITHDRAWALS(alice.address)).amountAssets).to.equal(133005657734);
        expect((await Calculum.WITHDRAWALS(alice.address)).amountShares).to.equal(ethers.parseEther("90497.4"));
        expect((await Calculum.WITHDRAWALS(alice.address)).finalAmount).to.equal(0);
        console.log("Withdrawal: ", (await Calculum.WITHDRAWALS(alice.address)));
        // Try to Finalize the Epoch before the Finalization Time
        const time = Math.floor(
            (await ethers.provider.getBlock("latest")).timestamp
        );
        await expect(Calculum.connect(openZeppelinDefenderWallet).finalizeEpoch())
            .to.revertedWithCustomError(Calculum, "VaultOutMaintenance");
        // Move before to Maintenance Windows Pre Start
        await network.provider.send("evm_setNextBlockTimestamp", [
            parseInt(move1.add(epochDuration - maintTimeBefore, "s").format("X")),
        ]);
        await network.provider.send("evm_mine", []);
        // Setting actual value of Assets
        await Oracle.connect(deployer).setAssetValue(481653.55 * 10 ** 6);
        console.log("Set Value of Assets in the Oracle: ", 481653.55);
        // sub
        const sub = (481653.55 - 469905.90) * 10 ** 6;
        // TODO: need to fix the smart contract of the vault, to handle the transfer to the dex wallet (deposit or withdraw)
        console.log("Adjust Balance of Dex Wallet to Real Value: ", sub);
        const newDeposits: BigNumber = (await Calculum.newDeposits());
        const newWithdrawalsShares: BigNumber = (await Calculum.newWithdrawals());
        // Finalize the Epoch
        await Calculum.connect(openZeppelinDefenderWallet).finalizeEpoch();
        console.log("Finalize the Fifth Epoch Successfully");
        // Verify the Balance of Transfer Bot Role Address in USDc
        expect(
            parseInt(await USDc.balanceOf(openZeppelinDefenderWallet.address)) / 10 ** 6
        ).to.equal(1000);
        // Getting netTransfer Object
        const netTransfer: any = await Calculum.netTransfer(
            await Calculum.CURRENT_EPOCH()
        );
        expect(netTransfer.pending).to.be.true;
        expect(netTransfer.direction).to.be.false;
        const netTransferAmount = netTransfer.amount;
        expect(netTransferAmount).to.equal(131852454711);
        console.log("Vault Token Price: ", parseInt(await Calculum.VAULT_TOKEN_PRICE(await Calculum.CURRENT_EPOCH())) / 10 ** 6);
        expect((await Calculum.VAULT_TOKEN_PRICE(await Calculum.CURRENT_EPOCH()))).to.equal(1436506);
        // Verify the Transfer Bot Gas Reserve in USD is Zero
        const feeKept = await Utils.CalculateTransferBotGasReserveDA(await Calculum.getAddress(), await USDc.getAddress());
        expect(feeKept).to.equal(0);

        // Call dexTransfer to transfer the amount of USDc to the Vault
        await expect(Calculum.connect(openZeppelinDefenderWallet).dexTransfer(true))
            .to.emit(Calculum, "DexTransfer")
            .withArgs(
                await Calculum.CURRENT_EPOCH(),
                netTransfer.amount
            );
        console.log("Execute First Dex Transfer Successfully");
        // Simulate a Withdrawal to the Vault
        await USDc.transfer(await Calculum.getAddress(), netTransfer.amount);
        await expect(Calculum.connect(openZeppelinDefenderWallet).dexTransfer(false))
            .to.emit(USDc, "Transfer")
            .withArgs(
                await Calculum.getAddress(),
                openZeppelinDefenderWallet.address,
                await Utils.CalculateTransferBotGasReserveDA(await Calculum.getAddress(), await USDc.getAddress())
            )
        console.log(
            "Transfer USDc from Dex Wallet to the Vault Successfully,Dex Transfer: ",
            netTransfer.amount / BigInt("1000000")
        );
        // Validate Last Balance of Vault in USDc, compare with value in the Excel Spread Sheet
        console.log(
            "Last Balance of Contract in USDc before Fees Transfer: ",
            parseInt(await USDc.balanceOf(await Calculum.getAddress())) / 10 ** 6
        );
        expect(
            (await USDc.balanceOf(await Calculum.getAddress()))
        ).to.equal(131852454711);
        // Call FeeTransfer to transfer the amount of USDc to the Fee Address
        await expect(Calculum.connect(openZeppelinDefenderWallet).feesTransfer())
            .to.emit(Calculum, "FeesTransfer")
            .withArgs(await Calculum.CURRENT_EPOCH(), 1852396626);
        // Start summarize the Epoch
        console.log('\x1b[32m%s\x1b[0m', 'Start Summarize the Epoch');
        console.log('\x1b[32m%s\x1b[0m', "Epoch Number: ", (await Calculum.CURRENT_EPOCH()).toString());
        const DexWalletBeginningBalance: BigNumber = (await Oracle.connect(traderBotWallet).GetAccount(traderBotWallet.address));
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance Beginning : ", DexWalletBeginningBalance / BigInt("1000000"));
        console.log('\x1b[32m%s\x1b[0m', "(+/-) Strategy(ies) P/L : -2.5% -", sub / 10 ** 6);
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance EoP before Fees : ", BigInt((150000 - 3750)).toString());
        console.log('\x1b[32m%s\x1b[0m', "Management Fee per Vault Token: ", parseInt((await Utils.MgtFeePerVaultToken(await Calculum.getAddress()))));
        console.log('\x1b[32m%s\x1b[0m', "Performance Fee per Vault Token: ", parseInt((await Utils.PerfFeePerVaultToken(await Calculum.getAddress(), await USDc.getAddress()))));
        console.log('\x1b[32m%s\x1b[0m', "Fees kept in TransferBot Wallet as gas reserves: ", (feeKept));
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance EoP after Fees :", DexWalletBeginningBalance - feeKept);
        console.log('\x1b[32m%s\x1b[0m', "Deposit (Mint New Wallet): ", newDeposits / BigInt("1000000"));
        console.log('\x1b[32m%s\x1b[0m', "Withdrawal (Burn Wallet): ", newWithdrawalsShares / BigInt("1000000"));
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance End Period: ", (DexWalletBeginningBalance + newDeposits - newWithdrawalsShares - feeKept) / BigInt("1000000"));
        console.log('\x1b[32m%s\x1b[0m', "Treasury Balance : ", (await USDc.balanceOf(treasuryWallet.address)) / BigInt("1000000"));
        console.log('\x1b[32m%s\x1b[0m', "Vault Token Price: ", parseInt((await Calculum.VAULT_TOKEN_PRICE(await Calculum.CURRENT_EPOCH()))) / 10 ** 6);
        console.log('\x1b[32m%s\x1b[0m', "Net Transfer Amount: ", parseInt(netTransferAmount) / 10 ** 6);
        // Verify the Balance of USDc of treasury in the Vault
        expect(
            parseInt((await USDc.balanceOf(treasuryWallet.address))) /
            10 ** 6
        ).to.equal(26103.076425);
        console.log(
            "Transfer USDc to the Treasury Successfully,Fees Transfer: ",
            parseInt((await USDc.balanceOf(treasuryWallet.address))) /
            10 ** 6
        );
        // Validate Last Balance of TransferBot Role Wallet in USDc, comparring with value in the Excel Spread Sheet
        expect(
            parseInt(await USDc.balanceOf(openZeppelinDefenderWallet.address)) / 10 ** 6
        ).to.equal(1000);
        console.log("Balance USDc of Open Zeppellin Wallet: ", parseInt((await USDc.balanceOf(openZeppelinDefenderWallet.address))) / 10 ** 6);
    });

    //   ** Verification of Sequence of Epoch based on Excel */
    //   ** 8. Verification of Sequence of Epoch */
    //   ** t1. Sixth Epoch / Epoch 6 */
    it("8.- Verification of Sequence of Epoch 6", async () => {
        const timestamp: number = Math.floor(
            (await ethers.provider.getBlock("latest")).timestamp
        );
        await expect(
            Calculum.connect(deployer).setEpochDuration(
                epochDuration,
                maintTimeBefore,
                maintTimeAfter
            )
        )
            .to.revertedWithCustomError(Calculum, "VaultInMaintenance");
        // Revert if alice Try to Claim Her Shares in the Vault Maintenance Window
        await expect(
            Calculum.connect(alice).deposit(ethers.parseEther("100000"), alice.address)
        )
            .to.revertedWithCustomError(Calculum, "VaultInMaintenance");
        // Move to after the Maintenance Time Post Maintenance
        const move1: moment.Moment = moment(
            parseInt((await Calculum.getNextEpoch()).toString()) * 1000
        );
        console.log("Actual TimeStamp: ", move1.utc(false).unix());
        await network.provider.send("evm_setNextBlockTimestamp", [
            parseInt(move1.add(maintTimeAfter, "s").format("X")),
        ]);
        await network.provider.send("evm_mine", []);
        console.log(
            `Verify TimeStamp after Add ${maintTimeAfter} seconds for Maintenance Window: `,
            moment(move1.unix() * 1000)
                .utc(false)
                .unix(),
            " Full Date: ",
            moment(move1.unix() * 1000)
                .utc(false)
                .format("dddd, MMMM Do YYYY, h:mm:ss a")
        );
        // Getting Current Epoch and Next Epoch
        await Calculum.connect(deployer).CurrentEpoch();
        CURRENT_EPOCH = 6;
        const Current_Epoch = parseInt((await Calculum.CURRENT_EPOCH()).toString());
        console.log(`Number of Current Epoch: ${Current_Epoch}`);
        expect(CURRENT_EPOCH).to.equal(Current_Epoch);
        let currentEpoch: moment.Moment = moment(
            parseInt((await Calculum.getCurrentEpoch()).toString()) * 1000
        );
        console.log(
            "TimeStamp Current Epoch: ",
            currentEpoch.utc(false),
            " TiemStamp Format: ",
            currentEpoch.utc(false).unix()
        );
        expect(currentEpoch.utc(false).unix()).to.equal(
            (await Calculum.EPOCH_START()) + (
                (await Calculum.EPOCH_DURATION()) * BigInt(6)
            )
        );
        let nextEpoch: moment.Moment = moment(
            parseInt((await Calculum.getNextEpoch()).toString()) * 1000
        );
        expect(nextEpoch.utc(false).unix()).to.equal(
            currentEpoch.add(epochDuration, "s").utc(false).unix()
        );
        console.log("TimeStamp Next Epoch: ", nextEpoch.utc(false));
        // time before to set Epoch Duration
        const move2: moment.Moment = moment(
            Math.floor((await ethers.provider.getBlock("latest")).timestamp) * 1000
        );
        console.log(
            "TimeStamp Before to Set Epoch Duration: ",
            move2.utc(false).unix()
        );
        // Setting the Value of Epoch Duration and Maintenance Time Before and After
        await Calculum.connect(deployer).setEpochDuration(
            epochDuration,
            maintTimeBefore,
            maintTimeAfter
        );
        // Verify Epoch Duration
        expect(await Calculum.EPOCH_DURATION()).to.equal(epochDuration);
        // Verify Maint Time Before
        expect(await Calculum.MAINTENANCE_PERIOD_PRE_START()).to.equal(
            maintTimeBefore
        );
        // Verify Maint Time After
        expect(await Calculum.MAINTENANCE_PERIOD_POST_START()).to.equal(
            maintTimeAfter
        );
        // Veriyfy the Value of Alice int the WITHDRAWS VALUE mapping before to Claimed
        expect((await Calculum.WITHDRAWALS(alice.address)).status).to.equal(2); // 2 = Claimet
        expect((await Calculum.WITHDRAWALS(alice.address)).amountAssets).to.equal(130000058085);
        expect((await Calculum.WITHDRAWALS(alice.address)).amountShares).to.equal(ethers.parseEther("90497.4"));
        expect((await Calculum.WITHDRAWALS(alice.address)).finalAmount).to.equal(130000058085);
        console.log("Withdrawal Status: ", (await Calculum.WITHDRAWALS(alice.address)).status);
        console.log("Withdrawal Amount Shares of Alice: ", parseInt((await Calculum.balanceOf(alice.address)).toString()) / 10 ** 18);
        // Claiming the Withdraw Assets of Alice
        await expect(Calculum.connect(alice).claimAssets(alice.address, alice.address))
            .to.emit(Calculum, "Transfer")
            .withArgs(
                alice.address,
                ZERO_ADDRESS,
                ethers.parseEther("90497.4"),
            )
            .to.emit(USDc, "Transfer")
            .withArgs(
                await Calculum.getAddress(),
                alice.address,
                130000058085
            )
            .to.emit(Calculum, "Withdraw")
            .withArgs(
                alice.address,
                alice.address,
                alice.address,
                ethers.parseEther("90497.4"),
                130000058085
            );
        // Verify the Value of Alice int the WITHDRAWS VALUE mapping after to Claimed
        expect((await Calculum.WITHDRAWALS(alice.address)).status).to.equal(3); // 3 = Completed
        expect((await Calculum.WITHDRAWALS(alice.address)).amountAssets).to.equal(0);
        expect((await Calculum.WITHDRAWALS(alice.address)).amountShares).to.equal(0);
        expect((await Calculum.WITHDRAWALS(alice.address)).finalAmount).to.equal(130000058085);
        console.log("Withdrawal Status After: ", (await Calculum.WITHDRAWALS(alice.address)).status);

        // Validate WITHDRAWALS VALUE before withdraw of Carla
        expect((await Calculum.WITHDRAWALS(carla.address)).status).to.equal(0); // 0 = Inactive
        expect((await Calculum.WITHDRAWALS(carla.address)).amountAssets).to.equal(0);
        expect((await Calculum.WITHDRAWALS(carla.address)).amountShares).to.equal(0);
        expect((await Calculum.WITHDRAWALS(carla.address)).finalAmount).to.equal(
            0
        );
        // Try withdraw of carla
        await expect(Calculum.connect(carla).redeem(ethers.parseEther("10767.1"), carla.address, carla.address))
            .to.emit(Calculum, "PendingWithdraw")
            .withArgs(carla.address, carla.address, 20419568274, ethers.parseEther("10767.1"));
        // Validate WITHDRAWALS VALUE after withdraw
        expect((await Calculum.WITHDRAWALS(carla.address)).status).to.equal(4); // 4 = PendingRedeem
        expect((await Calculum.WITHDRAWALS(carla.address)).amountAssets).to.equal(20419568274);
        expect((await Calculum.WITHDRAWALS(carla.address)).amountShares).to.equal(ethers.parseEther("10767.1"));
        expect((await Calculum.WITHDRAWALS(carla.address)).finalAmount).to.equal(0);
        console.log("Withdrawal Status: ", (await Calculum.WITHDRAWALS(carla.address)).status);

        // Try to Finalize the Epoch before the Finalization Time
        const time = Math.floor(
            (await ethers.provider.getBlock("latest")).timestamp
        );
        await expect(Calculum.connect(openZeppelinDefenderWallet).finalizeEpoch())
            .to.revertedWithCustomError(Calculum, "VaultOutMaintenance");
        // Move before to Maintenance Windows Pre Start
        await network.provider.send("evm_setNextBlockTimestamp", [
            parseInt(move1.add(epochDuration - maintTimeBefore, "s").format("X")),
        ]);
        await network.provider.send("evm_mine", []);
        // Setting actual value of Assets
        await Oracle.connect(deployer).setAssetValue(339307.15 * 10 ** 6);
        console.log("Set Value of Assets in the Oracle: ", 339307.15);
        // sub
        const sub = (349801.19 - 339307.15) * 10 ** 6
        // TODO: need to fix the smart contract of the vault, to handle the transfer to the dex wallet (deposit or withdraw)
        console.log("Adjust Balance of Dex Wallet to Real Value: ", sub / 10 ** 6);
        const newDeposits: BigNumber = (await Calculum.newDeposits());
        const newWithdrawalsShares: BigNumber = (await Calculum.newWithdrawals());
        // Finalize the Epoch
        await Calculum.connect(openZeppelinDefenderWallet).finalizeEpoch();
        console.log("Finalize the Sixth Epoch Successfully");
        // Verify the Balance of Transfer Bot Role Address in USDc
        expect(
            (await USDc.balanceOf(openZeppelinDefenderWallet.address))
        ).to.equal(1000 * 10 ** 6);
        //** Verify the Balance of Transfer Bot Role Address in Eth is minor than 1 ETH **/
        expect(
            parseInt(
                (
                    await ethers.provider.getBalance(openZeppelinDefenderWallet.address)
                ).toString()
            )
        ).to.approximately(10 ** 18, 2 * 10 ** 17);
        console.log(
            "Transfer Bot Role Address Balance in Eth: ",
            parseInt(
                (
                    await ethers.provider.getBalance(openZeppelinDefenderWallet.address)
                ).toString()
            ) / 10 ** 18
        );
        // Getting netTransfer Object
        const netTransfer: any = await Calculum.netTransfer(
            await Calculum.CURRENT_EPOCH()
        );
        expect(netTransfer.pending).to.be.true;
        expect(netTransfer.direction).to.be.false;
        const netTransferAmount = netTransfer.amount;
        expect(netTransferAmount).to.equal(15067221433);
        console.log("Vault Token Price: ", parseInt(await Calculum.VAULT_TOKEN_PRICE(await Calculum.CURRENT_EPOCH())) / 10 ** 6);
        expect((await Calculum.VAULT_TOKEN_PRICE(await Calculum.CURRENT_EPOCH()))).to.equal(1393134);
        // Verify the Transfer Bot Gas Reserve in USD is Zero
        const feeKept = await Utils.CalculateTransferBotGasReserveDA(await Calculum.getAddress(), await USDc.getAddress());
        expect(feeKept).to.equal(0);
        // Call dexTransfer to transfer the amount of USDc to the Vault
        await expect(Calculum.connect(openZeppelinDefenderWallet).dexTransfer(true))
            .to.emit(Calculum, "DexTransfer")
            .withArgs(
                await Calculum.CURRENT_EPOCH(),
                netTransfer.amount
            );
        console.log("Execute First Dex Transfer Successfully");
        // Simulate a Withdrawal to the Vault
        await USDc.transfer(await Calculum.getAddress(), netTransfer.amount);
        // Call dexTransfer to transfer the amount of USDc to reserve becuase previous execution an Withdrawal was without reserve
        await expect(Calculum.connect(openZeppelinDefenderWallet).dexTransfer(false))
            .to.emit(USDc, "Transfer")
            .withArgs(
                await Calculum.getAddress(),
                openZeppelinDefenderWallet.address,
                await Utils.CalculateTransferBotGasReserveDA(await Calculum.getAddress(), await USDc.getAddress())
            )
            .to.emit(Calculum, "DexTransfer")
            .withArgs(
                await Calculum.CURRENT_EPOCH(),
                netTransfer.amount
            );
        console.log(
            "Transfer USDc from Dex Wallet to the Vault Successfully,Dex Transfer: ",
            netTransfer.amount / BigInt("1000000")
        );
        // Validate Last Balance of Vault in USDc, compare with value in the Excel Spread Sheet
        console.log(
            "Last Balance of Contract in USDc before Fees Transfer: ",
            parseInt(await USDc.balanceOf(await Calculum.getAddress())) / 10 ** 6
        );
        expect(
            (await USDc.balanceOf(await Calculum.getAddress()))
        ).to.equal(15067221433);
        // Call FeeTransfer to transfer the amount of USDc to the Fee Address
        await expect(Calculum.connect(openZeppelinDefenderWallet).feesTransfer())
            .to.emit(Calculum, "FeesTransfer")
            .withArgs(await Calculum.CURRENT_EPOCH(), 67208341);
        // Start summarize the Epoch
        console.log('\x1b[32m%s\x1b[0m', 'Start Summarize the Epoch');
        console.log('\x1b[32m%s\x1b[0m', "Epoch Number: ", (await Calculum.CURRENT_EPOCH()).toString());
        const DexWalletBeginningBalance: BigNumber = (await Oracle.connect(traderBotWallet).GetAccount(traderBotWallet.address));
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance Beginning : ", DexWalletBeginningBalance / BigInt("1000000"));
        console.log('\x1b[32m%s\x1b[0m', "(+/-) Strategy(ies) P/L : -2.5% -", sub / 10 ** 6);
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance EoP before Fees : ", BigInt((150000 - 3750)).toString());
        console.log('\x1b[32m%s\x1b[0m', "Management Fee per Vault Token: ", parseInt((await Utils.MgtFeePerVaultToken(await Calculum.getAddress()))));
        console.log('\x1b[32m%s\x1b[0m', "Performance Fee per Vault Token: ", parseInt((await Utils.PerfFeePerVaultToken(await Calculum.getAddress(), await USDc.getAddress()))));
        console.log('\x1b[32m%s\x1b[0m', "Fees kept in TransferBot Wallet as gas reserves: ", (feeKept));
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance EoP after Fees :", DexWalletBeginningBalance - feeKept);
        console.log('\x1b[32m%s\x1b[0m', "Deposit (Mint New Wallet): ", newDeposits / BigInt("1000000"));
        console.log('\x1b[32m%s\x1b[0m', "Withdrawal (Burn Wallet): ", newWithdrawalsShares / BigInt("1000000"));
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance End Period: ", (DexWalletBeginningBalance + newDeposits - newWithdrawalsShares - feeKept) / BigInt("1000000"));
        console.log('\x1b[32m%s\x1b[0m', "Treasury Balance : ", (await USDc.balanceOf(treasuryWallet.address)) / BigInt("1000000"));
        console.log('\x1b[32m%s\x1b[0m', "Vault Token Price: ", parseInt((await Calculum.VAULT_TOKEN_PRICE(await Calculum.CURRENT_EPOCH()))) / 10 ** 6);
        console.log('\x1b[32m%s\x1b[0m', "Net Transfer Amount: ", parseInt(netTransferAmount) / 10 ** 6);
        // Verify the Balance of USDc of treasury in the Vault
        expect(
            (await USDc.balanceOf(treasuryWallet.address))
        ).to.equal(26169284766);
        console.log(
            "Transfer USDc to the Treasury Successfully,Fees Transfer: ",
            parseInt((await USDc.balanceOf(treasuryWallet.address)).toString()) /
            10 ** 6
        );
        // Validate Last Balance of TransferBot Role Wallet in USDc, comparring with value in the Excel Spread Sheet
        expect(
            (await USDc.balanceOf(openZeppelinDefenderWallet.address))
        ).to.equal(1000 * 10 ** 6);
        console.log("Balance USDc of Open Zeppellin Wallet: ", parseInt((await USDc.balanceOf(openZeppelinDefenderWallet.address))) / 10 ** 6);
    });

    //   ** Verification of Sequence of Epoch based on Excel */
    //   ** 9. Verification of Sequence of Epoch */
    //   ** t1. Seventh Epoch / Epoch 7 */
    it("9.- Verification of Sequence of Epoch 7", async () => {
        const timestamp: number = Math.floor(
            (await ethers.provider.getBlock("latest")).timestamp
        );
        await expect(
            Calculum.connect(deployer).setEpochDuration(
                epochDuration,
                maintTimeBefore,
                maintTimeAfter
            )
        )
            .to.revertedWithCustomError(Calculum, "VaultInMaintenance");
        // Revert if alice Try to Claim Her Shares in the Vault Maintenance Window
        await expect(
            Calculum.connect(alice).deposit(100000 * 10 ** 6, alice.address)
        )
            .to.revertedWithCustomError(Calculum, "VaultInMaintenance");
        // Move to after the Maintenance Time Post Maintenance
        const move1: moment.Moment = moment(
            parseInt((await Calculum.getNextEpoch()).toString()) * 1000
        );
        console.log("Actual TimeStamp: ", move1.utc(false).unix());
        await network.provider.send("evm_setNextBlockTimestamp", [
            parseInt(move1.add(maintTimeAfter, "s").format("X")),
        ]);
        await network.provider.send("evm_mine", []);
        console.log(
            `Verify TimeStamp after Add ${maintTimeAfter} seconds for Maintenance Window: `,
            moment(move1.unix() * 1000)
                .utc(false)
                .unix(),
            " Full Date: ",
            moment(move1.unix() * 1000)
                .utc(false)
                .format("dddd, MMMM Do YYYY, h:mm:ss a")
        );
        // Getting Current Epoch and Next Epoch
        await Calculum.connect(deployer).CurrentEpoch();
        CURRENT_EPOCH = 7;
        const Current_Epoch = parseInt((await Calculum.CURRENT_EPOCH()).toString());
        console.log(`Number of Current Epoch: ${Current_Epoch}`);
        expect(CURRENT_EPOCH).to.equal(Current_Epoch);
        let currentEpoch: moment.Moment = moment(
            parseInt((await Calculum.getCurrentEpoch()).toString()) * 1000
        );
        console.log(
            "TimeStamp Current Epoch: ",
            currentEpoch.utc(false),
            " TiemStamp Format: ",
            currentEpoch.utc(false).unix()
        );
        expect(currentEpoch.utc(false).unix()).to.equal(
            (await Calculum.EPOCH_START()) + (
                (await Calculum.EPOCH_DURATION()) * BigInt(7)
            )
        );
        let nextEpoch: moment.Moment = moment(
            parseInt((await Calculum.getNextEpoch()).toString()) * 1000
        );
        expect(nextEpoch.utc(false).unix()).to.equal(
            currentEpoch.add(epochDuration, "s").utc(false).unix()
        );
        console.log("TimeStamp Next Epoch: ", nextEpoch.utc(false));
        // time before to set Epoch Duration
        const move2: moment.Moment = moment(
            Math.floor((await ethers.provider.getBlock("latest")).timestamp) * 1000
        );
        console.log(
            "TimeStamp Before to Set Epoch Duration: ",
            move2.utc(false).unix()
        );
        // Setting the Value of Epoch Duration and Maintenance Time Before and After
        await Calculum.connect(deployer).setEpochDuration(
            epochDuration,
            maintTimeBefore,
            maintTimeAfter
        );
        // Verify Epoch Duration
        expect(await Calculum.EPOCH_DURATION()).to.equal(epochDuration);
        // Verify Maint Time Before
        expect(await Calculum.MAINTENANCE_PERIOD_PRE_START()).to.equal(
            maintTimeBefore
        );
        // Verify Maint Time After
        expect(await Calculum.MAINTENANCE_PERIOD_POST_START()).to.equal(
            maintTimeAfter
        );
        // Claiming the Withdraw Assets of Alice
        await expect(Calculum.connect(carla).claimAssets(carla.address, carla.address))
            .to.emit(Calculum, "Transfer")
            .withArgs(
                carla.address,
                ZERO_ADDRESS,
                ethers.parseEther("10767.1"),
            )
            .to.emit(USDc, "Transfer")
            .withArgs(
                await Calculum.getAddress(),
                carla.address,
                15000.013092 * 10 ** 6
            )
            .to.emit(Calculum, "Withdraw")
            .withArgs(
                carla.address,
                carla.address,
                carla.address,
                ethers.parseEther("10767.1"),
                15000.013092 * 10 ** 6
            );
        // Verify the Value of carla int the WITHDRAWS VALUE mapping after to Claimed
        expect((await Calculum.WITHDRAWALS(carla.address)).status).to.equal(3); // 3 = Completed
        expect((await Calculum.WITHDRAWALS(carla.address)).amountAssets).to.equal(0);
        expect((await Calculum.WITHDRAWALS(carla.address)).amountShares).to.equal(0);
        expect((await Calculum.WITHDRAWALS(carla.address)).finalAmount).to.equal(15000.013092 * 10 ** 6);
        console.log("Withdrawal Status After: ", (await Calculum.WITHDRAWALS(carla.address)).status);

        // Try to Finalize the Epoch before the Finalization Time
        const time = Math.floor(
            (await ethers.provider.getBlock("latest")).timestamp
        );
        await expect(Calculum.connect(openZeppelinDefenderWallet).finalizeEpoch())
            .to.revertedWithCustomError(Calculum, "VaultOutMaintenance");
        // Move before to Maintenance Windows Pre Start
        await network.provider.send("evm_setNextBlockTimestamp", [
            parseInt(move1.add(epochDuration - maintTimeBefore, "s").format("X")),
        ]);
        await network.provider.send("evm_mine", []);
        // Setting actual value of Assets
        await Oracle.connect(deployer).setAssetValue(333967.37 * 10 ** 6);
        console.log("Set Value of Assets in the Oracle: ", 333967.37);
        // sub
        const sub = (324240.16 - 333967.37) * 10 ** 6;
        // TODO: need to fix the smart contract of the vault, to handle the transfer to the dex wallet (deposit or withdraw)
        const newDeposits: BigNumber = (await Calculum.newDeposits());
        const newWithdrawalsShares: BigNumber = (await Calculum.newWithdrawals());
        // Finalize the Epoch
        await Calculum.connect(openZeppelinDefenderWallet).finalizeEpoch();
        console.log("Finalize the Seventh Epoch Successfully");
        // Verify the Balance of Transfer Bot Role Address in USDc
        expect(
            (await USDc.balanceOf(openZeppelinDefenderWallet.address))
        ).to.equal(1000 * 10 ** 6);
        //** Verify the Balance of Transfer Bot Role Address in Eth is minor than 1 ETH **/
        expect(
            parseInt(
                (
                    await ethers.provider.getBalance(openZeppelinDefenderWallet.address)
                ).toString()
            )
        ).to.approximately(10 ** 18, 2 * 10 ** 17);
        console.log(
            "Transfer Bot Role Address Balance in Eth: ",
            parseInt(
                (
                    await ethers.provider.getBalance(openZeppelinDefenderWallet.address)
                ).toString()
            ) / 10 ** 18
        );
        // Getting netTransfer Object
        const netTransfer: any = await Calculum.netTransfer(
            await Calculum.CURRENT_EPOCH()
        );
        expect(netTransfer.pending).to.be.true;
        expect(netTransfer.direction).to.be.false;
        const netTransferAmount = netTransfer.amount;
        expect(netTransferAmount).to.equal(1521430420);
        console.log("Vault Token Price: ", parseInt(await Calculum.VAULT_TOKEN_PRICE(await Calculum.CURRENT_EPOCH())) / 10 ** 6);
        expect((await Calculum.VAULT_TOKEN_PRICE(await Calculum.CURRENT_EPOCH()))).to.equal(1428393);
        // Verify the Transfer Bot Gas Reserve in USD is Zero
        const feeKept = await Utils.CalculateTransferBotGasReserveDA(await Calculum.getAddress(), await USDc.getAddress());
        expect(feeKept).to.equal(0);
        // Call dexTransfer to transfer the amount of USDc to the Vault
        await expect(Calculum.connect(openZeppelinDefenderWallet).dexTransfer(true))
            .to.emit(Calculum, "DexTransfer")
            .withArgs(
                await Calculum.CURRENT_EPOCH(),
                netTransfer.amount
            );
        // Simulate a Withdrawal to the Vault
        await USDc.transfer(await Calculum.getAddress(), netTransfer.amount);
        // Call dexTransfer to transfer the amount of USDc to reserve becuase previous execution an Withdrawal was without reserve
        await expect(Calculum.connect(openZeppelinDefenderWallet).dexTransfer(false))
            .to.emit(USDc, "Transfer")
            .withArgs(
                await Calculum.getAddress(),
                openZeppelinDefenderWallet.address,
                await Utils.CalculateTransferBotGasReserveDA(await Calculum.getAddress(), await USDc.getAddress())
            )
        console.log(
            "Transfer USDc from Dex Wallet to the Vault Successfully,Dex Transfer: ",
            netTransfer.amount / BigInt("1000000")
        );
        // Validate Last Balance of Vault in USDc, compare with value in the Excel Spread Sheet
        console.log(
            "Last Balance of Contract in USDc before Fees Transfer: ",
            (await USDc.balanceOf(await Calculum.getAddress()))
        );
        expect(
            (await USDc.balanceOf(await Calculum.getAddress()))
        ).to.equal(1521430420);
        // Call FeeTransfer to transfer the amount of USDc to the Fee Address
        await expect(Calculum.connect(openZeppelinDefenderWallet).feesTransfer())
            .to.emit(Calculum, "FeesTransfer")
            .withArgs(await Calculum.CURRENT_EPOCH(), 1521430420);
        // Start summarize the Epoch
        console.log('\x1b[32m%s\x1b[0m', 'Start Summarize the Epoch');
        console.log('\x1b[32m%s\x1b[0m', "Epoch Number: ", (await Calculum.CURRENT_EPOCH()).toString());
        const DexWalletBeginningBalance: BigNumber = (await Oracle.connect(traderBotWallet).GetAccount(traderBotWallet.address));
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance Beginning : ", DexWalletBeginningBalance / BigInt("1000000"));
        console.log('\x1b[32m%s\x1b[0m', "(+/-) Strategy(ies) P/L : -2.5% -", sub / 10 ** 6);
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance EoP before Fees : ", BigInt((150000 - 3750)).toString());
        console.log('\x1b[32m%s\x1b[0m', "Management Fee per Vault Token: ", parseInt((await Utils.MgtFeePerVaultToken(await Calculum.getAddress()))));
        console.log('\x1b[32m%s\x1b[0m', "Performance Fee per Vault Token: ", parseInt((await Utils.PerfFeePerVaultToken(await Calculum.getAddress(), await USDc.getAddress()))));
        console.log('\x1b[32m%s\x1b[0m', "Fees kept in TransferBot Wallet as gas reserves: ", (feeKept));
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance EoP after Fees :", DexWalletBeginningBalance - feeKept);
        console.log('\x1b[32m%s\x1b[0m', "Deposit (Mint New Wallet): ", newDeposits / BigInt("1000000"));
        console.log('\x1b[32m%s\x1b[0m', "Withdrawal (Burn Wallet): ", newWithdrawalsShares / BigInt("1000000"));
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance End Period: ", (DexWalletBeginningBalance + newDeposits - newWithdrawalsShares - feeKept) / BigInt("1000000"));
        console.log('\x1b[32m%s\x1b[0m', "Treasury Balance : ", (await USDc.balanceOf(treasuryWallet.address)) / BigInt("1000000"));
        console.log('\x1b[32m%s\x1b[0m', "Vault Token Price: ", parseInt((await Calculum.VAULT_TOKEN_PRICE(await Calculum.CURRENT_EPOCH()))) / 10 ** 6);
        console.log('\x1b[32m%s\x1b[0m', "Net Transfer Amount: ", parseInt(netTransferAmount) / 10 ** 6);
        // Verify the Balance of USDc of treasury in the Vault
        expect(
            (await USDc.balanceOf(treasuryWallet.address))
        ).to.equal(27689.715186 * 10 ** 6);
        console.log(
            "Transfer USDc to the Treasury Successfully,Fees Transfer: ",
            parseInt((await USDc.balanceOf(treasuryWallet.address)).toString()) /
            10 ** 6
        );
        // Validate Last Balance of TransferBot Role Wallet in USDc, comparring with value in the Excel Spread Sheet
        expect(
            (await USDc.balanceOf(openZeppelinDefenderWallet.address))
        ).to.equal(1000 * 10 ** 6);
        console.log("Balance USDc of Open Zeppellin Wallet: ", parseInt((await USDc.balanceOf(openZeppelinDefenderWallet.address))) / 10 ** 6);
    });

    //   ** Verification of Sequence of Epoch based on Excel */
    //   ** 10. Verification of Sequence of Epoch */
    //   ** t1. Eighth Epoch / Epoch 8 */
    it("10.- Verification of Sequence of Epoch 8", async () => {
        const timestamp: number = Math.floor(
            (await ethers.provider.getBlock("latest")).timestamp
        );
        await expect(
            Calculum.connect(deployer).setEpochDuration(
                epochDuration,
                maintTimeBefore,
                maintTimeAfter
            )
        )
            .to.revertedWithCustomError(Calculum, "VaultInMaintenance");
        // Revert if alice Try to Claim Her Shares in the Vault Maintenance Window
        await expect(
            Calculum.connect(alice).deposit(ethers.parseEther("100000"), alice.address)
        )
            .to.revertedWithCustomError(Calculum, "VaultInMaintenance");
        // Move to after the Maintenance Time Post Maintenance
        const move1: moment.Moment = moment(
            parseInt((await Calculum.getNextEpoch()).toString()) * 1000
        );
        console.log("Actual TimeStamp: ", move1.utc(false).unix());
        await network.provider.send("evm_setNextBlockTimestamp", [
            parseInt(move1.add(maintTimeAfter, "s").format("X")),
        ]);
        await network.provider.send("evm_mine", []);
        console.log(
            `Verify TimeStamp after Add ${maintTimeAfter} seconds for Maintenance Window: `,
            moment(move1.unix() * 1000)
                .utc(false)
                .unix(),
            " Full Date: ",
            moment(move1.unix() * 1000)
                .utc(false)
                .format("dddd, MMMM Do YYYY, h:mm:ss a")
        );
        // Getting Current Epoch and Next Epoch
        await Calculum.connect(deployer).CurrentEpoch();
        CURRENT_EPOCH = 8;
        const Current_Epoch = parseInt((await Calculum.CURRENT_EPOCH()).toString());
        console.log(`Number of Current Epoch: ${Current_Epoch}`);
        expect(CURRENT_EPOCH).to.equal(Current_Epoch);
        let currentEpoch: moment.Moment = moment(
            parseInt((await Calculum.getCurrentEpoch()).toString()) * 1000
        );
        console.log(
            "TimeStamp Current Epoch: ",
            currentEpoch.utc(false),
            " TiemStamp Format: ",
            currentEpoch.utc(false).unix()
        );
        expect(currentEpoch.utc(false).unix()).to.equal(
            (await Calculum.EPOCH_START()) + (
                (await Calculum.EPOCH_DURATION()) * BigInt(8)
            )
        );
        let nextEpoch: moment.Moment = moment(
            parseInt((await Calculum.getNextEpoch()).toString()) * 1000
        );
        expect(nextEpoch.utc(false).unix()).to.equal(
            currentEpoch.add(epochDuration, "s").utc(false).unix()
        );
        console.log("TimeStamp Next Epoch: ", nextEpoch.utc(false));
        // time before to set Epoch Duration
        const move2: moment.Moment = moment(
            Math.floor((await ethers.provider.getBlock("latest")).timestamp) * 1000
        );
        console.log(
            "TimeStamp Before to Set Epoch Duration: ",
            move2.utc(false).unix()
        );
        // Setting the Value of Epoch Duration and Maintenance Time Before and After
        await Calculum.connect(deployer).setEpochDuration(
            epochDuration,
            maintTimeBefore,
            maintTimeAfter
        );
        // Verify Epoch Duration
        expect(await Calculum.EPOCH_DURATION()).to.equal(epochDuration);
        // Verify Maint Time Before
        expect(await Calculum.MAINTENANCE_PERIOD_PRE_START()).to.equal(
            maintTimeBefore
        );
        // Verify Maint Time After
        expect(await Calculum.MAINTENANCE_PERIOD_POST_START()).to.equal(
            maintTimeAfter
        );
        // Redeem Alice Shares
        // Try withdraw of Alice
        await expect(Calculum.connect(alice).redeem(ethers.parseEther("160775.000"), alice.address, alice.address))
            .to.emit(Calculum, "PendingWithdraw")
            .withArgs(alice.address, alice.address, 230499.098125 * 10 ** 6, ethers.parseEther("160775.000"));
        // Validate WITHDRAWALS VALUE after withdraw
        expect((await Calculum.WITHDRAWALS(alice.address)).status).to.equal(4); // 4 = PendingRedeem

        expect((await Calculum.WITHDRAWALS(alice.address)).amountAssets).to.equal(230499.098125 * 10 ** 6);
        expect((await Calculum.WITHDRAWALS(alice.address)).amountShares).to.equal(ethers.parseEther("160775"));
        expect((await Calculum.WITHDRAWALS(alice.address)).finalAmount).to.equal(130000058085);
        // Claim bob Shares
        // Try withdraw of bob
        await expect(Calculum.connect(bob).redeem(ethers.parseEther("52348.2"), bob.address, bob.address))
            .to.emit(Calculum, "PendingWithdraw")
            .withArgs(bob.address, bob.address, 75050.305635 * 10 ** 6, ethers.parseEther("52348.2"));
        // Validate WITHDRAWALS VALUE after withdraw
        expect((await Calculum.WITHDRAWALS(bob.address)).status).to.equal(4); // 4 = PendingRedeem
        expect((await Calculum.WITHDRAWALS(bob.address)).amountAssets).to.equal(75050.305635 * 10 ** 6);
        expect((await Calculum.WITHDRAWALS(bob.address)).amountShares).to.equal(ethers.parseEther("52348.2"));
        expect((await Calculum.WITHDRAWALS(bob.address)).finalAmount).to.equal(0);
        // Claim carla Shares
        // Try withdraw of carla
        await expect(Calculum.connect(carla).redeem(ethers.parseEther("19613.5"), carla.address, carla.address))
            .to.emit(Calculum, "PendingWithdraw")
            .withArgs(carla.address, carla.address, 28119384613, ethers.parseEther("19613.5"));
        // Validate WITHDRAWALS VALUE after withdraw
        expect((await Calculum.WITHDRAWALS(carla.address)).status).to.equal(4); // 4 = PendingRedeem
        expect((await Calculum.WITHDRAWALS(carla.address)).amountAssets).to.equal(28119384613);
        expect((await Calculum.WITHDRAWALS(carla.address)).amountShares).to.equal(ethers.parseEther("19613.5"));
        expect((await Calculum.WITHDRAWALS(carla.address)).finalAmount).to.equal(15000013092);

        // Try to Finalize the Epoch before the Finalization Time
        const time = Math.floor(
            (await ethers.provider.getBlock("latest")).timestamp
        );
        await expect(Calculum.connect(openZeppelinDefenderWallet).finalizeEpoch())
            .to.revertedWithCustomError(Calculum, "VaultOutMaintenance");
        // Move before to Maintenance Windows Pre Start
        await network.provider.send("evm_setNextBlockTimestamp", [
            parseInt(move1.add(epochDuration - maintTimeBefore, "s").format("X")),
        ]);
        await network.provider.send("evm_mine", []);
        // Setting actual value of Assets
        await Oracle.connect(deployer).setAssetValue(340757.32 * 10 ** 6);
        console.log("Set Value of Assets in the Oracle: ", 340757.32);
        // sub
        const sub = (340757.32 - 332446.17) * 10 ** 6;
        const newDeposits: BigNumber = (await Calculum.newDeposits());
        const newWithdrawalsShares: BigNumber = (await Calculum.newWithdrawals());
        // Finalize the Epoch
        await Calculum.connect(openZeppelinDefenderWallet).finalizeEpoch();
        console.log("Finalize the eighth Epoch Successfully");
        // Verify the Balance of Transfer Bot Role Address in USDc
        expect(
            (await USDc.balanceOf(openZeppelinDefenderWallet.address))
        ).to.equal(1000 * 10 ** 6);
        //** Verify the Balance of Transfer Bot Role Address in Eth is minor than 1 ETH **/
        expect(
            parseInt(
                (
                    await ethers.provider.getBalance(openZeppelinDefenderWallet.address)
                ).toString()
            )
        ).to.approximately(10 ** 18, 2 * 10 ** 17);
        console.log(
            "Transfer Bot Role Address Balance in Eth: ",
            parseInt(
                (
                    await ethers.provider.getBalance(openZeppelinDefenderWallet.address)
                ).toString()
            ) / 10 ** 18
        );
        // Getting netTransfer Object
        const netTransfer: any = await Calculum.netTransfer(
            await Calculum.CURRENT_EPOCH()
        );
        expect(netTransfer.pending).to.be.true;
        expect(netTransfer.direction).to.be.false;
        const netTransferAmount = netTransfer.amount;
        expect(netTransferAmount).to.equal(340750527050);
        console.log("Vault Token Price: ", (await Calculum.VAULT_TOKEN_PRICE(await Calculum.CURRENT_EPOCH())));
        expect((await Calculum.VAULT_TOKEN_PRICE(await Calculum.CURRENT_EPOCH()))).to.equal(1458472);
        // Verify the Transfer Bot Gas Reserve in USD is Zero
        const feeKept = await Utils.CalculateTransferBotGasReserveDA(await Calculum.getAddress(), await USDc.getAddress());
        expect(feeKept).to.equal(0);
        // Call dexTransfer to transfer the amount of USDc to the Vault
        await expect(Calculum.connect(openZeppelinDefenderWallet).dexTransfer(true))
            .to.emit(Calculum, "DexTransfer")
            .withArgs(
                await Calculum.CURRENT_EPOCH(),
                netTransfer.amount
            );
        // Simulate a Withdrawal to the Vault
        await USDc.transfer(await Calculum.getAddress(), netTransfer.amount);
        // Call dexTransfer to transfer the amount of USDc to reserve becuase previous execution an Withdrawal was without reserve
        await expect(Calculum.connect(openZeppelinDefenderWallet).dexTransfer(false))
            .to.emit(USDc, "Transfer")
            .withArgs(
                await Calculum.getAddress(),
                openZeppelinDefenderWallet.address,
                await Utils.CalculateTransferBotGasReserveDA(await Calculum.getAddress(), await USDc.getAddress())
            )
            .to.emit(Calculum, "DexTransfer")
            .withArgs(
                await Calculum.CURRENT_EPOCH(),
                netTransfer.amount
            );
        console.log(
            "Transfer USDc from Dex Wallet to the Vault Successfully,Dex Transfer: ",
            netTransfer.amount
        );
        // Validate Last Balance of Vault in USDc, compare with value in the Excel Spread Sheet
        console.log(
            "Last Balance of Contract in USDc before Fees Transfer: ",
            (await USDc.balanceOf(await Calculum.getAddress()))
        );
        expect(
            (await USDc.balanceOf(await Calculum.getAddress()))
        ).to.equal(340750527050);
        // Call FeeTransfer to transfer the amount of USDc to the Fee Address
        await expect(Calculum.connect(openZeppelinDefenderWallet).feesTransfer())
            .to.emit(Calculum, "FeesTransfer")
            .withArgs(await Calculum.CURRENT_EPOCH(), 1310566727);
        // Start summarize the Epoch
        console.log('\x1b[32m%s\x1b[0m', 'Start Summarize the Epoch');
        console.log('\x1b[32m%s\x1b[0m', "Epoch Number: ", (await Calculum.CURRENT_EPOCH()).toString());
        const DexWalletBeginningBalance: BigNumber = (await Oracle.connect(traderBotWallet).GetAccount(traderBotWallet.address));
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance Beginning : ", DexWalletBeginningBalance / BigInt("1000000"));
        console.log('\x1b[32m%s\x1b[0m', "(+/-) Strategy(ies) P/L : -2.5% -", sub / 10 ** 6);
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance EoP before Fees : ", BigInt((150000 - 3750)).toString());
        console.log('\x1b[32m%s\x1b[0m', "Management Fee per Vault Token: ", parseInt((await Utils.MgtFeePerVaultToken(await Calculum.getAddress()))) / 10 ** 6);
        console.log('\x1b[32m%s\x1b[0m', "Performance Fee per Vault Token: ", parseInt((await Utils.PerfFeePerVaultToken(await Calculum.getAddress(), await USDc.getAddress()))) / 10 ** 6);
        console.log('\x1b[32m%s\x1b[0m', "Fees kept in TransferBot Wallet as gas reserves: ", (feeKept));
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance EoP after Fees :", DexWalletBeginningBalance - feeKept);
        console.log('\x1b[32m%s\x1b[0m', "Deposit (Mint New Wallet): ", newDeposits / BigInt("1000000"));
        console.log('\x1b[32m%s\x1b[0m', "Withdrawal (Burn Wallet): ", newWithdrawalsShares / BigInt("1000000"));
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance End Period: ", (DexWalletBeginningBalance + newDeposits - newWithdrawalsShares - feeKept) / BigInt("1000000"));
        console.log('\x1b[32m%s\x1b[0m', "Treasury Balance : ", (await USDc.balanceOf(treasuryWallet.address)) / BigInt("1000000"));
        console.log('\x1b[32m%s\x1b[0m', "Vault Token Price: ", parseInt((await Calculum.VAULT_TOKEN_PRICE(await Calculum.CURRENT_EPOCH()))) / 10 ** 6);
        console.log('\x1b[32m%s\x1b[0m', "Net Transfer Amount: ", parseInt(netTransferAmount) / 10 ** 6);
        // The Amount of USDc in the Dex Wallet is 1500000 USDc minus the last fee
        console.log("Balance USDc of Dex Wallet: ", parseInt((await USDc.balanceOf(traderBotWallet.address))) / 10 ** 6);
        // Verify the Balance of USDc of treasury in the Vault
        expect(
            parseInt((await USDc.balanceOf(treasuryWallet.address)).toString()) /
            10 ** 6
        ).to.equal(28999.281913);
        console.log(
            "Transfer USDc to the Treasury Successfully,Fees Transfer: ",
            parseInt((await USDc.balanceOf(treasuryWallet.address)).toString()) /
            10 ** 6
        );
        // Validate Last Balance of TransferBot Role Wallet in USDc, comparring with value in the Excel Spread Sheet
        expect(
            (await USDc.balanceOf(openZeppelinDefenderWallet.address))
        ).to.equal(1000 * 10 ** 6);
        console.log("Balance USDc of Open Zeppellin Wallet: ", parseInt((await USDc.balanceOf(openZeppelinDefenderWallet.address))) / 10 ** 6);
    });

    //   ** Verification of Sequence of Epoch based on Excel */
    //   ** 11. Verification of Sequence of Epoch */
    //   ** t1. Ninth Epoch / Epoch 9 */
    it("11.- Verification of Sequence of Epoch 9", async () => {
        const timestamp: number = Math.floor(
            (await ethers.provider.getBlock("latest")).timestamp
        );
        await expect(
            Calculum.connect(deployer).setEpochDuration(
                epochDuration,
                maintTimeBefore,
                maintTimeAfter
            )
        )
            .to.revertedWithCustomError(Calculum, "VaultInMaintenance");
        // Revert if alice Try to Claim Her Shares in the Vault Maintenance Window
        await expect(
            Calculum.connect(alice).deposit(ethers.parseEther("100000"), alice.address)
        )
            .to.revertedWithCustomError(Calculum, "VaultInMaintenance");
        // Move to after the Maintenance Time Post Maintenance
        const move1: moment.Moment = moment(
            parseInt((await Calculum.getNextEpoch()).toString()) * 1000
        );
        console.log("Actual TimeStamp: ", move1.utc(false).unix());
        await network.provider.send("evm_setNextBlockTimestamp", [
            parseInt(move1.add(maintTimeAfter, "s").format("X")),
        ]);
        await network.provider.send("evm_mine", []);
        console.log(
            `Verify TimeStamp after Add ${maintTimeAfter} seconds for Maintenance Window: `,
            moment(move1.unix() * 1000)
                .utc(false)
                .unix(),
            " Full Date: ",
            moment(move1.unix() * 1000)
                .utc(false)
                .format("dddd, MMMM Do YYYY, h:mm:ss a")
        );
        // Getting Current Epoch and Next Epoch
        await Calculum.connect(deployer).CurrentEpoch();
        CURRENT_EPOCH = 9;
        const Current_Epoch = parseInt((await Calculum.CURRENT_EPOCH()).toString());
        console.log(`Number of Current Epoch: ${Current_Epoch}`);
        expect(CURRENT_EPOCH).to.equal(Current_Epoch);
        let currentEpoch: moment.Moment = moment(
            parseInt((await Calculum.getCurrentEpoch()).toString()) * 1000
        );
        console.log(
            "TimeStamp Current Epoch: ",
            currentEpoch.utc(false),
            " TiemStamp Format: ",
            currentEpoch.utc(false).unix()
        );
        expect(currentEpoch.utc(false).unix()).to.equal(
            (await Calculum.EPOCH_START()) + (
                (await Calculum.EPOCH_DURATION()) * BigInt(9)
            )
        );
        let nextEpoch: moment.Moment = moment(
            parseInt((await Calculum.getNextEpoch()).toString()) * 1000
        );
        expect(nextEpoch.utc(false).unix()).to.equal(
            currentEpoch.add(epochDuration, "s").utc(false).unix()
        );
        console.log("TimeStamp Next Epoch: ", nextEpoch.utc(false));
        // time before to set Epoch Duration
        const move2: moment.Moment = moment(
            Math.floor((await ethers.provider.getBlock("latest")).timestamp) * 1000
        );
        console.log(
            "TimeStamp Before to Set Epoch Duration: ",
            move2.utc(false).unix()
        );
        // Setting the Value of Epoch Duration and Maintenance Time Before and After
        await Calculum.connect(deployer).setEpochDuration(
            epochDuration,
            maintTimeBefore,
            maintTimeAfter
        );
        // Verify Epoch Duration
        expect(await Calculum.EPOCH_DURATION()).to.equal(epochDuration);
        // Verify Maint Time Before
        expect(await Calculum.MAINTENANCE_PERIOD_PRE_START()).to.equal(
            maintTimeBefore
        );
        // Verify Maint Time After
        expect(await Calculum.MAINTENANCE_PERIOD_POST_START()).to.equal(
            maintTimeAfter
        );
        // Claim Shares all the Users
        // Claiming the Withdraw Assets of Alice
        await expect(Calculum.connect(alice).claimAssets(alice.address, alice.address))
            .to.emit(Calculum, "Transfer")
            .withArgs(
                alice.address,
                ZERO_ADDRESS,
                ethers.parseEther("160775"),
            )
            .to.emit(USDc, "Transfer")
            .withArgs(
                await Calculum.getAddress(),
                alice.address,
                234485.8358 * 10 ** 6
            )
            .to.emit(Calculum, "Withdraw")
            .withArgs(
                alice.address,
                alice.address,
                alice.address,
                ethers.parseEther("160775"),
                234485.8358 * 10 ** 6
            );
        // Verify the Value of alice int the WITHDRAWS VALUE mapping after to Claimed
        expect((await Calculum.WITHDRAWALS(alice.address)).status).to.equal(3); // 3 = Completed
        expect((await Calculum.WITHDRAWALS(alice.address)).amountAssets).to.equal(0);
        expect((await Calculum.WITHDRAWALS(alice.address)).amountShares).to.equal(0);
        expect((await Calculum.WITHDRAWALS(alice.address)).finalAmount).to.equal(364485893885);

        // Claiming the Withdraw Assets of Bob
        await expect(Calculum.connect(bob).claimAssets(bob.address, bob.address))
            .to.emit(Calculum, "Transfer")
            .withArgs(
                bob.address,
                ZERO_ADDRESS,
                ethers.parseEther("52348.2"),
            )
            .to.emit(USDc, "Transfer")
            .withArgs(
                await Calculum.getAddress(),
                bob.address,
                76348.383951 * 10 ** 6
            )
            .to.emit(Calculum, "Withdraw")
            .withArgs(
                bob.address,
                bob.address,
                bob.address,
                ethers.parseEther("52348.2"),
                76348.383951 * 10 ** 6
            );
        // Verify the Value of bob int the WITHDRAWS VALUE mapping after to Claimed
        expect((await Calculum.WITHDRAWALS(bob.address)).status).to.equal(3); // 3 = Completed
        expect((await Calculum.WITHDRAWALS(bob.address)).amountAssets).to.equal(0);
        expect((await Calculum.WITHDRAWALS(bob.address)).amountShares).to.equal(0);
        expect((await Calculum.WITHDRAWALS(bob.address)).finalAmount).to.equal(76348.383951 * 10 ** 6);

        // Claiming the Withdraw Assets of carla
        await expect(Calculum.connect(carla).claimAssets(carla.address, carla.address))
            .to.emit(Calculum, "Transfer")
            .withArgs(
                carla.address,
                ZERO_ADDRESS,
                ethers.parseEther("19613.5"),
            )
            .to.emit(USDc, "Transfer")
            .withArgs(
                await Calculum.getAddress(),
                carla.address,
                28605740572
            )
            .to.emit(Calculum, "Withdraw")
            .withArgs(
                carla.address,
                carla.address,
                carla.address,
                ethers.parseEther("19613.5"),
                28605740572
            );
        // Verify the Value of carla int the WITHDRAWS VALUE mapping after to Claimed
        expect((await Calculum.WITHDRAWALS(carla.address)).status).to.equal(3); // 3 = Completed
        expect((await Calculum.WITHDRAWALS(carla.address)).amountAssets).to.equal(0);
        expect((await Calculum.WITHDRAWALS(carla.address)).amountShares).to.equal(0);
        expect((await Calculum.WITHDRAWALS(carla.address)).finalAmount).to.equal(43605.753664 * 10 ** 6);

        // Add deposit to the Vault from bob
        await expect(
            Calculum.connect(bob).deposit(50000 * 10 ** 6, bob.address)
        )
            .to.emit(USDc, "Transfer")
            .withArgs(bob.address, await Calculum.getAddress(), 50000 * 10 ** 6)
            .to.emit(Calculum, "PendingDeposit")
            .withArgs(
                bob.address,
                bob.address,
                50000 * 10 ** 6,
                ethers.parseUnits("808391327305192911", "wei")
            );
        // Verify status of bob in DEPOSITS after deposit
        expect((await Calculum.DEPOSITS(bob.address)).status).to.equal(1); // 1 = Pending
        expect((await Calculum.DEPOSITS(bob.address)).amountAssets).to.equal(
            50000 * 10 ** 6
        );
        expect((await Calculum.DEPOSITS(bob.address)).amountShares).to.equal(
            ethers.parseUnits("808391327305192911", "wei")
        );
        expect((await Calculum.DEPOSITS(bob.address)).finalAmount).to.equal(
            50000 * 10 ** 6
        );

        // Try to Finalize the Epoch before the Finalization Time
        const time = Math.floor(
            (await ethers.provider.getBlock("latest")).timestamp
        );
        await expect(Calculum.connect(openZeppelinDefenderWallet).finalizeEpoch())
            .to.revertedWithCustomError(Calculum, "VaultOutMaintenance");
        // Move before to Maintenance Windows Pre Start
        await network.provider.send("evm_setNextBlockTimestamp", [
            parseInt(move1.add(epochDuration - maintTimeBefore, "s").format("X")),
        ]);
        await network.provider.send("evm_mine", []);
        // Setting actual value of Assets
        await Oracle.connect(deployer).setAssetValue(7.34 * 10 ** 6);
        console.log("Set Value of Assets in the Oracle: ", 7.34 * 10 ** 6);
        // sub
        const sub = (7.53 - 7.34) * 10 ** 6;
        const newDeposits: BigNumber = (await Calculum.newDeposits());
        const newWithdrawalsShares: BigNumber = (await Calculum.newWithdrawals());
        // Finalize the Epoch
        await Calculum.connect(openZeppelinDefenderWallet).finalizeEpoch();
        console.log("Finalize the Ninth Epoch Successfully");
        // Verify the Balance of Transfer Bot Role Address in USDc
        expect(
            (await USDc.balanceOf(openZeppelinDefenderWallet.address))
        ).to.equal(1000 * 10 ** 6);
        //** Verify the Balance of Transfer Bot Role Address in Eth is minor than 1 ETH **/
        expect(
            parseInt(
                (
                    await ethers.provider.getBalance(openZeppelinDefenderWallet.address)
                ).toString()
            )
        ).to.approximately(10 ** 18, 2 * 10 ** 17);
        console.log(
            "Transfer Bot Role Address Balance in Eth: ",
            parseInt(
                (
                    await ethers.provider.getBalance(openZeppelinDefenderWallet.address)
                ).toString()
            ) / 10 ** 18
        );
        // Getting netTransfer Object
        const netTransfer: any = await Calculum.netTransfer(
            await Calculum.CURRENT_EPOCH()
        );
        expect(netTransfer.pending).to.be.true;
        expect(netTransfer.direction).to.be.true;
        const netTransferAmount = netTransfer.amount;
        expect(netTransferAmount).to.equal(ethers.parseUnits("49999922175", "wei"));
        console.log("Vault Token Price: ", (await Calculum.VAULT_TOKEN_PRICE(await Calculum.CURRENT_EPOCH())));
        expect((await Calculum.VAULT_TOKEN_PRICE(await Calculum.CURRENT_EPOCH()))).to.equal(1550778);
        // Verify the Transfer Bot Gas Reserve in USD is Zero
        const feeKept = await Utils.CalculateTransferBotGasReserveDA(await Calculum.getAddress(), await USDc.getAddress());
        expect(feeKept).to.equal(0);
        // Call dexTransfer to transfer the amount of USDc to the Vault
        await expect(Calculum.connect(openZeppelinDefenderWallet).dexTransfer(true))
            .to.emit(Calculum, "DexTransfer")
            .withArgs(
                await Calculum.CURRENT_EPOCH(),
                netTransfer.amount
            );
        // Call dexTransfer to transfer the amount of USDc to reserve becuase previous execution an Deposit was without reserve
        await expect(Calculum.connect(openZeppelinDefenderWallet).dexTransfer(false))
            .to.emit(USDc, "Transfer")
            .withArgs(
                await Calculum.getAddress(),
                openZeppelinDefenderWallet.address,
                await Utils.CalculateTransferBotGasReserveDA(await Calculum.getAddress(), await USDc.getAddress())
            )
            .to.emit(Calculum, "DexTransfer")
            .withArgs(
                await Calculum.CURRENT_EPOCH(),
                netTransfer.amount
            );
        console.log(
            "Transfer USDc from Dex Wallet to the Vault Successfully,Dex Transfer: ",
            netTransfer.amount
        );
        // Validate Last Balance of Vault in USDc, compare with value in the Excel Spread Sheet
        console.log(
            "Last Balance of Contract in USDc before Fees Transfer: ",
            (await USDc.balanceOf(await Calculum.getAddress()))
        );
        expect(
            (await USDc.balanceOf(await Calculum.getAddress()))
        ).to.equal(2000000);
        // Call FeeTransfer to transfer the amount of USDc to the Fee Address
        await expect(Calculum.connect(openZeppelinDefenderWallet).feesTransfer())
            .to.emit(Calculum, "FeesTransfer")
            .withArgs(await Calculum.CURRENT_EPOCH(), 0);
        // Start summarize the Epoch
        console.log('\x1b[32m%s\x1b[0m', 'Start Summarize the Epoch');
        console.log('\x1b[32m%s\x1b[0m', "Epoch Number: ", (await Calculum.CURRENT_EPOCH()).toString());
        const DexWalletBeginningBalance: BigNumber = (await Oracle.connect(traderBotWallet).GetAccount(traderBotWallet.address));
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance Beginning : ", DexWalletBeginningBalance / BigInt("1000000"));
        console.log('\x1b[32m%s\x1b[0m', "(+/-) Strategy(ies) P/L : -2.5% -", sub / 10 ** 6);
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance EoP before Fees : ", BigInt((150000 - 3750)).toString());
        console.log('\x1b[32m%s\x1b[0m', "Management Fee per Vault Token: ", parseInt((await Utils.MgtFeePerVaultToken(await Calculum.getAddress()))) / 10 ** 6);
        console.log('\x1b[32m%s\x1b[0m', "Performance Fee per Vault Token: ", parseInt((await Utils.PerfFeePerVaultToken(await Calculum.getAddress(), await USDc.getAddress()))) / 10 ** 6);
        console.log('\x1b[32m%s\x1b[0m', "Fees kept in TransferBot Wallet as gas reserves: ", (feeKept));
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance EoP after Fees :", DexWalletBeginningBalance - feeKept);
        console.log('\x1b[32m%s\x1b[0m', "Deposit (Mint New Wallet): ", newDeposits / BigInt("1000000"));
        console.log('\x1b[32m%s\x1b[0m', "Withdrawal (Burn Wallet): ", newWithdrawalsShares / BigInt("1000000"));
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance End Period: ", (DexWalletBeginningBalance + newDeposits - newWithdrawalsShares - feeKept) / BigInt("1000000"));
        console.log('\x1b[32m%s\x1b[0m', "Treasury Balance : ", (await USDc.balanceOf(treasuryWallet.address)) / BigInt("1000000"));
        console.log('\x1b[32m%s\x1b[0m', "Vault Token Price: ", parseInt((await Calculum.VAULT_TOKEN_PRICE(await Calculum.CURRENT_EPOCH()))) / 10 ** 6);
        console.log('\x1b[32m%s\x1b[0m', "Net Transfer Amount: ", parseInt(netTransferAmount) / 10 ** 6);
        // The Amount of USDc in the Dex Wallet is 1500000 USDc minus the last fee
        console.log("Balance USDc of Dex Wallet: ", parseInt((await USDc.balanceOf(traderBotWallet.address))) / 10 ** 6);
        // Verify the Balance of USDc of treasury in the Vault
        expect(
            (await USDc.balanceOf(treasuryWallet.address)).toString()
        ).to.equal("28999281913");
        console.log(
            "Transfer USDc to the Treasury Successfully,Fees Transfer: ",
            parseInt((await USDc.balanceOf(treasuryWallet.address)).toString()) /
            10 ** 6
        );
        // Validate Last Balance of TransferBot Role Wallet in USDc, comparring with value in the Excel Spread Sheet
        expect(
            (await USDc.balanceOf(openZeppelinDefenderWallet.address))
        ).to.equal(999077825);
        console.log("Balance USDc of Open Zeppellin Wallet: ", parseInt((await USDc.balanceOf(openZeppelinDefenderWallet.address))) / 10 ** 6);
    });

    //   ** Verification of Sequence of Epoch based on Excel */
    //   ** 12. Verification of Sequence of Epoch */
    //   ** t1. Tenth Epoch / Epoch 10 */
    it("12.- Verification of Sequence of Epoch 10", async () => {
        const timestamp: number = Math.floor(
            (await ethers.provider.getBlock("latest")).timestamp
        );
        await expect(
            Calculum.connect(deployer).setEpochDuration(
                epochDuration,
                maintTimeBefore,
                maintTimeAfter
            )
        )
            .to.revertedWithCustomError(Calculum, "VaultInMaintenance");
        // Revert if alice Try to Claim Her Shares in the Vault Maintenance Window
        await expect(
            Calculum.connect(alice).deposit(ethers.parseEther("100000"), alice.address)
        )
            .to.revertedWithCustomError(Calculum, "VaultInMaintenance");
        // Move to after the Maintenance Time Post Maintenance
        const move1: moment.Moment = moment(
            parseInt((await Calculum.getNextEpoch()).toString()) * 1000
        );
        console.log("Actual TimeStamp: ", move1.utc(false).unix());
        await network.provider.send("evm_setNextBlockTimestamp", [
            parseInt(move1.add(maintTimeAfter, "s").format("X")),
        ]);
        await network.provider.send("evm_mine", []);
        console.log(
            `Verify TimeStamp after Add ${maintTimeAfter} seconds for Maintenance Window: `,
            moment(move1.unix() * 1000)
                .utc(false)
                .unix(),
            " Full Date: ",
            moment(move1.unix() * 1000)
                .utc(false)
                .format("dddd, MMMM Do YYYY, h:mm:ss a")
        );
        // Getting Current Epoch and Next Epoch
        await Calculum.connect(deployer).CurrentEpoch();
        CURRENT_EPOCH = 10;
        const Current_Epoch = parseInt((await Calculum.CURRENT_EPOCH()).toString());
        console.log(`Number of Current Epoch: ${Current_Epoch}`);
        expect(CURRENT_EPOCH).to.equal(Current_Epoch);
        let currentEpoch: moment.Moment = moment(
            parseInt((await Calculum.getCurrentEpoch()).toString()) * 1000
        );
        console.log(
            "TimeStamp Current Epoch: ",
            currentEpoch.utc(false),
            " TiemStamp Format: ",
            currentEpoch.utc(false).unix()
        );
        expect(currentEpoch.utc(false).unix()).to.equal(
            (await Calculum.EPOCH_START()) + (
                (await Calculum.EPOCH_DURATION()) * BigInt(10)
            )
        );
        let nextEpoch: moment.Moment = moment(
            parseInt((await Calculum.getNextEpoch()).toString()) * 1000
        );
        expect(nextEpoch.utc(false).unix()).to.equal(
            currentEpoch.add(epochDuration, "s").utc(false).unix()
        );
        console.log("TimeStamp Next Epoch: ", nextEpoch.utc(false));
        // time before to set Epoch Duration
        const move2: moment.Moment = moment(
            Math.floor((await ethers.provider.getBlock("latest")).timestamp) * 1000
        );
        console.log(
            "TimeStamp Before to Set Epoch Duration: ",
            move2.utc(false).unix()
        );
        // Setting the Value of Epoch Duration and Maintenance Time Before and After
        await Calculum.connect(deployer).setEpochDuration(
            epochDuration,
            maintTimeBefore,
            maintTimeAfter
        );
        // Verify Epoch Duration
        expect(await Calculum.EPOCH_DURATION()).to.equal(epochDuration);
        // Verify Maint Time Before
        expect(await Calculum.MAINTENANCE_PERIOD_PRE_START()).to.equal(
            maintTimeBefore
        );
        // Verify Maint Time After
        expect(await Calculum.MAINTENANCE_PERIOD_POST_START()).to.equal(
            maintTimeAfter
        );

        // Claiming the Withdraw Assets of Bob
        await expect(Calculum.connect(bob).claimShares(bob.address))
            .to.emit(Calculum, "Transfer")
            .withArgs(
                ZERO_ADDRESS,
                bob.address,
                ethers.parseUnits("32241881171902103331361", "wei")
            )
            .to.emit(Calculum, "Deposit")
            .withArgs(
                bob.address,
                bob.address,
                100000000000,
                ethers.parseUnits("32241881171902103331361", "wei")
            );
        // Verify the Value of bob int the WITHDRAWS VALUE mapping after to Claimed
        expect((await Calculum.DEPOSITS(bob.address)).status).to.equal(3); // 3 = Completed
        expect((await Calculum.DEPOSITS(bob.address)).amountAssets).to.equal(0);
        expect((await Calculum.DEPOSITS(bob.address)).amountShares).to.equal(0);
        expect((await Calculum.DEPOSITS(bob.address)).finalAmount).to.equal(100000000000);

        // Try to Finalize the Epoch before the Finalization Time
        const time = Math.floor(
            (await ethers.provider.getBlock("latest")).timestamp
        );
        await expect(Calculum.connect(openZeppelinDefenderWallet).finalizeEpoch())
            .to.revertedWithCustomError(Calculum, "VaultOutMaintenance");
        // Move before to Maintenance Windows Pre Start
        await network.provider.send("evm_setNextBlockTimestamp", [
            parseInt(move1.add(epochDuration - maintTimeBefore, "s").format("X")),
        ]);
        await network.provider.send("evm_mine", []);
        // Setting actual value of Assets
        await Oracle.connect(deployer).setAssetValue(51007.48 * 10 ** 6);
        console.log("Set Value of Assets in the Oracle: ", 51007.48 * 10 ** 6);
        // sub
        const sub = (51007.07 - 50007.33) * 10 ** 6;
        const newDeposits: BigNumber = (await Calculum.newDeposits());
        const newWithdrawalsShares: BigNumber = (await Calculum.newWithdrawals());
        // Finalize the Epoch
        await Calculum.connect(openZeppelinDefenderWallet).finalizeEpoch();
        console.log("Finalize the Tenth Epoch Successfully");
        // Verify the Balance of Transfer Bot Role Address in USDc
        expect(
            (await USDc.balanceOf(openZeppelinDefenderWallet.address))
        ).to.equal(999077825);
        //** Verify the Balance of Transfer Bot Role Address in Eth is minor than 1 ETH **/
        expect(
            parseInt(
                (
                    await ethers.provider.getBalance(openZeppelinDefenderWallet.address)
                ).toString()
            )
        ).to.approximately(10 ** 18, 2 * 10 ** 17);
        console.log(
            "Transfer Bot Role Address Balance in Eth: ",
            parseInt(
                (
                    await ethers.provider.getBalance(openZeppelinDefenderWallet.address)
                ).toString()
            ) / 10 ** 18
        );
        // Getting netTransfer Object
        const netTransfer: any = await Calculum.netTransfer(
            await Calculum.CURRENT_EPOCH()
        );
        expect(netTransfer.pending).to.be.true;
        expect(netTransfer.direction).to.be.false;
        const netTransferAmount = netTransfer.amount;
        expect(netTransferAmount).to.equal(ethers.parseUnits("159652738", "wei"));
        console.log("Vault Token Price: ", parseInt((await Calculum.VAULT_TOKEN_PRICE(await Calculum.CURRENT_EPOCH()))) / 10 ** 6);
        expect((await Calculum.VAULT_TOKEN_PRICE(await Calculum.CURRENT_EPOCH()))).to.equal(1576845);
        // Verify the Transfer Bot Gas Reserve in USD is Zero
        const feeKept = await Utils.CalculateTransferBotGasReserveDA(await Calculum.getAddress(), await USDc.getAddress());
        expect(feeKept).to.equal(922175);
        // Call dexTransfer to transfer the amount of USDc to the Vault
        await expect(Calculum.connect(openZeppelinDefenderWallet).dexTransfer(true))
            .to.emit(Calculum, "DexTransfer")
            .withArgs(
                await Calculum.CURRENT_EPOCH(),
                netTransfer.amount
        );
        console.log("Transfer USDc from Dex Wallet to the Vault Successfully,Dex Transfer: ", netTransfer.amount);
        // Simulate the Transfer of USDc from the Dex Wallet to the Vault
        await USDc.transfer(await Calculum.getAddress(), netTransfer.amount);
        // Call dexTransfer to transfer the amount of USDc to reserve becuase previous execution an Deposit was without reserve
        await expect(Calculum.connect(openZeppelinDefenderWallet).dexTransfer(false))
            .to.emit(USDc, "Transfer")
            .withArgs(
                await Calculum.getAddress(),
                openZeppelinDefenderWallet.address,
                await Utils.CalculateTransferBotGasReserveDA(await Calculum.getAddress(), await USDc.getAddress())
            )
            .to.emit(Calculum, "DexTransfer")
            .withArgs(
                await Calculum.CURRENT_EPOCH(),
                netTransfer.amount
            );
        console.log(
            "Transfer USDc from Dex Wallet to the Vault Successfully,Dex Transfer: ",
            netTransfer.amount
        );
        // Validate Last Balance of Vault in USDc, compare with value in the Excel Spread Sheet
        console.log(
            "Last Balance of Contract in USDc before Fees Transfer: ",
            (await USDc.balanceOf(await Calculum.getAddress()))
        );
        expect(
            (await USDc.balanceOf(await Calculum.getAddress()))
        ).to.equal(159730563);
        // Call FeeTransfer to transfer the amount of USDc to the Fee Address
        await expect(Calculum.connect(openZeppelinDefenderWallet).feesTransfer())
            .to.emit(Calculum, "FeesTransfer")
            .withArgs(await Calculum.CURRENT_EPOCH(), 159730563);
        // Start summarize the Epoch
        console.log('\x1b[32m%s\x1b[0m', 'Start Summarize the Epoch');
        console.log('\x1b[32m%s\x1b[0m', "Epoch Number: ", (await Calculum.CURRENT_EPOCH()).toString());
        const DexWalletBeginningBalance: BigNumber = (await Oracle.connect(traderBotWallet).GetAccount(traderBotWallet.address));
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance Beginning : ", DexWalletBeginningBalance / BigInt("1000000"));
        console.log('\x1b[32m%s\x1b[0m', "(+/-) Strategy(ies) P/L : -2.5% -", sub / 10 ** 6);
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance EoP before Fees : ", BigInt((150000 - 3750)).toString());
        console.log('\x1b[32m%s\x1b[0m', "Management Fee per Vault Token: ", parseInt((await Utils.MgtFeePerVaultToken(await Calculum.getAddress()))) / 10 ** 6);
        console.log('\x1b[32m%s\x1b[0m', "Performance Fee per Vault Token: ", parseInt((await Utils.PerfFeePerVaultToken(await Calculum.getAddress(), await USDc.getAddress()))) / 10 ** 6);
        console.log('\x1b[32m%s\x1b[0m', "Fees kept in TransferBot Wallet as gas reserves: ", (feeKept));
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance EoP after Fees :", DexWalletBeginningBalance - feeKept);
        console.log('\x1b[32m%s\x1b[0m', "Deposit (Mint New Wallet): ", newDeposits / BigInt("1000000"));
        console.log('\x1b[32m%s\x1b[0m', "Withdrawal (Burn Wallet): ", newWithdrawalsShares / BigInt("1000000"));
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance End Period: ", (DexWalletBeginningBalance + newDeposits - newWithdrawalsShares - feeKept) / BigInt("1000000"));
        console.log('\x1b[32m%s\x1b[0m', "Treasury Balance : ", (await USDc.balanceOf(treasuryWallet.address)) / BigInt("1000000"));
        console.log('\x1b[32m%s\x1b[0m', "Vault Token Price: ", parseInt((await Calculum.VAULT_TOKEN_PRICE(await Calculum.CURRENT_EPOCH()))) / 10 ** 6);
        console.log('\x1b[32m%s\x1b[0m', "Net Transfer Amount: ", parseInt(netTransferAmount) / 10 ** 6);
        // The Amount of USDc in the Dex Wallet is 1500000 USDc minus the last fee
        console.log("Balance USDc of Dex Wallet: ", parseInt((await USDc.balanceOf(traderBotWallet.address))) / 10 ** 6);
        // Verify the Balance of USDc of treasury in the Vault
        expect(
            (await USDc.balanceOf(treasuryWallet.address)).toString()
        ).to.equal("29158012476");
        console.log(
            "Transfer USDc to the Treasury Successfully,Fees Transfer: ",
            parseInt((await USDc.balanceOf(treasuryWallet.address)).toString()) /
            10 ** 6
        );
        // Validate Last Balance of TransferBot Role Wallet in USDc, comparring with value in the Excel Spread Sheet
        expect(
            (await USDc.balanceOf(openZeppelinDefenderWallet.address))
        ).to.equal(1000000000);
        console.log("Balance USDc of Open Zeppellin Wallet: ", parseInt((await USDc.balanceOf(openZeppelinDefenderWallet.address))) / 10 ** 6);
    });

    afterEach(async () => {
        console.log(
            "Balance of Vault in USDc after each test: ",
            (await USDc.balanceOf(await Calculum.getAddress())) / BigInt("1000000")
        );
        const time = Math.floor(
            (await ethers.provider.getBlock("latest")).timestamp
        );
        console.log(
            "Verify TimeStamp: ",
            time,
            " Full Date: ",
            moment(time * 1000)
                .utc(false)
                .format("dddd, MMMM Do YYYY, h:mm:ss a")
        );
        currentEpoch = moment(
            parseInt((await Calculum.getCurrentEpoch()).toString()) * 1000
        );
        console.log("TimeStamp Current Epoch: ", currentEpoch.utc(false));
        nextEpoch = moment(
            parseInt((await Calculum.getNextEpoch()).toString()) * 1000
        );
        console.log("TimeStamp Next Epoch: ", nextEpoch.utc(false));
    });
});
