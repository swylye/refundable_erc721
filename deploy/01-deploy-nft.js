const { networkConfig, developmentChains } = require("../helper-hardhat-config")
const { getNamedAccounts, deployments, network, run, ethers } = require("hardhat")
const { verify } = require("../utils/verify")

const VRF_SUB_FUND_AMOUNT = ethers.utils.parseEther("10")

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId

    let vrfCoordinatorAddress, subscriptionId, vrfCoordinatorV2Mock


    const MAX_SUPPLY = networkConfig[chainId]['maxSupply'] || 1000
    const NAME = 'Refundable NFT'
    const SYMBOL = "RNFT"
    const args = [NAME, SYMBOL, MAX_SUPPLY]

    const nft = await deploy("RefundableERC721", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })

    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        await verify(nft.address, args)
    }
    log("========================================================================================================================================")
}

module.exports.tags = ["all", "nft"]