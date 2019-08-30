/* Data pre-loader for app video demo. Deploys EtherSplit to Ganache, 
and populates it with agreements, users and transaction data */

const Factory = artifacts.require("AgreementFactory");
const Agreement = artifacts.require("Agreement");

module.exports = async () => {
  try {
    const factoryData = await getContractData(Factory)
    const factory = factoryData.contractInstance
    console.log(`factory address: ${factoryData.contractAddress}`)

    const accounts = await web3.eth.getAccounts()
    const rick = accounts[0] // 0x...54B90 - Metamask account 2
    const bob = accounts[1] // 0x...EC479 - Metamask account 3
    const alice = accounts[2] // 0x...Ef1A3 - Metamask account 4
    const carol = accounts[3] //0x...b4175 - Metamask account 7 

    // create 3 agreements as Rick
    const agreementTx1 = await factory.createNewAgreement({ from: rick })
    const agreement1 = await getAgreementFromTxReceipt(agreementTx1)

    const agreementTx2 = await factory.createNewAgreement({ from: rick })
    const agreement2 = await getAgreementFromTxReceipt(agreementTx2)

    const agreementTx3 = await factory.createNewAgreement({ from: rick })
    const agreement3 = await getAgreementFromTxReceipt(agreementTx3)

    // set Rick's name on all his agreements
    await agreement1.setName("Rick")
    await agreement2.setName("Rick")
    await agreement3.setName("Rick")
    
    // Rick invites Bob to Ag1 and Alice to Ag2
    await agreement1.inviteFriend(bob)
    await agreement2.inviteFriend(alice)
    
    // Carol creates Ag4, and invites Rick
    const agreementTx4 = await factory.createNewAgreement({ from: carol })
    const agreement4 = await getAgreementFromTxReceipt(agreementTx4)

    await agreement4.setName("Carol", { from: carol })
    await agreement4.inviteFriend(rick, { from: carol })

    // Bob and Alice register on Ag1 and Ag2 respectively
    await agreement1.registerUser2({ from: bob })
    await agreement2.registerUser2({ from: alice })

    await agreement1.setName("Bob", { from: bob })
    await agreement2.setName("Alice", { from: alice })

    // Bob creates 3 pending transactions on Ag1
    await agreement1.createPending(650, true, rick, "Coffees", { from: bob })
    await agreement1.createPending(2500, false, bob, "Borrowed cash", { from: bob })
    await agreement1.createPending(2000, true, rick, "Dinner - Nandos", { from: bob })

    console.log("All Agreement data loaded")
  } catch (err) {
    console.log(err)
  }
}

// Helper functions

const getContractData = async (Contract) => {
  const contractInstance = await Contract.deployed()
  const contractAddress = await contractInstance.address
  return { contractAddress, contractInstance }
}

const getAgreementFromTxReceipt = async (agreementTx) => {
  agreementAddr = agreementTx.logs[0].args[1];  // grab the created agreement address from event logs
  agreement = await Agreement.at(agreementAddr);
  return agreement
}