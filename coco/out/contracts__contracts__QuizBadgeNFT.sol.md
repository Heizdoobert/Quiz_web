# contracts/contracts/QuizBadgeNFT.sol
lines:95 exports:
---
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
