const { DefenderRelaySigner, DefenderRelayProvider } = require('defender-relay-client/lib/ethers');
const { ethers } = require('ethers');

// Contract ABI
const contractAbi = [
    {
        inputs: [],
        name: "finalizeEpoch",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        "inputs": [],
        "name": "CURRENT_EPOCH",
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
    },
    {
        inputs: [
            {
                internalType: "bool",
                name: "kind",
                type: "bool",
            },
        ],
        name: "dexTransfer",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [],
        name: "feesTransfer",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [],
        name: "isDexTxPending",
        outputs: [{ internalType: "bool", name: "", type: "bool" }],
        stateMutability: "view",
        type: "function",
    },
];

// Contract address
const contractAddress = '0xF92b7c95A2f5F60Ba8127F7A2F10833Ca3431Ed7';

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

        // Pause to ensure the state is updated
        await snooze(300); // Adjust the delay as necessary

        // Call CurrentEpoch to force the contract to update the epoch value
        const CURRENT_EPOCH = await contract.CURRENT_EPOCH();

        if (CURRENT_EPOCH == 0) {
            const currentEpochTx = await contract.CurrentEpoch();

            await currentEpochTx.wait();
            console.log('Transaction for Current Epoch confirmed:', currentEpochTx.hash);
        }

        // Pause to ensure the state is updated
        await snooze(200); // Adjust the delay as necessary

        // Check if is pending
        if (await contract.isDexTxPending()) {

            // Call dexTransfer with the argument true
            const dexTransferTx2 = await contract.dexTransfer(false);
            console.log('Transaction for dexTransfer sent:', dexTransferTx2.hash);

            // Wait for the dexTransfer transaction to be confirmed
            await dexTransferTx2.wait();
            console.log('Transaction for dexTransfer confirmed.');

        }

        // Pause to ensure the state is updated 4 minutes y 30 seconds
        await snooze(30000); // Adjust the delay as necessary

        // Call CurrentEpoch to force the contract to update the epoch value
        let feesTransferTx;
        // Fee transfer only executed if the current epoch is greater than 0
        if (CURRENT_EPOCH > 0) {
            const feesTransferTx = await contract.feesTransfer();

            // Wait for the CurrentEpoch transaction to be confirmed
            await feesTransferTx.wait();
            console.log('Transaction for feesTransferTx confirmed:', feesTransferTx.hash);
        }
        return {
            feesTransferTxHash: feesTransferTx.hash ?? null,
            signerAddress: signerAddress
        };
    } catch (error) {
        console.error('Error in handler:', error);
        throw error;
    }
};
