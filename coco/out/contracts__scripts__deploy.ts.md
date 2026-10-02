# contracts/scripts/deploy.ts
lines:50 exports:
---
import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  const signerAddress = process.env.REWARD_SIGNER_ADDRESS || deployer.address;
  const baseURI = process.env.BADGE_BASE_URI;
  if (!baseURI) {
    throw new Error("Missing BADGE_BASE_URI env var. Set it before deploying.");
  }

  // Deploy QuizToken
  const QuizTokenFactory = await ethers.getContractFactory("QuizToken");
  const quizToken = await QuizTokenFactory.deploy(signerAddress);
  await quizToken.waitForDeployment();
  const tokenAddress = await quizToken.getAddress();
  console.log("QuizToken deployed to:", tokenAddress);

  // Deploy QuizBadgeNFT
  const BadgeFactory = await ethers.getContractFactory("QuizBadgeNFT");
  const badge = await BadgeFactory.deploy(signerAddress, baseURI);
  await badge.waitForDeployment();
  const badgeAddress = await badge.getAddress();
  console.log("QuizBadgeNFT deployed to:", badgeAddress);

  // Deploy ContestEscrow (escrows creator-funded $QUIZ for list contests)
  const EscrowFactory = await ethers.getContractFactory("ContestEscrow");
  const escrow = await EscrowFactory.deploy(tokenAddress, signerAddress);
  await escrow.waitForDeployment();
  const escrowAddress = await escrow.getAddress();
  console.log("ContestEscrow deployed to:", escrowAddress);

  // Write deployed addresses to .env.deploy for easy copy into .env
  const envContent = `# Deployed contract addresses — copy these into your .env file
NEXT_PUBLIC_QUIZ_TOKEN_ADDRESS=${tokenAddress}
NEXT_PUBLIC_QUIZ_BADGE_ADDRESS=${badgeAddress}
NEXT_PUBLIC_CONTEST_ESCROW_ADDRESS=${escrowAddress}
