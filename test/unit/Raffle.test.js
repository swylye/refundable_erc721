const { assert, expect } = require("chai")
const { providers } = require("ethers")
const { network, deployments, ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle", function () {
        let raffle, vrfCoordinatorV2Mock, raffleEntranceFee, interval
        let deployer
        const chainId = network.config.chainId

        beforeEach(async () => {
            deployer = (await getNamedAccounts()).deployer
            await deployments.fixture(["all"])
            raffle = await ethers.getContract("Raffle", deployer)
            vrfCoordinatorV2Mock = await ethers.getContract(
                "VRFCoordinatorV2Mock",
                deployer
            )
            raffleEntranceFee = await raffle.getEntranceFee()
            interval = await raffle.getInterval()
        })

        describe("constructor", function () {
            it("sets up the initial values correctly", async () => {
                const raffleState = await raffle.getRaffleState()
                assert.equal(raffleState.toString(), "0")

                const interval = await raffle.getInterval()
                assert.equal(interval.toString(), networkConfig[chainId]['interval'].toString())

                assert.equal(raffleEntranceFee.toString(), networkConfig[chainId]['entranceFee'].toString())
            })
        })

        describe("enter raffle", function () {
            it("should fail if insufficient entrance fee", async () => {
                await expect(raffle.enterRaffle({ value: raffleEntranceFee.sub(100) })).to.be.revertedWithCustomError(raffle, "Raffle__InsufficientFee")
            })

            it("records player when they enter", async () => {
                const enterTx = await raffle.enterRaffle({ value: raffleEntranceFee })
                const playerAdd = await raffle.getPlayer(0)
                const playerCount = await raffle.getNumberOfPlayers()
                assert.equal(playerAdd, deployer)
                assert.equal(playerCount.toString(), "1")
            })

            it("emits event on enter", async () => {
                await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.emit(raffle, "RaffleEnter").withArgs(deployer)
            })

            it("doesn't allow enter raffle when state is not open", async () => {
                await raffle.enterRaffle({ value: raffleEntranceFee })
                await network.provider.send("evm_increaseTime", [interval.toNumber() + 10])
                await network.provider.send("evm_mine", [])
                // We'll pretend to be chainlink keeper
                await raffle.performUpkeep([])
                await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.be.revertedWithCustomError(raffle, "Raffle__NotOpen")
            })
        })

        describe("check upkeep", function () {
            it("returns false if people have not sent any ETH", async () => {
                await network.provider.send("evm_increaseTime", [interval.toNumber() + 10])
                await network.provider.send("evm_mine", [])
                const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])
                assert(!upkeepNeeded)
            })

            it("returns false if not enough time has passed", async () => {
                await raffle.enterRaffle({ value: raffleEntranceFee })
                const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])
                assert(!upkeepNeeded)
            })

            it("returns false if raffle is not open", async () => {
                await raffle.enterRaffle({ value: raffleEntranceFee })
                await network.provider.send("evm_increaseTime", [interval.toNumber() + 10])
                await network.provider.send("evm_mine", [])
                await raffle.performUpkeep([])
                const raffleState = await raffle.getRaffleState()
                const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])
                assert.equal(raffleState.toString(), "1")
                assert(!upkeepNeeded)
            })

            it("returns true if all criterias are fulfilled", async () => {
                await raffle.enterRaffle({ value: raffleEntranceFee })
                await network.provider.send("evm_increaseTime", [interval.toNumber() + 10])
                await network.provider.send("evm_mine", [])
                const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])
                assert(upkeepNeeded)
            })
        })

        describe("perform upkeep", function () {
            it("can only run if perform upkeep is true", async () => {
                await raffle.enterRaffle({ value: raffleEntranceFee })
                await network.provider.send("evm_increaseTime", [interval.toNumber() + 10])
                await network.provider.send("evm_mine", [])
                const tx = await raffle.performUpkeep([])
                assert(tx)
            })

            it("reverts with upkeep not needed if perform upkeep is false", async () => {
                await expect(raffle.performUpkeep([])).to.be.revertedWithCustomError(raffle, "Raffle__UpkeepNotNeeded").withArgs(0, 0, 0)
            })

            it("updates raffle state, calls vrf coordinator and emits an event", async () => {
                await raffle.enterRaffle({ value: raffleEntranceFee })
                await network.provider.send("evm_increaseTime", [interval.toNumber() + 10])
                await network.provider.send("evm_mine", [])
                const tx = await raffle.performUpkeep([])
                const receipt = await tx.wait(1)
                const raffleState = await raffle.getRaffleState()
                const requestId = receipt.events[1].args.requestId
                assert(requestId.toNumber() > 0)
                assert.equal(raffleState.toString(), "1")
            })
        })

        describe("fulfill random words", function () {
            beforeEach(async function () {
                await raffle.enterRaffle({ value: raffleEntranceFee })
                await network.provider.send("evm_increaseTime", [interval.toNumber() + 10])
                await network.provider.send("evm_mine", [])
            })

            it("can only be called after perform upkeep", async () => {
                await expect(vrfCoordinatorV2Mock.fulfillRandomWords(0, raffle.address)).to.be.revertedWith("nonexistent request")
                await expect(vrfCoordinatorV2Mock.fulfillRandomWords(1, raffle.address)).to.be.revertedWith("nonexistent request")
            })

            it("picks a winner, resets the lottery and sends the money", async () => {
                const additionalEntrants = 3
                const startingAccIndex = 1
                const accounts = await ethers.getSigners()
                for (let i = startingAccIndex; i < startingAccIndex + additionalEntrants; i++) {
                    const accConnectedRaffle = raffle.connect(accounts[i])
                    await accConnectedRaffle.enterRaffle({ value: raffleEntranceFee })
                }

                const startingTimestamp = await raffle.getLatestTimestamp()

                await new Promise(async (resolve, reject) => {
                    raffle.once("WinnerPicked", async () => {
                        console.log("Found the winner picked event!")
                        try {
                            const recentWinner = await raffle.getRecentWinner()
                            // console.log(`Recent winner: ${recentWinner}`)
                            // console.log(`Account 0: ${deployer}`)
                            // console.log(`Account 1: ${accounts[1].address}`)
                            // console.log(`Account 2: ${accounts[2].address}`)
                            // console.log(`Account 3: ${accounts[3].address}`)

                            const raffleState = await raffle.getRaffleState()
                            const endingTimestamp = await raffle.getLatestTimestamp()
                            const playerCount = await raffle.getNumberOfPlayers()
                            const winnerEndingBalance = await accounts[1].getBalance()

                            assert.equal(playerCount.toString(), "0")
                            assert.equal(raffleState.toString(), "0")
                            assert(endingTimestamp > startingTimestamp)
                            assert.equal(winnerEndingBalance.toString(), winnerStartingBalance.add(raffleEntranceFee.mul(additionalEntrants + 1)).toString())
                        } catch (e) {
                            reject(e)
                        }
                        resolve()
                    })

                    const tx = await raffle.performUpkeep([])
                    const receipt = await tx.wait(1)
                    const winnerStartingBalance = await accounts[1].getBalance()
                    await vrfCoordinatorV2Mock.fulfillRandomWords(receipt.events[1].args.requestId, raffle.address)
                })
            })
        })
    })