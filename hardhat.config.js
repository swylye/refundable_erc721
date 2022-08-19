require("@nomiclabs/hardhat-waffle")
require('@nomicfoundation/hardhat-toolbox')
require("dotenv").config()
require("@nomiclabs/hardhat-etherscan")
require("hardhat-gas-reporter")
require("solidity-coverage")
require("hardhat-deploy")
require("@nomiclabs/hardhat-solhint");

const RINKEBY_RPC_URL = process.env.RINKEBY_RPC_URL
const GOERLI_RPC_URL = process.env.GOERLI_RPC_URL
const DEV00_PRIVATE_KEY = process.env.DEV00_PRIVATE_KEY
const DEV01_PRIVATE_KEY = process.env.DEV01_PRIVATE_KEY
const DEV02_PRIVATE_KEY = process.env.DEV02_PRIVATE_KEY
const DEV03_PRIVATE_KEY = process.env.DEV03_PRIVATE_KEY
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY
const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY

module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    rinkeby: {
      url: RINKEBY_RPC_URL,
      accounts: [DEV01_PRIVATE_KEY, DEV02_PRIVATE_KEY, DEV03_PRIVATE_KEY, DEV00_PRIVATE_KEY],
      chainId: 4,
      blockConfirmations: 6,
      gas: 6000000,
    },
    goerli: {
      url: GOERLI_RPC_URL,
      accounts: [DEV01_PRIVATE_KEY, DEV02_PRIVATE_KEY, DEV03_PRIVATE_KEY, DEV00_PRIVATE_KEY],
      chainId: 5,
      blockConfirmations: 6,
      gas: 6000000,
    },
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY
  },
  solidity: {
    compilers: [
      { version: "0.8.8" },
    ]
  },
  gasReporter: {
    enabled: true,
    outputFile: "gas-report.txt",
    noColors: true,
    currency: "USD",
    // coinmarketcap: COINMARKETCAP_API_KEY,
    // token: "ETH",
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
    user1: {
      default: 1,
    },
    user2: {
      default: 2,
    },
  },
  // mocha: {
  //   timeout: 100000000,
  // },
};
