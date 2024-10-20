/* eslint-disable node/no-unpublished-import */
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-foundry";
import "@nomicfoundation/hardhat-chai-matchers";
import "@nomiclabs/hardhat-ethers";
import "hardhat-gas-reporter";
import "hardhat-contract-sizer";
import "@openzeppelin/hardhat-upgrades";
import "solidity-docgen";
import { relative } from "path";
import * as dotenv from "dotenv";
import { task } from "hardhat/config";

dotenv.config();

const MNEMONIC =
    process.env.MNEMONIC!;
const API_KEY = process.env.INFURAKEY || "ffc8f8f8f8f8f8f8f8f8f8f8f8f8f8f8";
const ALCHEMY_KEY = process.env.ALCHEMY_KEY || "ffc8f8f8f8f8f8f8f8f8f8f8f8f8f8";
const ACCOUNTS = parseInt(process.env.ACCOUNTS!);
const PRIVATE_KEY = process.env.PRIVATE_KEY!;

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
    const accounts = await hre.ethers.getSigners();

    for (const account of accounts) {
        console.log(account.address);
    }
});


// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
    networks: {
        hardhat: {
            chainId: 42161,
            throwOnTransactionFailures: true,
            throwOnCallFailures: true,
            forking: {
                url: `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
            },
            accounts: {
                mnemonic: MNEMONIC,
                count: ACCOUNTS,
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
        arbitrumSepolia: {
            url: `https://arbitrum-sepolia.infura.io/v3/${API_KEY}`,
            accounts: {
                mnemonic: MNEMONIC,
                accounts: ACCOUNTS,
            },
            // accounts: [PRIVATE_KEY]
        },
        arbitrumOne: {
            chainId: 42161,
            url: `https://arbitrum-mainnet.infura.io/v3/${API_KEY}`,
            // accounts: {
            //     mnemonic: MNEMONIC,
            //     accounts: ACCOUNTS,
            // },
            accounts: [PRIVATE_KEY]
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
    defaultNetwork: "hardhat",
    docgen: {
        templates: "./templates",
        path: "./docs",
        pages: (item, file) =>
            file.absolutePath.startsWith("src")
                ? relative("src", file.absolutePath).replace(".sol", ".md")
                : undefined,
    },
    mocha: {
        timeout: 1500000,
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
            process.env.COINMARKETCAP_API_KEY,
        enabled: true,
        gasPriceApi: `https://api.arbiscan.io/api?module=proxy&action=eth_gasPrice&apikey=${process.env.ARBITRUM_API_KEY}`,
        // gasPrice: 35
    },
    etherscan: {
        // Your API key for Etherscan
        // Obtain one at https://etherscan.io/
        // apiKey: process.env.ETHERSCAN_API_KEY,
        // apiKey: process.env.OPTIMISM_API_KEY,
        apiKey: {
            mainnet: process.env.ETHERSCAN_API_KEY,
            goerli: process.env.ETHERSCAN_API_KEY,
            sepolia: process.env.ETHERSCAN_API_KEY,
            polygon: process.env.POLYGON_API_KEY,
            mumbai: process.env.POLYGON_API_KEY,
            optimism: process.env.OPTIMISM_API_KEY,
            arbitrumOne: process.env.ARBITRUM_API_KEY,
            avalance: process.env.SNOWTRACE_API_KEY,
            arbitrumSepolia: process.env.ARBITRUM_API_KEY
        },
        // apiKey: process.env.POLYGON_API_KEY
        // apiKey: SNOWTRACE_API_KEY,
        customChains: [
            {
                network: "arbitrumSepolia",
                chainId: 421614,
                urls: {
                    apiURL: "https://api-sepolia.arbiscan.io/api",
                    browserURL: "https://sepolia.arbiscan.io"
                }
            }
        ]
    },
    solidity: {
        compilers: [
            {
                version: "0.8.24",
                settings: {
                    viaIR: true,
                    optimizer: {
                        enabled: true,
                        runs: 200,
                    },
                },
            },
            {
                version: "0.8.19",
                settings: {
                    viaIR: true,
                    optimizer: {
                        enabled: true,
                        runs: 150,
                    },
                },
            },
            {
                version: "0.8.17",
                settings: {
                    viaIR: true,
                    optimizer: {
                        enabled: true,
                        runs: 500,
                    },
                },
            },
            {
                version: "0.8.4",
                settings: {
                    viaIR: true,
                    optimizer: {
                        enabled: true,
                        runs: 999,
                    },
                },
            },
            {
                version: "0.8.2",
                settings: {
                    viaIR: true,
                    optimizer: {
                        enabled: true,
                        runs: 999,
                    },
                },
            },
            {
                version: "0.7.0",
                settings: {
                    viaIR: true,
                    optimizer: {
                        enabled: true,
                        runs: 999,
                    },
                },
            },
        ],
    },
};
