const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BridgeAttestation", function () {
  let attestation, owner, other;
  const sampleTxHash = ethers.keccak256(ethers.toUtf8Bytes("sample-tx-1"));
  const sampleFrom = "0x1234567890123456789012345678901234567890";
  const sampleTo = "0x0987654321098765432109876543210987654321";
  const sampleAmount = ethers.parseEther("1.0");
  const sampleDirection = "BSC->opBNB";

  beforeEach(async function () {
    [owner, other] = await ethers.getSigners();
    const BridgeAttestation = await ethers.getContractFactory("BridgeAttestation");
    attestation = await BridgeAttestation.deploy();
    await attestation.waitForDeployment();
  });

  describe("createReceipt", function () {
    it("should create a receipt with correct data", async function () {
      await attestation.createReceipt(sampleTxHash, sampleFrom, sampleTo, sampleAmount, sampleDirection);

      const receipt = await attestation.getReceipt(sampleTxHash);
      expect(receipt.txHash).to.equal(sampleTxHash);
      expect(receipt.from).to.equal(sampleFrom);
      expect(receipt.to).to.equal(sampleTo);
      expect(receipt.amount).to.equal(sampleAmount);
      expect(receipt.bridgeDirection).to.equal(sampleDirection);
      expect(receipt.verified).to.equal(false);
    });

    it("should emit ReceiptCreated event", async function () {
      await expect(attestation.createReceipt(sampleTxHash, sampleFrom, sampleTo, sampleAmount, sampleDirection))
        .to.emit(attestation, "ReceiptCreated")
        .withArgs(sampleTxHash, sampleFrom, sampleTo, sampleAmount, sampleDirection);
    });

    it("should reject duplicate receipt", async function () {
      await attestation.createReceipt(sampleTxHash, sampleFrom, sampleTo, sampleAmount, sampleDirection);
      await expect(
        attestation.createReceipt(sampleTxHash, sampleFrom, sampleTo, sampleAmount, sampleDirection)
      ).to.be.revertedWith("Receipt already exists");
    });

    it("should reject non-owner", async function () {
      await expect(
        attestation.connect(other).createReceipt(sampleTxHash, sampleFrom, sampleTo, sampleAmount, sampleDirection)
      ).to.be.revertedWithCustomError(attestation, "OwnableUnauthorizedAccount");
    });
  });

  describe("verifyReceipt", function () {
    beforeEach(async function () {
      await attestation.createReceipt(sampleTxHash, sampleFrom, sampleTo, sampleAmount, sampleDirection);
    });

    it("should verify a receipt", async function () {
      await attestation.verifyReceipt(sampleTxHash);
      const receipt = await attestation.getReceipt(sampleTxHash);
      expect(receipt.verified).to.equal(true);
    });

    it("should emit ReceiptVerified event", async function () {
      await expect(attestation.verifyReceipt(sampleTxHash))
        .to.emit(attestation, "ReceiptVerified")
        .withArgs(sampleTxHash);
    });

    it("should reject verifying non-existent receipt", async function () {
      const fakeHash = ethers.keccak256(ethers.toUtf8Bytes("fake"));
      await expect(attestation.verifyReceipt(fakeHash)).to.be.revertedWith("Receipt does not exist");
    });

    it("should reject double verification", async function () {
      await attestation.verifyReceipt(sampleTxHash);
      await expect(attestation.verifyReceipt(sampleTxHash)).to.be.revertedWith("Already verified");
    });
  });

  describe("getRecentReceipts", function () {
    it("should return recent receipts", async function () {
      for (let i = 0; i < 5; i++) {
        const hash = ethers.keccak256(ethers.toUtf8Bytes(`tx-${i}`));
        await attestation.createReceipt(hash, sampleFrom, sampleTo, sampleAmount, sampleDirection);
      }

      const recent = await attestation.getRecentReceipts(3);
      expect(recent.length).to.equal(3);
    });

    it("should return all if count exceeds total", async function () {
      await attestation.createReceipt(sampleTxHash, sampleFrom, sampleTo, sampleAmount, sampleDirection);
      const recent = await attestation.getRecentReceipts(10);
      expect(recent.length).to.equal(1);
    });
  });

  describe("getTotalReceipts", function () {
    it("should return correct count", async function () {
      expect(await attestation.getTotalReceipts()).to.equal(0);
      await attestation.createReceipt(sampleTxHash, sampleFrom, sampleTo, sampleAmount, sampleDirection);
      expect(await attestation.getTotalReceipts()).to.equal(1);
    });
  });
});
