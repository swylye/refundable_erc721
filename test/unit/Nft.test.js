const { assert, expect } = require("chai")
const { providers, BigNumber } = require("ethers")
const { network, deployments, ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("NFT", function () {
        let nft, mintPrice
        let deployer, accounts
        const chainId = network.config.chainId

        beforeEach(async () => {
            deployer = (await getNamedAccounts()).deployer
            accounts = await ethers.getSigners()
            await deployments.fixture(["all"])
            nft = await ethers.getContract("RefundableERC721", deployer)
            mintPrice = await nft.getMintPrice()
        })

        describe("constructor", function () {
            it("sets up the initial values correctly", async () => {
                const maxSupply = await nft.getMaxSupply()
                assert.equal(maxSupply.toString(), "10")
            })
        })

        describe("mint", function () {
            it("should fail if insufficient mint fee", async () => {
                await expect(nft.mint(1, { value: mintPrice.sub(100) })).to.be.revertedWithCustomError(nft, "RefundableERC721__InsufficientFunds")
            })

            it("should fail if exceed max supply", async () => {
                const maxSupply = await nft.getMaxSupply()
                const mintTx = await nft.mint(maxSupply, { value: mintPrice.mul(maxSupply) })
                await mintTx.wait(1)
                await expect(nft.mint(1, { value: mintPrice })).to.be.revertedWithCustomError(nft, "RefundableERC721__ExceedMaxSupply")

            })

            it("should be able to mint", async () => {
                const mintTx = await nft.mint(1, { value: mintPrice })
                await mintTx.wait(1)
                const nftCount = await nft.balanceOf(deployer)
                assert.equal(nftCount.toString(), "1")
            })
        })

        describe("refund", function () {
            let acc1

            beforeEach(async () => {
                acc1 = accounts[1]
                const mintTx = await nft.connect(acc1).mint(1, { value: mintPrice })
                await mintTx.wait(1)
            })

            it("should be able to refund", async () => {
                const tokenRefunded = await nft.isTokenRefunded("0")
                const refundPeriodActive = await nft.isRefundPeriodActive()
                const initialBalance = await acc1.getBalance()
                const refundTx = await nft.connect(acc1).getRefund([0])
                const receipt = await refundTx.wait(1)
                const gasUsed = receipt.cumulativeGasUsed.mul(receipt.effectiveGasPrice)
                const finalBalance = await acc1.getBalance()
                const isRefunded = await nft.isTokenRefunded("0")
                const tokenCount = await nft.balanceOf(acc1.address)


                assert.equal(tokenRefunded, false)
                assert.equal(refundPeriodActive, true)
                assert.equal(isRefunded, true)
                assert.equal(tokenCount.toString(), "0")
                assert.equal(initialBalance.sub(gasUsed).add(mintPrice).toString(), finalBalance.toString())
            })

            it("should fail to refund after 30 days", async () => {
                const thirtyDays = 30 * 24 * 60 * 60 + 1
                await ethers.provider.send('evm_increaseTime', [thirtyDays])
                await ethers.provider.send('evm_mine')

                const refundPeriodActive = await nft.isRefundPeriodActive()
                await expect(nft.connect(acc1).getRefund([0])).to.be.revertedWithCustomError(nft, "RefundableERC721__PastRefundPeriod")

                assert.equal(refundPeriodActive, false)
            })

            it("should fail to refund if not token holder", async () => {
                await expect(nft.getRefund([0])).to.be.revertedWithCustomError(nft, "RefundableERC721__NotTokenOwner")
            })

            it("should fail to refund if already refunded", async () => {
                const refundTx = await nft.connect(acc1).getRefund([0])
                await refundTx.wait(1)
                await expect(nft.getRefund([0])).to.be.revertedWithCustomError(nft, "RefundableERC721__AlreadyRefunded")
            })
        })

        describe("set max supply", function () {
            it("can set max supply", async () => {
                const supplySet = "12"
                const tx = await nft.setMaxSupply(supplySet)
                await tx.wait(1)
                const newMaxSupply = await nft.getMaxSupply()

                assert.equal(newMaxSupply.toString(), supplySet)
            })

            it("fail to set if not owner", async () => {
                const supplySet = "12"
                const acc1 = accounts[1]
                await expect(nft.connect(acc1).setMaxSupply(supplySet)).to.be.revertedWithCustomError(nft, "Ownable__NotOwner")
            })

            it("fail to set of minted amount is higher", async () => {
                const mintQuantity = 8
                const acc1 = accounts[1]
                const mintTx = await nft.connect(acc1).mint(mintQuantity, { value: mintPrice.mul(BigNumber.from(mintQuantity)) })
                await mintTx.wait(1)
                await expect(nft.setMaxSupply(mintQuantity - 1)).to.be.revertedWithCustomError(nft, "RefundableERC721__InvalidMaxSupply")

            })
        })

        describe("withdraw funds", function () {
            let refundAmount, acc0, acc1

            beforeEach(async () => {
                acc0 = accounts[0]
                acc1 = accounts[1]
                refundAmount = mintPrice.mul(BigNumber.from(5))
                const mintTx = await nft.connect(acc1).mint(5, { value: refundAmount })
                await mintTx.wait(1)
            })

            it("can withdraw funds", async () => {
                const thirtyDays = 30 * 24 * 60 * 60 + 1
                await ethers.provider.send('evm_increaseTime', [thirtyDays])
                await ethers.provider.send('evm_mine')

                const initialBalance = await acc0.getBalance()
                const withdrawTx = await nft.withdrawFunds()
                const receipt = await withdrawTx.wait(1)
                const gasUsed = receipt.cumulativeGasUsed.mul(receipt.effectiveGasPrice)
                const finalBalance = await acc0.getBalance()

                assert.equal(initialBalance.sub(gasUsed).add(refundAmount).toString(), finalBalance.toString())
            })

            it("should only withdraw to owner address", async () => {
                const thirtyDays = 30 * 24 * 60 * 60 + 1
                await ethers.provider.send('evm_increaseTime', [thirtyDays])
                await ethers.provider.send('evm_mine')

                const initialBalance = await acc0.getBalance()
                const withdrawTx = await nft.connect(acc1).withdrawFunds()
                const receipt = await withdrawTx.wait(1)
                const finalBalance = await acc0.getBalance()

                assert.equal(initialBalance.add(refundAmount).toString(), finalBalance.toString())
            })

            it("fail to withdraw if not past refund period", async () => {
                await expect(nft.withdrawFunds()).to.be.revertedWithCustomError(nft, "RefundableERC721__StillInRefundPeriod")
            })
        })
    })