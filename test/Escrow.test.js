const { expect } = require('chai');
const { ethers } = require('hardhat');
const { isCallTrace } = require('hardhat/internal/hardhat-network/stack-traces/message-trace');

const tokens = (n) => {
    return ethers.utils.parseUnits(n.toString(), 'ether')
}

describe('Escrow', () => {
    let buyer, seller, lender, inspector
    let realEstate, realEstateFactory, escrow, escrowFactory

    beforeEach(async () => {
        const accounts = await ethers.getSigners();
            [buyer, seller, lender, inspector] = accounts
            realEstateFactory = await ethers.getContractFactory("RealEstate")
            realEstate = await realEstateFactory.deploy()
    
            // seller mints his real estate nft
            let tx = await realEstate.connect(seller).mint("https://ipfs.io/ipfs/QmTudSYeM7mz3PkYEWXWqPjomRPHogcMFSq7XAvsvsgAPS")
            await tx.wait()
    
            escrowFactory = await ethers.getContractFactory("Escrow")
            escrow = await escrowFactory.deploy(realEstate.address, seller.address, inspector.address, lender.address)

            // Approve transfer of property.
            tx = await realEstate.connect(seller).approve(escrow.address, 1)
            await tx.wait()
            
            // once approved list the property for sale
            tx = await escrow.connect(seller).listProperty(1, tokens(10), tokens(3), buyer.address)
            await tx.wait()
    })

    describe ("Deployments/checking of each significant address.", () => {
        it("Returns the NFT Address", async () => {
            const result = await escrow.nftAddress();
            expect(result).to.be.equal(realEstate.address);
        })
    
        it("Returns the seller address", async() => {
            const result = await escrow.seller();
            expect(result).to.be.equal(seller.address);
        })
        it("Returns the inspector address", async () => {
            const result = await escrow.inspector();
            expect(result).to.be.equal(inspector.address);
        })
        it("Returns the lender address", async() => {
            const result = await escrow.lender();
            expect(result).to.be.equal(lender.address);
        })
    })
    describe("Listing of NFT Property", () => {
        it("Updates the ownership of the NFT (RealEstate) to the escrow contract", async () => {
            expect(await realEstate.ownerOf(1)).to.be.equal(escrow.address);
        })

        it("Updates mapping of the NFT token id to listed", async () => {
           const listNFT = await escrow.isListed(1);
           expect(listNFT).to.be.equal(true);
        })

        it("Returns a buyer", async () => {
            const result = await escrow.nftIdToBuyer(1)
            expect(result).to.be.equal(buyer.address);
        })
        it("Returns a purchase price", async () => {
            const result = await escrow.purchasePrice(1)
            expect(result).to.be.equal(tokens(10));
        })
        it("Returns an escrow amount", async () => {
            const result = await escrow.escrowAmount(1)
            expect(result).to.be.equal(tokens(3));
        })
    })

    describe("Deposits", () => {
        it("Deposit escrow earnest into smart contract", async () => {
            const tx1 = await escrow.connect(buyer).depositEarnest(1, {value: tokens(3)});
            await tx1.wait();

            const contractBalance = await escrow.getBalance();
            expect(contractBalance).to.be.equal(tokens(3))
        })
    })
    
    describe("Inpsection", () => {
        it("Updates property on whether it passed inspection or not.", async () => {
            const tx1 = await escrow.connect(inspector).updateInspectionStatus(1, true);
            await tx1.wait()
            const result = await escrow.inspectionStatus(1);
            expect(result).to.be.equal(true);
            
        })
    })

    describe("Approval", () => {
        it("Updates approval status on whether it passed appraisal or not.", async () => {
            const tx1 = await escrow.connect(buyer).approveSale(1);
            await tx1.wait()
            const tx2 = await escrow.connect(seller).approveSale(1);
            await tx2.wait()
            const tx3 = await escrow.connect(lender).approveSale(1);
            await tx3.wait()

            const buyerApproval = await escrow.approval(1, buyer.address)
            const sellerApproval = await escrow.approval(1, seller.address)
            const lenderApproval = await escrow.approval(1, lender.address)

            expect(buyerApproval).to.be.equal(true);
            expect(sellerApproval).to.be.equal(true);
            expect(lenderApproval).to.be.equal(true);
        })
    })
    describe("Finalizing property sale", () => {
        beforeEach(async () => {
            let tx1 = await escrow.connect(buyer).depositEarnest(1, {value: tokens(3)});
            await tx1.wait();

            tx1 = await escrow.connect(inspector).updateInspectionStatus(1, true);
            await tx1.wait()

            tx1 = await escrow.connect(buyer).approveSale(1);
            await tx1.wait()

            tx1 = await escrow.connect(seller).approveSale(1);
            await tx1.wait()

            tx1 = await escrow.connect(lender).approveSale(1);
            await tx1.wait()

            await lender.sendTransaction({to: escrow.address, value: tokens(10)})

            tx1 = await escrow.connect(seller).finalizeSale(1);
            await tx1.wait()
        })
        it("Checks to see if all requirements to finalize the save have been met", async () => {
            expect(await escrow.getBalance()).to.be.equal(0);
        })

        it("Expects buyer to own real estate NFT", async () => {
            expect(await realEstate.ownerOf(1)).to.be.equal(buyer.address);
        })
    })

   
})
