# contracts/contracts/ContestEscrow.sol
lines:170 exports:
---
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ContestEscrow
 * @notice Trustless escrow for community-curated trivia contests.
 *         Contest creators pre-fund reward pools in $QUIZ. Players redeem
 *         EIP-712 vouchers signed by authorizedSigner upon contest completion.
 */
contract ContestEscrow is EIP712, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;

    bytes32 public constant CLAIM_TYPEHASH =
        keccak256("ClaimContestReward(bytes32 contestId,address recipient,uint256 amount,uint256 nonce,uint256 deadline)");

    struct Contest {
        address creator;
        uint256 totalPool;
        uint256 remainingPool;
        uint256 createdAt;
        uint256 expiresAt;
        bool active;
    }

    IERC20 public immutable token;
    address public authorizedSigner;

    // contestId => Contest details
    mapping(bytes32 => Contest) public contests;

    // contestId => recipient => nonce => used
    mapping(bytes32 => mapping(address => mapping(uint256 => bool))) public usedNonces;
