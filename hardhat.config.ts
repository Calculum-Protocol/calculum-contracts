/* eslint-disable node/no-unpublished-import */
import * as dotenv from "dotenv";

import { task } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";
import "@nomiclabs/hardhat-truffle5";
import "@nomiclabs/hardhat-ethers";
import "hardhat-contract-sizer";
import "@openzeppelin/hardhat-upgrades";

dotenv.config();

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

const MNEMONIC =
  process.env.MNEMONIC ||
  "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat";
const API_KEY = process.env.INFURAKEY || "ffc8f8f8f8f8f8f8f8f8f8f8f8f8f8f8";
const ACCOUNTS = parseInt(process.env.ACCOUNTS!);

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  networks: {
    hardhat: {
      throwOnTransactionFailures: true,
      throwOnCallFailures: true,
      forking: {
        url: `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_KEY}`,
        accounts: {
          mnemonic: process.env.MNEMONIC,
          balance: 1000,
          count: 100,
        },
      },
    },
    // hardhat: {
    //   chainId: 1,
    //   accounts: {
    //     mnemonic: MNEMONIC,
    //     accounts: ACCOUNTS,
    //   },
    //   // accounts: [PRIVATE_KEY]
    //   allowUnlimitedContractSize: true,
    //   timeout: 100000,
    // },
    local: {
      url: "http://127.0.0.1:8545",
      allowUnlimitedContractSize: true,
      timeout: 100000,
    },
    mainnet: {
      chainId: 1,
      url: `https://mainnet.infura.io/v3/${API_KEY}`,
      accounts: {
        mnemonic: MNEMONIC,
      },
    },
    goerli: {
      url: `https://goerli.infura.io/v3/${API_KEY}`,
      accounts: {
        mnemonic: MNEMONIC,
        accounts: ACCOUNTS,
      },
      // accounts: [PRIVATE_KEY]
    },
    sepolia: {
      url: `https://sepolia.infura.io/v3/${API_KEY}`,
      accounts: {
        mnemonic: MNEMONIC,
        accounts: ACCOUNTS,
      },
      // accounts: [PRIVATE_KEY]
    },
    polygon: {
      chainId: 137,
      url: `https://polygon-mainnet.infura.io/v3/${API_KEY}`,
      accounts: {
        mnemonic: MNEMONIC,
        accounts: ACCOUNTS,
      },
      // accounts: [PRIVATE_KEY]
    },
    mumbai: {
      chainId: 80001,
      url: `https://polygon-mumbai.infura.io/v3/${API_KEY}`,
      accounts: {
        mnemonic: MNEMONIC,
        accounts: ACCOUNTS,
      },
      // accounts: [PRIVATE_KEY]
    },
  },
  mocha: {
    timeout: 500000,
  },
  contractSizer: {
    alphaSort: true,
    runOnCompile: true,
    disambiguatePaths: false,
  },
  gasReporter: {
    currency: "USD",
    token: "ETH",
    coinmarketcap:
      process.env.COINMARKETCAP_API_KEY ||
      "f7169cda-d705-4f67-9e99-9a3985d713a4",
    enabled: true,
    gasPriceApi: `https://api.etherscan.io/api?module=proxy&action=eth_gasPrice&apikey=${process.env.ETHERSCAN_API_KEY}`,
    // gasPrice: 50
  },
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: process.env.ETHERSCAN_API_KEY,
    // apiKey: process.env.POLYGON_API_KEY
    // apiKey: SNOWTRACE_API_KEY,
  },
  solidity: {
    version: "0.8.17",
    settings: {
      viaIR: true,
      optimizer: {
        enabled: true,
        runs: 500,
      },
    },
  },
};
