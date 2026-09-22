// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

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
