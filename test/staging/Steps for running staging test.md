## Steps for running staging test
1. If you don't have an existing subscription ID on Goerli testnet, set it up [here](https://vrf.chain.link/goerli/new)
2. Once you have your subscription ID, edit the value into helper-hardhat-config.js file under the appropriate chainId
3. Deploy the raffle contract onto Goerli testnet and take note of the deployed contract address
4. Add raffle contract address as consumer for the subscription ID
5. Set up Chainlink Keeper [here](https://keepers.chain.link/goerli/new)
6. Make sure that both the subscription and keeper are funded. Recommend to fund at least 2 LINKs for subscription and 8 LINKs for keeper.
7. Proceed to run staging test
