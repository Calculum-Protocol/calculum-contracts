import { ethers } from 'hardhat';
import { WETH9, WETH9__factory } from "../typechain-types";

import UniswapV3FactoryArtifact from '../lib/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json';
import UniswapV3PairArtifact from '../lib/v3-core/artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json';
import UniswapV3Router02Artifact from '../lib/v3-periphery/artifacts/contracts/SwapRouter.sol/SwapRouter.json';


async function createMockWETH(unideployer:any) {
    // deploy mock WETH
    const WETHFactory = (await ethers.getContractFactory(
        "WETH9",
        unideployer
    )) as WETH9__factory;
    const WETH = (await WETHFactory.deploy()) as WETH9;
    await WETH.deployed();
    return WETH;
}

async function createUniswapFactory(unideployer:any) {
    // deploy uni factory
    const UniswapV2Factory = await ethers.getContractFactory(
        UniswapV3FactoryArtifact.abi,
        UniswapV3FactoryArtifact.bytecode
    );
    const uniswapV2Factory = await UniswapV2Factory.connect(unideployer).deploy();
    await uniswapV2Factory.deployed();
    return uniswapV2Factory;
}

async function createUniswapRouter02(unideployer:any, uniswapV2Factory:any, WETH:any) {
    // deploy uni router
    const UniswapV2Router02 = await ethers.getContractFactory(
        UniswapV3Router02Artifact.abi,
        UniswapV3Router02Artifact.bytecode
    );
    const uniswapV2Router02 = await UniswapV2Router02.connect(unideployer).deploy(uniswapV2Factory.address, WETH.address);
    await uniswapV2Router02.deployed();
    return uniswapV2Router02;
}

export async function mockUniswap(unideployer: any) {
    const WETH = await createMockWETH(unideployer);
    const uniswapV2Factory = await createUniswapFactory(unideployer);
    const uniswapV2Router02 = await createUniswapRouter02(unideployer, uniswapV2Factory, WETH)

    // for event decoding
    const UniswapV2PairContract = await ethers.getContractFactory(
        UniswapV3PairArtifact.abi,
        UniswapV3PairArtifact.bytecode
    );

    return { WETH, uniswapV2Factory, uniswapV2Router02, UniswapV2PairContract };
}

async function mockLiquidity(unideployer:any, supplier:any, token0Contract:any, amount0:any, amountWeth:any) {
    const { WETH, uniswapV2Factory, uniswapV2Router02, UniswapV2PairContract } = await mockUniswap(unideployer);
    // get 10 WETH
    await WETH.connect(supplier).deposit({ value: amountWeth });

    await WETH.connect(supplier).approve(uniswapV2Router02.address, ethers.utils.parseEther('100000'));
    await token0Contract.connect(supplier).approve(uniswapV2Router02.address, ethers.utils.parseEther('100000'));

    // create weth / kwan
    const tx = await uniswapV2Factory.createPair(token0Contract.address, WETH.address);
    const { pair: pairCreated } = (await (await tx).wait()).events[0].args;

    const uniswapToken0Weth = UniswapV2PairContract.attach(pairCreated);

    await uniswapV2Router02.connect(supplier).addLiquidity(
        token0Contract.address,
        WETH.address,
        amount0,
        amountWeth,
        1,
        1,
        supplier.address,
        // wait time
        '999999999999999999999999999999',
    );

    return {
        WETH, uniswapV2Factory, uniswapV2Router02, uniswapV2Pair: uniswapToken0Weth
    }
}

module.exports = {
    mockUniswap,
    mockLiquidity
}