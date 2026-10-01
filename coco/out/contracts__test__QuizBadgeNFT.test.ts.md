# contracts/test/QuizBadgeNFT.test.ts
lines:142 exports:
---
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

