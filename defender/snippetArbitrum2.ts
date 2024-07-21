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
const contractAddress = '0xEcb1B3676a929f46C723Ac76A7e17c472338e76C';

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
        await snooze(500); // Adjust the delay as necessary

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
        const feesTransferTx = await contract.feesTransfer();
        console.log('Transaction for feesTransferTx sent:', feesTransferTx.hash);

        // Wait for the CurrentEpoch transaction to be confirmed
        await feesTransferTx.wait();
        console.log('Transaction for feesTransferTx confirmed.');

        return {
            feesTransferTxHash: feesTransferTx.hash,
            signerAddress: signerAddress
        };
    } catch (error) {
        console.error('Error in handler:', error);
        throw error;
    }
};