const { network, ethers, getNamedAccounts } = require("hardhat")

async function main() {
    const { deployer } = await getNamedAccounts()
    const nft = await ethers.getContract("RefundableERC721", deployer)
    console.log("Minting NFT...")
    const mintPrice = await nft.getMintPrice()
    const transactionResponse = await nft.mint(1, { value: mintPrice })
    const transactionReceipt = await transactionResponse.wait(1)
    console.log("Minted!")
}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.log(err)
        process.exit(1)
    })