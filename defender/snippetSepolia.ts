const { DefenderRelaySigner, DefenderRelayProvider } = require('defender-relay-client/lib/ethers');
const { ethers } = require('ethers');

// Contract ABI
const contractAbi = [
    {
        "inputs": [],
        "name": "finalizeEpoch",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "bool",
                "name": "kind",
                "type": "bool"
            }
        ],
        "name": "dexTransfer",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getCurrentEpoch",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "CurrentEpoch",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];

// Contract address
const contractAddress = '0x8C468A95EF7dD41eFF8d921d34Cc5dD6695bbd8F';

// Snooze function to pause execution
const snooze = ms => new Promise(resolve => setTimeout(resolve, ms));

exports.handler = async function (credentials) {
    try {
        // Initialize Defender Relay Provider and Signer
        const provider = new DefenderRelayProvider(credentials);
        const signer = new DefenderRelaySigner(credentials, provider);

        // Log the signer address for debugging
        const signerAddress = await signer.getAddress();
        console.log('Signer address:', signerAddress);

        // Create an instance of the contract
        const contract = new ethers.Contract(contractAddress, contractAbi, signer);

        // Call finalizeEpoch
        const finalizeEpochTx = await contract.finalizeEpoch();
        console.log('Transaction for finalizeEpoch sent:', finalizeEpochTx.hash);

        // Wait for the finalizeEpoch transaction to be confirmed
        await finalizeEpochTx.wait();
        console.log('Transaction for finalizeEpoch confirmed.');

        // Call dexTransfer with the argument true
        const dexTransferTx = await contract.dexTransfer(true);
        console.log('Transaction for dexTransfer sent:', dexTransferTx.hash);

        // Wait for the dexTransfer transaction to be confirmed
        await dexTransferTx.wait();
        console.log('Transaction for dexTransfer confirmed.');

        // Pause to ensure the state is updated
        await snooze(240000); // Adjust the delay as necessary

        // Call CurrentEpoch to force the contract to update the epoch value
        const currentEpochTx = await contract.CurrentEpoch();
        console.log('Transaction for CurrentEpoch sent:', currentEpochTx.hash);

        // Wait for the CurrentEpoch transaction to be confirmed
        await currentEpochTx.wait();
        console.log('Transaction for CurrentEpoch confirmed.');

        return {
            finalizeEpochTxHash: finalizeEpochTx.hash,
            dexTransferTxHash: dexTransferTx.hash,
            currentEpochTxHash: currentEpochTx.hash,
            signerAddress: signerAddress
        };
    } catch (error) {
        console.error('Error in handler:', error);
        throw error;
    }
};
