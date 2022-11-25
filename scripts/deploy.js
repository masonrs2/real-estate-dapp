// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");

async function main() {
  const tokens = (n) => {
    return ethers.utils.parseUnits(n.toString(), 'ether')
  }

  let buyer, seller, lender, inspector
  [buyer, seller, lender, inspector] = await ethers.getSigners();

  const realEstateFactory = await ethers.getContractFactory("RealEstate");
  const realEstate = await realEstateFactory.deploy();
  await realEstate.deployed();

  console.log(`RealEstate address: ${realEstate.address}`)
  console.log(`Minting 3 properties... \n`)

  for(let i = 1; i <= 3; i++) {
    const tx = await realEstate.connect(seller).mint(`https://ipfs.io/ipfs/QmQVcpsjrA6cr1iJjZAodYwmPekYgbnXGo4DFubJiLc2EB/${i}.json`);
    await tx.wait();
  }

  const escrowFactory = await ethers.getContractFactory("Escrow");
  const escrow = await escrowFactory.deploy(
    realEstate.address, 
    seller.address, 
    inspector.address, 
    lender.address
    );
    await escrow.deployed();
    
    console.log(`Escrow address: ${escrow.address}`)

    for(let i = 1; i <= 3; i++) {
      let tx = await realEstate.connect(seller).approve(escrow.address, i);
      await tx.wait();
    }

    let tx = await escrow.connect(seller).listProperty(1, tokens(20), tokens(10), buyer.address);
    await tx.wait();

    tx = await escrow.connect(seller).listProperty(2, tokens(15), tokens(3), buyer.address);
    await tx.wait();

    tx = await escrow.connect(seller).listProperty(3, tokens(25), tokens(7), buyer.address);
    await tx.wait();

    console.log(`Finished listing properties...`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
