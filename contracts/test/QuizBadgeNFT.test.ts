import { expect } from "chai";
import { ethers } from "hardhat";
import { QuizBadgeNFT } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("QuizBadgeNFT", function () {
  let badge: QuizBadgeNFT;
  let owner: SignerWithAddress;
  let signer: SignerWithAddress;
  let user: SignerWithAddress;
  let other: SignerWithAddress;

  const BASE_URI = "https://quiz.example.com/badges/";

  async function signBadgeVoucher(
    contract: QuizBadgeNFT,
    signerAccount: SignerWithAddress,
    recipient: string,
    badgeType: bigint,
    nonce: bigint,
    deadline: bigint
  ): Promise<string> {
    const domain = {
      name: "QuizBadgeNFT",
      version: "1",
      chainId: (await ethers.provider.getNetwork()).chainId,
      verifyingContract: await contract.getAddress(),
    };
    const types = {
      MintBadge: [
        { name: "recipient", type: "address" },
        { name: "badgeType", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    };
    const value = { recipient, badgeType, nonce, deadline };
    return signerAccount.signTypedData(domain, types, value);
  }

  beforeEach(async function () {
    [owner, signer, user, other] = await ethers.getSigners();
    const BadgeFactory = await ethers.getContractFactory("QuizBadgeNFT");
    badge = await BadgeFactory.deploy(signer.address, BASE_URI);
    await badge.waitForDeployment();
  });

  it("should mint badge NFT with valid voucher", async function () {
    const badgeType = 0n;
    const nonce = 1n;
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
    const sig = await signBadgeVoucher(badge, signer, user.address, badgeType, nonce, deadline);

    await badge.connect(user).mintBadge(user.address, badgeType, nonce, deadline, sig);
    expect(await badge.balanceOf(user.address)).to.equal(1n);
    expect(await badge.hasBadge(user.address, badgeType)).to.be.true;
  });

  it("should revert on duplicate badge for same address", async function () {
    const badgeType = 1n;
    const nonce1 = 1n;
    const nonce2 = 2n;
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
    const sig1 = await signBadgeVoucher(badge, signer, user.address, badgeType, nonce1, deadline);
    const sig2 = await signBadgeVoucher(badge, signer, user.address, badgeType, nonce2, deadline);

    await badge.connect(user).mintBadge(user.address, badgeType, nonce1, deadline, sig1);
    await expect(
      badge.connect(user).mintBadge(user.address, badgeType, nonce2, deadline, sig2)
    ).to.be.revertedWith("Badge already claimed");
  });

  it("should revert on replayed nonce", async function () {
    const badgeType = 0n;
    const nonce = 1n;
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
    const sig = await signBadgeVoucher(badge, signer, user.address, badgeType, nonce, deadline);

    await badge.connect(user).mintBadge(user.address, badgeType, nonce, deadline, sig);
    await expect(
      badge.connect(user).mintBadge(user.address, badgeType, nonce, deadline, sig)
    ).to.be.revertedWith("Badge already claimed");
  });

  it("should revert on expired deadline", async function () {
    const badgeType = 0n;
    const nonce = 1n;
    const deadline = BigInt(Math.floor(Date.now() / 1000) - 3600);
    const sig = await signBadgeVoucher(badge, signer, user.address, badgeType, nonce, deadline);

    await expect(
      badge.connect(user).mintBadge(user.address, badgeType, nonce, deadline, sig)
    ).to.be.revertedWith("Voucher expired");
  });

  it("should revert on wrong signer", async function () {
    const badgeType = 0n;
    const nonce = 1n;
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
    const sig = await signBadgeVoucher(badge, other, user.address, badgeType, nonce, deadline);

    await expect(
      badge.connect(user).mintBadge(user.address, badgeType, nonce, deadline, sig)
    ).to.be.revertedWith("Invalid signature");
  });

  it("should return correct tokenURI", async function () {
    const badgeType = 2n;
    const nonce = 1n;
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
    const sig = await signBadgeVoucher(badge, signer, user.address, badgeType, nonce, deadline);

    await badge.connect(user).mintBadge(user.address, badgeType, nonce, deadline, sig);
    const uri = await badge.tokenURI(0);
    expect(uri).to.equal(BASE_URI + "2");
  });

  it("should allow different addresses to hold same badge type", async function () {
    const badgeType = 0n;
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

    const sig1 = await signBadgeVoucher(badge, signer, user.address, badgeType, 1n, deadline);
    const sig2 = await signBadgeVoucher(badge, signer, other.address, badgeType, 1n, deadline);

    await badge.connect(user).mintBadge(user.address, badgeType, 1n, deadline, sig1);
    await badge.connect(other).mintBadge(other.address, badgeType, 1n, deadline, sig2);

    expect(await badge.hasBadge(user.address, badgeType)).to.be.true;
    expect(await badge.hasBadge(other.address, badgeType)).to.be.true;
  });

  it("should revert on invalid badge type", async function () {
    const badgeType = 99n; // Out of range
    const nonce = 1n;
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
    const sig = await signBadgeVoucher(badge, signer, user.address, badgeType, nonce, deadline);

    await expect(
      badge.connect(user).mintBadge(user.address, badgeType, nonce, deadline, sig)
    ).to.be.revertedWith("Invalid badge type");
  });
});
