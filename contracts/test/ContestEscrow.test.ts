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
    const [owner, signer, creator, player1, player2, other] = await ethers.getSigners();

    // 1. Deploy QuizToken
    const QuizTokenFactory = await ethers.getContractFactory("QuizToken");
    const quizToken = await QuizTokenFactory.deploy(signer.address);
    await quizToken.waitForDeployment();

    // 2. Deploy ContestEscrow
    const ContestEscrowFactory = await ethers.getContractFactory("ContestEscrow");
    const escrow = await ContestEscrowFactory.deploy(
      await quizToken.getAddress(),
      signer.address
    );
    await escrow.waitForDeployment();

    // 3. Fund creator with tokens
    const mintAmount = ethers.parseEther("5000");
    const nonce = 9999n;
    const currentBlockTime = BigInt(await time.latest());
    const deadline = currentBlockTime + 3600n;

    const mintDomain = {
      name: "QuizToken",
      version: "1",
      chainId: (await ethers.provider.getNetwork()).chainId,
      verifyingContract: await quizToken.getAddress(),
    };
    const mintTypes = {
      ClaimTokens: [
        { name: "recipient", type: "address" },
        { name: "amount", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    };
    const mintSig = await signer.signTypedData(mintDomain, mintTypes, {
      recipient: creator.address,
      amount: mintAmount,
      nonce,
      deadline,
    });
    await quizToken.connect(creator).claimTokens(creator.address, mintAmount, nonce, deadline, mintSig);

    // Creator approves escrow
    await quizToken.connect(creator).approve(await escrow.getAddress(), poolAmount * 2n);

    return { quizToken, escrow, owner, signer, creator, player1, player2, other };
  }

  describe("Contest Creation", function () {
    it("should lock tokens and initialize contest", async function () {
      const { escrow, quizToken, creator } = await loadFixture(deployContestEscrowFixture);

      await expect(escrow.connect(creator).createContest(contestId, poolAmount, duration))
        .to.emit(escrow, "ContestCreated");

      const contest = await escrow.contests(contestId);
      expect(contest.creator).to.equal(creator.address);
      expect(contest.totalPool).to.equal(poolAmount);
      expect(contest.remainingPool).to.equal(poolAmount);
      expect(contest.active).to.be.true;

      expect(await quizToken.balanceOf(await escrow.getAddress())).to.equal(poolAmount);
    });

    it("should revert if contestId already exists", async function () {
      const { escrow, creator } = await loadFixture(deployContestEscrowFixture);
      await escrow.connect(creator).createContest(contestId, poolAmount, duration);
      await expect(
        escrow.connect(creator).createContest(contestId, poolAmount, duration)
      ).to.be.revertedWith("Contest already exists");
    });

    it("should revert on zero poolAmount", async function () {
      const { escrow, creator } = await loadFixture(deployContestEscrowFixture);
      await expect(
        escrow.connect(creator).createContest(contestId, 0, duration)
      ).to.be.revertedWith("Pool amount must be > 0");
    });

    it("should revert if duration is less than 1 hour", async function () {
      const { escrow, creator } = await loadFixture(deployContestEscrowFixture);
      await expect(
        escrow.connect(creator).createContest(contestId, poolAmount, 1800)
      ).to.be.revertedWith("Duration too short");
    });

    it("should revert on zero contestId", async function () {
      const { escrow, creator } = await loadFixture(deployContestEscrowFixture);
      await expect(
        escrow.connect(creator).createContest(ethers.ZeroHash, poolAmount, duration)
      ).to.be.revertedWith("Invalid contestId");
    });
  });

  describe("Claiming Rewards", function () {
    async function contestCreatedFixture() {
      const base = await deployContestEscrowFixture();
      await base.escrow.connect(base.creator).createContest(contestId, poolAmount, duration);
      return base;
    }

    it("should transfer reward to player with valid EIP-712 voucher", async function () {
      const { escrow, quizToken, signer, player1 } = await loadFixture(contestCreatedFixture);

      const reward = ethers.parseEther("50");
      const nonce = 1n;
      const deadline = BigInt(await time.latest()) + 3600n;

      const sig = await signClaimVoucher(
        escrow,
        signer,
        contestId,
        player1.address,
        reward,
        nonce,
        deadline
      );

      await expect(
        escrow.connect(player1).claimReward(contestId, player1.address, reward, nonce, deadline, sig)
      )
        .to.emit(escrow, "ContestRewardClaimed")
        .withArgs(contestId, player1.address, reward, nonce);

      expect(await quizToken.balanceOf(player1.address)).to.equal(reward);

      const contest = await escrow.contests(contestId);
      expect(contest.remainingPool).to.equal(poolAmount - reward);
      expect(await escrow.isNonceUsed(contestId, player1.address, nonce)).to.be.true;
    });

    it("should revert on replayed nonce for same recipient", async function () {
      const { escrow, signer, player1 } = await loadFixture(contestCreatedFixture);

      const reward = ethers.parseEther("50");
      const nonce = 1n;
      const deadline = BigInt(await time.latest()) + 3600n;

      const sig = await signClaimVoucher(
        escrow,
        signer,
        contestId,
        player1.address,
        reward,
        nonce,
        deadline
      );

      await escrow.connect(player1).claimReward(contestId, player1.address, reward, nonce, deadline, sig);

      await expect(
        escrow.connect(player1).claimReward(contestId, player1.address, reward, nonce, deadline, sig)
      ).to.be.revertedWith("Nonce already used");
    });

    it("should revert on expired deadline", async function () {
      const { escrow, signer, player1 } = await loadFixture(contestCreatedFixture);

      const reward = ethers.parseEther("50");
      const nonce = 2n;
      const deadline = BigInt(await time.latest()) - 10n;

      const sig = await signClaimVoucher(
        escrow,
        signer,
        contestId,
        player1.address,
        reward,
        nonce,
        deadline
      );

      await expect(
        escrow.connect(player1).claimReward(contestId, player1.address, reward, nonce, deadline, sig)
      ).to.be.revertedWith("Voucher expired");
    });

    it("should revert on wrong signer", async function () {
      const { escrow, other, player1 } = await loadFixture(contestCreatedFixture);

      const reward = ethers.parseEther("50");
      const nonce = 3n;
      const deadline = BigInt(await time.latest()) + 3600n;

      // Signed by other instead of authorizedSigner
      const sig = await signClaimVoucher(
        escrow,
        other,
        contestId,
        player1.address,
        reward,
        nonce,
        deadline
      );

      await expect(
        escrow.connect(player1).claimReward(contestId, player1.address, reward, nonce, deadline, sig)
      ).to.be.revertedWith("Invalid signature");
    });

    it("should revert if claim amount exceeds remaining pool", async function () {
      const { escrow, signer, player1 } = await loadFixture(contestCreatedFixture);

      const excessiveReward = poolAmount + 1n;
      const nonce = 4n;
      const deadline = BigInt(await time.latest()) + 3600n;

      const sig = await signClaimVoucher(
        escrow,
        signer,
        contestId,
        player1.address,
        excessiveReward,
        nonce,
        deadline
      );

      await expect(
        escrow.connect(player1).claimReward(contestId, player1.address, excessiveReward, nonce, deadline, sig)
      ).to.be.revertedWith("Insufficient pool balance");
    });

    it("should deactivate contest when remaining pool reaches zero", async function () {
      const { escrow, signer, player1, player2 } = await loadFixture(contestCreatedFixture);

      const nonce1 = 101n;
      const deadline = BigInt(await time.latest()) + 3600n;
      const sig1 = await signClaimVoucher(
        escrow,
        signer,
        contestId,
        player1.address,
        poolAmount,
        nonce1,
        deadline
      );

      await expect(
        escrow.connect(player1).claimReward(contestId, player1.address, poolAmount, nonce1, deadline, sig1)
      ).to.emit(escrow, "ContestRewardClaimed");

      const contest = await escrow.contests(contestId);
      expect(contest.remainingPool).to.equal(0n);
      expect(contest.active).to.be.false;

      // Further claim reverts because contest is deactivated
      const nonce2 = 102n;
      const sig2 = await signClaimVoucher(
        escrow,
        signer,
        contestId,
        player2.address,
        1n,
        nonce2,
        deadline
      );
      await expect(
        escrow.connect(player2).claimReward(contestId, player2.address, 1n, nonce2, deadline, sig2)
      ).to.be.revertedWith("Contest not active");
    });

    it("should revert if signature is used on a different contestId (cross-contest replay attack)", async function () {
      const { escrow, creator, signer, player1 } = await loadFixture(contestCreatedFixture);

      // Create a second contest
      const contestId2 = ethers.keccak256(ethers.toUtf8Bytes("contest-uuid-5678"));
      await escrow.connect(creator).createContest(contestId2, poolAmount, duration);

      const reward = ethers.parseEther("50");
      const nonce = 103n;
      const deadline = BigInt(await time.latest()) + 3600n;
      // Signed for contestId
      const sig = await signClaimVoucher(escrow, signer, contestId, player1.address, reward, nonce, deadline);

      // Attempt to claim against contestId2 with voucher for contestId
      await expect(
        escrow.connect(player1).claimReward(contestId2, player1.address, reward, nonce, deadline, sig)
      ).to.be.revertedWith("Invalid signature");
    });

    it("should revert if reward amount is tampered in claim call", async function () {
      const { escrow, signer, player1 } = await loadFixture(contestCreatedFixture);

      const reward = ethers.parseEther("50");
      const nonce = 104n;
      const deadline = BigInt(await time.latest()) + 3600n;
      const sig = await signClaimVoucher(escrow, signer, contestId, player1.address, reward, nonce, deadline);

      // Submit tampered amount 60 ETH instead of 50 ETH
      await expect(
        escrow.connect(player1).claimReward(contestId, player1.address, ethers.parseEther("60"), nonce, deadline, sig)
      ).to.be.revertedWith("Invalid signature");
    });

    it("should revert if recipient is tampered in claim call", async function () {
      const { escrow, signer, player1, player2 } = await loadFixture(contestCreatedFixture);

      const reward = ethers.parseEther("50");
      const nonce = 105n;
      const deadline = BigInt(await time.latest()) + 3600n;
      const sig = await signClaimVoucher(escrow, signer, contestId, player1.address, reward, nonce, deadline);

      // Claim as player2 with voucher signed for player1
      await expect(
        escrow.connect(player2).claimReward(contestId, player2.address, reward, nonce, deadline, sig)
      ).to.be.revertedWith("Invalid signature");
    });

    it("should revert on zero claim amount", async function () {
      const { escrow, signer, player1 } = await loadFixture(contestCreatedFixture);
      const nonce = 106n;
      const deadline = BigInt(await time.latest()) + 3600n;
      const sig = await signClaimVoucher(escrow, signer, contestId, player1.address, 0n, nonce, deadline);

      await expect(
        escrow.connect(player1).claimReward(contestId, player1.address, 0n, nonce, deadline, sig)
      ).to.be.revertedWith("Amount must be > 0");
    });

    it("should revert on zero recipient address", async function () {
      const { escrow, signer, player1 } = await loadFixture(contestCreatedFixture);
      const nonce = 107n;
      const deadline = BigInt(await time.latest()) + 3600n;
      const sig = await signClaimVoucher(escrow, signer, contestId, ethers.ZeroAddress, 50n, nonce, deadline);

      await expect(
        escrow.connect(player1).claimReward(contestId, ethers.ZeroAddress, 50n, nonce, deadline, sig)
      ).to.be.revertedWith("Invalid recipient");
    });
  });

  describe("Refund Remaining Tokens", function () {
    async function contestCreatedFixture() {
      const base = await deployContestEscrowFixture();
      await base.escrow.connect(base.creator).createContest(contestId, poolAmount, duration);
      return base;
    }

    it("should revert if contest has not expired yet", async function () {
      const { escrow, creator } = await loadFixture(contestCreatedFixture);
      await expect(
        escrow.connect(creator).refundRemaining(contestId)
      ).to.be.revertedWith("Contest not yet expired");
    });

    it("should revert if caller is neither creator nor owner", async function () {
      const { escrow, player1 } = await loadFixture(contestCreatedFixture);
      await time.increase(duration + 10);
      await expect(
        escrow.connect(player1).refundRemaining(contestId)
      ).to.be.revertedWith("Not creator or owner");
    });

    it("should refund unearned balance to creator after expiry", async function () {
      const { escrow, quizToken, signer, creator, player1 } = await loadFixture(contestCreatedFixture);

      // 1. Player1 claims 100 tokens
      const reward = ethers.parseEther("100");
      const nonce = 1n;
      const deadline = BigInt(await time.latest()) + 3600n;
      const sig = await signClaimVoucher(escrow, signer, contestId, player1.address, reward, nonce, deadline);
      await escrow.connect(player1).claimReward(contestId, player1.address, reward, nonce, deadline, sig);

      const balanceBefore = await quizToken.balanceOf(creator.address);

      // 2. Fast-forward past expiry
      await time.increase(duration + 10);

      // 3. Creator refunds remaining 900 tokens
      const expectedRefund = poolAmount - reward;
      await expect(escrow.connect(creator).refundRemaining(contestId))
        .to.emit(escrow, "ContestRefunded")
        .withArgs(contestId, creator.address, expectedRefund);

      const balanceAfter = await quizToken.balanceOf(creator.address);
      expect(balanceAfter - balanceBefore).to.equal(expectedRefund);

      const contest = await escrow.contests(contestId);
      expect(contest.remainingPool).to.equal(0n);
      expect(contest.active).to.be.false;
    });
  });

  describe("Admin Controls", function () {
    it("should allow owner to update authorized signer", async function () {
      const { escrow, owner, signer, other } = await loadFixture(deployContestEscrowFixture);

      await expect(escrow.connect(owner).setAuthorizedSigner(other.address))
        .to.emit(escrow, "SignerUpdated")
        .withArgs(signer.address, other.address);

      expect(await escrow.authorizedSigner()).to.equal(other.address);
    });

    it("should revert if non-owner tries to update signer", async function () {
      const { escrow, other } = await loadFixture(deployContestEscrowFixture);

      await expect(
        escrow.connect(other).setAuthorizedSigner(other.address)
      ).to.be.revertedWithCustomError(escrow, "OwnableUnauthorizedAccount");
    });

    it("should revert if setting authorized signer to zero address", async function () {
      const { escrow, owner } = await loadFixture(deployContestEscrowFixture);

      await expect(
        escrow.connect(owner).setAuthorizedSigner(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid signer address");
    });
  });
});
