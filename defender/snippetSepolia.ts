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
        "name": "feesTransfer",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
];

// Contract address
const contractAddress = '0x63d5d50e5c5B016f7A428A57Cd6FEc018b5a3071';

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

        // Pause to ensure the state is updated
        await snooze(2000); // Adjust the delay as necessary

        // Call dexTransfer with the argument true
        const dexTransferTx1 = await contract.dexTransfer(true);
        console.log('Transaction for dexTransfer sent:', dexTransferTx1.hash);

        // Wait for the dexTransfer transaction to be confirmed
        await dexTransferTx1.wait();
        console.log('Transaction for dexTransfer confirmed.');

        // Pause to ensure the state is updated
        await snooze(360000); // Adjust the delay as necessary

        // Call dexTransfer with the argument true
        const dexTransferTx2 = await contract.dexTransfer(false);
        console.log('Transaction for dexTransfer sent:', dexTransferTx2.hash);

        // Wait for the dexTransfer transaction to be confirmed
        await dexTransferTx2.wait();
        console.log('Transaction for dexTransfer confirmed.');

        // Pause to ensure the state is updated
        await snooze(2000); // Adjust the delay as necessary

        // Call CurrentEpoch to force the contract to update the epoch value
        const feesTransferTx = await contract.feesTransfer();
        console.log('Transaction for CurrentEpoch sent:', feesTransferTx.hash);

        // Wait for the CurrentEpoch transaction to be confirmed
        await feesTransferTx.wait();
        console.log('Transaction for CurrentEpoch confirmed.');

        return {
            finalizeEpochTxHash: finalizeEpochTx.hash,
            dexTransferTx1Hash: dexTransferTx1.hash,
            dexTransferTx2Hash: dexTransferTx2.hash,
            feesTransferTxHash: feesTransferTx.hash,
            signerAddress: signerAddress
        };
    } catch (error) {
        console.error('Error in handler:', error);
        throw error;
    }
};
