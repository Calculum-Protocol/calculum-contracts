/* eslint-disable no-unused-vars */
/* eslint-disable camelcase */
import { ethers, run, network, upgrades } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
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
} from "../typechain-types";
import { USDC_ABI } from "../files/USDC.json";
import { sUSD_ABI } from "../files/sUSD.json";
import { BigNumber } from "ethers";

dotenv.config();

const { expect } = chai;

// General Vars
let deployer: SignerWithAddress;
let treasuryWallet: SignerWithAddress;
let dexWallet: SignerWithAddress;
let delegateAddress: SignerWithAddress;
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
const MIN_DEPOSIT = ethers.utils.parseEther("30");
const MAX_DEPOSIT = ethers.utils.parseEther("250");
const MAX_TOTAL_DEPOSIT = ethers.utils.parseEther("1000");
const MIN_WALLET_BALANCE_USDC_TRANSFER_BOT = ethers.utils.parseEther("5");
const TARGET_WALLET_BALANCE_USDC_TRANSFER_BOT = ethers.utils.parseEther("25");
const MIN_WALLET_BALANCE_ETH_TRANSFER_BOT = ethers.utils.parseEther("0.15");
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
// const USDC_ADDRESS = "0x7F5c764cBc14f9669B88837ca1490cCa17c31607";
const sUSD_ADDRESS = "0x8c6f28f2F1A3C87F0f938b96d27520d9751ec8d9";
const UNISWAP_ROUTER2 = "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45";
const USDC_BIG_HOLDER = "0xEbe80f029b1c02862B9E8a70a7e5317C06F62Cae";
const sUSD_BIG_HOLDER = "0x5DD596C901987A2b28C38A9C1DfBf86fFFc15d77";
const KWENTA_ADDRESS = "0x8234F990b149Ae59416dc260305E565e5DAfEb54";

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
//             dexWallet,
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
//         await impersonateAccount(sUSD_BIG_HOLDER);
//         const polygonBridge: SignerWithAddress = await ethers.getSigner(
//             sUSD_BIG_HOLDER
//         );
//         await setBalance(sUSD_BIG_HOLDER, "0x56bc75e2d63100000");

//         // Create Instance of USDC
//         USDc = await ethers.getContractAt(sUSD_ABI, sUSD_ADDRESS);
//         expect(USDc.address).to.be.properAddress;
//         expect(USDc.address).to.be.equal(sUSD_ADDRESS);
//         expect(await USDc.decimals()).to.be.equal(18);
//         console.log("Deployer Address: ", deployer.address);
//         console.log("OpenZeppelin Address: ", openZeppelinDefenderWallet.address);
//         const initialBalance = await USDc.balanceOf(deployer.address);

//         // Transfer USDC to Owner
//         await expect(
//             USDc.connect(polygonBridge).transfer(
//                 deployer.address,
//                 ethers.utils.parseEther("600000")
//             )
//         )
//             .to.emit(USDc, "Transfer")
//             .withArgs(
//                 sUSD_BIG_HOLDER,
//                 deployer.address,
//                 ethers.utils.parseEther("600000")
//             );
//         expect(await USDc.balanceOf(deployer.address)).to.be.equal(
//             ethers.utils.parseEther("600000").add(initialBalance)
//         );

//         // eslint-disable-next-line no-unused-expressions
//         expect(USDc.address).to.properAddress;
//         console.log(`USDC Address: ${USDc.address}`);
//         // Mint 100 K Stable coin to deployer, user1, user2, user3
//         console.log("Deployer UDC Balance: ", (await USDc.balanceOf(deployer.address)).div(ethers.BigNumber.from(10).pow(18)).toString());
//         await USDc.transfer(alice.address, ethers.utils.parseEther("250000"));
//         await USDc.transfer(bob.address, ethers.utils.parseEther("100000"));
//         await USDc.transfer(carla.address, ethers.utils.parseEther("30000"));
//         // Deploy Mockup Oracle
//         OracleFactory = (await ethers.getContractFactory(
//             "MockUpOracle",
//             deployer
//         )) as MockUpOracle__factory;
//         // Deploy Oracle
//         const Balance = await USDc.balanceOf(dexWallet.address);
//         Oracle = (await OracleFactory.deploy(
//             dexWallet.address,
//             Balance
//         )) as MockUpOracle;
//         // eslint-disable-next-line no-unused-expressions
//         expect(Oracle.address).to.properAddress;
//         console.log(`Oracle Address: ${Oracle.address}`);
//         // Deploy all Libraries of Calculum , with not upgradeable version
//         ConstantsFactory = (await ethers.getContractFactory(
//             "Constants",
//             deployer
//         )) as Constants__factory;
//         Constants = (await ConstantsFactory.deploy()) as Constants;
//         // eslint-disable-next-line no-unused-expressions
//         expect(Constants.address).to.properAddress;
//         console.log(`Constants Address: ${Constants.address}`);
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
//         console.log(`Dex Wallet Address, before: ${dexWallet.address}`);
//         // Deploy Calculum Vault
//         Calculum = (await upgrades.deployProxy(CalculumFactory, [
//             name,
//             symbol,
//             decimals,
//             [
//                 Oracle.address,
//                 dexWallet.address,
//                 treasuryWallet.address,
//                 openZeppelinDefenderWallet.address,
//                 UNISWAP_ROUTER2,
//                 USDc.address,
//                 KWENTA_ADDRESS
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
//         expect(Calculum.address).to.properAddress;
//         console.log(`Calculum Address: ${Calculum.address}`);
//         console.log(`Dex Wallet Address, after: ${await Calculum.dexWallet()}`);
//         // Allowance the Contract in Stable Coin
//         await USDc.connect(deployer).approve(Calculum.address, ethers.utils.parseEther("100000"));
//         await USDc.connect(alice).approve(Calculum.address, ethers.utils.parseEther("250000"));
//         await USDc.connect(bob).approve(Calculum.address, ethers.utils.parseEther("100000"));
//         await USDc.connect(carla).approve(Calculum.address, ethers.utils.parseEther("30000"));
//         await USDc.connect(openZeppelinDefenderWallet).approve(
//             Calculum.address,
//             ethers.utils.parseEther("2000000")
//         );
//         await USDc.connect(dexWallet).approve(
//             Calculum.address,
//             ethers.utils.parseEther("2000000")
//         );
//         // Add deployer, alice, bob and carla wallet in the whitelist
//         await Calculum.connect(deployer).addDropWhitelist(deployer.address, true);
//         await Calculum.connect(deployer).addDropWhitelist(alice.address, true);
//         await Calculum.connect(deployer).addDropWhitelist(bob.address, true);
//         await Calculum.connect(deployer).addDropWhitelist(carla.address, true);
//         // Mint 200 USDc to the Transfer Bot Role  Wallet
//         await USDc.connect(deployer).transfer(
//             openZeppelinDefenderWallet.address,
//             ethers.utils.parseEther("200")
//         );
//         // Transfer 0.5 ETh from deployer to Contract Vault Address
//         await openZeppelinDefenderWallet.sendTransaction({
//             to: deployer.address,
//             value: (
//                 await openZeppelinDefenderWallet.getBalance()
//             ).sub(ethers.utils.parseEther("0.5")),
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
//         expect(await Calculum.asset()).to.equal(USDc.address);
//         // Verify Treasury Address
//         expect(await Calculum.treasuryWallet()).to.equal(treasuryWallet.address);
//         // Verify Oracle Address
//         expect(await Calculum.oracle()).to.equal(Oracle.address);
//         // Verify Initial Value of Percentage Maintenance Fee
//         expect(await Calculum.MANAGEMENT_FEE_PERCENTAGE()).to.equal(
//             ethers.utils.parseEther("0.01")
//         );
//         // Verify Initial Value of Percentage Performance Fee
//         expect(await Calculum.PERFORMANCE_FEE_PERCENTAGE()).to.equal(
//             ethers.utils.parseEther("0.15")
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
//         expect(await Calculum.router()).to.equal(UNISWAP_ROUTER2);
//         // Verify Balance of ERC20 USDc of the Contract Vault
//         expect(await USDc.balanceOf(openZeppelinDefenderWallet.address)).to.equal(
//             ethers.utils.parseEther("200")
//         );
//         // Verify Balance in USDc of alice
//         expect(await USDc.balanceOf(alice.address)).to.equal(ethers.utils.parseEther("250000"));
//         // Verify Balance in USDc of bob
//         expect(await USDc.balanceOf(bob.address)).to.equal(ethers.utils.parseEther("100000"));
//         // Verify Balance in USDc of carla
//         expect(await USDc.balanceOf(carla.address)).to.equal(ethers.utils.parseEther("30000"));
//         // Verify Balance of 0.5 ETH in ethereum of Contract Vault
//         expect(
//             await ethers.provider.getBalance(openZeppelinDefenderWallet.address)
//         ).to.lessThanOrEqual(ethers.utils.parseEther("0.5"));
//         // Verifi is DexWallet is a Delegate in Kwenta Dex
//         expect(await Calculum.isDelegate(dexWallet.address)).to.equal(true);
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

//     //   ** 4. Manage Delegates */
//     //   ** t1. Manage Delegates / Add / Remove */
//     it("4.- Manage Delegates", async () => {
//         await Calculum.connect(deployer).manageDelegate(lastdeployer.address, true);
//         expect(await Calculum.isDelegate(lastdeployer.address)).to.equal(true);
//         await Calculum.connect(deployer).manageDelegate(lastdeployer.address, false);
//         expect(await Calculum.isDelegate(lastdeployer.address)).to.equal(false);
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

