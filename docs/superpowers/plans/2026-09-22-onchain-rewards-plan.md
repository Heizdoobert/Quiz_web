# Phase 3: On-Chain Rewards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add verifiable on-chain ERC-20 token rewards and ERC-721 achievement badge NFTs to Quick Quiz, authorized via EIP-712 server-signed vouchers on Base Sepolia.

**Architecture:** A Hardhat workspace (`contracts/`) compiles and tests two Solidity contracts (QuizToken ERC-20, QuizBadgeNFT ERC-721). Next.js Server Actions sign EIP-712 vouchers after verifying player eligibility from Supabase. The frontend uses Wagmi hooks to submit claim transactions from the player's wallet. A deployment script syncs ABIs and addresses into the Next.js `lib/contracts/` directory.

**Tech Stack:** Solidity ^0.8.24, OpenZeppelin v5.x, Hardhat, viem, wagmi, Base Sepolia (chain ID 84532), Supabase, Next.js 16 App Router, Tailwind CSS v4.

**Spec:** `docs/superpowers/specs/2026-09-22-onchain-rewards-design.md`

## Global Constraints

- Solidity `^0.8.24` with OpenZeppelin `@openzeppelin/contracts` v5.x.
- Hardhat workspace isolated in `contracts/` with its own `package.json`.
- All styling uses Tailwind CSS v4 and the existing dark palette (`#0f172a` bg, `#1e293b` cards, `#3b82f6` accents).
- `REWARD_SIGNER_PRIVATE_KEY` is server-only — never prefixed with `NEXT_PUBLIC_`.
- `bigint` values crossing the server action boundary are serialized as strings (Server Actions cannot serialize `bigint`).
- Run `npm run lint` and `npm run build` in the root after each task to verify zero errors.
- Run `npx hardhat test` in `contracts/` after each contracts task.
- Use `BypassSandbox: true` for all shell commands (NTFS mount constraint).

---

## File Map

### New Files — Hardhat Workspace

| File | Responsibility |
|------|---------------|
| `contracts/package.json` | Hardhat dev dependencies, scripts |
| `contracts/tsconfig.json` | TypeScript config for Hardhat |
| `contracts/hardhat.config.ts` | Solidity compiler, network configs |
| `contracts/contracts/QuizToken.sol` | ERC-20 $QUIZ token with EIP-712 claim |
| `contracts/contracts/QuizBadgeNFT.sol` | ERC-721 badge NFT with EIP-712 mint |
| `contracts/test/QuizToken.test.ts` | 8 test cases for QuizToken |
| `contracts/test/QuizBadgeNFT.test.ts` | 8 test cases for QuizBadgeNFT |
| `contracts/scripts/deploy.ts` | Deploy both contracts, write addresses |
| `contracts/scripts/sync-abi.ts` | Extract ABIs to Next.js lib/contracts/ |

### New Files — Next.js Integration

| File | Responsibility |
|------|---------------|
| `lib/contracts/QuizTokenABI.ts` | Typed ABI const for QuizToken |
| `lib/contracts/QuizBadgeNFTABI.ts` | Typed ABI const for QuizBadgeNFT |
| `lib/contracts/addresses.ts` | Contract address exports from env |
| `lib/actions/reward-actions.ts` | Server Actions: voucher signing, claims |
| `components/modals/RewardsModal.tsx` | Two-tab modal: tokens + badges UI |

### Modified Files

| File | Change |
|------|--------|
| `lib/types.ts` | Add `ClaimableRewards`, `RewardVoucher`, `BADGE_NAMES`, `BADGE_ICONS` |
| `lib/schema.sql` | Add `reward_claims` table with RLS |
| `components/Providers.tsx` | Add `baseSepolia` to chains array |
| `components/Header.tsx` | Add Rewards button with notification dot |
| `components/StatsPanel.tsx` | Add claimable summary + View Rewards link |
| `components/QuizLayout.tsx` | Add rewards state, RewardsModal, pass callbacks |
| `.env` | Add reward signer key + contract addresses |
| `.env.example` | Add placeholder entries for new env vars |
| `.gitignore` | Add `contracts/artifacts/`, `contracts/cache/`, `contracts/typechain-types/` |

---

### Task 1: Hardhat Workspace Scaffold & QuizToken Contract

**Files:**
- Create: `contracts/package.json`
- Create: `contracts/tsconfig.json`
- Create: `contracts/hardhat.config.ts`
- Create: `contracts/contracts/QuizToken.sol`
- Create: `contracts/test/QuizToken.test.ts`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: Nothing (first task).
- Produces:
  - `QuizToken` Solidity contract with `claimTokens(address,uint256,uint256,uint256,bytes)` and `setAuthorizedSigner(address)`.
  - Hardhat workspace that compiles and tests.

- [ ] **Step 1: Create `contracts/package.json`**

```json
{
  "name": "quick-quiz-contracts",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "compile": "hardhat compile",
    "test": "hardhat test",
    "deploy:local": "hardhat run scripts/deploy.ts --network localhost",
    "deploy:base-sepolia": "hardhat run scripts/deploy.ts --network baseSepolia",
    "sync-abi": "ts-node scripts/sync-abi.ts"
  },
  "devDependencies": {
    "@nomicfoundation/hardhat-toolbox": "^5.0.0",
    "@openzeppelin/contracts": "^5.1.0",
    "hardhat": "^2.22.0",
    "ts-node": "^10.9.2",
    "typescript": "^5.5.0"
  }
}
```

- [ ] **Step 2: Create `contracts/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  }
}
```

- [ ] **Step 3: Create `contracts/hardhat.config.ts`**

```typescript
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    baseSepolia: {
      url: process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : [],
    },
  },
};

export default config;
```

- [ ] **Step 4: Install dependencies**

Run: `cd /mnt/second_drive/web_quiz/contracts && npm install`
Expected: `node_modules` created, no errors.

- [ ] **Step 5: Create `contracts/contracts/QuizToken.sol`**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

