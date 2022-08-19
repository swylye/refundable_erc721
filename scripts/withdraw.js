const { network, ethers, getNamedAccounts } = require("hardhat")

async function main() {
    const { deployer } = await getNamedAccounts()
    const fundMe = await ethers.getContract("FundMe", deployer)
    console.log("Withdraw from contract...")
    const transactionResponse = await fundMe.withdraw()
    const transactionReceipt = await transactionResponse.wait(1)
    console.log("Withdrawn!")
}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.log(err)
        process.exit(1)
    })