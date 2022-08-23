const { assert, expect } = require("chai")
const { network, ethers, getNamedAccounts } = require("hardhat")
const { isCallTrace } = require("hardhat/internal/hardhat-network/stack-traces/message-trace")
const { developmentChains } = require("../../helper-hardhat-config")


developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle", function () {
        let raffle, raffleEntranceFee
        let deployer

        beforeEach(async () => {
            deployer = (await getNamedAccounts()).deployer
            // await deployments.fixture(["all"])
            raffle = await ethers.getContract("Raffle", deployer)
            console.log(`Raffle contract at ${raffle.address}`)
            raffleEntranceFee = await raffle.getEntranceFee()
        })

        describe("fullfill random words", function () {
            it("works with live chainlink keepers and VRF, we get a random number", async function () {
                console.log("Setting up test")
                const startingTimestamp = await raffle.getLatestTimestamp()
                const accounts = await ethers.getSigners()

                await new Promise(async (resolve, reject) => {
                    raffle.once("WinnerPicked", async () => {
                        console.log("Winner picked event fired!")
                        try {
                            const recentWinner = await raffle.getRecentWinner()
                            const raffleState = await raffle.getRaffleState()
                            const winnerEndingBalance = await accounts[0].getBalance()
                            const endingTimestamp = await raffle.getLatestTimestamp()

                            await expect(raffle.getPlayer(0)).to.be.reverted
                            assert.equal(recentWinner, deployer)
                            assert.equal(raffleState, 0)
                            assert.equal(winnerEndingBalance.toString(), winnerStartingBalance.add(raffleEntranceFee).toString())
                            assert(endingTimestamp > startingTimestamp)
                            resolve()

                        } catch (e) {
                            console.log(e)
                            reject(e)
                        }
                    })
                    console.log("Entering raffle...")
                    const tx = await raffle.enterRaffle({ value: raffleEntranceFee })
                    await tx.wait(1)
                    console.log("Ok entered raffle successfully, now it's time to wait...")
                    const winnerStartingBalance = await accounts[0].getBalance()
                })
            })
        })


    })