contract QuizToken is ERC20, ERC20Permit, Ownable {
    using ECDSA for bytes32;

    bytes32 public constant CLAIM_TYPEHASH =
        keccak256("ClaimTokens(address recipient,uint256 amount,uint256 nonce,uint256 deadline)");

    address public authorizedSigner;
    mapping(address => mapping(uint256 => bool)) public usedNonces;

    event TokensClaimed(address indexed recipient, uint256 amount, uint256 nonce);
    event SignerUpdated(address indexed oldSigner, address indexed newSigner);

    constructor(address _signer)
        ERC20("Quiz Token", "QUIZ")
        ERC20Permit("QuizToken")
        Ownable(msg.sender)
    {
        require(_signer != address(0), "Invalid signer");
        authorizedSigner = _signer;
    }

    function claimTokens(
        address recipient,
        uint256 amount,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) external {
        require(block.timestamp <= deadline, "Voucher expired");
        require(amount > 0, "Amount must be > 0");
        require(!usedNonces[recipient][nonce], "Nonce already used");

        bytes32 structHash = keccak256(
            abi.encode(CLAIM_TYPEHASH, recipient, amount, nonce, deadline)
        );
        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(digest, signature);
        require(signer == authorizedSigner, "Invalid signature");

        usedNonces[recipient][nonce] = true;
        _mint(recipient, amount);

        emit TokensClaimed(recipient, amount, nonce);
    }

    function setAuthorizedSigner(address newSigner) external onlyOwner {
        require(newSigner != address(0), "Invalid signer");
        emit SignerUpdated(authorizedSigner, newSigner);
        authorizedSigner = newSigner;
    }
}
```

- [ ] **Step 6: Compile to verify Solidity compiles**

Run: `cd /mnt/second_drive/web_quiz/contracts && npx hardhat compile`
Expected: `Compiled 1 Solidity file successfully` (plus OpenZeppelin dependencies).

- [ ] **Step 7: Create `contracts/test/QuizToken.test.ts`**

```typescript
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
```

- [ ] **Step 8: Run QuizToken tests**

Run: `cd /mnt/second_drive/web_quiz/contracts && npx hardhat test test/QuizToken.test.ts`
Expected: 8 passing tests.

- [ ] **Step 9: Add Hardhat artifacts to `.gitignore`**

Append to `/mnt/second_drive/web_quiz/.gitignore`:
```
# Hardhat
contracts/artifacts/
contracts/cache/
contracts/typechain-types/
contracts/node_modules/
```

- [ ] **Step 10: Commit**

```bash
cd /mnt/second_drive/web_quiz
git add contracts/package.json contracts/tsconfig.json contracts/hardhat.config.ts contracts/contracts/QuizToken.sol contracts/test/QuizToken.test.ts .gitignore
git commit -m "feat(contracts): add Hardhat workspace and QuizToken ERC-20 with EIP-712 claims"
```

---

### Task 2: QuizBadgeNFT Contract & Tests

**Files:**
- Create: `contracts/contracts/QuizBadgeNFT.sol`
- Create: `contracts/test/QuizBadgeNFT.test.ts`

**Interfaces:**
- Consumes: Hardhat workspace from Task 1.
- Produces: `QuizBadgeNFT` Solidity contract with `mintBadge(address,uint256,uint256,uint256,bytes)`, `setAuthorizedSigner(address)`, `setBaseURI(string)`, `setBadgeTypeCount(uint256)`.

- [ ] **Step 1: Create `contracts/contracts/QuizBadgeNFT.sol`**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract QuizBadgeNFT is ERC721, ERC721URIStorage, EIP712, Ownable {
    using ECDSA for bytes32;
    using Strings for uint256;

    bytes32 public constant MINT_TYPEHASH =
        keccak256("MintBadge(address recipient,uint256 badgeType,uint256 nonce,uint256 deadline)");

    address public authorizedSigner;
    uint256 private _nextTokenId;
    uint256 public badgeTypeCount = 4;
    string public baseTokenURI;

    mapping(address => mapping(uint256 => bool)) public hasBadge;
    mapping(address => mapping(uint256 => bool)) public usedNonces;

    event BadgeMinted(address indexed recipient, uint256 indexed tokenId, uint256 badgeType);
    event SignerUpdated(address indexed oldSigner, address indexed newSigner);

    constructor(address _signer, string memory _baseURI)
        ERC721("Quiz Badge", "QBADGE")
        EIP712("QuizBadgeNFT", "1")
        Ownable(msg.sender)
    {
        require(_signer != address(0), "Invalid signer");
        authorizedSigner = _signer;
        baseTokenURI = _baseURI;
    }

    function mintBadge(
        address recipient,
        uint256 badgeType,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) external returns (uint256) {
        require(block.timestamp <= deadline, "Voucher expired");
        require(badgeType < badgeTypeCount, "Invalid badge type");
        require(!hasBadge[recipient][badgeType], "Badge already claimed");
        require(!usedNonces[recipient][nonce], "Nonce already used");

        bytes32 structHash = keccak256(
            abi.encode(MINT_TYPEHASH, recipient, badgeType, nonce, deadline)
        );
        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(digest, signature);
        require(signer == authorizedSigner, "Invalid signature");

        usedNonces[recipient][nonce] = true;
        hasBadge[recipient][badgeType] = true;

        uint256 tokenId = _nextTokenId++;
        _safeMint(recipient, tokenId);
        _setTokenURI(tokenId, string.concat(baseTokenURI, badgeType.toString()));

        emit BadgeMinted(recipient, tokenId, badgeType);
        return tokenId;
    }

    function setAuthorizedSigner(address newSigner) external onlyOwner {
        require(newSigner != address(0), "Invalid signer");
        emit SignerUpdated(authorizedSigner, newSigner);
        authorizedSigner = newSigner;
    }

    function setBaseURI(string memory newBaseURI) external onlyOwner {
        baseTokenURI = newBaseURI;
    }

    function setBadgeTypeCount(uint256 count) external onlyOwner {
        badgeTypeCount = count;
    }

    // Required overrides
    function tokenURI(uint256 tokenId)
        public view override(ERC721, ERC721URIStorage) returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public view override(ERC721, ERC721URIStorage) returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
```

- [ ] **Step 2: Compile to verify**

Run: `cd /mnt/second_drive/web_quiz/contracts && npx hardhat compile`
Expected: Both contracts compile successfully.

- [ ] **Step 3: Create `contracts/test/QuizBadgeNFT.test.ts`**

```typescript
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
```

- [ ] **Step 4: Run all contract tests**

Run: `cd /mnt/second_drive/web_quiz/contracts && npx hardhat test`
Expected: 16 passing tests (8 QuizToken + 8 QuizBadgeNFT).

- [ ] **Step 5: Commit**

```bash
cd /mnt/second_drive/web_quiz
git add contracts/contracts/QuizBadgeNFT.sol contracts/test/QuizBadgeNFT.test.ts
git commit -m "feat(contracts): add QuizBadgeNFT ERC-721 with EIP-712 badge minting"
```

---

### Task 3: Deploy Script, ABI Sync & Contract Address Exports

**Files:**
- Create: `contracts/scripts/deploy.ts`
- Create: `contracts/scripts/sync-abi.ts`
- Create: `lib/contracts/QuizTokenABI.ts`
- Create: `lib/contracts/QuizBadgeNFTABI.ts`
- Create: `lib/contracts/addresses.ts`