describe("Verification of Basic Value and Features", function () {
    let EPOCH_START: number;
    let EPOCH_TIME: moment.Moment;
    let CURRENT_EPOCH: number = 0;
    let currentEpoch: moment.Moment;
    let nextEpoch: moment.Moment;
    let lastBalanceOfVault: number = 0;
    before(async () => {
        [
            deployer,
            treasuryWallet,
            dexWallet,
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
        const accounts = await ethers.getSigners();

        // Deploy USDC in real World
        // Impersonate USDC Account of Polygon Bridge and Transfer USDC to Owner
        await impersonateAccount(sUSD_BIG_HOLDER);
        const polygonBridge: SignerWithAddress = await ethers.getSigner(
            sUSD_BIG_HOLDER
        );
        await setBalance(sUSD_BIG_HOLDER, "0x56bc75e2d63100000");

        // Create Instance of USDC
        USDc = await ethers.getContractAt(sUSD_ABI, sUSD_ADDRESS);
        expect(USDc.address).to.be.properAddress;
        expect(USDc.address).to.be.equal(sUSD_ADDRESS);
        expect(await USDc.decimals()).to.be.equal(18);
        console.log("Deployer Address: ", deployer.address);
        console.log("OpenZeppelin Address: ", openZeppelinDefenderWallet.address);
        const initialBalance = await USDc.balanceOf(deployer.address);

        // Transfer USDC to Owner
        await expect(
            USDc.connect(polygonBridge).transfer(
                deployer.address,
                ethers.utils.parseEther("1500")
            )
        )
            .to.emit(USDc, "Transfer")
            .withArgs(
                sUSD_BIG_HOLDER,
                deployer.address,
                ethers.utils.parseEther("1500")
            );
        expect(await USDc.balanceOf(deployer.address)).to.be.equal(
            ethers.utils.parseEther("1500").add(initialBalance)
        );

        // eslint-disable-next-line no-unused-expressions
        expect(USDc.address).to.properAddress;
        console.log(`USDC Address: ${USDc.address}`);
        // Mint 100 K Stable coin to deployer, user1, user2, user3
        console.log("Deployer UDC Balance: ", (await USDc.balanceOf(deployer.address)).div(ethers.BigNumber.from(10).pow(18)).toString());
        await USDc.transfer(alice.address, ethers.utils.parseEther("250"));
        await USDc.transfer(bob.address, ethers.utils.parseEther("100"));
        await USDc.transfer(carla.address, ethers.utils.parseEther("30"));
        // Deploy Mockup Oracle
        OracleFactory = (await ethers.getContractFactory(
            "MockUpOracle",
            deployer
        )) as MockUpOracle__factory;
        // Deploy Oracle
        const Balance = await USDc.balanceOf(dexWallet.address);
        Oracle = (await OracleFactory.deploy(
            dexWallet.address,
            Balance
        )) as MockUpOracle;
        // eslint-disable-next-line no-unused-expressions
        expect(Oracle.address).to.properAddress;
        console.log(`Oracle Address: ${Oracle.address}`);
        // Deploy all Libraries of Calculum , with not upgradeable version
        ConstantsFactory = (await ethers.getContractFactory(
            "Constants",
            deployer
        )) as Constants__factory;
        Constants = (await ConstantsFactory.deploy()) as Constants;
        // eslint-disable-next-line no-unused-expressions
        expect(Constants.address).to.properAddress;
        console.log(`Constants Address: ${Constants.address}`);
        DataTypesFactory = (await ethers.getContractFactory(
            "DataTypes",
            deployer
        )) as DataTypes__factory;
        DataTypes = (await DataTypesFactory.deploy()) as DataTypes;
        // eslint-disable-next-line no-unused-expressions
        expect(DataTypes.address).to.properAddress;
        console.log(`DataTypes Address: ${DataTypes.address}`);
        ErrorsFactory = (await ethers.getContractFactory(
            "Errors",
            deployer
        )) as Errors__factory;
        Errors = (await ErrorsFactory.deploy()) as Errors;
        // eslint-disable-next-line no-unused-expressions
        expect(Errors.address).to.properAddress;
        console.log(`Errors Address: ${Errors.address}`);
        FullMathFactory = (await ethers.getContractFactory(
            "FullMath",
            deployer
        )) as FullMath__factory;
        FullMath = (await FullMathFactory.deploy()) as FullMath;
        // eslint-disable-next-line no-unused-expressions
        expect(FullMath.address).to.properAddress;
        console.log(`FullMath Address: ${FullMath.address}`);
        TickMathFactory = (await ethers.getContractFactory(
            "TickMath",
            deployer
        )) as TickMath__factory;
        TickMath = (await TickMathFactory.deploy()) as TickMath;
        // eslint-disable-next-line no-unused-expressions
        expect(TickMath.address).to.properAddress;
        console.log(`TickMath Address: ${TickMath.address}`);
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
        // Allowance the Contract in Stable Coin
        await USDc.connect(deployer).approve(Calculum.address, ethers.utils.parseEther("800"));
        await USDc.connect(alice).approve(Calculum.address, ethers.utils.parseEther("250"));
        await USDc.connect(bob).approve(Calculum.address, ethers.utils.parseEther("100"));
        await USDc.connect(carla).approve(Calculum.address, ethers.utils.parseEther("30"));
        await USDc.connect(openZeppelinDefenderWallet).approve(
            Calculum.address,
            ethers.utils.parseEther("2000")
        );
        await USDc.connect(openZeppelinDefenderWallet).approve(
            UNISWAP_ROUTER2,
            ethers.utils.parseEther("2000")
        );
        await USDc.connect(dexWallet).approve(
            Calculum.address,
            ethers.utils.parseEther("2000")
        );
        // Add deployer, alice, bob and carla wallet in the whitelist
        await Calculum.connect(deployer).addDropWhitelist(deployer.address, true);
        await Calculum.connect(deployer).addDropWhitelist(alice.address, true);
        await Calculum.connect(deployer).addDropWhitelist(bob.address, true);
        await Calculum.connect(deployer).addDropWhitelist(carla.address, true);
        // Mint 200 USDc to the Transfer Bot Role  Wallet
        const requiredBalance = ethers.utils.parseEther("50");
        const currentBalance = await USDc.balanceOf(openZeppelinDefenderWallet.address);

        if (currentBalance.lt(requiredBalance)) {
            const amountToTransfer = requiredBalance.sub(currentBalance);

            await USDc.connect(deployer).transfer(openZeppelinDefenderWallet.address, amountToTransfer);
        }

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
        expect(await Calculum.asset()).to.equal(USDc.address);
        // Verify Treasury Address
        expect(await Calculum.treasuryWallet()).to.equal(treasuryWallet.address);
        // Verify Oracle Address
        expect(await Calculum.oracle()).to.equal(Oracle.address);
        // Verify Initial Value of Percentage Maintenance Fee
        expect(await Calculum.MANAGEMENT_FEE_PERCENTAGE()).to.equal(
            ethers.utils.parseEther("0.01")
        );
        // Verify Initial Value of Percentage Performance Fee
        expect(await Calculum.PERFORMANCE_FEE_PERCENTAGE()).to.equal(
            ethers.utils.parseEther("0.15")
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
        expect(await Calculum.router()).to.equal(UNISWAP_ROUTER2);
        // Verify Balance of ERC20 USDc of the Contract Vault
        expect(await USDc.balanceOf(openZeppelinDefenderWallet.address)).to.equal(
            ethers.utils.parseEther("50")
        );
        // Verify Balance in USDc of alice
        expect(await USDc.balanceOf(alice.address)).to.equal(ethers.utils.parseEther("250"));
        // Verify Balance in USDc of bob
        expect(await USDc.balanceOf(bob.address)).to.equal(ethers.utils.parseEther("100"));
        // Verify Balance in USDc of carla
        expect(await USDc.balanceOf(carla.address)).to.equal(ethers.utils.parseEther("30"));
        // Transfer 0.5 ETh from deployer to Contract Vault Address
        await openZeppelinDefenderWallet.sendTransaction({
            to: deployer.address,
            value: (
                await openZeppelinDefenderWallet.getBalance()
            ).sub(ethers.utils.parseEther("0.20")),
        });
        // Verify Balance of 0.5 ETH in ethereum of Contract Vault
        expect(
            await ethers.provider.getBalance(openZeppelinDefenderWallet.address)
        ).to.lessThanOrEqual(ethers.utils.parseEther("0.20"));
        // Verifi is DexWallet is a Delegate in Kwenta Dex
        expect(await Calculum.isDelegate(dexWallet.address)).to.equal(true);
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
        delegateAddress = dexWallet;
        dexWallet = await ethers.getSigner(await Calculum.dexWallet());
        await Oracle.setWallet(dexWallet.address);
        console.log("Dex Wallet Address After:", dexWallet.address);
        console.log("Balance of Vault + Future Refund SM Account: ", (await USDc.balanceOf(Calculum.address)).div(ethers.BigNumber.from(10).pow(18)).toString());
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
            (await Calculum.EPOCH_START()).add(
                (await Calculum.EPOCH_DURATION()).mul(0)
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
            Calculum.connect(alice).deposit(ethers.utils.parseEther("251"), alice.address)
        )
            .to.revertedWithCustomError(Calculum, "DepositExceededMax")
            .withArgs(alice.address, MAX_DEPOSIT);
        // Verify the minimal setting of deposit
        await expect(
            Calculum.connect(alice).deposit(ethers.utils.parseEther("29"), alice.address)
        )
            .to.revertedWithCustomError(Calculum, "DepositAmountTooLow")
            .withArgs(alice.address, ethers.utils.parseEther("29"));
        // Alice Introduces the Asset to the Vault
        const balanceAliceBefore =
            (await USDc.balanceOf(alice.address)).div(ethers.BigNumber.from(10).pow(18)).toString();
        console.log(
            "Balance of Alice Before to Deposit in the Vault: ",
            balanceAliceBefore
        );
        // Verify deposits status of alice
        let depositsAlice = await Calculum.DEPOSITS(alice.address);
        expect(depositsAlice.status).to.equal(0);
        // Validate all Event Fire after Alice Deposit in the Vault
        expect(
            await Calculum.connect(alice).deposit(ethers.utils.parseEther("150"), alice.address)
        )
            .to.emit(Calculum, "PendingDeposit")
            .withArgs(
                alice.address,
                alice.address,
                ethers.utils.parseEther("150"),
                ethers.utils.parseEther("150")
            )
            .to.emit(USDc, "Transfer")
            .withArgs(alice.address, Calculum.address, ethers.utils.parseEther("150"));
        console.log(`Alice deposits 150 tokens of sUSD`);
        // update alice deposits
        depositsAlice = await Calculum.DEPOSITS(alice.address);
        // Validate Deposit in the Vault
        expect(depositsAlice.status).to.equal(1);
        expect(depositsAlice.amountAssets).to.equal(
            ethers.utils.parseEther("150")
        );
        expect(depositsAlice.amountShares).to.equal(
            ethers.utils.parseEther("150")
        );
        expect(depositsAlice.finalAmount).to.equal(0);
        const balanceAliceVault =
            parseInt((await Calculum.balanceOf(alice.address)).toString()) / 10 ** 18;
        console.log("Verify of Balance of Alice in the Vault: ", balanceAliceVault);
        // Verify Alice don;t have any Vault token in your wallet
        expect(balanceAliceVault).to.equal(0);
        const balanceAliceAfter =
            (await USDc.balanceOf(alice.address)).div(ethers.BigNumber.from(10).pow(18)).toString();
        console.log(
            "Balance of Alice After to Deposit in the Vault: ",
            balanceAliceAfter
        );
        // Validate the Amount transferred from Alice to the Vault
        expect(balanceAliceBefore - balanceAliceAfter).to.equal(150);
        // Validate actual balance of ETH in the Calculum contract
        const balanceETH = (await ethers.provider.getBalance(Calculum.address)).div(ethers.BigNumber.from(10).pow(18))

        expect(balanceETH).to.equal(0);
        // Validate actual balance of USDc in the Calculum contract (Minimal more deposit of Alice)
        const balanceUSDc: BigNumber =
            (await USDc.balanceOf(Calculum.address)).div(ethers.BigNumber.from(10).pow(18));
        expect(balanceUSDc).to.equal(150);
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
            ethers.utils.parseEther("150")
        );
        expect(depositsAlice.finalAmount).to.equal(
            ethers.utils.parseEther("150")
        );
        // Getting netTransfer Object
        const netTransfer: any = await Calculum.netTransfer(
            await Calculum.CURRENT_EPOCH()
        );
        expect(netTransfer.pending).to.be.true;
        expect(netTransfer.direction).to.be.true;
        const netTransferAmount = netTransfer.amount;
        expect(netTransferAmount.div(ethers.BigNumber.from(10).pow(18))).to.equal(150);
        console.log("Vault Token Price: ", (await Calculum.VAULT_TOKEN_PRICE(await Calculum.CURRENT_EPOCH())).div(ethers.BigNumber.from(10).pow(18)).toString());
        expect((await Calculum.VAULT_TOKEN_PRICE(await Calculum.CURRENT_EPOCH())).div(ethers.BigNumber.from(10).pow(18))).to.equal(1);
        // Call dexTransfer to transfer the amount of USDc to the Vault
        await expect(Calculum.connect(openZeppelinDefenderWallet).dexTransfer())
            .to.emit(USDc, "Transfer")
            .withArgs(Calculum.address, dexWallet.address, ethers.utils.parseEther("150"))
            .to.emit(Calculum, "DexTransfer")
            .withArgs(await Calculum.CURRENT_EPOCH(), ethers.utils.parseEther("150"));
        console.log(
            "Transfer USDc from the Vault Successfully,to Dex Wallet, Dex Transfer: ",
            netTransfer.amount.div(ethers.BigNumber.from(10).pow(18)).toString()
        );
        // Verify Dex Wallet Balance
        const DexWalletBalance = (await USDc.balanceOf(dexWallet.address));
        expect(
            DexWalletBalance.div(ethers.BigNumber.from(10).pow(18))
        ).to.equal(150);
        // Verify the Transfer Bot Gas Reserve in USD is Zero
        expect(
            (await Utils.CalculateTransferBotGasReserveDA(Calculum.address, USDc.address))
        ).to.equal(0);
        const feeKept = (await Utils.CalculateTransferBotGasReserveDA(Calculum.address, USDc.address));
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
        const DexWalletBeginningBalance = (await Oracle.connect(dexWallet).GetAccount(dexWallet.address));
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance Beginning : ", ethers.BigNumber.from(DexWalletBeginningBalance).div(ethers.BigNumber.from(10).pow(18)).toString());
        console.log('\x1b[32m%s\x1b[0m', "(+/-) Strategy(ies) P/L : -2.5% -", 0);
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance EoP before Fees : ", DexWalletBalance.div(ethers.BigNumber.from(10).pow(18)).toString());
        console.log('\x1b[32m%s\x1b[0m', "Management Fee per Vault Token: ", parseInt((await Utils.MgtFeePerVaultToken(Calculum.address)).div(ethers.BigNumber.from(10).pow(12)).toString()) / 10 ** 6);
        console.log('\x1b[32m%s\x1b[0m', "Performance Fee per Vault Token: ", parseInt((await Utils.PerfFeePerVaultToken(Calculum.address, USDc.address)).div(ethers.BigNumber.from(10).pow(12)).toString()) / 10 ** 6);
        console.log('\x1b[32m%s\x1b[0m', "Fees kept in TransferBot Wallet as gas reserves: ", parseInt(feeKept.div(ethers.BigNumber.from(10).pow(15)).toString()) / 1000);
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance EoP after Fees :", DexWalletBalance.sub(feeKept).div(ethers.BigNumber.from(10).pow(18)).toString());
        console.log('\x1b[32m%s\x1b[0m', "Deposit (Mint New Wallet): ", newDeposits.div(ethers.BigNumber.from(10).pow(18)).toString());
        console.log('\x1b[32m%s\x1b[0m', "Withdrawal (Burn Wallet): ", newWithdrawalsShares.div(ethers.BigNumber.from(10).pow(18)).toString());
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance End Period: ", parseInt(DexWalletBeginningBalance.add(newDeposits).sub(newWithdrawalsShares).sub(feeKept).div(ethers.BigNumber.from(10).pow(16)).toString()) / 100)
        console.log('\x1b[32m%s\x1b[0m', "Treasury Balance : ", (await USDc.balanceOf(treasuryWallet.address)).div(ethers.BigNumber.from(10).pow(18)).toString());
        console.log('\x1b[32m%s\x1b[0m', "Vault Token Price: ", parseInt((await Calculum.VAULT_TOKEN_PRICE(await Calculum.CURRENT_EPOCH())).div(ethers.BigNumber.from(10).pow(12)).toString()) / 10 ** 6);
        console.log('\x1b[32m%s\x1b[0m', "Net Transfer Amount: ", parseInt(netTransferAmount.div(ethers.BigNumber.from(10).pow(15)).toString()) / 1000);

        // Validate the Transfer of USDc to TraderBotWallet
        expect(
            (await USDc.balanceOf(dexWallet.address)).div(ethers.BigNumber.from(10).pow(18))
        ).to.equal(150);
        console.log("Balance USDc of Dex Wallet: ", (await USDc.balanceOf(dexWallet.address)).div(ethers.BigNumber.from(10).pow(18)).toString());
        console.log("Preview to Modify the Account Margin of Dex Wallet, specifically deposit 15K USDc")
        // Validate the USDc into the Vautl (the minimal amount of Vault)
        expect(await USDc.balanceOf(openZeppelinDefenderWallet.address)).to.equal(
            ethers.utils.parseEther("50")
        );
        console.log("Balance USDc of Open Zeppellin Wallet: ", parseInt((await USDc.balanceOf(openZeppelinDefenderWallet.address)).div(ethers.BigNumber.from(10).pow(16)).toString()) / 100);
        // Validate the ETH into the Vautl (the minimal amount of Vault)
        expect(
            (await ethers.provider.getBalance(Calculum.address)).div(ethers.BigNumber.from(10).pow(18))
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
            (await Calculum.EPOCH_START()).add(
                (await Calculum.EPOCH_DURATION()).mul(1)
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
        ).to.equal(ethers.utils.parseEther("150"));
        expect(
            (await Calculum.DEPOSITS(alice.address)).amountShares.div(ethers.BigNumber.from(10).pow(18))
        ).to.equal(
            ethers.utils.parseEther("150").div(ethers.BigNumber.from(10).pow(18))
        );
        // Alice try to Claim your Vault tokens  (Shares)
        await expect(Calculum.connect(alice).claimShares(alice.address))
            .to.emit(Calculum, "Transfer")
            .withArgs(ZERO_ADDRESS, alice.address, ethers.utils.parseEther("150"))
            .to.emit(Calculum, "Deposit")
            .withArgs(
                alice.address,
                alice.address,
                ethers.utils.parseEther("150"),
                ethers.utils.parseEther("150")
            );
        console.log("Alice Claimed her Shares Successfully");
        // Verify all Storage Correctly in the Smart Contract
        expect(await Calculum.balanceOf(alice.address)).to.equal(
            ethers.utils.parseEther("150")
        );
        expect(
            (await Calculum.DEPOSITS(alice.address)).finalAmount
        ).to.equal(ethers.utils.parseEther("150"));
        expect(
            (await Calculum.DEPOSITS(alice.address)).amountShares
        ).to.equal(0);
        expect((await Calculum.DEPOSITS(alice.address)).status).to.equal(3);
        expect(
            (await Calculum.DEPOSITS(alice.address)).amountAssets
        ).to.equal(0);
        expect(await Calculum.balanceOf(alice.address)).to.equal(
            ethers.utils.parseEther("150")
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
        await Oracle.connect(deployer).setAssetValue(ethers.utils.parseEther("146.25"));
        console.log("Set Value of Assets in the Oracle: ", ethers.utils.parseEther("146.25").div(ethers.BigNumber.from(10).pow(18)).toString());
        // sub
        const sub = ethers.utils.parseEther("150").sub(ethers.utils.parseEther("146.25"))
        // Adjust Balance of Dex Wallet to Real Value
        await Calculum.connect(deployer).modifyAcctMargin(sub.mul(-1));
        // TODO: need to fix the smart contract of the vault, to handle the transfer to the dex wallet (deposit or withdraw)
        console.log("Adjust Balance of Dex Wallet to Real Value: ", parseInt(sub.div(ethers.BigNumber.from(10).pow(13)).toString()) / 100000);
        expect((await USDc.balanceOf(dexWallet.address)).div(ethers.BigNumber.from(10).pow(15))).to.equal(146250);
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
        expect(netTransferAmount.div(ethers.BigNumber.from(10).pow(10))).to.equal(2874804);
        console.log("Vault Token Price: ", parseInt((await Calculum.VAULT_TOKEN_PRICE(await Calculum.CURRENT_EPOCH())).div(ethers.BigNumber.from(10).pow(12)).toString()) / 10 ** 8);
        expect((await Calculum.VAULT_TOKEN_PRICE(await Calculum.CURRENT_EPOCH())).div(ethers.BigNumber.from(10).pow(12))).to.equal(974808);
        // Call dexTransfer to transfer the amount of USDc to the Vault
        await expect(Calculum.connect(openZeppelinDefenderWallet).dexTransfer())
            .to.emit(USDc, "Transfer")
            .withArgs(
                dexWallet.address,
                Calculum.address,
                netTransfer.amount
            )
            // .to.emit(USDc, "Transfer")
            // .withArgs(
            //     Calculum.address,
            //     openZeppelinDefenderWallet.address,
            //     netTransfer.amount
            // )
            .to.emit(Calculum, "DexTransfer")
            .withArgs(
                await Calculum.CURRENT_EPOCH(),
                netTransfer.amount
            );
        // Validate Last Balance of Vault in USDc, comparring with value in the Excel Spread Sheet
        lastBalanceOfVault += parseInt((await USDc.balanceOf(Calculum.address)).div(ethers.BigNumber.from(10).pow(18)).toString());
        console.log(
            "Last Balance of Vault in USDc: ",
            (await USDc.balanceOf(Calculum.address)).div(ethers.BigNumber.from(10).pow(18)).toString()
        );
        console.log(
            "Transfer USDc from Dex Wallet to the Vault Successfully,Dex Transfer: ",
            parseInt(netTransfer.amount.div(ethers.BigNumber.from(10).pow(15)).toString()) / 1000
        );
        // Verify the Transfer Bot Gas Reserve in USD is Zero
        const feeKept = await Utils.CalculateTransferBotGasReserveDA(Calculum.address, USDc.address);
        expect(feeKept).to.equal(0);
        // Call FeeTransfer to transfer the amount of USDc to the Fee Address
        await expect(Calculum.connect(openZeppelinDefenderWallet).feesTransfer())
            .to.emit(Calculum, "FeesTransfer")
            .withArgs(await Calculum.CURRENT_EPOCH(), ethers.utils.parseUnits("28748047259102400", "wei"));
        // Verify Dex Wallet Balance
        const DexWalletBalance = (await USDc.balanceOf(dexWallet.address));
        expect(
            parseInt(DexWalletBalance.div(ethers.BigNumber.from(10).pow(14)).toString())
        ).to.equal(1462212);
        // Start summarize the Epoch
        console.log('\x1b[32m%s\x1b[0m', 'Start Summarize the Epoch');
        console.log('\x1b[32m%s\x1b[0m', "Epoch Number: ", (await Calculum.CURRENT_EPOCH()).toString());
        const DexWalletBeginningBalance: BigNumber = (await Oracle.connect(dexWallet).GetAccount(dexWallet.address));
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance Beginning : ", ethers.BigNumber.from(DexWalletBeginningBalance).div(ethers.BigNumber.from(10).pow(18)).toString());
        console.log('\x1b[32m%s\x1b[0m', "(+/-) Strategy(ies) P/L : -2.5% -", parseInt(sub.div(ethers.BigNumber.from(10).pow(16)).toString()) / 100);
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance EoP before Fees : ", ethers.BigNumber.from((150000 - 3750)).toString());
        console.log('\x1b[32m%s\x1b[0m', "Management Fee per Vault Token: ", parseInt((await Utils.MgtFeePerVaultToken(Calculum.address)).div(ethers.BigNumber.from(10).pow(12)).toString()) / 10 ** 6);
        console.log('\x1b[32m%s\x1b[0m', "Performance Fee per Vault Token: ", parseInt((await Utils.PerfFeePerVaultToken(Calculum.address, USDc.address)).div(ethers.BigNumber.from(10).pow(12)).toString()) / 10 ** 6);
        console.log('\x1b[32m%s\x1b[0m', "Fees kept in TransferBot Wallet as gas reserves: ", parseInt(feeKept.div(ethers.BigNumber.from(10).pow(15)).toString()) / 1000);
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance EoP after Fees :", DexWalletBalance.sub(feeKept).div(ethers.BigNumber.from(10).pow(18)).toString());
        console.log('\x1b[32m%s\x1b[0m', "Deposit (Mint New Wallet): ", newDeposits.div(ethers.BigNumber.from(10).pow(18)).toString());
        console.log('\x1b[32m%s\x1b[0m', "Withdrawal (Burn Wallet): ", newWithdrawalsShares.div(ethers.BigNumber.from(10).pow(18)).toString());
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance End Period: ", parseInt(DexWalletBeginningBalance.add(newDeposits).sub(newWithdrawalsShares).sub(feeKept).div(ethers.BigNumber.from(10).pow(16)).toString()) / 100)
        console.log('\x1b[32m%s\x1b[0m', "Treasury Balance : ", (await USDc.balanceOf(treasuryWallet.address)).div(ethers.BigNumber.from(10).pow(18)).toString());
        console.log('\x1b[32m%s\x1b[0m', "Vault Token Price: ", parseInt((await Calculum.VAULT_TOKEN_PRICE(await Calculum.CURRENT_EPOCH())).div(ethers.BigNumber.from(10).pow(12)).toString()) / 10 ** 6);
        console.log('\x1b[32m%s\x1b[0m', "Net Transfer Amount: ", parseInt(netTransferAmount.div(ethers.BigNumber.from(10).pow(15)).toString()) / 1000);
        // Verify the Balance of USDc of Transfer Bot in the Wallet
        expect(
            parseInt((await USDc.balanceOf(dexWallet.address)).div(ethers.BigNumber.from(10).pow(14)).toString())
        ).to.equal(1462212);
        console.log("Balance USDc of Dex Wallet: ", parseInt((await USDc.balanceOf(dexWallet.address)).div(ethers.BigNumber.from(10).pow(17)).toString()) / 10);
        // Validate the USDc into the Vautl (the minimal amount of Vault)
        expect(
            parseInt((await USDc.balanceOf(openZeppelinDefenderWallet.address)).div(ethers.BigNumber.from(10).pow(14)).toString())
        ).to.equal(500000);
        console.log("Balance USDc of Open Zeppellin Wallet: ", parseInt((await USDc.balanceOf(openZeppelinDefenderWallet.address)).div(ethers.BigNumber.from(10).pow(16)).toString()) / 100);
        // Verify the Balance of USDc of treasury in the Vault
        expect(
            (await USDc.balanceOf(treasuryWallet.address)).toString()
        ).to.equal(ethers.utils.parseUnits("28748047259102400", "wei"));
        console.log(
            "Transfer USDc to the Treasury Successfully,Fees Transfer: ",
            ethers.utils.parseUnits("28748047259102400", "wei").toString(), "wei"
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
        await expect(Calculum.connect(bob).deposit(ethers.utils.parseEther("1000"), bob.address))
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
            (await Calculum.EPOCH_START()).add(
                (await Calculum.EPOCH_DURATION()).mul(2)
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
        await expect(Calculum.connect(bob).deposit(ethers.utils.parseEther("50"), bob.address))
            .to.emit(USDc, "Transfer")
            .withArgs(bob.address, Calculum.address, ethers.utils.parseEther("50"))
            .to.emit(Calculum, "PendingDeposit")
            .withArgs(
                bob.address,
                bob.address,
                ethers.utils.parseEther("50"),
                ethers.utils.parseUnits("51293392310187487795", "wei")
            );
        // Verify the Balance of USDc of Bob in the Vault
        expect((await USDc.balanceOf(bob.address)).toString()).to.equal(
            ethers.utils.parseEther("50").toString()
        );
        // Verify the Balance of USDc of Calculum in the Vault
        lastBalanceOfVault += 50;
        expect(
            parseInt((await USDc.balanceOf(Calculum.address)).div(ethers.BigNumber.from(10).pow(18)).toString())
        ).to.equal(lastBalanceOfVault);
        // Verify the status of Bob in DEPOSITS after deposit
        expect((await Calculum.DEPOSITS(bob.address)).status).to.equal(1);
        // Verify the amount of assets of Bob in DEPOSITS after deposit
        expect((await Calculum.DEPOSITS(bob.address)).amountAssets).to.equal(
            ethers.utils.parseEther("50")
        );
        // Verify the amount of shares of Bob in DEPOSITS after deposit
        expect(
            (await Calculum.DEPOSITS(bob.address)).amountShares.toString()
        ).to.equal(
            ethers.utils.parseUnits("51293392310187487795", "wei").toString()
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
        await Oracle.connect(deployer).setAssetValue(ethers.utils.parseEther("143.2968"));
        console.log("Set Value of Assets in the Oracle: ", parseInt(ethers.utils.parseEther("143.2968").div(ethers.BigNumber.from(10).pow(17)).toString()) / 10);
        // sub
        const sub = ethers.utils.parseEther("146.2212").sub(ethers.utils.parseEther("143.2968"))
        // Adjust Balance of Dex Wallet to Real Value
        await Calculum.connect(deployer).modifyAcctMargin(sub.mul(-1));
        // TODO: need to fix the smart contract of the vault, to handle the transfer to the dex wallet (deposit or withdraw)
        console.log("Adjust Balance of Dex Wallet to Real Value: ", parseInt(sub.div(ethers.BigNumber.from(10).pow(17)).toString()) / 10);
        expect((await USDc.balanceOf(dexWallet.address)).div(ethers.BigNumber.from(10).pow(17))).to.equal(1432);
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
        expect(parseInt(netTransferAmount.div(ethers.BigNumber.from(10).pow(16)).toString()) / 100).to.equal(
            4997 / 100
        );
        console.log("Vault Token Price: ", (await Calculum.VAULT_TOKEN_PRICE(await Calculum.CURRENT_EPOCH())).div(ethers.BigNumber.from(10).pow(12)).toString());
        expect((await Calculum.VAULT_TOKEN_PRICE(await Calculum.CURRENT_EPOCH())).div(ethers.BigNumber.from(10).pow(12))).to.equal(955125);
        // Call dexTransfer to transfer the amount of USDc to the Vault
        await expect(Calculum.connect(openZeppelinDefenderWallet).dexTransfer())
            .to.emit(USDc, "Transfer")
            .withArgs(
                Calculum.address,
                dexWallet.address,
                netTransfer.amount
            )
            // .to.emit(USDc, "Transfer")
            // .withArgs(
            //     Calculum.address,
            //     openZeppelinDefenderWallet.address,
            //     await Utils.CalculateTransferBotGasReserveDA(Calculum.address, USDc.address)
            // )
            .to.emit(Calculum, "DexTransfer")
            .withArgs(
                await Calculum.CURRENT_EPOCH(),
                netTransfer.amount
            );
        console.log(
            "Transfer USDc from the Vault to Dex Wallet Successfully,Dex Transfer: ",
            parseInt(netTransfer.amount.div(ethers.BigNumber.from(10).pow(16)).toString()) / 100
        );
        // Verify the Transfer Bot Gas Reserve in USD is Zero
        const feeKept = await Utils.CalculateTransferBotGasReserveDA(Calculum.address, USDc.address);
        expect(feeKept).to.equal(0);
        // Call FeeTransfer to transfer the amount of USDc to the Fee Address
        await expect(Calculum.connect(openZeppelinDefenderWallet).feesTransfer())
            .to.emit(Calculum, "FeesTransfer")
            .withArgs(await Calculum.CURRENT_EPOCH(), ethers.utils.parseUnits("28023836409483450", "wei"));
        // Verify Dex Wallet Balance
        const DexWalletBalance = (await USDc.balanceOf(dexWallet.address));
        expect(
            parseInt(DexWalletBalance.div(ethers.BigNumber.from(10).pow(14)).toString()) / 10
        ).to.equal(1932688 / 10);
        // Start summarize the Epoch
        console.log('\x1b[32m%s\x1b[0m', 'Start Summarize the Epoch');
        console.log('\x1b[32m%s\x1b[0m', "Epoch Number: ", (await Calculum.CURRENT_EPOCH()).toString());
        const DexWalletBeginningBalance: BigNumber = (await Oracle.connect(dexWallet).GetAccount(dexWallet.address));
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance Beginning : ", ethers.BigNumber.from(DexWalletBeginningBalance).div(ethers.BigNumber.from(10).pow(18)).toString());
        console.log('\x1b[32m%s\x1b[0m', "(+/-) Strategy(ies) P/L : -2.0% -", parseInt(sub.div(ethers.BigNumber.from(10).pow(16)).toString()) / 100);
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance EoP before Fees : ", DexWalletBalance.div(ethers.BigNumber.from(10).pow(18)).toString());
        console.log('\x1b[32m%s\x1b[0m', "Management Fee per Vault Token: ", parseInt((await Utils.MgtFeePerVaultToken(Calculum.address)).div(ethers.BigNumber.from(10).pow(12)).toString()) / 10 ** 6);
        console.log('\x1b[32m%s\x1b[0m', "Performance Fee per Vault Token: ", parseInt((await Utils.PerfFeePerVaultToken(Calculum.address, USDc.address)).div(ethers.BigNumber.from(10).pow(12)).toString()) / 10 ** 6);
        console.log('\x1b[32m%s\x1b[0m', "Fees kept in TransferBot Wallet as gas reserves: ", parseInt(feeKept.div(ethers.BigNumber.from(10).pow(15)).toString()) / 1000);
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance EoP after Fees :", DexWalletBalance.sub(feeKept).div(ethers.BigNumber.from(10).pow(18)).toString());
        console.log('\x1b[32m%s\x1b[0m', "Deposit (Mint New Wallet): ", newDeposits.div(ethers.BigNumber.from(10).pow(18)).toString());
        console.log('\x1b[32m%s\x1b[0m', "Withdrawal (Burn Wallet): ", newWithdrawalsShares.div(ethers.BigNumber.from(10).pow(18)).toString());
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance End Period: ", parseInt(DexWalletBeginningBalance.add(newDeposits).sub(newWithdrawalsShares).sub(feeKept).div(ethers.BigNumber.from(10).pow(16)).toString()) / 100)
        console.log('\x1b[32m%s\x1b[0m', "Treasury Balance : ", (await USDc.balanceOf(treasuryWallet.address)).div(ethers.BigNumber.from(10).pow(18)).toString());
        console.log('\x1b[32m%s\x1b[0m', "Vault Token Price: ", parseInt((await Calculum.VAULT_TOKEN_PRICE(await Calculum.CURRENT_EPOCH())).div(ethers.BigNumber.from(10).pow(12)).toString()) / 10 ** 6);
        console.log('\x1b[32m%s\x1b[0m', "Net Transfer Amount: ", parseInt(netTransferAmount.div(ethers.BigNumber.from(10).pow(15)).toString()) / 1000);
        // The Amount of USDc in the Dex Wallet is 1500000 USDc minus the last fee
        expect(
            parseInt((await USDc.balanceOf(dexWallet.address)).div(ethers.BigNumber.from(10).pow(13)).toString()) / 100
        ).to.equal(19326882 / 100);
        console.log("Balance USDc of Dex Wallet: ", parseInt((await USDc.balanceOf(dexWallet.address)).div(ethers.BigNumber.from(10).pow(16)).toString()) / 100);
        // Verify the Balance of USDc of treasury in the Vault
        expect(
            (await USDc.balanceOf(treasuryWallet.address)).toString()
        ).to.equal(ethers.utils.parseUnits("56771883668585850", "wei").toString());
        console.log(
            "Transfer USDc to the Treasury Successfully,Fees Transfer: ",
            ethers.utils.parseUnits("56771883668585850", "wei").toString(), "wei"
        );
        // Validate Last Balance of TransferBot Role Wallet in USDc, comparring with value in the Excel Spread Sheet
        expect(
            parseInt((await USDc.balanceOf(openZeppelinDefenderWallet.address)).div(ethers.BigNumber.from(10).pow(13)).toString()) / 100
        ).to.equal(50000);
        console.log("Balance USDc of Open Zeppellin Wallet: ", parseInt((await USDc.balanceOf(openZeppelinDefenderWallet.address)).div(ethers.BigNumber.from(10).pow(16)).toString()) / 100);
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
            Calculum.connect(alice).deposit(ethers.utils.parseEther("100000"), alice.address)
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
            (await Calculum.EPOCH_START()).add(
                (await Calculum.EPOCH_DURATION()).mul(3)
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
            ethers.utils.parseEther("150")
        );
        console.log(
            "Amount of Share before to new Deposit: ",
            (await Calculum.DEPOSITS(alice.address)).amountShares.toString()

        );
        // Verify status of bob in DEPOSITS before claim his shares
        expect((await Calculum.DEPOSITS(bob.address)).status).to.equal(2); // 2 = Claimet
        expect((await Calculum.DEPOSITS(bob.address)).amountAssets).to.equal(0);
        expect((await Calculum.DEPOSITS(bob.address)).amountShares.toString()).to.equal(
            ethers.utils.parseUnits("52349159396993619639", "wei").toString()
        );
        expect((await Calculum.DEPOSITS(bob.address)).finalAmount).to.equal(
            ethers.utils.parseEther("50")
        );
        // Claim Shares from bob
        await expect(Calculum.connect(bob).claimShares(bob.address))
            .to.emit(Calculum, "Transfer")
            .withArgs(
                ZERO_ADDRESS,
                bob.address,
                ethers.utils.parseUnits("52349159396993619639", "wei")
            )
            .to.emit(Calculum, "Deposit")
            .withArgs(
                bob.address,
                bob.address,
                ethers.utils.parseEther("50"),
                ethers.utils.parseUnits("52349159396993619639", "wei")
            );
        // Verify status of bob in DEPOSITS after claim his shares
        expect((await Calculum.DEPOSITS(bob.address)).status).to.equal(3); // 3 = Completed
        expect((await Calculum.DEPOSITS(bob.address)).amountAssets).to.equal(0);
        expect((await Calculum.DEPOSITS(bob.address)).amountShares).to.equal(0);
        expect((await Calculum.DEPOSITS(bob.address)).finalAmount).to.equal(
            ethers.utils.parseEther("50")
        );
        expect((await Calculum.balanceOf(bob.address)).toString()).to.equal(
            ethers.utils.parseUnits("52349159396993619639", "wei").toString()
        );
        // Verify status of carla in DEPOSITS before deposit
        expect((await Calculum.DEPOSITS(carla.address)).status).to.equal(0); // 0 = Inactive
        // Add deposit to the Vault from alice
        await expect(
            Calculum.connect(alice).deposit(ethers.utils.parseEther("100"), alice.address)
        )
            .to.emit(USDc, "Transfer")
            .withArgs(alice.address, Calculum.address, ethers.utils.parseEther("100"))
            .to.emit(Calculum, "PendingDeposit")
            .withArgs(
                alice.address,
                alice.address,
                ethers.utils.parseEther("100"),
                ethers.utils.parseUnits("141246334865978045879", "wei")
            );
        // Add deposit to the Vault from carla
        await expect(
            Calculum.connect(carla).deposit(ethers.utils.parseEther("30"), carla.address)
        )
            .to.emit(USDc, "Transfer")
            .withArgs(carla.address, Calculum.address, ethers.utils.parseEther("30"))
            .to.emit(Calculum, "PendingDeposit")
            .withArgs(
                carla.address,
                carla.address,
                ethers.utils.parseEther("30"),
                ethers.utils.parseUnits("42373900459793413764", "wei")
            );
        // Verify status of alice in DEPOSITS after deposit
        expect((await Calculum.DEPOSITS(alice.address)).status).to.equal(1); // 1 = Pending
        expect((await Calculum.DEPOSITS(alice.address)).amountAssets).to.equal(
            ethers.utils.parseEther("100")
        );
        expect((await Calculum.DEPOSITS(alice.address)).amountShares).to.equal(
            ethers.utils.parseUnits("141246334865978045879", "wei")
        );
        expect((await Calculum.DEPOSITS(alice.address)).finalAmount).to.equal(
            ethers.utils.parseEther("150")
        );
        // Verify status of carla in DEPOSITS after deposit
        expect((await Calculum.DEPOSITS(carla.address)).status).to.equal(1); // 1 = Pending
        expect((await Calculum.DEPOSITS(carla.address)).amountAssets).to.equal(
            ethers.utils.parseEther("30")
        );
        expect((await Calculum.DEPOSITS(carla.address)).amountShares).to.equal(
            ethers.utils.parseUnits("42373900459793413764", "wei")
        );
        expect((await Calculum.DEPOSITS(carla.address)).finalAmount).to.equal(0); // Zero because is a new user
        console.log("Balance of Calculum in USDc After Deposit: ", parseInt((await USDc.balanceOf(Calculum.address)).div(ethers.BigNumber.from(10).pow(16)).toString()) / 100);
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
        await Oracle.connect(deployer).setAssetValue(ethers.utils.parseEther("200.99955"));
        console.log("Set Value of Assets in the Oracle: ", parseInt(ethers.utils.parseEther("200.99955").div(ethers.BigNumber.from(10).pow(17)).toString()) / 10);
        // sub
        const sub = ethers.utils.parseEther("200.99955").sub(ethers.utils.parseEther("193.26877"))
        // Adjust Balance of Dex Wallet to Real Value
        await Calculum.connect(deployer).modifyAcctMargin(sub.mul(1));
        // TODO: need to fix the smart contract of the vault, to handle the transfer to the dex wallet (deposit or withdraw)
        console.log("Adjust Balance of Dex Wallet to Real Value: ", parseInt(sub.div(ethers.BigNumber.from(10).pow(17)).toString()) / 10);
        expect((await USDc.balanceOf(dexWallet.address)).div(ethers.BigNumber.from(10).pow(13))).to.equal(20099960);
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
        expect(netTransferAmount.div(ethers.BigNumber.from(10).pow(14))).to.equal(1288033);
        console.log("Vault Token Price: ", (await Calculum.VAULT_TOKEN_PRICE(await Calculum.CURRENT_EPOCH())).div(ethers.BigNumber.from(10).pow(12)).toString());
        expect((await Calculum.VAULT_TOKEN_PRICE(await Calculum.CURRENT_EPOCH())).div(ethers.BigNumber.from(10).pow(12))).to.equal(987416);
        console.log("Net Transfer Amount:", parseInt(netTransferAmount.div(ethers.BigNumber.from(10).pow(17)).toString()) / 10)
        console.log("Balance of Calculum in USDc: ", parseInt((await USDc.balanceOf(Calculum.address)).div(ethers.BigNumber.from(10).pow(16)).toString()) / 100);
        console.log("Reserve of Gas: ", parseInt((await Utils.CalculateTransferBotGasReserveDA(Calculum.address, USDc.address)).div(ethers.BigNumber.from(10).pow(16)).toString()) / 100);
        // Verify the Transfer Bot Gas Reserve in USD is Zero
        const feeKept = await Utils.CalculateTransferBotGasReserveDA(Calculum.address, USDc.address);
        expect(feeKept).to.equal(0);
        // Verify Dex Wallet Balance
        // Call dexTransfer to transfer the amount of USDc to the Vault
        await expect(Calculum.connect(openZeppelinDefenderWallet).dexTransfer())
            .to.emit(USDc, "Transfer")
            .withArgs(
                Calculum.address,
                dexWallet.address,
                netTransfer.amount
            )
            .to.emit(Calculum, "DexTransfer")
            .withArgs(
                await Calculum.CURRENT_EPOCH(),
                netTransfer.amount
            );
        console.log(
            "Transfer USDc from the Vault to Dex Wallet Successfully,Dex Transfer: ",
            parseInt(netTransfer.amount.div(ethers.BigNumber.from(10).pow(16)).toString()) / 100
        );
        // Validate Last Balance of Vault in USDc, compare with value in the Excel Spread Sheet
        console.log(
            "Last Balance of Contract in USDc before Fees Transfer: ",
            parseInt((await USDc.balanceOf(Calculum.address)).div(ethers.BigNumber.from(10).pow(13)).toString()) / 100000
        );
        expect(
            (await USDc.balanceOf(Calculum.address)).toString()
        ).to.equal(ethers.utils.parseUnits("1196656741533821333", "wei"));
        // Call FeeTransfer to transfer the amount of USDc to the Fee Address
        await expect(Calculum.connect(openZeppelinDefenderWallet).feesTransfer())
            .to.emit(Calculum, "FeesTransfer")
            .withArgs(await Calculum.CURRENT_EPOCH(), ethers.utils.parseUnits("1196656741533821333", "wei"));
        // Verify Dex Wallet Balance
        const DexWalletBalance = (await USDc.balanceOf(dexWallet.address));
        expect(
            parseInt(DexWalletBalance.div(ethers.BigNumber.from(10).pow(14)).toString()) / 10
        ).to.equal(3298029 / 10);
        // Start summarize the Epoch
        console.log('\x1b[32m%s\x1b[0m', 'Start Summarize the Epoch');
        console.log('\x1b[32m%s\x1b[0m', "Epoch Number: ", (await Calculum.CURRENT_EPOCH()).toString());
        const DexWalletBeginningBalance: BigNumber = (await Oracle.connect(dexWallet).GetAccount(dexWallet.address));
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance Beginning : ", ethers.BigNumber.from(DexWalletBeginningBalance).div(ethers.BigNumber.from(10).pow(18)).toString());
        console.log('\x1b[32m%s\x1b[0m', "(+/-) Strategy(ies) P/L : 4% ", parseInt(sub.div(ethers.BigNumber.from(10).pow(16)).toString()) / 100);
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance EoP before Fees : ", DexWalletBalance.div(ethers.BigNumber.from(10).pow(18)).toString());
        console.log('\x1b[32m%s\x1b[0m', "Management Fee per Vault Token: ", parseInt((await Utils.MgtFeePerVaultToken(Calculum.address)).div(ethers.BigNumber.from(10).pow(12)).toString()) / 10 ** 6);
        console.log('\x1b[32m%s\x1b[0m', "Performance Fee per Vault Token: ", parseInt((await Utils.PerfFeePerVaultToken(Calculum.address, USDc.address)).div(ethers.BigNumber.from(10).pow(12)).toString()) / 10 ** 6);
        console.log('\x1b[32m%s\x1b[0m', "Fees kept in TransferBot Wallet as gas reserves: ", parseInt(feeKept.div(ethers.BigNumber.from(10).pow(15)).toString()) / 1000);
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance EoP after Fees :", DexWalletBalance.sub(feeKept).div(ethers.BigNumber.from(10).pow(18)).toString());
        console.log('\x1b[32m%s\x1b[0m', "Deposit (Mint New Wallet): ", newDeposits.div(ethers.BigNumber.from(10).pow(18)).toString());
        console.log('\x1b[32m%s\x1b[0m', "Withdrawal (Burn Wallet): ", newWithdrawalsShares.div(ethers.BigNumber.from(10).pow(18)).toString());
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance End Period: ", parseInt(DexWalletBeginningBalance.add(newDeposits).sub(newWithdrawalsShares).sub(feeKept).div(ethers.BigNumber.from(10).pow(16)).toString()) / 100)
        console.log('\x1b[32m%s\x1b[0m', "Treasury Balance : ", (await USDc.balanceOf(treasuryWallet.address)).div(ethers.BigNumber.from(10).pow(18)).toString());
        console.log('\x1b[32m%s\x1b[0m', "Vault Token Price: ", parseInt((await Calculum.VAULT_TOKEN_PRICE(await Calculum.CURRENT_EPOCH())).div(ethers.BigNumber.from(10).pow(12)).toString()) / 10 ** 6);
        console.log('\x1b[32m%s\x1b[0m', "Net Transfer Amount: ", parseInt(netTransferAmount.div(ethers.BigNumber.from(10).pow(15)).toString()) / 1000);
        // The Amount of USDc in the Dex Wallet is 1500000 USDc minus the last fee
        expect(
            parseInt((await USDc.balanceOf(dexWallet.address)).div(ethers.BigNumber.from(10).pow(13)).toString()) / 100
        ).to.equal(32980295 / 100);
        console.log("Balance USDc of Dex Wallet: ", parseInt((await USDc.balanceOf(dexWallet.address)).div(ethers.BigNumber.from(10).pow(16)).toString()) / 100);
        // Verify the Balance of USDc of treasury in the Vault
        expect(
            parseInt((await USDc.balanceOf(treasuryWallet.address)).div(ethers.BigNumber.from(10).pow(14)).toString()) /
            10000
        ).to.equal(12534 / 10000);
        console.log(
            "Transfer USDc to the Treasury Successfully,Fees Transfer: ",
            parseInt((await USDc.balanceOf(treasuryWallet.address)).div(ethers.BigNumber.from(10).pow(15)).toString()) /
            1000
        );
        // Validate Last Balance of TransferBot Role Wallet in USDc, comparring with value in the Excel Spread Sheet
        expect(
            (await USDc.balanceOf(openZeppelinDefenderWallet.address)).div(ethers.BigNumber.from(10).pow(18))
        ).to.equal(50);
        console.log("Balance USDc of Open Zeppellin Wallet: ", parseInt((await USDc.balanceOf(openZeppelinDefenderWallet.address)).div(ethers.BigNumber.from(10).pow(16)).toString()) / 100);
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
            Calculum.connect(alice).deposit(ethers.utils.parseEther("100000"), alice.address)
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
            (await Calculum.EPOCH_START()).add(
                (await Calculum.EPOCH_DURATION()).mul(4)
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
            ethers.utils.parseUnits("101274389022602178371", "wei")
        );
        expect((await Calculum.DEPOSITS(alice.address)).finalAmount).to.equal(
            ethers.utils.parseEther("250")
        );
        // Verify status of carla in DEPOSITS before claim her shares
        expect((await Calculum.DEPOSITS(carla.address)).status).to.equal(2); // 2 = Claimet
        expect((await Calculum.DEPOSITS(carla.address)).amountAssets).to.equal(0);
        expect((await Calculum.DEPOSITS(carla.address)).amountShares).to.equal(
            ethers.utils.parseUnits("30382316706780653512", "wei")
        );
        expect((await Calculum.DEPOSITS(carla.address)).finalAmount).to.equal(
            ethers.utils.parseEther("30")
        );
        // Claim Shares of Alice
        await expect(Calculum.connect(alice).claimShares(alice.address))
            .to.emit(Calculum, "Transfer")
            .withArgs(
                ZERO_ADDRESS,
                alice.address,
                ethers.utils.parseUnits("101274389022602178371", "wei")
            )
            .to.emit(Calculum, "Deposit")
            .withArgs(
                alice.address,
                alice.address,
                ethers.utils.parseEther("250"),
                ethers.utils.parseUnits("101274389022602178371", "wei")
            );
        // Claim Shares of Carla
        await expect(Calculum.connect(carla).claimShares(carla.address))
            .to.emit(Calculum, "Transfer")
            .withArgs(
                ZERO_ADDRESS,
                carla.address,
                ethers.utils.parseUnits("30382316706780653512", "wei")
            )
            .to.emit(Calculum, "Deposit")
            .withArgs(
                carla.address,
                carla.address,
                ethers.utils.parseEther("30"),
                ethers.utils.parseUnits("30382316706780653512", "wei")
            );
        // Verify status of alice in DEPOSITS after claim her shares
        expect((await Calculum.DEPOSITS(alice.address)).status).to.equal(3); // 3 = Completed
        expect((await Calculum.DEPOSITS(alice.address)).amountAssets).to.equal(0);
        expect((await Calculum.DEPOSITS(alice.address)).amountShares).to.equal(0);
        expect((await Calculum.DEPOSITS(alice.address)).finalAmount).to.equal(
            ethers.utils.parseEther("250")
        );
        expect((await Calculum.balanceOf(alice.address)).toString()).to.equal(
            ethers.utils.parseUnits("251274389022602178371", "wei").toString()
        );
        // Verify status of carla in DEPOSITS after claim her shares
        expect((await Calculum.DEPOSITS(carla.address)).status).to.equal(3); // 3 = Completed
        expect((await Calculum.DEPOSITS(carla.address)).amountAssets).to.equal(0);
        expect((await Calculum.DEPOSITS(carla.address)).amountShares).to.equal(0);
        expect((await Calculum.DEPOSITS(carla.address)).finalAmount).to.equal(
            ethers.utils.parseEther("30")
        );
        expect((await Calculum.balanceOf(carla.address)).toString()).to.equal(
            ethers.utils.parseUnits("30382316706780653512", "wei").toString()
        );
        // Try to Finalize the Epoch before the Finalization Time
        const time = Math.floor(
            (await ethers.provider.getBlock("latest")).timestamp
        );
        const asset: string = (await Calculum.asset()).toString();
        console.log("Address of ERC20 Asset: ", asset);
        const getPriceInPaymentToken = (
            await UniswapLibV3.getPriceInPaymentToken(asset, UNISWAP_ROUTER2)
        ).toString();
        console.log(
            "Value of getPriceInPaymentToken: ",
            parseInt(getPriceInPaymentToken) / 10 ** 18
        );
        const balancetransferBotRoleWallet = (
            await USDc.balanceOf(openZeppelinDefenderWallet.address)
        ).toString();
        console.log(
            "balancetransferBotRoleWallet: ",
            balancetransferBotRoleWallet / 10 ** 18
        );
        console.log(
            "Expected Amount: ",
            ((parseInt(balancetransferBotRoleWallet) / 10 ** 18) *
                parseInt(getPriceInPaymentToken)) /
            10 ** 18
        );
        await expect(Calculum.connect(openZeppelinDefenderWallet).finalizeEpoch())
            .to.revertedWithCustomError(Calculum, "VaultOutMaintenance");
        // Move before to Maintenance Windows Pre Start
        await network.provider.send("evm_setNextBlockTimestamp", [
            parseInt(move1.add(epochDuration - maintTimeBefore, "s").format("X")),
        ]);
        await network.provider.send("evm_mine", []);
        // Setting actual value of Assets
        await Oracle.connect(deployer).setAssetValue(ethers.utils.parseEther("494.70"));
        console.log("Set Value of Assets in the Oracle: ", parseInt(ethers.utils.parseEther("494.70").div(ethers.BigNumber.from(10).pow(17)).toString()) / 10);
        // sub
        const sub = ethers.utils.parseEther("494.70").sub(ethers.utils.parseEther("329.8028"))
        console.log("Substract: ", parseInt(sub.div(ethers.BigNumber.from(10).pow(16)).toString()) / 100);
        console.log("Balance of USDc of Deployer: ", parseInt((await USDc.balanceOf(deployer.address)).div(ethers.BigNumber.from(10).pow(16)).toString()) / 100);
        // Adjust Balance of Dex Wallet to Real Value
        await Calculum.connect(deployer).modifyAcctMargin(sub.mul(1));
        // TODO: need to fix the smart contract of the vault, to handle the transfer to the dex wallet (deposit or withdraw)
        console.log("Adjust Balance of Dex Wallet to Real Value: ", parseInt(sub.div(ethers.BigNumber.from(10).pow(14)).toString()) / 10000);
        expect((await USDc.balanceOf(dexWallet.address)).div(ethers.BigNumber.from(10).pow(16))).to.equal(49470);
        const newDeposits: BigNumber = (await Calculum.newDeposits());
        const newWithdrawalsShares: BigNumber = (await Calculum.newWithdrawals());
        // Try to hack Vault through the UniswapV3 Library
        // Finalize the Epoch
        await Calculum.connect(openZeppelinDefenderWallet).finalizeEpoch();
        console.log("Finalize the Fourth Epoch Successfully");
        // Verify the Balance of Transfer Bot Role Address in USDc
        expect(
            (await USDc.balanceOf(openZeppelinDefenderWallet.address)).toString()
        ).to.equal(ethers.utils.parseEther("50").toString());
        //** Verify the Balance of Transfer Bot Role Address in Eth is minor than 1 ETH **/
        expect(
            parseInt(
                (
                    await ethers.provider.getBalance(openZeppelinDefenderWallet.address)
                ).toString()
            )
        ).to.approximately(20 * 10 ** 16, 1 * 10 ** 17);
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
        expect(netTransferAmount.div(ethers.BigNumber.from(10).pow(15))).to.equal(24797);
        console.log("Vault Token Price: ", (await Calculum.VAULT_TOKEN_PRICE(await Calculum.CURRENT_EPOCH())).div(ethers.BigNumber.from(10).pow(12)).toString());
        expect((await Calculum.VAULT_TOKEN_PRICE(await Calculum.CURRENT_EPOCH())).div(ethers.BigNumber.from(10).pow(12))).to.equal(1406868);
        // Verify the Transfer Bot Gas Reserve in USD is Zero
        const feeKept = await Utils.CalculateTransferBotGasReserveDA(Calculum.address, USDc.address);
        expect(feeKept).to.equal(0);
        // Call dexTransfer to transfer the amount of USDc to the Vault
        await expect(Calculum.connect(openZeppelinDefenderWallet).dexTransfer())
            .to.emit(USDc, "Transfer")
            .withArgs(
                dexWallet.address,
                Calculum.address,
                netTransfer.amount
            )
            .to.emit(Calculum, "DexTransfer")
            .withArgs(
                await Calculum.CURRENT_EPOCH(),
                netTransfer.amount
            );
        console.log(
            "Transfer USDc from Dex Wallet to the Vault Successfully,Dex Transfer: ",
            netTransfer.amount.div(ethers.BigNumber.from(10).pow(18)).toString()
        );
        // Validate Last Balance of Vault in USDc, compare with value in the Excel Spread Sheet
        console.log(
            "Last Balance of Contract in USDc before Fees Transfer: ",
            (await USDc.balanceOf(Calculum.address)).div(ethers.BigNumber.from(10).pow(18)).toString()
        );
        expect(
            parseInt((await USDc.balanceOf(Calculum.address)).div(ethers.BigNumber.from(10).pow(17)).toString()) / 10
        ).to.equal(247 / 10);
        // Call FeeTransfer to transfer the amount of USDc to the Fee Address
        await expect(Calculum.connect(openZeppelinDefenderWallet).feesTransfer())
            .to.emit(Calculum, "FeesTransfer")
            .withArgs(await Calculum.CURRENT_EPOCH(), ethers.utils.parseUnits("24797773938973960957", "wei"));
        // Verify Dex Wallet Balance
        const DexWalletBalance = (await USDc.balanceOf(dexWallet.address));
        expect(
            parseInt(DexWalletBalance.div(ethers.BigNumber.from(10).pow(15)).toString()) / 10
        ).to.equal(469902 / 10);
        // Start summarize the Epoch
        console.log('\x1b[32m%s\x1b[0m', 'Start Summarize the Epoch');
        console.log('\x1b[32m%s\x1b[0m', "Epoch Number: ", (await Calculum.CURRENT_EPOCH()).toString());
        const DexWalletBeginningBalance: BigNumber = (await Oracle.connect(dexWallet).GetAccount(dexWallet.address));
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance Beginning : ", DexWalletBalance.sub(ethers.BigNumber.from("98941").mul(ethers.BigNumber.from(10).pow(5))).div(ethers.BigNumber.from(10).pow(18)).toString());
        console.log('\x1b[32m%s\x1b[0m', "(+/-) Strategy(ies) P/L : 3% ", 98941 / 10);
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance EoP before Fees : ", DexWalletBalance.div(ethers.BigNumber.from(10).pow(18)).toString());
        console.log('\x1b[32m%s\x1b[0m', "Management Fee per Vault Token: ", (await Utils.MgtFeePerVaultToken(Calculum.address)).div(ethers.BigNumber.from(10).pow(18)).toString());
        console.log('\x1b[32m%s\x1b[0m', "Performance Fee per Vault Token: ", (await Utils.PerfFeePerVaultToken(Calculum.address, USDc.address)).div(ethers.BigNumber.from(10).pow(18)).toString());
        console.log('\x1b[32m%s\x1b[0m', "Fees kept in TransferBot Wallet as gas reserves: ", parseInt(feeKept.div(ethers.BigNumber.from(10).pow(15)).toString()) / 1000);
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance EoP after Fees :", DexWalletBalance.sub(feeKept).div(ethers.BigNumber.from(10).pow(18)).toString());
        console.log('\x1b[32m%s\x1b[0m', "Deposit (Mint New Wallet): ", newDeposits.div(ethers.BigNumber.from(10).pow(18)).toString());
        console.log('\x1b[32m%s\x1b[0m', "Withdrawal (Burn Wallet): ", newWithdrawalsShares.div(ethers.BigNumber.from(10).pow(18)).toString());
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance End Period: ", parseInt(DexWalletBeginningBalance.add(newDeposits).sub(newWithdrawalsShares).sub(feeKept).div(ethers.BigNumber.from(10).pow(16)).toString()) / 100);
        console.log('\x1b[32m%s\x1b[0m', "Treasury Balance : ", (await USDc.balanceOf(treasuryWallet.address)).div(ethers.BigNumber.from(10).pow(18)).toString());
        console.log('\x1b[32m%s\x1b[0m', "Vault Token Price: ", (await Calculum.VAULT_TOKEN_PRICE(await Calculum.CURRENT_EPOCH())).div(ethers.BigNumber.from(10).pow(18)).toString());
        console.log('\x1b[32m%s\x1b[0m', "Net Transfer Amount: ", parseInt(netTransferAmount.div(ethers.BigNumber.from(10).pow(15)).toString()) / 1000);
        // The Amount of USDc in the Dex Wallet is 327198.471729 USDc minus the last fee
        expect(
            (await USDc.balanceOf(dexWallet.address)).div(ethers.BigNumber.from(10).pow(8)).toString()
        ).to.equal(ethers.utils.parseUnits("4699023774358", "wei").toString());
        console.log("Balance of Dex Wallet in USDc: ", (await USDc.balanceOf(dexWallet.address)).div(ethers.BigNumber.from(10).pow(18)).toString());
        // Verify the Balance of USDc of treasury in the Vault
        expect(
            parseInt((await USDc.balanceOf(treasuryWallet.address)).toString()) /
            10 ** 18
        ).to.equal(26.051202564176368);
        console.log(
            "Transfer USDc to the Treasury Successfully,Fees Transfer: ",
            parseInt((await USDc.balanceOf(treasuryWallet.address)).toString()) /
            10 ** 18
        );
        // Validate Last Balance of TransferBot Role Wallet in USDc, comparring with value in the Excel Spread Sheet
        expect(
            (await USDc.balanceOf(openZeppelinDefenderWallet.address)).div(ethers.BigNumber.from(10).pow(18))
        ).to.equal(50);
        console.log("Balance USDc of Open Zeppellin Wallet: ", parseInt((await USDc.balanceOf(openZeppelinDefenderWallet.address)).div(ethers.BigNumber.from(10).pow(16)).toString()) / 100);
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
            Calculum.connect(alice).deposit(ethers.utils.parseEther("100000"), alice.address)
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
            (await Calculum.EPOCH_START()).add(
                (await Calculum.EPOCH_DURATION()).mul(5)
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
        await expect(Calculum.connect(alice).redeem(ethers.utils.parseEther("130"), alice.address, alice.address))
            .to.emit(Calculum, "PendingWithdraw")
            .withArgs(alice.address, alice.address, ethers.utils.parseUnits("191061722171143931250", "wei"), ethers.utils.parseEther("130"));
        // Validate WITHDRAWALS VALUE after withdraw
        expect((await Calculum.WITHDRAWALS(alice.address)).status).to.equal(4); // 4 = PendingRedeem
        expect((await Calculum.WITHDRAWALS(alice.address)).amountAssets).to.equal(ethers.utils.parseUnits("191061722171143931250", "wei"));
        expect((await Calculum.WITHDRAWALS(alice.address)).amountShares).to.equal(ethers.utils.parseEther("130"));
        expect((await Calculum.WITHDRAWALS(alice.address)).finalAmount).to.equal(0);
        console.log("Withdrawal Status: ", (await Calculum.WITHDRAWALS(alice.address)).status);
        // Try to Finalize the Epoch before the Finalization Time
        const time = Math.floor(
            (await ethers.provider.getBlock("latest")).timestamp
        );
        const asset: string = (await Calculum.asset()).toString();
        console.log("Address of ERC20 Asset: ", asset);
        const getPriceInPaymentToken = (
            await UniswapLibV3.getPriceInPaymentToken(asset, UNISWAP_ROUTER2)
        ).toString();
        console.log(
            "Value of getPriceInPaymentToken: ",
            parseInt(getPriceInPaymentToken) / 10 ** 18
        );
        const balancetransferBotRoleWallet = (
            await USDc.balanceOf(openZeppelinDefenderWallet.address)
        ).toString();
        console.log(
            "balancetransferBotRoleWallet: ",
            balancetransferBotRoleWallet / 10 ** 18
        );
        console.log(
            "Expected Amount: ",
            ((parseInt(balancetransferBotRoleWallet) / 10 ** 18) *
                parseInt(getPriceInPaymentToken)) /
            10 ** 18
        );
        await expect(Calculum.connect(openZeppelinDefenderWallet).finalizeEpoch())
            .to.revertedWithCustomError(Calculum, "VaultOutMaintenance");
        // Move before to Maintenance Windows Pre Start
        await network.provider.send("evm_setNextBlockTimestamp", [
            parseInt(move1.add(epochDuration - maintTimeBefore, "s").format("X")),
        ]);
        await network.provider.send("evm_mine", []);
        // Setting actual value of Assets
        await Oracle.connect(deployer).setAssetValue(ethers.utils.parseEther("481.65"));
        console.log("Set Value of Assets in the Oracle: ", parseInt(ethers.utils.parseEther("481.65").div(ethers.BigNumber.from(10).pow(17)).toString()) / 10);
        // sub
        const sub = ethers.utils.parseEther("481.65").sub(ethers.utils.parseEther("469.91"))
        // Adjust Balance of Dex Wallet to Real Value
        await Calculum.connect(deployer).modifyAcctMargin(sub.mul(1));
        // TODO: need to fix the smart contract of the vault, to handle the transfer to the dex wallet (deposit or withdraw)
        console.log("Adjust Balance of Dex Wallet to Real Value: ", parseInt(sub.div(ethers.BigNumber.from(10).pow(17)).toString()) / 10);
        expect((await USDc.balanceOf(dexWallet.address)).div(ethers.BigNumber.from(10).pow(16))).to.equal(48164);
        const newDeposits: BigNumber = (await Calculum.newDeposits());
        const newWithdrawalsShares: BigNumber = (await Calculum.newWithdrawals());
        // Finalize the Epoch
        await Calculum.connect(openZeppelinDefenderWallet).finalizeEpoch();
        console.log("Finalize the Fifth Epoch Successfully");
        // Verify the Balance of Transfer Bot Role Address in USDc
        expect(
            (await USDc.balanceOf(openZeppelinDefenderWallet.address))
        ).to.equal(ethers.utils.parseEther("50"));
        //** Verify the Balance of Transfer Bot Role Address in Eth is minor than 1 ETH **/
        expect(
            parseInt(
                (
                    await ethers.provider.getBalance(openZeppelinDefenderWallet.address)
                ).toString()
            )
        ).to.approximately(20 * 10 ** 16, 2 * 10 ** 17);
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
        expect(netTransferAmount.div(ethers.BigNumber.from(10).pow(16))).to.equal(18859);
        console.log("Vault Token Price: ", (await Calculum.VAULT_TOKEN_PRICE(await Calculum.CURRENT_EPOCH())).div(ethers.BigNumber.from(10).pow(12)).toString());
        expect((await Calculum.VAULT_TOKEN_PRICE(await Calculum.CURRENT_EPOCH())).div(ethers.BigNumber.from(10).pow(12))).to.equal(1436495);
        // Verify the Transfer Bot Gas Reserve in USD is Zero
        const feeKept = await Utils.CalculateTransferBotGasReserveDA(Calculum.address, USDc.address);
        expect(feeKept).to.equal(0);

        // Call dexTransfer to transfer the amount of USDc to the Vault
        await expect(Calculum.connect(openZeppelinDefenderWallet).dexTransfer())
            .to.emit(USDc, "Transfer")
            .withArgs(
                dexWallet.address,
                Calculum.address,
                netTransfer.amount
            )
            .to.emit(Calculum, "DexTransfer")
            .withArgs(
                await Calculum.CURRENT_EPOCH(),
                netTransfer.amount
            );
        console.log(
            "Transfer USDc from Dex Wallet to the Vault Successfully,Dex Transfer: ",
            netTransfer.amount.div(ethers.BigNumber.from(10).pow(18)).toString()
        );
        // Validate Last Balance of Vault in USDc, compare with value in the Excel Spread Sheet
        console.log(
            "Last Balance of Contract in USDc before Fees Transfer: ",
            (await USDc.balanceOf(Calculum.address)).div(ethers.BigNumber.from(10).pow(16)).toString()
        );
        expect(
            (await USDc.balanceOf(Calculum.address)).div(ethers.BigNumber.from(10).pow(16))
        ).to.equal(18859);
        // Call FeeTransfer to transfer the amount of USDc to the Fee Address
        await expect(Calculum.connect(openZeppelinDefenderWallet).feesTransfer())
            .to.emit(Calculum, "FeesTransfer")
            .withArgs(await Calculum.CURRENT_EPOCH(), ethers.utils.parseUnits("1852224566859159553", "wei"));
        // Verify Dex Wallet Balance
        const DexWalletBalance = (await USDc.balanceOf(dexWallet.address));
        expect(
            parseInt(DexWalletBalance.div(ethers.BigNumber.from(10).pow(16)).toString()) / 100
        ).to.equal(29304 / 100);
        // Start summarize the Epoch
        console.log('\x1b[32m%s\x1b[0m', 'Start Summarize the Epoch');
        console.log('\x1b[32m%s\x1b[0m', "Epoch Number: ", (await Calculum.CURRENT_EPOCH()).toString());
        const DexWalletBeginningBalance: BigNumber = (await Oracle.connect(dexWallet).GetAccount(dexWallet.address));
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance Beginning : ", ethers.BigNumber.from(DexWalletBeginningBalance).div(ethers.BigNumber.from(10).pow(18)).toString());
        console.log('\x1b[32m%s\x1b[0m', "(+/-) Strategy(ies) P/L : 4% ", parseInt(sub.div(ethers.BigNumber.from(10).pow(16)).toString()) / 100);
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance EoP before Fees : ", DexWalletBalance.div(ethers.BigNumber.from(10).pow(18)).toString());
        console.log('\x1b[32m%s\x1b[0m', "Management Fee per Vault Token: ", parseInt((await Utils.MgtFeePerVaultToken(Calculum.address)).div(ethers.BigNumber.from(10).pow(12)).toString()) / 10 ** 6);
        console.log('\x1b[32m%s\x1b[0m', "Performance Fee per Vault Token: ", parseInt((await Utils.PerfFeePerVaultToken(Calculum.address, USDc.address)).div(ethers.BigNumber.from(10).pow(12)).toString()) / 10 ** 6);
        console.log('\x1b[32m%s\x1b[0m', "Fees kept in TransferBot Wallet as gas reserves: ", parseInt(feeKept.div(ethers.BigNumber.from(10).pow(15)).toString()) / 1000);
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance EoP after Fees :", DexWalletBalance.sub(feeKept).div(ethers.BigNumber.from(10).pow(18)).toString());
        console.log('\x1b[32m%s\x1b[0m', "Deposit (Mint New Wallet): ", newDeposits.div(ethers.BigNumber.from(10).pow(18)).toString());
        console.log('\x1b[32m%s\x1b[0m', "Withdrawal (Burn Wallet): ", newWithdrawalsShares.div(ethers.BigNumber.from(10).pow(18)).toString());
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance End Period: ", parseInt(DexWalletBeginningBalance.add(newDeposits).sub(newWithdrawalsShares).sub(feeKept).div(ethers.BigNumber.from(10).pow(16)).toString()) / 100)
        console.log('\x1b[32m%s\x1b[0m', "Treasury Balance : ", (await USDc.balanceOf(treasuryWallet.address)).div(ethers.BigNumber.from(10).pow(18)).toString());
        console.log('\x1b[32m%s\x1b[0m', "Vault Token Price: ", parseInt((await Calculum.VAULT_TOKEN_PRICE(await Calculum.CURRENT_EPOCH())).div(ethers.BigNumber.from(10).pow(12)).toString()) / 10 ** 6);
        console.log('\x1b[32m%s\x1b[0m', "Net Transfer Amount: ", parseInt(netTransferAmount.div(ethers.BigNumber.from(10).pow(15)).toString()) / 1000);
        // The Amount of USDc in the Dex Wallet is 1500000 USDc minus the last fee
        console.log("Balance USDc of Dex Wallet: ", parseInt((await USDc.balanceOf(dexWallet.address)).div(ethers.BigNumber.from(10).pow(16)).toString()) / 100);
        // Verify the Balance of USDc of treasury in the Vault
        expect(
            parseInt((await USDc.balanceOf(treasuryWallet.address)).div(ethers.BigNumber.from(10).pow(17)).toString()) /
            10
        ).to.equal(279 / 10);
        console.log(
            "Transfer USDc to the Treasury Successfully,Fees Transfer: ",
            parseInt((await USDc.balanceOf(treasuryWallet.address)).div(ethers.BigNumber.from(10).pow(15)).toString()) /
            1000
        );
        // Validate Last Balance of TransferBot Role Wallet in USDc, comparring with value in the Excel Spread Sheet
        expect(
            (await USDc.balanceOf(openZeppelinDefenderWallet.address)).div(ethers.BigNumber.from(10).pow(18))
        ).to.equal(50);
        console.log("Balance USDc of Open Zeppellin Wallet: ", parseInt((await USDc.balanceOf(openZeppelinDefenderWallet.address)).div(ethers.BigNumber.from(10).pow(16)).toString()) / 100);
        // Balance of ETH 
        console.log("Balance of ETH in the Vault: ", parseInt(
            (
                await ethers.provider.getBalance(openZeppelinDefenderWallet.address)
            ).toString()
        ) / 10 ** 18);
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
            Calculum.connect(alice).deposit(ethers.utils.parseEther("100"), alice.address)
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
            (await Calculum.EPOCH_START()).add(
                (await Calculum.EPOCH_DURATION()).mul(6)
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
        expect((await Calculum.WITHDRAWALS(alice.address)).amountAssets).to.equal(ethers.utils.parseEther("186.744357865417183650"));
        expect((await Calculum.WITHDRAWALS(alice.address)).amountShares).to.equal(ethers.utils.parseEther("130"));
        expect((await Calculum.WITHDRAWALS(alice.address)).finalAmount).to.equal(ethers.utils.parseEther("186.744357865417183650"));
        console.log("Withdrawal Status: ", (await Calculum.WITHDRAWALS(alice.address)).status);
        // Claiming the Withdraw Assets of Alice
        await expect(Calculum.connect(alice).claimAssets(alice.address, alice.address))
            .to.emit(Calculum, "Transfer")
            .withArgs(
                alice.address,
                ZERO_ADDRESS,
                ethers.utils.parseEther("130"),
            )
            .to.emit(USDc, "Transfer")
            .withArgs(
                Calculum.address,
                alice.address,
                ethers.utils.parseEther("186.744357865417183650")
            )
            .to.emit(Calculum, "Withdraw")
            .withArgs(
                alice.address,
                alice.address,
                alice.address,
                ethers.utils.parseEther("130"),
                ethers.utils.parseEther("186.744357865417183650")
            );
        // Verify the Value of Alice int the WITHDRAWS VALUE mapping after to Claimed
        expect((await Calculum.WITHDRAWALS(alice.address)).status).to.equal(3); // 3 = Completed
        expect((await Calculum.WITHDRAWALS(alice.address)).amountAssets).to.equal(0);
        expect((await Calculum.WITHDRAWALS(alice.address)).amountShares).to.equal(0);
        expect((await Calculum.WITHDRAWALS(alice.address)).finalAmount).to.equal(ethers.utils.parseEther("186.744357865417183650"));
        console.log("Withdrawal Status After: ", (await Calculum.WITHDRAWALS(alice.address)).status);

        // Validate WITHDRAWALS VALUE before withdraw of Carla
        expect((await Calculum.WITHDRAWALS(carla.address)).status).to.equal(0); // 0 = Inactive
        expect((await Calculum.WITHDRAWALS(carla.address)).amountAssets).to.equal(0);
        expect((await Calculum.WITHDRAWALS(carla.address)).amountShares).to.equal(0);
        expect((await Calculum.WITHDRAWALS(carla.address)).finalAmount).to.equal(
            0
        );
        // Try withdraw of carla
        await expect(Calculum.connect(carla).redeem(ethers.utils.parseEther("15"), carla.address, carla.address))
            .to.emit(Calculum, "PendingWithdraw")
            .withArgs(carla.address, carla.address, ethers.utils.parseEther("33.330243784733602890"), ethers.utils.parseEther("15"));
        // Validate WITHDRAWALS VALUE after withdraw
        expect((await Calculum.WITHDRAWALS(carla.address)).status).to.equal(4); // 4 = PendingRedeem
        expect((await Calculum.WITHDRAWALS(carla.address)).amountAssets).to.equal(ethers.utils.parseEther("33.330243784733602890"));
        expect((await Calculum.WITHDRAWALS(carla.address)).amountShares).to.equal(ethers.utils.parseEther("15"));
        expect((await Calculum.WITHDRAWALS(carla.address)).finalAmount).to.equal(0);
        console.log("Withdrawal Status: ", (await Calculum.WITHDRAWALS(carla.address)).status);

        // Try to Finalize the Epoch before the Finalization Time
        const time = Math.floor(
            (await ethers.provider.getBlock("latest")).timestamp
        );
        const asset: string = (await Calculum.asset()).toString();
        console.log("Address of ERC20 Asset: ", asset);
        const getPriceInPaymentToken = (
            await UniswapLibV3.getPriceInPaymentToken(asset, UNISWAP_ROUTER2)
        ).toString();
        console.log(
            "Value of getPriceInPaymentToken: ",
            parseInt(getPriceInPaymentToken) / 10 ** 18
        );
        const balancetransferBotRoleWallet = (
            await USDc.balanceOf(openZeppelinDefenderWallet.address)
        ).toString();
        console.log(
            "balancetransferBotRoleWallet: ",
            balancetransferBotRoleWallet / 10 ** 18
        );
        console.log(
            "Expected Amount: ",
            ((parseInt(balancetransferBotRoleWallet) / 10 ** 18) *
                parseInt(getPriceInPaymentToken)) /
            10 ** 18
        );
        await expect(Calculum.connect(openZeppelinDefenderWallet).finalizeEpoch())
            .to.revertedWithCustomError(Calculum, "VaultOutMaintenance");
        // Move before to Maintenance Windows Pre Start
        await network.provider.send("evm_setNextBlockTimestamp", [
            parseInt(move1.add(epochDuration - maintTimeBefore, "s").format("X")),
        ]);
        await network.provider.send("evm_mine", []);
        // Setting actual value of Assets
        await Oracle.connect(deployer).setAssetValue(ethers.utils.parseEther("284.26"));
        console.log("Set Value of Assets in the Oracle: ", parseInt(ethers.utils.parseEther("284.26").div(ethers.BigNumber.from(10).pow(17)).toString()) / 10);
        // sub
        const sub = ethers.utils.parseEther("293.06").sub(ethers.utils.parseEther("284.26"))
        // Adjust Balance of Dex Wallet to Real Value
        await Calculum.connect(deployer).modifyAcctMargin(sub.mul(-1));
        // TODO: need to fix the smart contract of the vault, to handle the transfer to the dex wallet (deposit or withdraw)
        console.log("Adjust Balance of Dex Wallet to Real Value: ", parseInt(sub.div(ethers.BigNumber.from(10).pow(17)).toString()) / 10);
        expect((await USDc.balanceOf(dexWallet.address)).div(ethers.BigNumber.from(10).pow(16))).to.equal(28424);
        const newDeposits: BigNumber = (await Calculum.newDeposits());
        const newWithdrawalsShares: BigNumber = (await Calculum.newWithdrawals());
        // Finalize the Epoch
        await Calculum.connect(openZeppelinDefenderWallet).finalizeEpoch();
        console.log("Finalize the Sixth Epoch Successfully");
        // Verify the Balance of Transfer Bot Role Address in USDc
        expect(
            (await USDc.balanceOf(openZeppelinDefenderWallet.address)).toString()
        ).to.equal(ethers.utils.parseEther("50"));
        //** Verify the Balance of Transfer Bot Role Address in Eth is minor than 1 ETH **/
        expect(
            parseInt(
                (
                    await ethers.provider.getBalance(openZeppelinDefenderWallet.address)
                ).toString()
            )
        ).to.approximately(20 * 10 ** 16, 1 * 10 ** 17);
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
        expect(netTransferAmount.div(ethers.BigNumber.from(10).pow(13))).to.equal(2095290);
        console.log("Vault Token Price: ", (await Calculum.VAULT_TOKEN_PRICE(await Calculum.CURRENT_EPOCH())).div(ethers.BigNumber.from(10).pow(12)).toString());
        expect((await Calculum.VAULT_TOKEN_PRICE(await Calculum.CURRENT_EPOCH())).div(ethers.BigNumber.from(10).pow(12))).to.equal(1393116);
        // Verify the Transfer Bot Gas Reserve in USD is Zero
        const feeKept = await Utils.CalculateTransferBotGasReserveDA(Calculum.address, USDc.address);
        expect(feeKept).to.equal(0);
        // Call dexTransfer to transfer the amount of USDc to the Vault
        await expect(Calculum.connect(openZeppelinDefenderWallet).dexTransfer())
            .to.emit(USDc, "Transfer")
            .withArgs(
                dexWallet.address,
                Calculum.address,
                netTransfer.amount
            )
            .to.emit(Calculum, "DexTransfer")
            .withArgs(
                await Calculum.CURRENT_EPOCH(),
                netTransfer.amount
            );
        console.log(
            "Transfer USDc from Dex Wallet to the Vault Successfully,Dex Transfer: ",
            netTransfer.amount.div(ethers.BigNumber.from(10).pow(18)).toString()
        );
        // Validate Last Balance of Vault in USDc, compare with value in the Excel Spread Sheet
        console.log(
            "Last Balance of Contract in USDc before Fees Transfer: ",
            (await USDc.balanceOf(Calculum.address)).div(ethers.BigNumber.from(10).pow(18)).toString()
        );
        expect(
            (await USDc.balanceOf(Calculum.address)).div(ethers.BigNumber.from(10).pow(13))
        ).to.equal(2095290);
        // Call FeeTransfer to transfer the amount of USDc to the Fee Address
        await expect(Calculum.connect(openZeppelinDefenderWallet).feesTransfer())
            .to.emit(Calculum, "FeesTransfer")
            .withArgs(await Calculum.CURRENT_EPOCH(), ethers.utils.parseUnits("56164756651189306", "wei"));
        // Verify Dex Wallet Balance
        const DexWalletBalance = (await USDc.balanceOf(dexWallet.address));
        expect(
            parseInt(DexWalletBalance.div(ethers.BigNumber.from(10).pow(17)).toString()) / 10
        ).to.equal(2632 / 10);
        // Start summarize the Epoch
        console.log('\x1b[32m%s\x1b[0m', 'Start Summarize the Epoch');
        console.log('\x1b[32m%s\x1b[0m', "Epoch Number: ", (await Calculum.CURRENT_EPOCH()).toString());
        const DexWalletBeginningBalance: BigNumber = (await Oracle.connect(dexWallet).GetAccount(dexWallet.address));
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance Beginning : ", ethers.BigNumber.from(DexWalletBeginningBalance).div(ethers.BigNumber.from(10).pow(18)).toString());
        console.log('\x1b[32m%s\x1b[0m', "(+/-) Strategy(ies) P/L : 4% ", parseInt(sub.div(ethers.BigNumber.from(10).pow(16)).toString()) / 100);
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance EoP before Fees : ", DexWalletBalance.div(ethers.BigNumber.from(10).pow(18)).toString());
        console.log('\x1b[32m%s\x1b[0m', "Management Fee per Vault Token: ", parseInt((await Utils.MgtFeePerVaultToken(Calculum.address)).div(ethers.BigNumber.from(10).pow(12)).toString()) / 10 ** 6);
        console.log('\x1b[32m%s\x1b[0m', "Performance Fee per Vault Token: ", parseInt((await Utils.PerfFeePerVaultToken(Calculum.address, USDc.address)).div(ethers.BigNumber.from(10).pow(12)).toString()) / 10 ** 6);
        console.log('\x1b[32m%s\x1b[0m', "Fees kept in TransferBot Wallet as gas reserves: ", parseInt(feeKept.div(ethers.BigNumber.from(10).pow(15)).toString()) / 1000);
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance EoP after Fees :", DexWalletBalance.sub(feeKept).div(ethers.BigNumber.from(10).pow(18)).toString());
        console.log('\x1b[32m%s\x1b[0m', "Deposit (Mint New Wallet): ", newDeposits.div(ethers.BigNumber.from(10).pow(18)).toString());
        console.log('\x1b[32m%s\x1b[0m', "Withdrawal (Burn Wallet): ", newWithdrawalsShares.div(ethers.BigNumber.from(10).pow(18)).toString());
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance End Period: ", parseInt(DexWalletBeginningBalance.add(newDeposits).sub(newWithdrawalsShares).sub(feeKept).div(ethers.BigNumber.from(10).pow(16)).toString()) / 100)
        console.log('\x1b[32m%s\x1b[0m', "Treasury Balance : ", (await USDc.balanceOf(treasuryWallet.address)).div(ethers.BigNumber.from(10).pow(18)).toString());
        console.log('\x1b[32m%s\x1b[0m', "Vault Token Price: ", parseInt((await Calculum.VAULT_TOKEN_PRICE(await Calculum.CURRENT_EPOCH())).div(ethers.BigNumber.from(10).pow(12)).toString()) / 10 ** 6);
        console.log('\x1b[32m%s\x1b[0m', "Net Transfer Amount: ", parseInt(netTransferAmount.div(ethers.BigNumber.from(10).pow(15)).toString()) / 1000);
        // The Amount of USDc in the Dex Wallet is 1500000 USDc minus the last fee
        console.log("Balance USDc of Dex Wallet: ", parseInt((await USDc.balanceOf(dexWallet.address)).div(ethers.BigNumber.from(10).pow(16)).toString()) / 100);
        // Verify the Balance of USDc of treasury in the Vault
        expect(
            (await USDc.balanceOf(treasuryWallet.address)).div(ethers.BigNumber.from(10).pow(6)).toString()
        ).to.equal("27959591887686");
        console.log(
            "Transfer USDc to the Treasury Successfully,Fees Transfer: ",
            parseInt((await USDc.balanceOf(treasuryWallet.address)).toString()) /
            10 ** 18
        );
        // Validate Last Balance of TransferBot Role Wallet in USDc, comparring with value in the Excel Spread Sheet
        expect(
            (await USDc.balanceOf(openZeppelinDefenderWallet.address)).div(ethers.BigNumber.from(10).pow(18))
        ).to.equal(50);
        console.log("Balance USDc of Open Zeppellin Wallet: ", parseInt((await USDc.balanceOf(openZeppelinDefenderWallet.address)).div(ethers.BigNumber.from(10).pow(16)).toString()) / 100);
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
            Calculum.connect(alice).deposit(ethers.utils.parseEther("100000"), alice.address)
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
            (await Calculum.EPOCH_START()).add(
                (await Calculum.EPOCH_DURATION()).mul(7)
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
                ethers.utils.parseEther("15"),
            )
            .to.emit(USDc, "Transfer")
            .withArgs(
                Calculum.address,
                carla.address,
                ethers.utils.parseEther("20.896740032495518245")
            )
            .to.emit(Calculum, "Withdraw")
            .withArgs(
                carla.address,
                carla.address,
                carla.address,
                ethers.utils.parseEther("15"),
                ethers.utils.parseEther("20.896740032495518245")
            );
        // Verify the Value of carla int the WITHDRAWS VALUE mapping after to Claimed
        expect((await Calculum.WITHDRAWALS(carla.address)).status).to.equal(3); // 3 = Completed
        expect((await Calculum.WITHDRAWALS(carla.address)).amountAssets).to.equal(0);
        expect((await Calculum.WITHDRAWALS(carla.address)).amountShares).to.equal(0);
        expect((await Calculum.WITHDRAWALS(carla.address)).finalAmount).to.equal(ethers.utils.parseEther("20.896740032495518245"));
        console.log("Withdrawal Status After: ", (await Calculum.WITHDRAWALS(carla.address)).status);

        // Try to Finalize the Epoch before the Finalization Time
        const time = Math.floor(
            (await ethers.provider.getBlock("latest")).timestamp
        );
        const asset: string = (await Calculum.asset()).toString();
        console.log("Address of ERC20 Asset: ", asset);
        const getPriceInPaymentToken = (
            await UniswapLibV3.getPriceInPaymentToken(asset, UNISWAP_ROUTER2)
        ).toString();
        console.log(
            "Value of getPriceInPaymentToken: ",
            parseInt(getPriceInPaymentToken) / 10 ** 18
        );
        const balancetransferBotRoleWallet = (
            await USDc.balanceOf(openZeppelinDefenderWallet.address)
        ).toString();
        console.log(
            "balancetransferBotRoleWallet: ",
            balancetransferBotRoleWallet / 10 ** 18
        );
        console.log(
            "Expected Amount: ",
            ((parseInt(balancetransferBotRoleWallet) / 10 ** 18) *
                parseInt(getPriceInPaymentToken)) /
            10 ** 18
        );
        await expect(Calculum.connect(openZeppelinDefenderWallet).finalizeEpoch())
            .to.revertedWithCustomError(Calculum, "VaultOutMaintenance");
        // Move before to Maintenance Windows Pre Start
        await network.provider.send("evm_setNextBlockTimestamp", [
            parseInt(move1.add(epochDuration - maintTimeBefore, "s").format("X")),
        ]);
        await network.provider.send("evm_mine", []);
        // Setting actual value of Assets
        await Oracle.connect(deployer).setAssetValue(ethers.utils.parseEther("263.31"));
        console.log("Set Value of Assets in the Oracle: ", parseInt(ethers.utils.parseEther("263.31").div(ethers.BigNumber.from(10).pow(17)).toString()) / 10);
        // sub
        const sub = ethers.utils.parseEther("271.21").sub(ethers.utils.parseEther("263.31"))
        // Adjust Balance of Dex Wallet to Real Value
        await Calculum.connect(deployer).modifyAcctMargin(sub.mul(-1));
        // TODO: need to fix the smart contract of the vault, to handle the transfer to the dex wallet (deposit or withdraw)
        console.log("Adjust Balance of Dex Wallet to Real Value: ", parseInt(sub.div(ethers.BigNumber.from(10).pow(17)).toString()) / 10);
        expect((await USDc.balanceOf(dexWallet.address)).div(ethers.BigNumber.from(10).pow(16))).to.equal(25539);
        const newDeposits: BigNumber = (await Calculum.newDeposits());
        const newWithdrawalsShares: BigNumber = (await Calculum.newWithdrawals());
        // Finalize the Epoch
        await Calculum.connect(openZeppelinDefenderWallet).finalizeEpoch();
        console.log("Finalize the Seventh Epoch Successfully");
        // Verify the Balance of Transfer Bot Role Address in USDc
        expect(
            (await USDc.balanceOf(openZeppelinDefenderWallet.address)).toString()
        ).to.equal(ethers.utils.parseEther("50"));
        //** Verify the Balance of Transfer Bot Role Address in Eth is minor than 1 ETH **/
        expect(
            parseInt(
                (
                    await ethers.provider.getBalance(openZeppelinDefenderWallet.address)
                ).toString()
            )
        ).to.approximately(20 * 10 ** 16, 2 * 10 ** 17);
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
        expect(netTransferAmount.div(ethers.BigNumber.from(10).pow(12))).to.equal(50899);
        console.log("Vault Token Price: ", (await Calculum.VAULT_TOKEN_PRICE(await Calculum.CURRENT_EPOCH())).div(ethers.BigNumber.from(10).pow(12)).toString());
        expect((await Calculum.VAULT_TOKEN_PRICE(await Calculum.CURRENT_EPOCH())).div(ethers.BigNumber.from(10).pow(12))).to.equal(1392862);
        // Verify the Transfer Bot Gas Reserve in USD is Zero
        const feeKept = await Utils.CalculateTransferBotGasReserveDA(Calculum.address, USDc.address);
        expect(feeKept).to.equal(0);
        // Call dexTransfer to transfer the amount of USDc to the Vault
        await expect(Calculum.connect(openZeppelinDefenderWallet).dexTransfer())
            .to.emit(USDc, "Transfer")
            .withArgs(
                dexWallet.address,
                Calculum.address,
                netTransfer.amount
            )
            .to.emit(Calculum, "DexTransfer")
            .withArgs(
                await Calculum.CURRENT_EPOCH(),
                netTransfer.amount
            );
        console.log(
            "Transfer USDc from Dex Wallet to the Vault Successfully,Dex Transfer: ",
            netTransfer.amount.div(ethers.BigNumber.from(10).pow(18)).toString()
        );
        // Validate Last Balance of Vault in USDc, compare with value in the Excel Spread Sheet
        console.log(
            "Last Balance of Contract in USDc before Fees Transfer: ",
            (await USDc.balanceOf(Calculum.address)).div(ethers.BigNumber.from(10).pow(18)).toString()
        );
        expect(
            (await USDc.balanceOf(Calculum.address)).div(ethers.BigNumber.from(10).pow(12))
        ).to.equal(888982685);
        // Call FeeTransfer to transfer the amount of USDc to the Fee Address
        await expect(Calculum.connect(openZeppelinDefenderWallet).feesTransfer())
            .to.emit(Calculum, "FeesTransfer")
            .withArgs(await Calculum.CURRENT_EPOCH(), ethers.utils.parseEther("888.982685358094995722"));
        // Verify Dex Wallet Balance
        const DexWalletBalance = (await USDc.balanceOf(dexWallet.address));
        expect(
            parseInt(DexWalletBalance.div(ethers.BigNumber.from(10).pow(17)).toString()) / 10
        ).to.equal(1942768 / 10);
        // Start summarize the Epoch
        console.log('\x1b[32m%s\x1b[0m', 'Start Summarize the Epoch');
        console.log('\x1b[32m%s\x1b[0m', "Epoch Number: ", (await Calculum.CURRENT_EPOCH()).toString());
        const DexWalletBeginningBalance: BigNumber = (await Oracle.connect(dexWallet).GetAccount(dexWallet.address));
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance Beginning : ", ethers.BigNumber.from(DexWalletBeginningBalance).div(ethers.BigNumber.from(10).pow(18)).toString());
        console.log('\x1b[32m%s\x1b[0m', "(+/-) Strategy(ies) P/L : 4% ", parseInt(sub.div(ethers.BigNumber.from(10).pow(16)).toString()) / 100);
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance EoP before Fees : ", DexWalletBalance.div(ethers.BigNumber.from(10).pow(18)).toString());
        console.log('\x1b[32m%s\x1b[0m', "Management Fee per Vault Token: ", parseInt((await Utils.MgtFeePerVaultToken(Calculum.address)).div(ethers.BigNumber.from(10).pow(12)).toString()) / 10 ** 6);
        console.log('\x1b[32m%s\x1b[0m', "Performance Fee per Vault Token: ", parseInt((await Utils.PerfFeePerVaultToken(Calculum.address, USDc.address)).div(ethers.BigNumber.from(10).pow(12)).toString()) / 10 ** 6);
        console.log('\x1b[32m%s\x1b[0m', "Fees kept in TransferBot Wallet as gas reserves: ", parseInt(feeKept.div(ethers.BigNumber.from(10).pow(15)).toString()) / 1000);
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance EoP after Fees :", DexWalletBalance.sub(feeKept).div(ethers.BigNumber.from(10).pow(18)).toString());
        console.log('\x1b[32m%s\x1b[0m', "Deposit (Mint New Wallet): ", newDeposits.div(ethers.BigNumber.from(10).pow(18)).toString());
        console.log('\x1b[32m%s\x1b[0m', "Withdrawal (Burn Wallet): ", newWithdrawalsShares.div(ethers.BigNumber.from(10).pow(18)).toString());
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance End Period: ", parseInt(DexWalletBeginningBalance.add(newDeposits).sub(newWithdrawalsShares).sub(feeKept).div(ethers.BigNumber.from(10).pow(16)).toString()) / 100)
        console.log('\x1b[32m%s\x1b[0m', "Treasury Balance : ", (await USDc.balanceOf(treasuryWallet.address)).div(ethers.BigNumber.from(10).pow(18)).toString());
        console.log('\x1b[32m%s\x1b[0m', "Vault Token Price: ", parseInt((await Calculum.VAULT_TOKEN_PRICE(await Calculum.CURRENT_EPOCH())).div(ethers.BigNumber.from(10).pow(12)).toString()) / 10 ** 6);
        console.log('\x1b[32m%s\x1b[0m', "Net Transfer Amount: ", parseInt(netTransferAmount.div(ethers.BigNumber.from(10).pow(15)).toString()) / 1000);
        // The Amount of USDc in the Dex Wallet is 1500000 USDc minus the last fee
        console.log("Balance USDc of Dex Wallet: ", parseInt((await USDc.balanceOf(dexWallet.address)).div(ethers.BigNumber.from(10).pow(16)).toString()) / 100);
        // Verify the Balance of USDc of treasury in the Vault
        expect(
            (await USDc.balanceOf(treasuryWallet.address))
        ).to.equal(ethers.utils.parseEther("3263.031303419864158094"));
        console.log(
            "Transfer USDc to the Treasury Successfully,Fees Transfer: ",
            parseInt((await USDc.balanceOf(treasuryWallet.address)).toString()) /
            10 ** 18
        );
        // Validate Last Balance of TransferBot Role Wallet in USDc, comparring with value in the Excel Spread Sheet
        expect(
            (await USDc.balanceOf(openZeppelinDefenderWallet.address)).div(ethers.BigNumber.from(10).pow(18))
        ).to.equal(1000);
        console.log("Balance USDc of Open Zeppellin Wallet: ", parseInt((await USDc.balanceOf(openZeppelinDefenderWallet.address)).div(ethers.BigNumber.from(10).pow(16)).toString()) / 100);
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
            Calculum.connect(alice).deposit(ethers.utils.parseEther("100000"), alice.address)
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
            (await Calculum.EPOCH_START()).add(
                (await Calculum.EPOCH_DURATION()).mul(8)
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
        await expect(Calculum.connect(alice).redeem(ethers.utils.parseEther("121274.389"), alice.address, alice.address))
            .to.emit(Calculum, "PendingWithdraw")
            .withArgs(alice.address, alice.address, ethers.utils.parseEther("125117.41894549918820044"), ethers.utils.parseEther("121274.389"));
        // Validate WITHDRAWALS VALUE after withdraw
        expect((await Calculum.WITHDRAWALS(alice.address)).status).to.equal(4); // 4 = PendingRedeem
        expect((await Calculum.WITHDRAWALS(alice.address)).amountAssets).to.equal(ethers.utils.parseEther("125117.41894549918820044"));
        expect((await Calculum.WITHDRAWALS(alice.address)).amountShares).to.equal(ethers.utils.parseEther("121274.389"));
        expect((await Calculum.WITHDRAWALS(alice.address)).finalAmount).to.equal(ethers.utils.parseEther("134384.4030114235"));
        // Claim bob Shares
        // Try withdraw of bob
        await Calculum.connect(bob).redeem(ethers.utils.parseEther("52349.1"), bob.address, bob.address);
        // .to.emit(Calculum, "PendingWithdraw")
        // .withArgs(bob.address, bob.address, 54007990630, ethers.utils.parseEther("52349.1"));
        // Validate WITHDRAWALS VALUE after withdraw
        expect((await Calculum.WITHDRAWALS(bob.address)).status).to.equal(4); // 4 = PendingRedeem
        expect((await Calculum.WITHDRAWALS(bob.address)).amountAssets).to.equal(ethers.utils.parseEther("54007.975881204658578191"));
        expect((await Calculum.WITHDRAWALS(bob.address)).amountShares).to.equal(ethers.utils.parseEther("52349.1"));
        expect((await Calculum.WITHDRAWALS(bob.address)).finalAmount).to.equal(0);
        // Claim carla Shares
        // Try withdraw of carla
        await expect(Calculum.connect(carla).redeem(ethers.utils.parseEther("15381.5"), carla.address, carla.address))
            .to.emit(Calculum, "PendingWithdraw")
            .withArgs(carla.address, carla.address, ethers.utils.parseEther("15868.920019957352770543"), ethers.utils.parseEther("15381.5"));
        // Validate WITHDRAWALS VALUE after withdraw
        expect((await Calculum.WITHDRAWALS(carla.address)).status).to.equal(4); // 4 = PendingRedeem
        expect((await Calculum.WITHDRAWALS(carla.address)).amountAssets).to.equal(ethers.utils.parseEther("15868.920019957352770543"));
        expect((await Calculum.WITHDRAWALS(carla.address)).amountShares).to.equal(ethers.utils.parseEther("15381.5"));
        expect((await Calculum.WITHDRAWALS(carla.address)).finalAmount).to.equal(ethers.utils.parseEther("15037.73551533158913"));

        // Try to Finalize the Epoch before the Finalization Time
        const time = Math.floor(
            (await ethers.provider.getBlock("latest")).timestamp
        );
        const asset: string = (await Calculum.asset()).toString();
        console.log("Address of ERC20 Asset: ", asset);
        const getPriceInPaymentToken = (
            await UniswapLibV3.getPriceInPaymentToken(asset, UNISWAP_ROUTER2)
        ).toString();
        console.log(
            "Value of getPriceInPaymentToken: ",
            parseInt(getPriceInPaymentToken) / 10 ** 18
        );
        const balancetransferBotRoleWallet = (
            await USDc.balanceOf(openZeppelinDefenderWallet.address)
        ).toString();
        console.log(
            "balancetransferBotRoleWallet: ",
            balancetransferBotRoleWallet / 10 ** 18
        );
        console.log(
            "Expected Amount: ",
            ((parseInt(balancetransferBotRoleWallet) / 10 ** 18) *
                parseInt(getPriceInPaymentToken)) /
            10 ** 18
        );
        await expect(Calculum.connect(openZeppelinDefenderWallet).finalizeEpoch())
            .to.revertedWithCustomError(Calculum, "VaultOutMaintenance");
        // Move before to Maintenance Windows Pre Start
        await network.provider.send("evm_setNextBlockTimestamp", [
            parseInt(move1.add(epochDuration - maintTimeBefore, "s").format("X")),
        ]);
        await network.provider.send("evm_mine", []);
        // Setting actual value of Assets
        await Oracle.connect(deployer).setAssetValue(ethers.utils.parseEther("199133.8"));
        console.log("Set Value of Assets in the Oracle: ", parseInt(ethers.utils.parseEther("199133.8").div(ethers.BigNumber.from(10).pow(17)).toString()) / 10);
        // sub
        const sub = ethers.utils.parseEther("199133.8").sub(ethers.utils.parseEther("194276.9"))
        // Adjust Balance of Dex Wallet to Real Value
        await Calculum.connect(deployer).modifyAcctMargin(sub.mul(1));
        // TODO: need to fix the smart contract of the vault, to handle the transfer to the dex wallet (deposit or withdraw)
        console.log("Adjust Balance of Dex Wallet to Real Value: ", parseInt(sub.div(ethers.BigNumber.from(10).pow(17)).toString()) / 10);
        expect((await USDc.balanceOf(dexWallet.address)).div(ethers.BigNumber.from(10).pow(16))).to.equal(19913371);
        const newDeposits: BigNumber = (await Calculum.newDeposits());
        const newWithdrawalsShares: BigNumber = (await Calculum.newWithdrawals());
        // Finalize the Epoch
        await Calculum.connect(openZeppelinDefenderWallet).finalizeEpoch();
        console.log("Finalize the eighth Epoch Successfully");
        // Verify the Balance of Transfer Bot Role Address in USDc
        expect(
            (await USDc.balanceOf(openZeppelinDefenderWallet.address)).toString()
        ).to.equal(ethers.utils.parseEther("1000"));
        //** Verify the Balance of Transfer Bot Role Address in Eth is minor than 1 ETH **/
        expect(
            parseInt(
                (
                    await ethers.provider.getBalance(openZeppelinDefenderWallet.address)
                ).toString()
            )
        ).to.approximately(20 * 10 ** 16, 2 * 10 ** 17);
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
        expect(netTransferAmount.div(ethers.BigNumber.from(10).pow(12))).to.equal(199132880475);
        console.log("Vault Token Price: ", (await Calculum.VAULT_TOKEN_PRICE(await Calculum.CURRENT_EPOCH())).div(ethers.BigNumber.from(10).pow(12)).toString());
        expect((await Calculum.VAULT_TOKEN_PRICE(await Calculum.CURRENT_EPOCH())).div(ethers.BigNumber.from(10).pow(12))).to.equal(1049533);
        // Verify the Transfer Bot Gas Reserve in USD is Zero
        const feeKept = await Utils.CalculateTransferBotGasReserveDA(Calculum.address, USDc.address);
        expect(feeKept).to.equal(0);
        // Call dexTransfer to transfer the amount of USDc to the Vault
        await expect(Calculum.connect(openZeppelinDefenderWallet).dexTransfer())
            .to.emit(USDc, "Transfer")
            .withArgs(
                dexWallet.address,
                Calculum.address,
                netTransfer.amount
            )
            .to.emit(Calculum, "DexTransfer")
            .withArgs(
                await Calculum.CURRENT_EPOCH(),
                netTransfer.amount
            );
        console.log(
            "Transfer USDc from Dex Wallet to the Vault Successfully,Dex Transfer: ",
            netTransfer.amount.div(ethers.BigNumber.from(10).pow(18)).toString()
        );
        // Validate Last Balance of Vault in USDc, compare with value in the Excel Spread Sheet
        console.log(
            "Last Balance of Contract in USDc before Fees Transfer: ",
            (await USDc.balanceOf(Calculum.address)).div(ethers.BigNumber.from(10).pow(18)).toString()
        );
        expect(
            (await USDc.balanceOf(Calculum.address)).div(ethers.BigNumber.from(10).pow(12))
        ).to.equal(199132880475);
        // Call FeeTransfer to transfer the amount of USDc to the Fee Address
        await expect(Calculum.connect(openZeppelinDefenderWallet).feesTransfer())
            .to.emit(Calculum, "FeesTransfer")
            .withArgs(await Calculum.CURRENT_EPOCH(), ethers.utils.parseEther("765.781263640443211157"));
        // Verify Dex Wallet Balance
        const DexWalletBalance = (await USDc.balanceOf(dexWallet.address));
        expect(
            parseInt(DexWalletBalance.div(ethers.BigNumber.from(10).pow(17)).toString()) / 10
        ).to.equal(8 / 10);
        // Start summarize the Epoch
        console.log('\x1b[32m%s\x1b[0m', 'Start Summarize the Epoch');
        console.log('\x1b[32m%s\x1b[0m', "Epoch Number: ", (await Calculum.CURRENT_EPOCH()).toString());
        const DexWalletBeginningBalance: BigNumber = (await Oracle.connect(dexWallet).GetAccount(dexWallet.address));
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance Beginning : ", ethers.BigNumber.from(DexWalletBeginningBalance).div(ethers.BigNumber.from(10).pow(18)).toString());
        console.log('\x1b[32m%s\x1b[0m', "(+/-) Strategy(ies) P/L : 4% ", parseInt(sub.div(ethers.BigNumber.from(10).pow(16)).toString()) / 100);
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance EoP before Fees : ", DexWalletBalance.div(ethers.BigNumber.from(10).pow(18)).toString());
        console.log('\x1b[32m%s\x1b[0m', "Management Fee per Vault Token: ", parseInt((await Utils.MgtFeePerVaultToken(Calculum.address)).div(ethers.BigNumber.from(10).pow(12)).toString()) / 10 ** 6);
        console.log('\x1b[32m%s\x1b[0m', "Performance Fee per Vault Token: ", parseInt((await Utils.PerfFeePerVaultToken(Calculum.address, USDc.address)).div(ethers.BigNumber.from(10).pow(12)).toString()) / 10 ** 6);
        console.log('\x1b[32m%s\x1b[0m', "Fees kept in TransferBot Wallet as gas reserves: ", parseInt(feeKept.div(ethers.BigNumber.from(10).pow(15)).toString()) / 1000);
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance EoP after Fees :", DexWalletBalance.sub(feeKept).div(ethers.BigNumber.from(10).pow(18)).toString());
        console.log('\x1b[32m%s\x1b[0m', "Deposit (Mint New Wallet): ", newDeposits.div(ethers.BigNumber.from(10).pow(18)).toString());
        console.log('\x1b[32m%s\x1b[0m', "Withdrawal (Burn Wallet): ", newWithdrawalsShares.div(ethers.BigNumber.from(10).pow(18)).toString());
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance End Period: ", parseInt(DexWalletBeginningBalance.add(newDeposits).sub(newWithdrawalsShares).sub(feeKept).div(ethers.BigNumber.from(10).pow(16)).toString()) / 100)
        console.log('\x1b[32m%s\x1b[0m', "Treasury Balance : ", (await USDc.balanceOf(treasuryWallet.address)).div(ethers.BigNumber.from(10).pow(18)).toString());
        console.log('\x1b[32m%s\x1b[0m', "Vault Token Price: ", parseInt((await Calculum.VAULT_TOKEN_PRICE(await Calculum.CURRENT_EPOCH())).div(ethers.BigNumber.from(10).pow(12)).toString()) / 10 ** 6);
        console.log('\x1b[32m%s\x1b[0m', "Net Transfer Amount: ", parseInt(netTransferAmount.div(ethers.BigNumber.from(10).pow(15)).toString()) / 1000);
        // The Amount of USDc in the Dex Wallet is 1500000 USDc minus the last fee
        console.log("Balance USDc of Dex Wallet: ", parseInt((await USDc.balanceOf(dexWallet.address)).div(ethers.BigNumber.from(10).pow(16)).toString()) / 100);
        // Verify the Balance of USDc of treasury in the Vault
        expect(
            parseInt((await USDc.balanceOf(treasuryWallet.address)).toString()) /
            10 ** 18
        ).to.equal(4028.8125670603076);
        console.log(
            "Transfer USDc to the Treasury Successfully,Fees Transfer: ",
            parseInt((await USDc.balanceOf(treasuryWallet.address)).toString()) /
            10 ** 18
        );
        // Validate Last Balance of TransferBot Role Wallet in USDc, comparring with value in the Excel Spread Sheet
        expect(
            (await USDc.balanceOf(openZeppelinDefenderWallet.address)).div(ethers.BigNumber.from(10).pow(18))
        ).to.equal(1000);
        console.log("Balance USDc of Open Zeppellin Wallet: ", parseInt((await USDc.balanceOf(openZeppelinDefenderWallet.address)).div(ethers.BigNumber.from(10).pow(16)).toString()) / 100);
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
            Calculum.connect(alice).deposit(ethers.utils.parseEther("100000"), alice.address)
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
            (await Calculum.EPOCH_START()).add(
                (await Calculum.EPOCH_DURATION()).mul(9)
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
                ethers.utils.parseEther("121274.389"),
            )
            .to.emit(USDc, "Transfer")
            .withArgs(
                Calculum.address,
                alice.address,
                ethers.utils.parseEther("127281.554216887217607657")
            )
            .to.emit(Calculum, "Withdraw")
            .withArgs(
                alice.address,
                alice.address,
                alice.address,
                ethers.utils.parseEther("121274.389"),
                ethers.utils.parseEther("127281.554216887217607657")
            );
        // Verify the Value of alice int the WITHDRAWS VALUE mapping after to Claimed
        expect((await Calculum.WITHDRAWALS(alice.address)).status).to.equal(3); // 3 = Completed
        expect((await Calculum.WITHDRAWALS(alice.address)).amountAssets).to.equal(0);
        expect((await Calculum.WITHDRAWALS(alice.address)).amountShares).to.equal(0);
        expect((await Calculum.WITHDRAWALS(alice.address)).finalAmount).to.equal(ethers.utils.parseEther("261665.957228310717607657"));

        // Claiming the Withdraw Assets of Bob
        await expect(Calculum.connect(bob).claimAssets(bob.address, bob.address))
            .to.emit(Calculum, "Transfer")
            .withArgs(
                bob.address,
                ZERO_ADDRESS,
                ethers.utils.parseEther("52349.1"),
            )
            .to.emit(USDc, "Transfer")
            .withArgs(
                Calculum.address,
                bob.address,
                ethers.utils.parseEther("54942.142894286201213226")
            )
            .to.emit(Calculum, "Withdraw")
            .withArgs(
                bob.address,
                bob.address,
                bob.address,
                ethers.utils.parseEther("52349.1"),
                ethers.utils.parseEther("54942.142894286201213226")
            );
        // Verify the Value of bob int the WITHDRAWS VALUE mapping after to Claimed
        expect((await Calculum.WITHDRAWALS(bob.address)).status).to.equal(3); // 3 = Completed
        expect((await Calculum.WITHDRAWALS(bob.address)).amountAssets).to.equal(0);
        expect((await Calculum.WITHDRAWALS(bob.address)).amountShares).to.equal(0);
        expect((await Calculum.WITHDRAWALS(bob.address)).finalAmount).to.equal(ethers.utils.parseEther("54942.142894286201213226"));

        // Claiming the Withdraw Assets of carla
        await expect(Calculum.connect(carla).claimAssets(carla.address, carla.address))
            .to.emit(Calculum, "Transfer")
            .withArgs(
                carla.address,
                ZERO_ADDRESS,
                ethers.utils.parseEther("15381.5"),
            )
            .to.emit(USDc, "Transfer")
            .withArgs(
                Calculum.address,
                carla.address,
                ethers.utils.parseEther("16143.402101057385971511")
            )
            .to.emit(Calculum, "Withdraw")
            .withArgs(
                carla.address,
                carla.address,
                carla.address,
                ethers.utils.parseEther("15381.5"),
                ethers.utils.parseEther("16143.402101057385971511")
            );
        // Verify the Value of carla int the WITHDRAWS VALUE mapping after to Claimed
        expect((await Calculum.WITHDRAWALS(carla.address)).status).to.equal(3); // 3 = Completed
        expect((await Calculum.WITHDRAWALS(carla.address)).amountAssets).to.equal(0);
        expect((await Calculum.WITHDRAWALS(carla.address)).amountShares).to.equal(0);
        expect((await Calculum.WITHDRAWALS(carla.address)).finalAmount).to.equal(ethers.utils.parseEther("31181.137616388975101511"));

        // Add deposit to the Vault from bob
        await expect(
            Calculum.connect(bob).deposit(ethers.utils.parseEther("50000"), bob.address)
        )
            .to.emit(USDc, "Transfer")
            .withArgs(bob.address, Calculum.address, ethers.utils.parseEther("50000"))
            .to.emit(Calculum, "PendingDeposit")
            .withArgs(
                bob.address,
                bob.address,
                ethers.utils.parseEther("50000"),
                ethers.utils.parseUnits("258804902689916882", "wei")
            );
        // Verify status of bob in DEPOSITS after deposit
        expect((await Calculum.DEPOSITS(bob.address)).status).to.equal(1); // 1 = Pending
        expect((await Calculum.DEPOSITS(bob.address)).amountAssets).to.equal(
            ethers.utils.parseEther("50000")
        );
        expect((await Calculum.DEPOSITS(bob.address)).amountShares).to.equal(
            ethers.utils.parseUnits("258804902689916882", "wei")
        );
        expect((await Calculum.DEPOSITS(bob.address)).finalAmount).to.equal(
            ethers.utils.parseEther("50000")
        );

        // Try to Finalize the Epoch before the Finalization Time
        const time = Math.floor(
            (await ethers.provider.getBlock("latest")).timestamp
        );
        const asset: string = (await Calculum.asset()).toString();
        console.log("Address of ERC20 Asset: ", asset);
        const getPriceInPaymentToken = (
            await UniswapLibV3.getPriceInPaymentToken(asset, UNISWAP_ROUTER2)
        ).toString();
        console.log(
            "Value of getPriceInPaymentToken: ",
            parseInt(getPriceInPaymentToken) / 10 ** 18
        );
        const balancetransferBotRoleWallet = (
            await USDc.balanceOf(openZeppelinDefenderWallet.address)
        ).toString();
        console.log(
            "balancetransferBotRoleWallet: ",
            balancetransferBotRoleWallet / 10 ** 18
        );
        console.log(
            "Expected Amount: ",
            ((parseInt(balancetransferBotRoleWallet) / 10 ** 18) *
                parseInt(getPriceInPaymentToken)) /
            10 ** 18
        );
        await expect(Calculum.connect(openZeppelinDefenderWallet).finalizeEpoch())
            .to.revertedWithCustomError(Calculum, "VaultOutMaintenance");
        // Move before to Maintenance Windows Pre Start
        await network.provider.send("evm_setNextBlockTimestamp", [
            parseInt(move1.add(epochDuration - maintTimeBefore, "s").format("X")),
        ]);
        await network.provider.send("evm_mine", []);
        // Setting actual value of Assets
        await Oracle.connect(deployer).setAssetValue(ethers.utils.parseEther("0.8"));
        console.log("Set Value of Assets in the Oracle: ", parseInt(ethers.utils.parseEther("0.8").div(ethers.BigNumber.from(10).pow(17)).toString()) / 10);
        // sub
        const sub = ethers.utils.parseEther("0.8").sub(ethers.utils.parseUnits("49888", "wei"))
        // Adjust Balance of Dex Wallet to Real Value
        await Calculum.connect(deployer).modifyAcctMargin(sub.mul(1));
        // TODO: need to fix the smart contract of the vault, to handle the transfer to the dex wallet (deposit or withdraw)
        console.log("Adjust Balance of Dex Wallet to Real Value: ", parseInt(sub.div(ethers.BigNumber.from(10).pow(17)).toString()) / 10);
        expect((await USDc.balanceOf(dexWallet.address)).div(ethers.BigNumber.from(10).pow(18))).to.equal(1);
        const newDeposits: BigNumber = (await Calculum.newDeposits());
        const newWithdrawalsShares: BigNumber = (await Calculum.newWithdrawals());
        // Finalize the Epoch
        await Calculum.connect(openZeppelinDefenderWallet).finalizeEpoch();
        console.log("Finalize the Ninth Epoch Successfully");
        // Verify the Balance of Transfer Bot Role Address in USDc
        expect(
            (await USDc.balanceOf(openZeppelinDefenderWallet.address)).toString()
        ).to.equal(ethers.utils.parseEther("1000"));
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
        expect(netTransferAmount.div(ethers.BigNumber.from(10).pow(12))).to.equal(ethers.utils.parseUnits("49999999823", "wei"));
        console.log("Vault Token Price: ", (await Calculum.VAULT_TOKEN_PRICE(await Calculum.CURRENT_EPOCH())).div(ethers.BigNumber.from(10).pow(12)).toString());
        expect((await Calculum.VAULT_TOKEN_PRICE(await Calculum.CURRENT_EPOCH())).div(ethers.BigNumber.from(10).pow(12))).to.equal(912909);
        // Verify the Transfer Bot Gas Reserve in USD is Zero
        const feeKept = await Utils.CalculateTransferBotGasReserveDA(Calculum.address, USDc.address);
        expect(feeKept).to.equal(0);
        // Call dexTransfer to transfer the amount of USDc to the Vault
        await expect(Calculum.connect(openZeppelinDefenderWallet).dexTransfer())
            .to.emit(USDc, "Transfer")
            .withArgs(
                Calculum.address,
                dexWallet.address,
                netTransfer.amount
            )
            .to.emit(Calculum, "DexTransfer")
            .withArgs(
                await Calculum.CURRENT_EPOCH(),
                netTransfer.amount
            );
        console.log(
            "Transfer USDc from Dex Wallet to the Vault Successfully,Dex Transfer: ",
            netTransfer.amount.div(ethers.BigNumber.from(10).pow(18)).toString()
        );
        // Validate Last Balance of Vault in USDc, compare with value in the Excel Spread Sheet
        console.log(
            "Last Balance of Contract in USDc before Fees Transfer: ",
            (await USDc.balanceOf(Calculum.address)).div(ethers.BigNumber.from(10).pow(18)).toString()
        );
        expect(
            (await USDc.balanceOf(Calculum.address)).div(ethers.BigNumber.from(10).pow(18))
        ).to.equal(0);
        // Call FeeTransfer to transfer the amount of USDc to the Fee Address
        await expect(Calculum.connect(openZeppelinDefenderWallet).feesTransfer())
            .to.emit(Calculum, "FeesTransfer")
            .withArgs(await Calculum.CURRENT_EPOCH(), 176230154061654);
        // Verify Dex Wallet Balance
        const DexWalletBalance = (await USDc.balanceOf(dexWallet.address));
        expect(
            parseInt(DexWalletBalance.div(ethers.BigNumber.from(10).pow(17)).toString()) / 10
        ).to.equal(500016 / 10);
        // Start summarize the Epoch
        console.log('\x1b[32m%s\x1b[0m', 'Start Summarize the Epoch');
        console.log('\x1b[32m%s\x1b[0m', "Epoch Number: ", (await Calculum.CURRENT_EPOCH()).toString());
        const DexWalletBeginningBalance: BigNumber = (await Oracle.connect(dexWallet).GetAccount(dexWallet.address));
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance Beginning : ", ethers.BigNumber.from(DexWalletBeginningBalance).div(ethers.BigNumber.from(10).pow(18)).toString());
        console.log('\x1b[32m%s\x1b[0m', "(+/-) Strategy(ies) P/L : 4% ", parseInt(sub.div(ethers.BigNumber.from(10).pow(16)).toString()) / 100);
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance EoP before Fees : ", DexWalletBalance.div(ethers.BigNumber.from(10).pow(18)).toString());
        console.log('\x1b[32m%s\x1b[0m', "Management Fee per Vault Token: ", parseInt((await Utils.MgtFeePerVaultToken(Calculum.address)).div(ethers.BigNumber.from(10).pow(12)).toString()) / 10 ** 6);
        console.log('\x1b[32m%s\x1b[0m', "Performance Fee per Vault Token: ", parseInt((await Utils.PerfFeePerVaultToken(Calculum.address, USDc.address)).div(ethers.BigNumber.from(10).pow(12)).toString()) / 10 ** 6);
        console.log('\x1b[32m%s\x1b[0m', "Fees kept in TransferBot Wallet as gas reserves: ", parseInt(feeKept.div(ethers.BigNumber.from(10).pow(15)).toString()) / 1000);
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance EoP after Fees :", DexWalletBalance.sub(feeKept).div(ethers.BigNumber.from(10).pow(18)).toString());
        console.log('\x1b[32m%s\x1b[0m', "Deposit (Mint New Wallet): ", newDeposits.div(ethers.BigNumber.from(10).pow(18)).toString());
        console.log('\x1b[32m%s\x1b[0m', "Withdrawal (Burn Wallet): ", newWithdrawalsShares.div(ethers.BigNumber.from(10).pow(18)).toString());
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance End Period: ", parseInt(DexWalletBeginningBalance.add(newDeposits).sub(newWithdrawalsShares).sub(feeKept).div(ethers.BigNumber.from(10).pow(16)).toString()) / 100)
        console.log('\x1b[32m%s\x1b[0m', "Treasury Balance : ", (await USDc.balanceOf(treasuryWallet.address)).div(ethers.BigNumber.from(10).pow(18)).toString());
        console.log('\x1b[32m%s\x1b[0m', "Vault Token Price: ", parseInt((await Calculum.VAULT_TOKEN_PRICE(await Calculum.CURRENT_EPOCH())).div(ethers.BigNumber.from(10).pow(12)).toString()) / 10 ** 6);
        console.log('\x1b[32m%s\x1b[0m', "Net Transfer Amount: ", parseInt(netTransferAmount.div(ethers.BigNumber.from(10).pow(15)).toString()) / 1000);
        // The Amount of USDc in the Dex Wallet is 1500000 USDc minus the last fee
        console.log("Balance USDc of Dex Wallet: ", parseInt((await USDc.balanceOf(dexWallet.address)).div(ethers.BigNumber.from(10).pow(16)).toString()) / 100);
        // Verify the Balance of USDc of treasury in the Vault
        expect(
            (await USDc.balanceOf(treasuryWallet.address)).toString()
        ).to.equal("4028812743290461430905");
        console.log(
            "Transfer USDc to the Treasury Successfully,Fees Transfer: ",
            parseInt((await USDc.balanceOf(treasuryWallet.address)).toString()) /
            10 ** 18
        );
        // Validate Last Balance of TransferBot Role Wallet in USDc, comparring with value in the Excel Spread Sheet
        expect(
            (await USDc.balanceOf(openZeppelinDefenderWallet.address)).div(ethers.BigNumber.from(10).pow(18))
        ).to.equal(1000);
        console.log("Balance USDc of Open Zeppellin Wallet: ", parseInt((await USDc.balanceOf(openZeppelinDefenderWallet.address)).div(ethers.BigNumber.from(10).pow(16)).toString()) / 100);
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
            Calculum.connect(alice).deposit(ethers.utils.parseEther("100000"), alice.address)
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
            (await Calculum.EPOCH_START()).add(
                (await Calculum.EPOCH_DURATION()).mul(10)
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
                ethers.utils.parseUnits("54769963677141012645604", "wei")
            )
            .to.emit(Calculum, "Deposit")
            .withArgs(
                bob.address,
                bob.address,
                ethers.utils.parseEther("100000"),
                ethers.utils.parseUnits("54769963677141012645604", "wei")
            );
        // Verify the Value of bob int the WITHDRAWS VALUE mapping after to Claimed
        expect((await Calculum.DEPOSITS(bob.address)).status).to.equal(3); // 3 = Completed
        expect((await Calculum.DEPOSITS(bob.address)).amountAssets).to.equal(0);
        expect((await Calculum.DEPOSITS(bob.address)).amountShares).to.equal(0);
        expect((await Calculum.DEPOSITS(bob.address)).finalAmount).to.equal(ethers.utils.parseEther("100000"));

        // Try to Finalize the Epoch before the Finalization Time
        const time = Math.floor(
            (await ethers.provider.getBlock("latest")).timestamp
        );
        const asset: string = (await Calculum.asset()).toString();
        console.log("Address of ERC20 Asset: ", asset);
        const getPriceInPaymentToken = (
            await UniswapLibV3.getPriceInPaymentToken(asset, UNISWAP_ROUTER2)
        ).toString();
        console.log(
            "Value of getPriceInPaymentToken: ",
            parseInt(getPriceInPaymentToken) / 10 ** 18
        );
        const balancetransferBotRoleWallet = (
            await USDc.balanceOf(openZeppelinDefenderWallet.address)
        ).toString();
        console.log(
            "balancetransferBotRoleWallet: ",
            balancetransferBotRoleWallet / 10 ** 18
        );
        console.log(
            "Expected Amount: ",
            ((parseInt(balancetransferBotRoleWallet) / 10 ** 18) *
                parseInt(getPriceInPaymentToken)) /
            10 ** 18
        );
        await expect(Calculum.connect(openZeppelinDefenderWallet).finalizeEpoch())
            .to.revertedWithCustomError(Calculum, "VaultOutMaintenance");
        // Move before to Maintenance Windows Pre Start
        await network.provider.send("evm_setNextBlockTimestamp", [
            parseInt(move1.add(epochDuration - maintTimeBefore, "s").format("X")),
        ]);
        await network.provider.send("evm_mine", []);
        // Setting actual value of Assets
        await Oracle.connect(deployer).setAssetValue(ethers.utils.parseEther("51001"));
        console.log("Set Value of Assets in the Oracle: ", parseInt(ethers.utils.parseEther("51001").div(ethers.BigNumber.from(10).pow(17)).toString()) / 10);
        // sub
        const sub = ethers.utils.parseEther("51001").sub(ethers.utils.parseEther("50000"))
        // Adjust Balance of Dex Wallet to Real Value
        await Calculum.connect(deployer).modifyAcctMargin(sub.mul(1));
        // TODO: need to fix the smart contract of the vault, to handle the transfer to the dex wallet (deposit or withdraw)
        console.log("Adjust Balance of Dex Wallet to Real Value: ", parseInt(sub.div(ethers.BigNumber.from(10).pow(17)).toString()) / 10);
        expect((await USDc.balanceOf(dexWallet.address)).div(ethers.BigNumber.from(10).pow(18))).to.equal(ethers.utils.parseUnits("51002", "wei"));
        const newDeposits: BigNumber = (await Calculum.newDeposits());
        const newWithdrawalsShares: BigNumber = (await Calculum.newWithdrawals());
        // Finalize the Epoch
        await Calculum.connect(openZeppelinDefenderWallet).finalizeEpoch();
        console.log("Finalize the Tenth Epoch Successfully");
        // Verify the Balance of Transfer Bot Role Address in USDc
        expect(
            (await USDc.balanceOf(openZeppelinDefenderWallet.address)).toString()
        ).to.equal(ethers.utils.parseEther("1000"));
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
        expect(netTransferAmount.div(ethers.BigNumber.from(10).pow(12))).to.equal(ethers.utils.parseUnits("159612862", "wei"));
        console.log("Vault Token Price: ", (await Calculum.VAULT_TOKEN_PRICE(await Calculum.CURRENT_EPOCH())).div(ethers.BigNumber.from(10).pow(12)).toString());
        expect((await Calculum.VAULT_TOKEN_PRICE(await Calculum.CURRENT_EPOCH())).div(ethers.BigNumber.from(10).pow(12))).to.equal(928256);
        // Verify the Transfer Bot Gas Reserve in USD is Zero
        const feeKept = await Utils.CalculateTransferBotGasReserveDA(Calculum.address, USDc.address);
        expect(feeKept).to.equal(0);
        // Call dexTransfer to transfer the amount of USDc to the Vault
        await expect(Calculum.connect(openZeppelinDefenderWallet).dexTransfer())
            .to.emit(USDc, "Transfer")
            .withArgs(
                dexWallet.address,
                Calculum.address,
                netTransfer.amount
            )
            .to.emit(Calculum, "DexTransfer")
            .withArgs(
                await Calculum.CURRENT_EPOCH(),
                netTransfer.amount
            );
        console.log(
            "Transfer USDc from Dex Wallet to the Vault Successfully,Dex Transfer: ",
            netTransfer.amount.div(ethers.BigNumber.from(10).pow(18)).toString()
        );
        // Validate Last Balance of Vault in USDc, compare with value in the Excel Spread Sheet
        console.log(
            "Last Balance of Contract in USDc before Fees Transfer: ",
            (await USDc.balanceOf(Calculum.address)).div(ethers.BigNumber.from(10).pow(18)).toString()
        );
        expect(
            (await USDc.balanceOf(Calculum.address)).div(ethers.BigNumber.from(10).pow(18))
        ).to.equal(159);
        // Call FeeTransfer to transfer the amount of USDc to the Fee Address
        await expect(Calculum.connect(openZeppelinDefenderWallet).feesTransfer())
            .to.emit(Calculum, "FeesTransfer")
            .withArgs(await Calculum.CURRENT_EPOCH(), ethers.utils.parseUnits("159612862143367555006", "wei"));
        // Verify Dex Wallet Balance
        const DexWalletBalance = (await USDc.balanceOf(dexWallet.address));
        expect(
            parseInt(DexWalletBalance.div(ethers.BigNumber.from(10).pow(17)).toString()) / 10
        ).to.equal(50843);
        // Start summarize the Epoch
        console.log('\x1b[32m%s\x1b[0m', 'Start Summarize the Epoch');
        console.log('\x1b[32m%s\x1b[0m', "Epoch Number: ", (await Calculum.CURRENT_EPOCH()).toString());
        const DexWalletBeginningBalance: BigNumber = (await Oracle.connect(dexWallet).GetAccount(dexWallet.address));
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance Beginning : ", ethers.BigNumber.from(DexWalletBeginningBalance).div(ethers.BigNumber.from(10).pow(18)).toString());
        console.log('\x1b[32m%s\x1b[0m', "(+/-) Strategy(ies) P/L : 4% ", parseInt(sub.div(ethers.BigNumber.from(10).pow(16)).toString()) / 100);
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance EoP before Fees : ", DexWalletBalance.div(ethers.BigNumber.from(10).pow(18)).toString());
        console.log('\x1b[32m%s\x1b[0m', "Management Fee per Vault Token: ", parseInt((await Utils.MgtFeePerVaultToken(Calculum.address)).div(ethers.BigNumber.from(10).pow(12)).toString()) / 10 ** 6);
        console.log('\x1b[32m%s\x1b[0m', "Performance Fee per Vault Token: ", parseInt((await Utils.PerfFeePerVaultToken(Calculum.address, USDc.address)).div(ethers.BigNumber.from(10).pow(12)).toString()) / 10 ** 6);
        console.log('\x1b[32m%s\x1b[0m', "Fees kept in TransferBot Wallet as gas reserves: ", parseInt(feeKept.div(ethers.BigNumber.from(10).pow(15)).toString()) / 1000);
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance EoP after Fees :", DexWalletBalance.sub(feeKept).div(ethers.BigNumber.from(10).pow(18)).toString());
        console.log('\x1b[32m%s\x1b[0m', "Deposit (Mint New Wallet): ", newDeposits.div(ethers.BigNumber.from(10).pow(18)).toString());
        console.log('\x1b[32m%s\x1b[0m', "Withdrawal (Burn Wallet): ", newWithdrawalsShares.div(ethers.BigNumber.from(10).pow(18)).toString());
        console.log('\x1b[32m%s\x1b[0m', "Dex Wallet Balance End Period: ", parseInt(DexWalletBeginningBalance.add(newDeposits).sub(newWithdrawalsShares).sub(feeKept).div(ethers.BigNumber.from(10).pow(16)).toString()) / 100)
        console.log('\x1b[32m%s\x1b[0m', "Treasury Balance : ", (await USDc.balanceOf(treasuryWallet.address)).div(ethers.BigNumber.from(10).pow(18)).toString());
        console.log('\x1b[32m%s\x1b[0m', "Vault Token Price: ", parseInt((await Calculum.VAULT_TOKEN_PRICE(await Calculum.CURRENT_EPOCH())).div(ethers.BigNumber.from(10).pow(12)).toString()) / 10 ** 6);
        console.log('\x1b[32m%s\x1b[0m', "Net Transfer Amount: ", parseInt(netTransferAmount.div(ethers.BigNumber.from(10).pow(15)).toString()) / 1000);
        // The Amount of USDc in the Dex Wallet is 1500000 USDc minus the last fee
        console.log("Balance USDc of Dex Wallet: ", parseInt((await USDc.balanceOf(dexWallet.address)).div(ethers.BigNumber.from(10).pow(16)).toString()) / 100);
        // Verify the Balance of USDc of treasury in the Vault
        expect(
            (await USDc.balanceOf(treasuryWallet.address)).toString()
        ).to.equal("4188425605433828985911");
        console.log(
            "Transfer USDc to the Treasury Successfully,Fees Transfer: ",
            parseInt((await USDc.balanceOf(treasuryWallet.address)).toString()) /
            10 ** 18
        );
        // Validate Last Balance of TransferBot Role Wallet in USDc, comparring with value in the Excel Spread Sheet
        expect(
            (await USDc.balanceOf(openZeppelinDefenderWallet.address)).div(ethers.BigNumber.from(10).pow(18))
        ).to.equal(1000);
        console.log("Balance USDc of Open Zeppellin Wallet: ", parseInt((await USDc.balanceOf(openZeppelinDefenderWallet.address)).div(ethers.BigNumber.from(10).pow(16)).toString()) / 100);
    });

    afterEach(async () => {
        console.log(
            "Balance of Vault in USDc after each test: ",
            (await USDc.balanceOf(Calculum.address)).div(ethers.BigNumber.from(10).pow(18)).toString()
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
