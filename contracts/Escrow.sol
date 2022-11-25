//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface IERC721 {
    function transferFrom(
        address _from,
        address _to,
        uint256 _id
    ) external;
}

contract Escrow {
    /* STATE VARIABLES */
    address public lender;
    address public inspector;
    address payable public seller;
    address public buyer;
    address public nftAddress;

    // Mappings
    mapping(uint256 => bool) public isListed;
    mapping(uint256 => uint256) public purchasePrice;
    mapping(uint256 => uint256) public escrowAmount;
    mapping(uint256 => address) public nftIdToBuyer;
    mapping(uint256 => bool) public inspectionStatus;
    mapping(uint256 => mapping(address => bool)) public approval;

    // Modifiers
    modifier onlySeller() {
        require(msg.sender == seller, "Only seller can call this function.");
        _;
    }

    modifier onlyBuyer(uint256 _nftId) {
        require(msg.sender == nftIdToBuyer[_nftId], "Only buyer can call this function.");
        _;
    }

    modifier onlyInspector() {
        require(msg.sender == inspector, "Only inspector can call this function.");
        _;
    }
    

    constructor(
        address _nftAddress, 
        address payable _seller,
        address _inspector, 
        address _lender
        ) {
            nftAddress = _nftAddress;
            lender = _lender;
            seller = _seller;
            inspector = _inspector;
    }

    function listProperty(
        uint256 _nftId,
        uint256 _purchasePrice, 
        uint256 _escrowAmount, 
        address buyer
            ) public payable onlySeller {
        // Transfer the real estate NFT to the escrow contract
        IERC721(nftAddress).transferFrom(msg.sender, address(this), _nftId);

        isListed[_nftId] = true;
        purchasePrice[_nftId] = _purchasePrice;
        escrowAmount[_nftId] = _escrowAmount;
        nftIdToBuyer[_nftId] = buyer;
    }

    // 1. Inspection must pass
    // 2. Approval from the buyer,seller and lender
    // 3. Funds sent to the smart contract is equal to the property value + fees
    // 4. Transfer NFT to buyer
    // 5. Send funds to the seller
    function finalizeSale(uint256 _nftId) public {
        require(inspectionStatus[_nftId] == true, "Inspection failed.");
        // require(approval[_nftId][buyer[_nftId]], "Buyer has not approved the sale.");
        require(approval[_nftId][seller] == true, "Seller has not approved the sale.");
        require(approval[_nftId][lender] == true, "Lender has not approved the sale.");
        require(address(this).balance >= purchasePrice[_nftId], "Insufficient funds sent to the smart contract.");

        (bool success, ) = payable(seller).call{value: address(this).balance}("");
        require(success, "Transfer failed.");

        isListed[_nftId] = false;

        IERC721(nftAddress).transferFrom(address(this), nftIdToBuyer[_nftId], _nftId);
    }

    function cancelSale(uint256 _nftId) public {
        if(inspectionStatus[_nftId] == false) {
            payable(nftIdToBuyer[_nftId]).transfer(address(this).balance);
        } else {
            payable(seller).transfer(address(this).balance);
        }
        
    }

    function depositEarnest(uint256 _nftId) public payable onlyBuyer(_nftId) {
        require(msg.value >= escrowAmount[_nftId], "Insufficient deposit amount.");
    }

    function updateInspectionStatus(uint256 _nftId, bool _status) 
        public onlyInspector {
            inspectionStatus[_nftId] = _status;
        }

    function approveSale(uint256 _nftId) public {
        approval[_nftId][msg.sender] = true;
    }

    function getBalance() public view returns(uint256) {
        return address(this).balance;
    }

    receive() external payable {}
}