**Interfaces:**
- Consumes: Compiled Hardhat artifacts from Tasks 1-2.
- Produces:
  - `lib/contracts/QuizTokenABI.ts`: `export const QuizTokenABI = [...] as const;`
  - `lib/contracts/QuizBadgeNFTABI.ts`: `export const QuizBadgeNFTABI = [...] as const;`
  - `lib/contracts/addresses.ts`: `export const QUIZ_TOKEN_ADDRESS`, `export const QUIZ_BADGE_ADDRESS`.
  - Deployment script that writes addresses to `lib/contracts/addresses.ts`.

- [ ] **Step 1: Create `contracts/scripts/deploy.ts`**

```typescript
import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  const signerAddress = process.env.REWARD_SIGNER_ADDRESS || deployer.address;
  const baseURI = process.env.BADGE_BASE_URI || "https://quiz.example.com/badges/";

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

  // Write addresses to lib/contracts/addresses.ts
  const addressesContent = `// Auto-generated by deploy.ts — do not edit manually
export const QUIZ_TOKEN_ADDRESS = (process.env.NEXT_PUBLIC_QUIZ_TOKEN_ADDRESS || '${tokenAddress}') as \`0x\${string}\`;
export const QUIZ_BADGE_ADDRESS = (process.env.NEXT_PUBLIC_QUIZ_BADGE_ADDRESS || '${badgeAddress}') as \`0x\${string}\`;
`;
  const outDir = path.resolve(__dirname, "../../lib/contracts");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "addresses.ts"), addressesContent);
  console.log("Addresses written to lib/contracts/addresses.ts");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

- [ ] **Step 2: Create `contracts/scripts/sync-abi.ts`**

```typescript
import * as fs from "fs";
import * as path from "path";

const ARTIFACTS_DIR = path.resolve(__dirname, "../artifacts/contracts");
const OUT_DIR = path.resolve(__dirname, "../../lib/contracts");

function extractABI(contractName: string): unknown[] {
  const artifactPath = path.join(
    ARTIFACTS_DIR,
    `${contractName}.sol`,
    `${contractName}.json`
  );
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
  return artifact.abi;
}

function writeABI(contractName: string, abi: unknown[]): void {
  const content = `// Auto-generated by sync-abi.ts — do not edit manually
export const ${contractName}ABI = ${JSON.stringify(abi, null, 2)} as const;
`;
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, `${contractName}ABI.ts`), content);
  console.log(`Wrote ${contractName}ABI.ts`);
}

function main(): void {
  for (const name of ["QuizToken", "QuizBadgeNFT"]) {
    const abi = extractABI(name);
    writeABI(name, abi);
  }
}

main();
```

- [ ] **Step 3: Run ABI sync**

Run: `cd /mnt/second_drive/web_quiz/contracts && npx ts-node scripts/sync-abi.ts`
Expected: Creates `lib/contracts/QuizTokenABI.ts` and `lib/contracts/QuizBadgeNFTABI.ts`.

- [ ] **Step 4: Create `lib/contracts/addresses.ts` (initial placeholder)**

