# MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

**THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.**

## Smart Contract Disclaimer

By interacting with this smart contract, you acknowledge and agree that you are engaging with this technology at your own risk. This smart contract is currently a Minimum Viable Product (MVP) and is intended for testing purposes only. It has not undergone any formal security audit, and as such, there may be vulnerabilities that could lead to the loss of assets.

### No Guarantees and Liability Disclaimer

This smart contract is provided on an "as-is" and "as-available" basis without any warranties of any kind, either express or implied, including but not limited to, the implied warranties of merchantability, fitness for a particular purpose, and non-infringement. We do not guarantee the functionality, security, or reliability of this smart contract. The developers and contributors to this project shall not be liable for any direct, indirect, incidental, special, consequential, or exemplary damages, including but not limited to, damages for loss of profits, goodwill, use, data, or other intangible losses, resulting from the use or inability to use this smart contract.

### Regulatory Compliance

Using this smart contract does not ensure compliance with any legal or regulatory requirements. It is the user's responsibility to ensure that their use of this smart contract complies with all applicable laws and regulations in their respective jurisdiction.

### Impermanent Loss

Users should be aware of the risk of impermanent loss, which is a potential loss that can occur when providing liquidity to automated market makers or similar decentralized finance protocols. The value of your assets can fluctuate based on market conditions and the behavior of other users in the ecosystem.

### Explicit Notice of Non-Audit

Please note that this smart contract has not been audited. As such, there may be unknown vulnerabilities or bugs that could potentially be exploited, leading to the loss of funds. Users are strongly advised to use this contract for testing purposes only and to not deposit significant amounts of assets.

### Conclusion

By proceeding to interact with this smart contract, you acknowledge that you have read, understood, and agree to all the terms outlined in this disclaimer. You accept the inherent risks involved and agree that you will not hold the developers, contributors, or any associated parties liable for any losses or damages incurred.

---

# Calculum Vault

Calculum v1 is the first version our Vault, based on ERC4626, with several improvement and adaptation

v1 changes include:

- Full compliance with ERC-4626
- Some improven of security
- Gas Cost improvement
- Integration with Trader Bot, API in the Unit-Test

## Getting Started

First, install the dependencies with yarn:

```bash
yarn install
```

Next, we need to populate the .env file with these values.\
Copy the .env.example -> .env and fill out the value.\
Reach out to the team if you need help on these variables. The `TEST_URI` needs to be an archive node.

```bash
MNEMONIC=
INFURAKEY=
PRIVATE_KEY=
DEPLOYER_ADDRESS=
COINMARKETCAP_API_KEY=
BSCSCAN_API_KEY=
ETHERSCAN_API_KEY=
POLYGON_API_KEY=
ALCHEMY_KEY=
HTTP_HOST_TESTNET = https://api.stage.dydx.exchange
WS_HOST_TESTNET = wss://api.stage.dydx.exchange/v3/ws
ACCOUNTS=
```

Can run the Build of contracts

```bash
# Run all the tests
yarn build
```

Finally, we can run the tests in Hardhat:

```bash
# Run all the tests
yarn test
```

## Deployment

Calculum Vault V1 uses [hardhat-deploy](https://github.com/wighawag/hardhat-deploy) to manage contract deployments to the blockchain.

To deploy all the contracts in the Testnet for Short Support of ethereum forum to Sepolia, do

```
yarn deploy:sepolia
```

To deploy all the contracts in the Testnet for long Support of ethereum forum to Goerli, do

```
yarn deploy:testnet
```

## Testing

Will run all tests on Ethereum fork-mainnet based on Alchemy RPC

```
yarn test
```

Runs local Own Ethereum Node (Hardhat Local Node)

```
yarn test-local
```

### Getting Started

 * Use Foundry:
```bash
forge install
forge test
```

### Features

 * Write / run tests with either Hardhat or Foundry:
```bash
forge test
# or
npx hardhat test
```

 * Use Hardhat's task framework
```bash
npx hardhat example
```

 * Install libraries with Foundry which work with Hardhat.
```bash
forge install rari-capital/solmate # Already in this repo, just an example
```

### Notes

Whenever you install new libraries using Foundry, make sure to update your `remappings.txt` file by running `forge remappings > remappings.txt`. This is required because we use `hardhat-preprocessor` and the `remappings.txt` file to allow Hardhat to resolve libraries you install with Foundry.
