const { ethers } = require("hardhat")

const networkConfig = {
    5: {
        name: "goerli",
        maxSupply: 1000,
        interval: 60, // 1 minute
    },
    31337: {
        name: "hardhat",
        maxSupply: 10,
        interval: 30, // 30 seconds
    }
}

const developmentChains = ["hardhat", "localhost"]


module.exports = {
    networkConfig,
    developmentChains,
}