```typescript
// Auto-generated by deploy.ts — do not edit manually
export const QUIZ_TOKEN_ADDRESS = (process.env.NEXT_PUBLIC_QUIZ_TOKEN_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`;
export const QUIZ_BADGE_ADDRESS = (process.env.NEXT_PUBLIC_QUIZ_BADGE_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`;
```

- [ ] **Step 5: Verify root project still builds**

Run: `cd /mnt/second_drive/web_quiz && npm run lint && npm run build`
Expected: Exit code 0.

- [ ] **Step 6: Commit**

```bash
cd /mnt/second_drive/web_quiz
git add contracts/scripts/ lib/contracts/
git commit -m "feat(contracts): add deploy script, ABI sync, and contract address exports"
```

---

### Task 4: Types, Schema & Reward Server Actions

**Files:**
- Modify: `lib/types.ts` (append new types)
- Modify: `lib/schema.sql` (append `reward_claims` table)
- Create: `lib/actions/reward-actions.ts`
- Modify: `.env` (add reward env vars)
- Modify: `.env.example` (add placeholder entries)

**Interfaces:**
- Consumes:
  - `lib/supabase.ts`: `supabase` client.
  - `lib/actions/leaderboard-actions.ts`: `getGlobalLeaderboard(limit: number): Promise<LeaderboardEntry[]>`.
  - `lib/actions/quiz-actions.ts`: `getUserStats(walletAddress: string): Promise<UserStats>`.
  - `lib/contracts/addresses.ts`: `QUIZ_TOKEN_ADDRESS`, `QUIZ_BADGE_ADDRESS`.
- Produces:
  - `ClaimableRewards` type, `RewardVoucher` type, `BADGE_NAMES`, `BADGE_ICONS` from `lib/types.ts`.
  - `getClaimableRewards(walletAddress: string): Promise<ClaimableRewards>`.
  - `generateTokenVoucher(walletAddress: string): Promise<RewardVoucher | { error: string }>`.
  - `generateBadgeVoucher(walletAddress: string, badgeType: number): Promise<RewardVoucher | { error: string }>`.
  - `confirmRewardClaim(walletAddress: string, nonce: string, txHash: string): Promise<{ success: boolean }>`.

- [ ] **Step 1: Append new types to `lib/types.ts`**

Add after the existing `AnswerSubmissionResult` interface:

```typescript
export interface ClaimableRewards {
  claimableTokens: string;
  eligibleBadges: number[];
  alreadyClaimedBadges: number[];
  totalEarned: string;
  totalClaimed: string;
}

export interface RewardVoucher {
  recipient: string;
  amount: string;
  badgeType?: number;
  nonce: string;
  deadline: string;
  signature: string;
  contractAddress: string;
}

export const BADGE_NAMES: Record<number, string> = {
  0: 'Leaderboard Champion',
  1: 'Streak Fire',
  2: 'Century Quizzer',
  3: 'Perfect Round',
};

export const BADGE_ICONS: Record<number, string> = {
  0: '🏆',
  1: '🔥',
  2: '💯',
  3: '⭐',
};
```

- [ ] **Step 2: Append `reward_claims` table to `lib/schema.sql`**

Add at the end of the file:

```sql
-- Reward claims tracking table
CREATE TABLE IF NOT EXISTS reward_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address TEXT NOT NULL,
    claim_type TEXT NOT NULL CHECK (claim_type IN ('token', 'badge')),
    amount BIGINT,
    badge_type INTEGER,
    nonce TEXT NOT NULL,
    tx_hash TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'claimed', 'expired')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(wallet_address, nonce)
);

CREATE INDEX IF NOT EXISTS idx_reward_claims_wallet ON reward_claims(wallet_address);
ALTER TABLE reward_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read for reward_claims" ON reward_claims FOR SELECT USING (true);
CREATE POLICY "Allow public insert for reward_claims" ON reward_claims FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update for reward_claims" ON reward_claims FOR UPDATE USING (true);
```

- [ ] **Step 3: Add env vars to `.env` and `.env.example`**

Append to `.env`:
```
# On-Chain Rewards
REWARD_SIGNER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
NEXT_PUBLIC_QUIZ_TOKEN_ADDRESS=0x0000000000000000000000000000000000000000
NEXT_PUBLIC_QUIZ_BADGE_ADDRESS=0x0000000000000000000000000000000000000000
NEXT_PUBLIC_CHAIN_ID=84532
```

Append to `.env.example`:
```
# On-Chain Rewards
REWARD_SIGNER_PRIVATE_KEY=0x_your_signer_private_key
NEXT_PUBLIC_QUIZ_TOKEN_ADDRESS=0x_deployed_quiz_token_address
NEXT_PUBLIC_QUIZ_BADGE_ADDRESS=0x_deployed_quiz_badge_address
NEXT_PUBLIC_CHAIN_ID=84532
```

- [ ] **Step 4: Create `lib/actions/reward-actions.ts`**

```typescript
'use server';

import { supabase } from '@/lib/supabase';
import { ClaimableRewards, RewardVoucher } from '@/lib/types';
import { getGlobalLeaderboard } from '@/lib/actions/leaderboard-actions';
import { getUserStats } from '@/lib/actions/quiz-actions';
import { QUIZ_TOKEN_ADDRESS, QUIZ_BADGE_ADDRESS } from '@/lib/contracts/addresses';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import crypto from 'crypto';

const TOKENS_PER_CORRECT = 10n * 10n ** 18n; // 10 QUIZ tokens (in wei) per correct answer

function getSignerAccount() {
  const key = process.env.REWARD_SIGNER_PRIVATE_KEY;
  if (!key || key === '0x_your_signer_private_key') {
    return null;
  }
  return privateKeyToAccount(key as `0x${string}`);
}

export async function getClaimableRewards(walletAddress: string): Promise<ClaimableRewards> {
  const empty: ClaimableRewards = {
    claimableTokens: '0',
    eligibleBadges: [],
    alreadyClaimedBadges: [],
    totalEarned: '0',
    totalClaimed: '0',
  };

  try {
    if (!walletAddress) return empty;
    const normalized = walletAddress.toLowerCase();

    // Get total correct answers
    const { data: results, error: rErr } = await supabase
      .from('quiz_results')
      .select('is_correct')
      .eq('wallet_address', normalized);

    if (rErr || !results) return empty;

    const totalCorrect = results.filter((r) => r.is_correct).length;
    const totalEarned = BigInt(totalCorrect) * TOKENS_PER_CORRECT;

    // Get total already-claimed tokens
    const { data: claims, error: cErr } = await supabase
      .from('reward_claims')
      .select('amount')
      .eq('wallet_address', normalized)
      .eq('claim_type', 'token')
      .eq('status', 'claimed');

    let totalClaimed = 0n;
    if (!cErr && claims) {
      for (const c of claims) {
        totalClaimed += BigInt(c.amount || 0);
      }
    }

    const claimableTokens = totalEarned > totalClaimed ? totalEarned - totalClaimed : 0n;

    // Check badge eligibility
    const stats = await getUserStats(walletAddress);
    const leaderboard = await getGlobalLeaderboard(3);
    const isTop3 = leaderboard.some(
      (e) => e.wallet_address === normalized && e.rank <= 3
    );

    const eligibleBadges: number[] = [];
    if (isTop3) eligibleBadges.push(0);
    if (stats.bestStreak >= 10) eligibleBadges.push(1);
    if (stats.totalAnswered >= 100) eligibleBadges.push(2);
    if (stats.bestStreak >= 10) eligibleBadges.push(3);

    // Check already-claimed badges
    const { data: badgeClaims } = await supabase
      .from('reward_claims')
      .select('badge_type')
      .eq('wallet_address', normalized)
      .eq('claim_type', 'badge')
      .eq('status', 'claimed');

    const alreadyClaimedBadges = (badgeClaims || [])
      .map((c) => c.badge_type as number)
      .filter((b): b is number => b !== null);

    // Remove already-claimed from eligible
    const filteredEligible = eligibleBadges.filter(
      (b) => !alreadyClaimedBadges.includes(b)
    );

    return {
      claimableTokens: claimableTokens.toString(),
      eligibleBadges: filteredEligible,
      alreadyClaimedBadges,
      totalEarned: totalEarned.toString(),
      totalClaimed: totalClaimed.toString(),
    };
  } catch (err) {
    console.error('getClaimableRewards error:', err);
    return empty;
  }
}

export async function generateTokenVoucher(
  walletAddress: string
): Promise<RewardVoucher | { error: string }> {
  try {
    if (!walletAddress) return { error: 'Wallet address required' };

    const account = getSignerAccount();
    if (!account) return { error: 'Reward signing not configured' };

    const rewards = await getClaimableRewards(walletAddress);
    const claimable = BigInt(rewards.claimableTokens);
    if (claimable <= 0n) return { error: 'Nothing to claim' };

    const normalized = walletAddress.toLowerCase();
    const nonce = crypto.randomUUID();
    const nonceUint = BigInt('0x' + nonce.replace(/-/g, '').slice(0, 16));
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

    const chainId = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '84532', 10);

    const signature = await account.signTypedData({
      domain: {
        name: 'QuizToken',
        version: '1',
        chainId: BigInt(chainId),
        verifyingContract: QUIZ_TOKEN_ADDRESS,
      },
      types: {
        ClaimTokens: [
          { name: 'recipient', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
        ],
      },
      primaryType: 'ClaimTokens',
      message: {
        recipient: normalized as `0x${string}`,
        amount: claimable,
        nonce: nonceUint,
        deadline,
      },
    });

    // Record pending claim
    await supabase.from('reward_claims').insert({
      wallet_address: normalized,
      claim_type: 'token',
      amount: claimable.toString(),
      nonce,
      status: 'pending',
    });

    return {
      recipient: normalized,
      amount: claimable.toString(),
      nonce: nonceUint.toString(),
      deadline: deadline.toString(),
      signature,
      contractAddress: QUIZ_TOKEN_ADDRESS,
    };
  } catch (err) {
    console.error('generateTokenVoucher error:', err);
    return { error: 'Failed to generate voucher' };
  }
}

export async function generateBadgeVoucher(
  walletAddress: string,
  badgeType: number
): Promise<RewardVoucher | { error: string }> {
  try {
    if (!walletAddress) return { error: 'Wallet address required' };

    const account = getSignerAccount();
    if (!account) return { error: 'Reward signing not configured' };

    const rewards = await getClaimableRewards(walletAddress);
    if (!rewards.eligibleBadges.includes(badgeType)) {
      return { error: 'Badge not eligible or already claimed' };
    }

    const normalized = walletAddress.toLowerCase();
    const nonce = crypto.randomUUID();
    const nonceUint = BigInt('0x' + nonce.replace(/-/g, '').slice(0, 16));
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

    const chainId = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '84532', 10);

    const signature = await account.signTypedData({
      domain: {
        name: 'QuizBadgeNFT',
        version: '1',
        chainId: BigInt(chainId),
        verifyingContract: QUIZ_BADGE_ADDRESS,
      },
      types: {
        MintBadge: [
          { name: 'recipient', type: 'address' },
          { name: 'badgeType', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
        ],
      },
      primaryType: 'MintBadge',
      message: {
        recipient: normalized as `0x${string}`,
        badgeType: BigInt(badgeType),
        nonce: nonceUint,
        deadline,
      },
    });

    // Record pending claim
    await supabase.from('reward_claims').insert({
      wallet_address: normalized,
      claim_type: 'badge',
      badge_type: badgeType,
      nonce,
      status: 'pending',
    });

    return {
      recipient: normalized,
      amount: '0',
      badgeType,
      nonce: nonceUint.toString(),
      deadline: deadline.toString(),
      signature,
      contractAddress: QUIZ_BADGE_ADDRESS,
    };
  } catch (err) {
    console.error('generateBadgeVoucher error:', err);
    return { error: 'Failed to generate badge voucher' };
  }
}

export async function confirmRewardClaim(
  walletAddress: string,
  nonce: string,
  txHash: string
): Promise<{ success: boolean }> {
  try {
    if (!walletAddress || !nonce || !txHash) return { success: false };
    const normalized = walletAddress.toLowerCase();

    const { error } = await supabase
      .from('reward_claims')
      .update({ status: 'claimed', tx_hash: txHash })
      .eq('wallet_address', normalized)
      .eq('nonce', nonce)
      .eq('status', 'pending');

    return { success: !error };
  } catch (err) {
    console.error('confirmRewardClaim error:', err);
    return { success: false };
  }
}
```

- [ ] **Step 5: Verify root project builds**

Run: `cd /mnt/second_drive/web_quiz && npm run lint && npm run build`
Expected: Exit code 0.

- [ ] **Step 6: Commit**

```bash
cd /mnt/second_drive/web_quiz
git add lib/types.ts lib/schema.sql lib/actions/reward-actions.ts .env .env.example
git commit -m "feat(rewards): add reward types, schema, and server actions for token/badge voucher signing"
```

---

### Task 5: RewardsModal, Providers & Chain Config

**Files:**
- Create: `components/modals/RewardsModal.tsx`
- Modify: `components/Providers.tsx` (add `baseSepolia` to chains)

**Interfaces:**
- Consumes:
  - `lib/types.ts`: `ClaimableRewards`, `RewardVoucher`, `BADGE_NAMES`, `BADGE_ICONS`.
  - `lib/actions/reward-actions.ts`: `getClaimableRewards`, `generateTokenVoucher`, `generateBadgeVoucher`, `confirmRewardClaim`.
  - `lib/contracts/QuizTokenABI.ts`: `QuizTokenABI`.
  - `lib/contracts/QuizBadgeNFTABI.ts`: `QuizBadgeNFTABI`.
  - `lib/contracts/addresses.ts`: `QUIZ_TOKEN_ADDRESS`, `QUIZ_BADGE_ADDRESS`.
  - `components/Modal.tsx`: Base `Modal` component.
- Produces:
  - `RewardsModal` component with props: `isOpen: boolean`, `onClose: () => void`, `walletAddress: string | null`.

- [ ] **Step 1: Add `baseSepolia` to `components/Providers.tsx`**

Modify the chains import and config:

Change:
```typescript
import { mainnet, polygon, optimism, arbitrum, base } from 'wagmi/chains';
```
To:
```typescript
import { mainnet, polygon, optimism, arbitrum, base, baseSepolia } from 'wagmi/chains';
```

Change:
```typescript
  chains: [mainnet, polygon, optimism, arbitrum, base],
```
To:
```typescript
  chains: [mainnet, polygon, optimism, arbitrum, base, baseSepolia],
```

- [ ] **Step 2: Create `components/modals/RewardsModal.tsx`**

```tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useSwitchChain, useChainId } from 'wagmi';
import Modal from '@/components/Modal';
import {
  ClaimableRewards,
  RewardVoucher,
  BADGE_NAMES,
  BADGE_ICONS,
} from '@/lib/types';
import {
  getClaimableRewards,
  generateTokenVoucher,
  generateBadgeVoucher,
  confirmRewardClaim,
} from '@/lib/actions/reward-actions';
import { QuizTokenABI } from '@/lib/contracts/QuizTokenABI';
import { QuizBadgeNFTABI } from '@/lib/contracts/QuizBadgeNFTABI';
import { QUIZ_TOKEN_ADDRESS, QUIZ_BADGE_ADDRESS } from '@/lib/contracts/addresses';
import { Gift, Coins, Award, ExternalLink, Loader2 } from 'lucide-react';

interface RewardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string | null;
}

type ClaimStep = 'idle' | 'signing' | 'submitting' | 'confirming' | 'done' | 'error';

const TARGET_CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '84532', 10);

export default function RewardsModal({ isOpen, onClose, walletAddress }: RewardsModalProps) {
  const [tab, setTab] = useState<'tokens' | 'badges'>('tokens');
  const [rewards, setRewards] = useState<ClaimableRewards | null>(null);
  const [loading, setLoading] = useState(false);
  const [claimStep, setClaimStep] = useState<ClaimStep>('idle');
  const [claimError, setClaimError] = useState<string | null>(null);
  const [currentNonce, setCurrentNonce] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [mintingBadge, setMintingBadge] = useState<number | null>(null);

  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();

  const { isSuccess: txConfirmed } = useWaitForTransactionReceipt({
    hash: txHash as `0x${string}` | undefined,
  });

  const loadRewards = useCallback(async () => {
    if (!walletAddress) return;
    setLoading(true);
    const data = await getClaimableRewards(walletAddress);
    setRewards(data);
    setLoading(false);
  }, [walletAddress]);

  useEffect(() => {
    if (isOpen && walletAddress) {
      loadRewards();
      setClaimStep('idle');
      setClaimError(null);
      setTxHash(null);
      setMintingBadge(null);
    }
  }, [isOpen, walletAddress, loadRewards]);

  // Confirm on-chain after tx is mined
  useEffect(() => {
    if (txConfirmed && currentNonce && walletAddress && txHash) {
      confirmRewardClaim(walletAddress, currentNonce, txHash).then(() => {
        setClaimStep('done');
        loadRewards(); // Refresh
      });
    }
  }, [txConfirmed, currentNonce, walletAddress, txHash, loadRewards]);

  const isWrongChain = chainId !== TARGET_CHAIN_ID;

  const handleClaimTokens = async () => {
    if (!walletAddress || isWrongChain) return;
    setClaimStep('signing');
    setClaimError(null);

    const voucher = await generateTokenVoucher(walletAddress);
    if ('error' in voucher) {
      setClaimError(voucher.error);
      setClaimStep('error');
      return;
    }

    setCurrentNonce(voucher.nonce);
    setClaimStep('submitting');

    try {
      const hash = await writeContractAsync({
        address: QUIZ_TOKEN_ADDRESS,
        abi: QuizTokenABI,
        functionName: 'claimTokens',
        args: [
          voucher.recipient as `0x${string}`,
          BigInt(voucher.amount),
          BigInt(voucher.nonce),
          BigInt(voucher.deadline),
          voucher.signature as `0x${string}`,
        ],
      });
      setTxHash(hash);
      setClaimStep('confirming');
    } catch (err) {
      console.error('Claim tx failed:', err);
      setClaimError('Transaction failed or was rejected');
      setClaimStep('error');
    }
  };

  const handleMintBadge = async (badgeType: number) => {
    if (!walletAddress || isWrongChain) return;
    setMintingBadge(badgeType);
    setClaimStep('signing');
    setClaimError(null);

    const voucher = await generateBadgeVoucher(walletAddress, badgeType);
    if ('error' in voucher) {
      setClaimError(voucher.error);
      setClaimStep('error');
      setMintingBadge(null);
      return;
    }

    setCurrentNonce(voucher.nonce);
    setClaimStep('submitting');

    try {
      const hash = await writeContractAsync({
        address: QUIZ_BADGE_ADDRESS,
        abi: QuizBadgeNFTABI,
        functionName: 'mintBadge',
        args: [
          voucher.recipient as `0x${string}`,
          BigInt(voucher.badgeType ?? 0),
          BigInt(voucher.nonce),
          BigInt(voucher.deadline),
          voucher.signature as `0x${string}`,
        ],
      });
      setTxHash(hash);
      setClaimStep('confirming');
    } catch (err) {
      console.error('Badge mint tx failed:', err);
      setClaimError('Transaction failed or was rejected');
      setClaimStep('error');
      setMintingBadge(null);
    }
  };

  const formatTokens = (weiStr: string): string => {
    const wei = BigInt(weiStr || '0');
    return (wei / 10n ** 18n).toString();
  };

  const explorerUrl = txHash
    ? `https://sepolia.basescan.org/tx/${txHash}`
    : null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Rewards" icon={<Gift className="w-5 h-5 text-amber-400" />} maxWidth="max-w-lg">
      {/* Chain warning */}
      {isWrongChain && (
        <div className="mb-4 p-3 bg-amber-900/30 border border-amber-700/50 rounded-lg text-amber-300 text-sm flex items-center justify-between">
          <span>Switch to Base Sepolia to claim rewards</span>
          <button
            onClick={() => switchChain({ chainId: TARGET_CHAIN_ID })}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-medium transition-colors"
          >
            Switch
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-slate-900/50 rounded-lg p-1">
        <button
          onClick={() => setTab('tokens')}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
            tab === 'tokens'
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Coins className="w-4 h-4" /> $QUIZ Tokens
        </button>
        <button
          onClick={() => setTab('badges')}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
            tab === 'badges'
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Award className="w-4 h-4" /> Badges
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
        </div>
      ) : !walletAddress ? (
        <p className="text-slate-400 text-center py-8">Connect your wallet to view rewards</p>
      ) : !rewards ? (
        <p className="text-slate-400 text-center py-8">No rewards data</p>
      ) : tab === 'tokens' ? (
        /* Tokens Tab */
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-slate-900/70 border border-slate-700/80 rounded-xl text-center">
              <p className="text-[10px] uppercase text-slate-400 font-semibold">Earned</p>
              <p className="text-lg font-bold text-green-400">{formatTokens(rewards.totalEarned)}</p>
            </div>
            <div className="p-3 bg-slate-900/70 border border-slate-700/80 rounded-xl text-center">
              <p className="text-[10px] uppercase text-slate-400 font-semibold">Claimed</p>
              <p className="text-lg font-bold text-slate-300">{formatTokens(rewards.totalClaimed)}</p>
            </div>
            <div className="p-3 bg-slate-900/70 border border-slate-700/80 rounded-xl text-center">
              <p className="text-[10px] uppercase text-slate-400 font-semibold">Available</p>
              <p className="text-lg font-bold text-amber-400">{formatTokens(rewards.claimableTokens)}</p>
            </div>
          </div>

          <p className="text-xs text-slate-500 text-center">Earn 10 $QUIZ for every correct answer</p>

          {claimStep === 'done' && explorerUrl ? (
            <div className="p-3 bg-green-900/30 border border-green-700/50 rounded-lg text-center">
              <p className="text-green-400 font-medium mb-1">🎉 Tokens claimed!</p>
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 text-xs inline-flex items-center gap-1"
              >
                View on BaseScan <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          ) : claimStep === 'error' ? (
            <div className="p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-center">
              <p className="text-red-400 text-sm">{claimError}</p>
            </div>
          ) : null}

          <button
            onClick={handleClaimTokens}
            disabled={
              isWrongChain ||
              BigInt(rewards.claimableTokens || '0') <= 0n ||
              (claimStep !== 'idle' && claimStep !== 'done' && claimStep !== 'error')
            }
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {claimStep === 'signing' && <Loader2 className="w-4 h-4 animate-spin" />}
            {claimStep === 'submitting' && <Loader2 className="w-4 h-4 animate-spin" />}
            {claimStep === 'confirming' && <Loader2 className="w-4 h-4 animate-spin" />}
            {claimStep === 'idle' || claimStep === 'done' || claimStep === 'error'
              ? `Claim ${formatTokens(rewards.claimableTokens)} $QUIZ`
              : claimStep === 'signing'
                ? 'Generating voucher...'
                : claimStep === 'submitting'
                  ? 'Confirm in wallet...'
                  : 'Confirming on-chain...'}
          </button>
        </div>
      ) : (
        /* Badges Tab */
        <div className="grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((badgeType) => {
            const isClaimed = rewards.alreadyClaimedBadges.includes(badgeType);
            const isEligible = rewards.eligibleBadges.includes(badgeType);
            const isMinting = mintingBadge === badgeType && claimStep !== 'idle' && claimStep !== 'done' && claimStep !== 'error';

            return (
              <div
                key={badgeType}
                className={`p-4 rounded-xl border text-center ${
                  isClaimed
                    ? 'bg-green-900/20 border-green-700/50'
                    : isEligible
                      ? 'bg-amber-900/20 border-amber-700/50'
                      : 'bg-slate-900/50 border-slate-700/50 opacity-60'
                }`}
              >
                <div className="text-3xl mb-2">{BADGE_ICONS[badgeType]}</div>
                <p className="text-sm font-medium text-white mb-1">{BADGE_NAMES[badgeType]}</p>
                <p className="text-xs text-slate-400 mb-3">
                  {isClaimed ? '✅ Claimed' : isEligible ? '🎯 Eligible' : '🔒 Locked'}
                </p>
                {isEligible && !isClaimed && (
                  <button
                    onClick={() => handleMintBadge(badgeType)}
                    disabled={isWrongChain || isMinting}
                    className="w-full py-1.5 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 text-white text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1"
                  >
                    {isMinting ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                    {isMinting ? 'Minting...' : 'Mint Badge'}
                  </button>
                )}
              </div>
            );
          })}

          {claimStep === 'done' && explorerUrl && mintingBadge !== null && (
            <div className="col-span-2 p-3 bg-green-900/30 border border-green-700/50 rounded-lg text-center">
              <p className="text-green-400 font-medium mb-1">🎉 Badge minted!</p>
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 text-xs inline-flex items-center gap-1"
              >
                View on BaseScan <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {claimStep === 'error' && mintingBadge !== null && (
            <div className="col-span-2 p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-center">
              <p className="text-red-400 text-sm">{claimError}</p>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
```

- [ ] **Step 3: Verify root project builds**

Run: `cd /mnt/second_drive/web_quiz && npm run lint && npm run build`
Expected: Exit code 0.

- [ ] **Step 4: Commit**

```bash
cd /mnt/second_drive/web_quiz
git add components/modals/RewardsModal.tsx components/Providers.tsx
git commit -m "feat(rewards): add RewardsModal with token claims and badge minting, add baseSepolia chain"
```

---

### Task 6: Header, StatsPanel & QuizLayout Integration

**Files:**
- Modify: `components/Header.tsx`
- Modify: `components/StatsPanel.tsx`
- Modify: `components/QuizLayout.tsx`

**Interfaces:**
- Consumes:
  - `components/modals/RewardsModal.tsx`: `RewardsModal` with props `isOpen`, `onClose`, `walletAddress`.
  - `lib/actions/reward-actions.ts`: `getClaimableRewards(walletAddress: string): Promise<ClaimableRewards>`.
  - `lib/types.ts`: `ClaimableRewards`.
- Produces: Integrated rewards button in Header, claimable summary in StatsPanel, rewards modal in QuizLayout.

- [ ] **Step 1: Update `components/Header.tsx`**

Replace the entire file:

```tsx
'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Gift } from 'lucide-react';

interface HeaderProps {
  onOpenRewards?: () => void;
  hasClaimable?: boolean;
  isConnected?: boolean;
}

export default function Header({ onOpenRewards, hasClaimable, isConnected }: HeaderProps) {
  return (
    <header className="flex justify-between items-center p-4 border-b border-slate-700 bg-slate-800">
      <h1 className="text-2xl font-bold text-blue-400">Quick Quiz</h1>
      <div className="flex items-center gap-3">
        {isConnected && onOpenRewards && (
          <button
            onClick={onOpenRewards}
            className="relative p-2 rounded-lg bg-slate-700/60 hover:bg-slate-600/60 text-amber-400 transition-colors"
            aria-label="Rewards"
          >
            <Gift className="w-5 h-5" />
            {hasClaimable && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full animate-pulse" />
            )}
          </button>
        )}
        <ConnectButton />
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Update `components/StatsPanel.tsx`**

Add a rewards summary row at the bottom. Replace the entire file:

```tsx
'use client';

import React from 'react';
import { UserStats } from '@/lib/types';
import { Flame, Trophy, Target, Coins } from 'lucide-react';

interface StatsPanelProps {
  stats: UserStats;
  claimableTokens?: string;
  onOpenRewards?: () => void;
}

export default function StatsPanel({ stats, claimableTokens, onOpenRewards }: StatsPanelProps) {
  const formattedClaimable = claimableTokens
    ? (BigInt(claimableTokens) / 10n ** 18n).toString()
    : '0';
  const hasClaimable = BigInt(claimableTokens || '0') > 0n;

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-3 gap-2.5">
        {/* Total Score */}
        <div className="p-3 bg-slate-900/70 border border-slate-700/80 rounded-xl flex flex-col items-center justify-center text-center">
          <Trophy className="w-4 h-4 text-amber-400 mb-1" />
          <span className="text-[10px] uppercase font-semibold text-slate-400">Score</span>
          <span className="text-lg font-bold text-white">{stats.score}</span>
          <span className="text-[10px] text-slate-500">pts</span>
        </div>

        {/* Streak */}
        <div className="p-3 bg-slate-900/70 border border-slate-700/80 rounded-xl flex flex-col items-center justify-center text-center">
          <Flame className="w-4 h-4 text-orange-500 mb-1" />
          <span className="text-[10px] uppercase font-semibold text-slate-400">Streak</span>
          <span className="text-lg font-bold text-orange-400">{stats.streak}</span>
          <span className="text-[10px] text-slate-500">Best: {stats.bestStreak}</span>
        </div>

        {/* Accuracy */}
        <div className="p-3 bg-slate-900/70 border border-slate-700/80 rounded-xl flex flex-col items-center justify-center text-center">
          <Target className="w-4 h-4 text-blue-400 mb-1" />
          <span className="text-[10px] uppercase font-semibold text-slate-400">Accuracy</span>
          <span className="text-lg font-bold text-blue-400">{stats.accuracy}%</span>
          <span className="text-[10px] text-slate-500">{stats.totalAnswered} total</span>
        </div>
      </div>

      {/* Rewards Summary */}
      {onOpenRewards && (
        <button
          onClick={onOpenRewards}
          className="w-full p-2.5 bg-slate-900/70 border border-slate-700/80 rounded-xl flex items-center justify-between hover:bg-slate-800/70 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-slate-300">
              {hasClaimable ? `${formattedClaimable} $QUIZ claimable` : 'No tokens to claim'}
            </span>
          </div>
          <span className="text-[10px] text-blue-400 font-medium">View Rewards →</span>
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Update `components/QuizLayout.tsx`**

Add rewards state, import RewardsModal, pass callbacks to Header and StatsPanel. Make the following changes:

**a) Add imports** (after existing imports):

```typescript
import RewardsModal from './modals/RewardsModal';
import { getClaimableRewards } from '@/lib/actions/reward-actions';
import { ClaimableRewards } from '@/lib/types';
```

**b) Add rewards state** (after the modal state block, around line 83):

```typescript
  // Rewards
  const [claimableRewards, setClaimableRewards] = useState<ClaimableRewards | null>(null);
  const [rewardsModalOpen, setRewardsModalOpen] = useState(false);
```

**c) Add `refreshRewards` callback** (after `refreshStats`):

```typescript
  const refreshRewards = useCallback(async () => {
    if (!address) return;
    const data = await getClaimableRewards(address);
    setClaimableRewards(data);
  }, [address]);
```

**d) Call `refreshRewards` in the initial user sync effect** — update the existing `useEffect` that calls `getOrCreateUser`:

Change:
```typescript
    if (isConnected && address) {
      getOrCreateUser(address).then(() => {
        refreshStats();
      });
    }
```
To:
```typescript
    if (isConnected && address) {
      getOrCreateUser(address).then(() => {
        refreshStats();
        refreshRewards();
      });
    }
```

Also add `refreshRewards` to the dependency array of this `useEffect`.

**e) Call `refreshRewards` after answer submission** — in `handleAnswerSubmit`, after `loadLeaderboards()`:

Add:
```typescript
      refreshRewards();
```

**f) Update the `activeModal` type** to include `'rewards'`:

Change:
```typescript
  const [activeModal, setActiveModal] = useState<
    'intro' | 'timer' | 'group' | 'review' | null
  >(null);
```
To:
```typescript
  const [activeModal, setActiveModal] = useState<
    'intro' | 'timer' | 'group' | 'review' | 'rewards' | null
  >(null);
```

**g) Update `<Sidebar>` — pass rewards props to StatsPanel via Sidebar, or pass directly. Since `Sidebar` wraps `StatsPanel`, the simplest approach is to pass rewards props through.**

Look at Sidebar component to determine the right approach. If Sidebar passes `stats` directly to `StatsPanel`, add `claimableTokens` and `onOpenRewards` as passthrough props.

**h) Add RewardsModal to the modals section** (after `<ReviewModal>`):

```tsx
      <RewardsModal
        isOpen={activeModal === 'rewards'}
        onClose={() => setActiveModal(null)}
        walletAddress={address || null}
      />
```

- [ ] **Step 4: Update `components/Sidebar.tsx` to pass rewards props through**

Read `Sidebar.tsx`, add `claimableTokens?: string` and `onOpenRewards?: () => void` to its props interface, and pass them through to `StatsPanel`.

- [ ] **Step 5: Verify root project builds**

Run: `cd /mnt/second_drive/web_quiz && npm run lint && npm run build`
Expected: Exit code 0.

- [ ] **Step 6: Commit**

```bash
cd /mnt/second_drive/web_quiz
git add components/Header.tsx components/StatsPanel.tsx components/QuizLayout.tsx components/Sidebar.tsx
git commit -m "feat(rewards): integrate RewardsModal into Header, StatsPanel, and QuizLayout"
```

---

### Task 7: Home Page Header Props & Final Integration

**Files:**
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes:
  - Updated `Header` component with `onOpenRewards`, `hasClaimable`, `isConnected` props.
  - Updated `QuizLayout` with rewards state management.
- Produces: Fully wired home page where the Header rewards button opens the QuizLayout's rewards modal.

- [ ] **Step 1: Update `app/page.tsx` to wire Header to QuizLayout**

Read `app/page.tsx`. The Header is rendered separately from QuizLayout. Since the rewards modal state lives in QuizLayout (a client component), and Header needs to trigger it, there are two approaches:

**Approach A (simplest):** Move `Header` rendering inside `QuizLayout` so it can access rewards state directly.

**Approach B:** Lift rewards state to a shared client wrapper.

Choose **Approach A**: Move the `<Header>` render into `QuizLayout.tsx` and remove it from `app/page.tsx`. Update `QuizLayout` to render Header internally with the rewards callback.

In `QuizLayout.tsx`, add at the top of the return JSX (before the main `<div>`):

```tsx
      <Header
        onOpenRewards={() => setActiveModal('rewards')}
        hasClaimable={BigInt(claimableRewards?.claimableTokens || '0') > 0n || (claimableRewards?.eligibleBadges?.length ?? 0) > 0}
        isConnected={isConnected}
      />
```

In `app/page.tsx`, remove the separate `<Header />` import and render, since it's now inside `QuizLayout`.

- [ ] **Step 2: Verify root project builds**

Run: `cd /mnt/second_drive/web_quiz && npm run lint && npm run build`
Expected: Exit code 0.

- [ ] **Step 3: Commit**

```bash
cd /mnt/second_drive/web_quiz
git add app/page.tsx components/QuizLayout.tsx
git commit -m "feat(rewards): wire Header rewards button into QuizLayout state management"
```

---

### Task 8: End-to-End Verification & Cleanup

**Files:**
- No new files.
- Potentially minor fixes across any file from Tasks 1-7.

**Interfaces:**
- Consumes: Everything from Tasks 1-7.
- Produces: Clean build, all contract tests passing, committed and ready to merge.

- [ ] **Step 1: Run contract tests**

Run: `cd /mnt/second_drive/web_quiz/contracts && npx hardhat test`
Expected: 16 passing tests.

- [ ] **Step 2: Run Next.js lint**

Run: `cd /mnt/second_drive/web_quiz && npm run lint`
Expected: Exit code 0, no errors.

- [ ] **Step 3: Run Next.js build**

Run: `cd /mnt/second_drive/web_quiz && npm run build`
Expected: Exit code 0, successful production build.

- [ ] **Step 4: Verify git status is clean**

Run: `cd /mnt/second_drive/web_quiz && git status`
Expected: Clean working tree, nothing to commit.

- [ ] **Step 5: Review git log for Phase 3 commits**

Run: `cd /mnt/second_drive/web_quiz && git log --oneline -n 10`
Expected: All Phase 3 commits present in order.
