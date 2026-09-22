import { expect } from "chai";
import { ethers } from "hardhat";
import { QuizToken } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("QuizToken", function () {
  let quizToken: QuizToken;
  let owner: SignerWithAddress;
  let signer: SignerWithAddress;
  let user: SignerWithAddress;
  let other: SignerWithAddress;

  const CLAIM_TYPEHASH = ethers.keccak256(
    ethers.toUtf8Bytes("ClaimTokens(address recipient,uint256 amount,uint256 nonce,uint256 deadline)")
  );

  async function signVoucher(
    contract: QuizToken,
    signerAccount: SignerWithAddress,
    recipient: string,
    amount: bigint,
    nonce: bigint,
    deadline: bigint
  ): Promise<string> {
    const domain = {
      name: "QuizToken",
      version: "1",
      chainId: (await ethers.provider.getNetwork()).chainId,
      verifyingContract: await contract.getAddress(),
    };
    const types = {
      ClaimTokens: [
        { name: "recipient", type: "address" },
        { name: "amount", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    };
    const value = { recipient, amount, nonce, deadline };
    return signerAccount.signTypedData(domain, types, value);
  }

  beforeEach(async function () {
    [owner, signer, user, other] = await ethers.getSigners();
    const QuizTokenFactory = await ethers.getContractFactory("QuizToken");
    quizToken = await QuizTokenFactory.deploy(signer.address);
    await quizToken.waitForDeployment();
  });

  it("should mint tokens with a valid voucher", async function () {
    const amount = ethers.parseEther("100");
    const nonce = 1n;
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
    const sig = await signVoucher(quizToken, signer, user.address, amount, nonce, deadline);

    await quizToken.connect(user).claimTokens(user.address, amount, nonce, deadline, sig);
    expect(await quizToken.balanceOf(user.address)).to.equal(amount);
  });

  it("should revert on replayed nonce", async function () {
    const amount = ethers.parseEther("50");
    const nonce = 1n;
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
    const sig = await signVoucher(quizToken, signer, user.address, amount, nonce, deadline);

    await quizToken.connect(user).claimTokens(user.address, amount, nonce, deadline, sig);
    await expect(
      quizToken.connect(user).claimTokens(user.address, amount, nonce, deadline, sig)
    ).to.be.revertedWith("Nonce already used");
  });

  it("should revert on expired deadline", async function () {
    const amount = ethers.parseEther("50");
    const nonce = 1n;
    const deadline = BigInt(Math.floor(Date.now() / 1000) - 3600); // Past
    const sig = await signVoucher(quizToken, signer, user.address, amount, nonce, deadline);

    await expect(
      quizToken.connect(user).claimTokens(user.address, amount, nonce, deadline, sig)
    ).to.be.revertedWith("Voucher expired");
  });

  it("should revert on wrong signer", async function () {
    const amount = ethers.parseEther("50");
    const nonce = 1n;
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
    // Sign with `other` instead of authorized `signer`
    const sig = await signVoucher(quizToken, other, user.address, amount, nonce, deadline);

    await expect(
      quizToken.connect(user).claimTokens(user.address, amount, nonce, deadline, sig)
    ).to.be.revertedWith("Invalid signature");
  });

  it("should revert on tampered amount", async function () {
    const amount = ethers.parseEther("50");
    const nonce = 1n;
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
    const sig = await signVoucher(quizToken, signer, user.address, amount, nonce, deadline);

    // Submit with a different amount
    const tamperedAmount = ethers.parseEther("500");
    await expect(
      quizToken.connect(user).claimTokens(user.address, tamperedAmount, nonce, deadline, sig)
    ).to.be.revertedWith("Invalid signature");
  });

  it("should allow owner to rotate signer", async function () {
    await quizToken.connect(owner).setAuthorizedSigner(other.address);
    expect(await quizToken.authorizedSigner()).to.equal(other.address);
  });

  it("should revert when non-owner tries to rotate signer", async function () {
    await expect(
      quizToken.connect(user).setAuthorizedSigner(other.address)
    ).to.be.revertedWithCustomError(quizToken, "OwnableUnauthorizedAccount");
  });

  it("should revert on zero amount", async function () {
    const amount = 0n;
    const nonce = 1n;
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
    const sig = await signVoucher(quizToken, signer, user.address, amount, nonce, deadline);

    await expect(
      quizToken.connect(user).claimTokens(user.address, amount, nonce, deadline, sig)
    ).to.be.revertedWith("Amount must be > 0");
  });
});
