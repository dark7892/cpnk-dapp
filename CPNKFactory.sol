// SPDX-License-Identifier: MIT
/*
    CPNKFactory / 2022
*/
pragma solidity >=0.4.22 <0.9.0;

import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/interfaces/IERC2981Upgradeable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract CPNKFactory is Initializable, ERC721EnumerableUpgradeable, OwnableUpgradeable, IERC2981Upgradeable {
    using Counters for Counters.Counter;

    bool private isInitialized;
    bool public isStarted;

    Counters.Counter private _tokenIds;

    struct CPNK {
        uint256 tokenId;
        uint256 salePrice;
    }

    uint256 public constant COOLDOWN_TIME = 86400;
    uint256 public constant MINT_PRICE = 500000000000000000000; //500SGB
    uint256 public constant DENOMINATOR = 100;

    mapping(uint256 => address) cpnkToOwner;
    mapping(address => uint256) ownerCPNKCount;
    mapping(address => uint256) readyForClaim;
    mapping(address => uint256) rewardsAmount;
    
    uint256 public royaltyPercent;
    uint256 public salePercent;
    uint256 public dev1Percent;
    uint256 public dev2Percent;
    uint256 public lastBalance;
    uint256 public startTime;

    string public _baseTokenURI;

    address public dev1Address;
    address public dev2Address;
    address private _recipient;    
    
    CPNK[] public cpnks;

    event CPNKMinted();

    function initialize(
        uint256 royaltyPercent_,
        uint256 salePercent_,
        uint256 dev1Percent_,
        uint256 dev2Percent_,
        address dev1Address_,
        address dev2Address_,
        string memory baseTokenURI_
    ) public initializer {
        __ERC721_init("Canary Punks", "CPNK");
        __Ownable_init();
        royaltyPercent = royaltyPercent_;
        salePercent = salePercent_;
        dev1Percent = dev1Percent_;
        dev2Percent = dev2Percent_;
        dev1Address = dev1Address_;
        dev2Address = dev2Address_;
        _baseTokenURI = baseTokenURI_;
        _recipient = address(this);
        isInitialized = true;
        isStarted = false;
    }

    function isInitialize() external view returns(bool) {
        return isInitialized;
    }

    //Basical settings

    function startMint() external onlyOwner {
        isStarted = true;
        startTime = block.timestamp;
    }

    function getContractState() external view returns(string memory) {
        if(isStarted) {
            if(startTime + 86400 < block.timestamp) {
                return "public";
            } else {
                return "presale";
            }
        } else {
            return "disable";
        }
    }

    function setDev1Address(address _dev1Address) external onlyOwner {
        dev1Address = _dev1Address;
    }

    function setDev2Address(address _dev2Address) external onlyOwner {
        dev2Address = _dev2Address;
    }

    function setRoyaltyPercent(uint256 _royaltyPercent) external onlyOwner {
        royaltyPercent = _royaltyPercent;
    }

    function setDev1Percent(uint256 _dev1Percent) external onlyOwner {
        dev1Percent = _dev1Percent;
    }

    function setDev2Percent(uint256 _dev2Percent) external onlyOwner {
        dev2Percent = _dev2Percent;
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");
        
        string memory currentBaseURI = _baseURI();
        return bytes(currentBaseURI).length > 0
            ? string(abi.encodePacked(currentBaseURI, Strings.toString(tokenId), ".json"))
            : "";
    }
    function setBaseURI(string calldata _newURI) external onlyOwner {
        _baseTokenURI = _newURI;
    }

    //Claim logic

    function claimRewards(address _addr) external {
        require(_addr == msg.sender, "Wrong address!");
        require(block.timestamp > readyForClaim[_addr], "Not claim now!");
        uint256 canClaimAmount = rewardsAmount[_addr];
        require(canClaimAmount > 0, "Zero balance");
        payable(_addr).transfer(canClaimAmount);
        lastBalance = address(this).balance;
        rewardsAmount[_addr] = 0;
        readyForClaim[_addr] = block.timestamp + COOLDOWN_TIME;
    }

    function getRewardsAmount(address _addr) external view returns(uint256) {
        return rewardsAmount[_addr];
    }

    function canClaim(address _addr) external view returns(bool) {
        if (block.timestamp > readyForClaim[_addr]) {
            return true;
        }
        return false;
    }

    //Withdraw from contract

    function withdraw(uint256 _withdrawAmount) external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance >= _withdrawAmount, "Over withdraw!");
        payable(msg.sender).transfer(_withdrawAmount);
        lastBalance = address(this).balance;
    }

    //For marketplace

    function walletOfOwner(address _owner) public view returns(uint256[] memory) {
        uint256 tokenCount = balanceOf(_owner);
        uint256[] memory tokensId = new uint256[](tokenCount);
        for(uint256 i = 0; i < tokenCount; i++) {
            tokensId[i] = tokenOfOwnerByIndex(_owner, i);
        }
        return tokensId;
    }

    //Mint logic

    function mintCPNK(uint256 _mintAmount) external payable {
        uint256 royaltyFee = MINT_PRICE * royaltyPercent / DENOMINATOR;
        uint256 dev1Fee = MINT_PRICE * dev1Percent / DENOMINATOR;
        uint256 dev2Fee = MINT_PRICE * dev2Percent / DENOMINATOR;
        uint256 restAmount = msg.value - MINT_PRICE * _mintAmount;
        require(msg.value >= MINT_PRICE * _mintAmount, "Invalid Amount");
        for (uint256 k = 0; k < _mintAmount; k++) {
            for(uint256 i = 0; i < cpnks.length; i++) {
                address ownerAddress = cpnkToOwner[i+1];
                rewardsAmount[ownerAddress] +=  royaltyFee / cpnks.length;
            }
            _tokenIds.increment();

            uint256 tokenId = _tokenIds.current();
            _safeMint(msg.sender, tokenId);
            cpnkToOwner[tokenId] = msg.sender;
            cpnks.push(CPNK(tokenId,0));
        }

        payable(msg.sender).transfer(restAmount);
        payable(dev1Address).transfer(dev1Fee * _mintAmount);
        payable(dev2Address).transfer(dev2Fee * _mintAmount);
        lastBalance = address(this).balance;

        emit CPNKMinted();
    }

    function freeMintCPNK(uint256 _mintAmount, address _to) external onlyOwner {
        require(balanceOf(_to) + _mintAmount <= 5, "Too much free mint!");
        for (uint256 k = 0; k < _mintAmount; k++) {
            _tokenIds.increment();

            uint256 tokenId = _tokenIds.current();
            _safeMint(_to, tokenId);
            cpnkToOwner[tokenId] = _to;
            cpnks.push(CPNK(tokenId,0));
        }
    }

    //EIP2981 implement
    
    function _setRoyalties(address newRecipient) external onlyOwner {
        require(newRecipient != address(0), "Royalties: new recipient is the zero address");
        _recipient = newRecipient;
    }

    function royaltyInfo(uint256 _tokenId, uint256 _salePrice) external view override 
        returns (address receiver, uint256 royaltyAmount)
    {
        return (_recipient, (_salePrice * salePercent) / DENOMINATOR);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC721EnumerableUpgradeable, IERC165Upgradeable)
        returns (bool)
    {
        return (
            interfaceId == type(IERC2981Upgradeable).interfaceId ||
            super.supportsInterface(interfaceId)
        );
    }

    function safeTransferFrom(
        address _from,
        address _to,
        uint256 _tokenId
    ) public virtual override
    {
        uint256 saleRewardsAmount = address(this).balance - lastBalance;
        for (uint256 i = 0; i < cpnks.length; i++) {
            address ownerAddress = cpnkToOwner[i+1];
            rewardsAmount[ownerAddress] += saleRewardsAmount / cpnks.length;
        }
        cpnkToOwner[_tokenId] = _to;
        ownerCPNKCount[_to]++;
        ownerCPNKCount[_from]--;
        lastBalance = address(this).balance;
        super.safeTransferFrom(_from, _to, _tokenId);
    }
}