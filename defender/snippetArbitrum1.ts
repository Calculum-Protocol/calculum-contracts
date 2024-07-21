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

        // Call finalizeEpoch
        const finalizeEpochTx = await contract.finalizeEpoch();
        console.log('Transaction for finalizeEpoch sent:', finalizeEpochTx.hash);

        // Wait for the finalizeEpoch transaction to be confirmed
        await finalizeEpochTx.wait();
        console.log('Transaction for finalizeEpoch confirmed.');

        // Pause to ensure the state is updated
        await snooze(500); // Adjust the delay as necessary

        // Check if is pending
        if (await contract.isDexTxPending()) {
            
            // Call dexTransfer with the argument true
            const dexTransferTx1 = await contract.dexTransfer(true);
            console.log('Transaction for dexTransfer sent:', dexTransferTx1.hash);

            // Wait for the dexTransfer transaction to be confirmed
            await dexTransferTx1.wait();
            console.log('Transaction for dexTransfer confirmed.');

        }

        return {
            finalizeEpochTxHash: finalizeEpochTx.hash,
            signerAddress: signerAddress
        };
    } catch (error) {
        console.error('Error in handler:', error);
        throw error;
    }
};