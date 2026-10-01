# contracts/test/QuizToken.test.ts
lines:129 exports:
---
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
