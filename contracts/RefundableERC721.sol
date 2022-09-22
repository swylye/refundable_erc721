// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "./OwnableExt.sol";
import "./ERC721C.sol";

// Errors
error RefundableERC721__InvalidMaxSupply();
error RefundableERC721__InsufficientFunds();
error RefundableERC721__ExceedMaxSupply();
error RefundableERC721__PastRefundPeriod();
error RefundableERC721__StillInRefundPeriod();
error RefundableERC721__NotTokenOwner();
error RefundableERC721__AlreadyRefunded();
error RefundableERC721__FailedTransaction();

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
}


contract RefundableERC721 is OwnableExt, ERC721C {
    /*///////////////////////////////////////////////////////////////
                                 VARIABLES
    //////////////////////////////////////////////////////////////*/
    uint256 private constant mintPrice = 0.01 ether;
    uint256 private maxSupply;
    uint256 private constant maxMintPerTransaction = 5;
    uint256 private constant refundPeriod = 30 days;
    uint256 private immutable refundEndTime;

    // Add in mapping to keep track of refunded tokenIDs
    mapping(uint256 => bool) private tokenIdRefunded;

    /*///////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/
    constructor(string memory _name, string memory _symbol, uint256 _maxSupply) ERC721C(_name, _symbol){
        maxSupply = _maxSupply;
        refundEndTime = block.timestamp + refundPeriod;
    }   

    /*///////////////////////////////////////////////////////////////
                              FALLBACK FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    // Function to receive Ether. msg.data must be empty
    receive() external payable {}

    // Fallback function is called when msg.data is not empty
    fallback() external payable {}


    /*///////////////////////////////////////////////////////////////
                              WRITE FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    function mint(uint256 _quantity) external payable {
        if (msg.value != _quantity * mintPrice) {
            revert RefundableERC721__InsufficientFunds();
        }
        if (_quantity + totalSupply() > maxSupply) {
            revert RefundableERC721__ExceedMaxSupply();
        }
        _mint(msg.sender, _quantity);
    }

    // Add refund function
    function getRefund(uint256[] calldata _tokenIds) external {
        if (block.timestamp > refundEndTime) {
            revert RefundableERC721__PastRefundPeriod();
        }
        uint256 listLength = _tokenIds.length;
        for (uint256 i = 0; i < listLength; i++) {
            uint256 _tokenId = _tokenIds[i];
            if (ownerOf(_tokenId) != msg.sender) {
                revert RefundableERC721__NotTokenOwner();
            }
            if (tokenIdRefunded[_tokenId]) {
                revert RefundableERC721__AlreadyRefunded();
            }
            tokenIdRefunded[_tokenId] = true;
            transferFrom(msg.sender, owner(), _tokenId);
        }
        uint256 refundAmount = listLength * mintPrice;
        (bool sent, ) = msg.sender.call{value: refundAmount}("");
        if (!sent) {
            revert RefundableERC721__FailedTransaction();
        }
    }

    /*///////////////////////////////////////////////////////////////
                              OWNER ONLY FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    function setMaxSupply(uint256 _maxSupply) external onlyOwner {
        if (_maxSupply < totalSupply()) {
            revert RefundableERC721__InvalidMaxSupply();
        }
        maxSupply = _maxSupply;
    }

    // tecnhnically anyone can call, but funds go to owner address
    function withdrawFunds() external {
        if (block.timestamp <= refundEndTime) {
            revert RefundableERC721__StillInRefundPeriod();
        }
        (bool sent, ) = owner().call{value: address(this).balance}("");
        if (!sent) {
            revert RefundableERC721__FailedTransaction();
        }
    }

    // tecnhnically anyone can call, but funds go to owner address
    function withdrawToken(address _tokenAddress) external {
        IERC20 token = IERC20(_tokenAddress);
        uint256 balance = token.balanceOf(address(this));
        token.transfer(owner(), balance);
    }

    /*///////////////////////////////////////////////////////////////
                              PURE / VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function getMaxSupply() external view returns (uint256) {
        return maxSupply;
    }

    function getRefundEndTime() external view returns (uint256) {
        return refundEndTime;
    }

    function isRefundPeriodActive() external view returns (bool) {
        return (block.timestamp <= refundEndTime);
    }

    function isTokenRefunded(uint256 _tokenId) external view tokenExists(_tokenId) returns (bool) {
        return tokenIdRefunded[_tokenId];
    }

    function getRefundPeriod() external pure returns (uint256) {
        return refundPeriod;
    }

    function getMintPrice() external pure returns (uint256) {
        return mintPrice;
    }
}