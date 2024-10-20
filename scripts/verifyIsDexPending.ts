import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { network } from 'hardhat';

dotenv.config();

const INFURAKEY = process.env.INFURAKEY;
const PRIVATEKEY = process.env.PRIVATE_KEY;

// export provider from hardhat config
const provider = new ethers.JsonRpcProvider(`https://arbitrum-sepolia.infura.io/v3/${INFURAKEY}`);

// Replace with your contract's address
const contractAddress = '0x9E09d335CAEdB4D76708854bFaCd5228946543E5';

// ABI of the isDexTxPending method
const abi = [
    {
        "inputs": [],
        "name": "isDexTxPending",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
];

async function checkPendingTransaction() {
    // Create a contract instance
    const contract = new ethers.Contract(contractAddress, abi, provider);

    try {
        // Call the isDexTxPending method
        const isPending = await contract.isDexTxPending();

        // Check if there is a pending transaction
        if (isPending) {
            console.log('Transaction DEX is Pending');
        } else {
            console.log('No DEX transactions are pending');
        }
    } catch (error) {
        console.error('Error calling isDexTxPending:', error);
    }
}

checkPendingTransaction();