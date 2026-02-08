// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract BridgeAttestation is Ownable {
    struct Receipt {
        bytes32 txHash;
        address from;
        address to;
        uint256 amount;
        uint256 timestamp;
        uint256 blockNumber;
        string bridgeDirection;
        bool verified;
    }

    mapping(bytes32 => Receipt) public receipts;
    bytes32[] public receiptHashes;

    event ReceiptCreated(
        bytes32 indexed txHash,
        address indexed from,
        address indexed to,
        uint256 amount,
        string bridgeDirection
    );

    event ReceiptVerified(bytes32 indexed txHash);

    constructor() Ownable(msg.sender) {}

    function createReceipt(
        bytes32 _txHash,
        address _from,
        address _to,
        uint256 _amount,
        string calldata _bridgeDirection
    ) external onlyOwner {
        require(receipts[_txHash].timestamp == 0, "Receipt already exists");

        receipts[_txHash] = Receipt({
            txHash: _txHash,
            from: _from,
            to: _to,
            amount: _amount,
            timestamp: block.timestamp,
            blockNumber: block.number,
            bridgeDirection: _bridgeDirection,
            verified: false
        });

        receiptHashes.push(_txHash);

        emit ReceiptCreated(_txHash, _from, _to, _amount, _bridgeDirection);
    }

    function verifyReceipt(bytes32 _txHash) external onlyOwner {
        require(receipts[_txHash].timestamp != 0, "Receipt does not exist");
        require(!receipts[_txHash].verified, "Already verified");

        receipts[_txHash].verified = true;

        emit ReceiptVerified(_txHash);
    }

    function getReceipt(bytes32 _txHash) external view returns (Receipt memory) {
        require(receipts[_txHash].timestamp != 0, "Receipt does not exist");
        return receipts[_txHash];
    }

    function getRecentReceipts(uint256 _count) external view returns (Receipt[] memory) {
        uint256 total = receiptHashes.length;
        uint256 count = _count > total ? total : _count;
        Receipt[] memory result = new Receipt[](count);

        for (uint256 i = 0; i < count; i++) {
            result[i] = receipts[receiptHashes[total - count + i]];
        }

        return result;
    }

    function getTotalReceipts() external view returns (uint256) {
        return receiptHashes.length;
    }
}
