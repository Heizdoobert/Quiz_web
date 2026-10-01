# contracts/test/ContestEscrow.test.ts
lines:452 exports:
---
import { expect } from "chai";
import { ethers } from "hardhat";
import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { ContestEscrow, QuizToken } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("ContestEscrow", function () {
  const contestId = ethers.keccak256(ethers.toUtf8Bytes("contest-uuid-1234"));
  const poolAmount = ethers.parseEther("1000");
  const duration = 7 * 24 * 3600; // 7 days

  async function signClaimVoucher(
    contract: ContestEscrow,
    signerAccount: SignerWithAddress,
    cId: string,
    recipient: string,
    amount: bigint,
    nonce: bigint,
    deadline: bigint
  ): Promise<string> {
    const domain = {
      name: "ContestEscrow",
      version: "1",
      chainId: (await ethers.provider.getNetwork()).chainId,
      verifyingContract: await contract.getAddress(),
    };
    const types = {
      ClaimContestReward: [
        { name: "contestId", type: "bytes32" },
        { name: "recipient", type: "address" },
        { name: "amount", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    };
    const value = { contestId: cId, recipient, amount, nonce, deadline };
    return signerAccount.signTypedData(domain, types, value);
  }

  async function deployContestEscrowFixture() {
