const { assert, expect } = require("chai")
const { providers, BigNumber } = require("ethers")
const { network, ethers, getNamedAccounts } = require("hardhat")
const { isCallTrace } = require("hardhat/internal/hardhat-network/stack-traces/message-trace")
const { developmentChains } = require("../../helper-hardhat-config")


developmentChains.includes(network.name)
    ? describe.skip
    : describe("Nft", function () {
        let nft, mintPrice
        let deployer, accounts

        beforeEach(async () => {
            deployer = (await getNamedAccounts()).deployer
            accounts = await ethers.getSigners()
            // await deployments.fixture(["all"])
            nft = await ethers.getContract("RefundableERC721", deployer)
            mintPrice = await nft.getMintPrice()
            console.log(`NFT contract at ${nft.address}`)
        })

        describe("mint and refund", function () {
            it("can mint and get refund", async function () {
                const acc1 = accounts[1]
                const mintCount = "2"
                const refundAmount = mintPrice.mul(BigNumber.from(mintCount))
                const mintTx = await nft.connect(acc1).mint(mintCount, { value: refundAmount })
                await mintTx.wait(1)
                const nftCount = await nft.balanceOf(acc1.address)
                const initialBalance = await acc1.getBalance()
                const refundTx = await nft.connect(acc1).getRefund([0, 1])
                const receipt = await refundTx.wait(1)
                const gasUsed = receipt.cumulativeGasUsed.mul(receipt.effectiveGasPrice)
                const finalBalance = await acc1.getBalance()
                const token0Refunded = await nft.isTokenRefunded(0)
                const token1Refunded = await nft.isTokenRefunded(1)

                assert.equal(nftCount.toString(), mintCount)
                // assert.equal(initialBalance.sub(gasUsed).add(refundAmount).toString(), finalBalance.toString())
                assert.equal(token0Refunded, token1Refunded, true)
            })
        })


    })