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
