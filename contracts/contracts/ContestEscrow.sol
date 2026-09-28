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

    event ContestCreated(bytes32 indexed contestId, address indexed creator, uint256 poolAmount, uint256 expiresAt);
    event ContestRewardClaimed(bytes32 indexed contestId, address indexed recipient, uint256 amount, uint256 nonce);
    event ContestRefunded(bytes32 indexed contestId, address indexed creator, uint256 amount);
    event SignerUpdated(address indexed oldSigner, address indexed newSigner);

    constructor(address _token, address _signer)
        EIP712("ContestEscrow", "1")
        Ownable(msg.sender)
    {
        require(_token != address(0), "Invalid token address");
        require(_signer != address(0), "Invalid signer address");
        token = IERC20(_token);
        authorizedSigner = _signer;
    }

    /**
     * @notice Creates and funds a contest reward pool.
     * @param contestId Unique 32-byte identifier for the contest (e.g. hash of list UUID).
     * @param poolAmount Total amount of $QUIZ to lock into escrow.
     * @param durationSeconds Minimum duration before remaining funds can be refunded.
     */
    function createContest(
        bytes32 contestId,
        uint256 poolAmount,
        uint256 durationSeconds
    ) external nonReentrant {
        require(contestId != bytes32(0), "Invalid contestId");
        require(contests[contestId].creator == address(0), "Contest already exists");
        require(poolAmount > 0, "Pool amount must be > 0");
        require(durationSeconds >= 1 hours, "Duration too short");

        uint256 expiresAt = block.timestamp + durationSeconds;
        contests[contestId] = Contest({
            creator: msg.sender,
            totalPool: poolAmount,
            remainingPool: poolAmount,
            createdAt: block.timestamp,
            expiresAt: expiresAt,
            active: true
        });

        token.safeTransferFrom(msg.sender, address(this), poolAmount);

        emit ContestCreated(contestId, msg.sender, poolAmount, expiresAt);
    }

    /**
     * @notice Claims contest reward using an EIP-712 signed voucher from authorizedSigner.
     * @param contestId Unique 32-byte identifier for the contest.
     * @param recipient Address receiving the payout tokens.
     * @param amount Token amount to be claimed.
     * @param nonce Replay prevention nonce for recipient.
     * @param deadline Expiration timestamp of the voucher.
     * @param signature Cryptographic signature over the EIP-712 struct.
     */
    function claimReward(
        bytes32 contestId,
        address recipient,
        uint256 amount,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) external nonReentrant {
        require(block.timestamp <= deadline, "Voucher expired");
        require(amount > 0, "Amount must be > 0");
        require(recipient != address(0), "Invalid recipient");

        Contest storage contest = contests[contestId];
        require(contest.active, "Contest not active");
        require(amount <= contest.remainingPool, "Insufficient pool balance");
        require(!usedNonces[contestId][recipient][nonce], "Nonce already used");

        bytes32 structHash = keccak256(
            abi.encode(CLAIM_TYPEHASH, contestId, recipient, amount, nonce, deadline)
        );
        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(digest, signature);
        require(signer == authorizedSigner, "Invalid signature");

        usedNonces[contestId][recipient][nonce] = true;
        contest.remainingPool -= amount;

        token.safeTransfer(recipient, amount);

        emit ContestRewardClaimed(contestId, recipient, amount, nonce);
    }

    /**
     * @notice Refunds remaining unclaimed tokens back to the contest creator after expiration.
     * @param contestId Unique 32-byte identifier for the contest.
     */
    function refundRemaining(bytes32 contestId) external nonReentrant {
        Contest storage contest = contests[contestId];
        require(contest.active, "Contest not active");
        require(
            msg.sender == contest.creator || msg.sender == owner(),
            "Not creator or owner"
        );
        require(block.timestamp > contest.expiresAt, "Contest not yet expired");
        require(contest.remainingPool > 0, "No remaining balance");

        uint256 refundAmount = contest.remainingPool;
        contest.remainingPool = 0;
        contest.active = false;

        token.safeTransfer(contest.creator, refundAmount);

        emit ContestRefunded(contestId, contest.creator, refundAmount);
    }

    /**
     * @notice Updates the authorized signer for EIP-712 vouchers.
     */
    function setAuthorizedSigner(address newSigner) external onlyOwner {
        require(newSigner != address(0), "Invalid signer address");
        emit SignerUpdated(authorizedSigner, newSigner);
        authorizedSigner = newSigner;
    }

    /**
     * @notice Helper view function to check if a nonce has been used.
     */
    function isNonceUsed(bytes32 contestId, address recipient, uint256 nonce) external view returns (bool) {
        return usedNonces[contestId][recipient][nonce];
    }
}
