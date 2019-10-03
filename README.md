

# EtherSplit 

EtherSplit is a dApp that records debts between acquaintances on the immutable Ethereum blockchain.

Conventional services such as Venmo or Splitwise are centralized - data is vulnerable to corruption, and dependent on that particular company staying in business.

EtherSplit takes advantage of Ethereum’s immutable data storage. Agreements with friends persist forever, and the history of debts is ‘set in stone’.

If an old friend owes you $100 on EtherSplit, you can be sure the debt and its impact on the balance will persist as long as the global Ethereum network does. This is arguably more likely than a single company surviving the long-term, or suffering no data loss.

## Project Structure

EtherSplit uses the `truffle-react` box template, and follows the default Truffle project structure.

The front-end React app is located in the /client folder. 

## Application Structure

EtherSplit consists of a parent *AgreementFactory* contract, from which users may deploy individual *Agreement* contracts. 

The parent factory stores all Agreements it creates, along with their associated users and user invites. The child Agreement contracts automatically update the parent contract when a new user is invited or joins. 

The creator of an Agreement invites one externally owned account (EOA) to register. Once both users are registered, they are “in” that Agreement in perpetuity - it remains on the Ethereum blockchain forever. They may then create and confirm debts and payments between one another.

An EOA may be in multiple agreements with different counterparties.

## *Agreement.sol* Contract Public Functions

| Function                                            | Description                                                                                               |
|-----------------------------------------------------|-----------------------------------------------------------------------------------------------------------|
| setName(name)                                       | Set User 1 name                                                                                           |
| inviteFriend(address)                               | Set the invited friend’s address                                                                          |
| registerUser2()                                     | Register as User 2. Reverts if calling EOA is not invited friend                                          |
| createPendingTx(amount, split, debtor, description) | creates a debt pending confirmation from the counterparty                                                 |
| userDeletePendingTx(id)                             | delete a pending debt that calling EOA created                                                            |
| confirmSingleTx(id)                                 | confirm one of calling EOA’s pending Txs                                                                  |
| confirmAll()                                        | confirm all calling EOA’s pending Txs                                                                     |
| balanceHealthCheck()                                | Recalculate the balance from all confirmed Txs from scratch, and check that it matches the stored balance |



## Using EtherSplit 

Users interact with their Agreements through Metamask and the EtherSplit UI - currently a web3/React web app. 

### Using EtherSplit on the Ropsten Testnet

EtherSplit is live on the Ropsten network. You can create agreements, join them and record debts through the UI.

**Parent AgreementFactory contract address:**

0xfaD0C449c477CfcCCEa2bbE27c1DA7d68BB009Ba

**Deployed front-end UI:**

https://ethersplit.firebaseapp.com/

## Entering a New Agreement with a Counterparty

Anyone may create an Agreement through the factory. The creator of an Agreement becomes User 1, and invites a second EOA address. This invited address is then able to register as User 2.

## Recording Debts

EtherSplit records debts in the following manner:

- User A suggests a debt.
- The debt is added to User B’s “Pending Transactions” list
- If User B confirms the debt, the debt is permanently recorded in the “Confirmed Transactions” list, and the balance updates.

Like SplitWise, users can suggest debts where either they or the counterparty owe money. Regardless of the debtor, every suggested debt must be confirmed by the counterparty.

To suggest a pending debt, call `createPendingTx` with the debt parameters.

To confirm a pending transaction, call `confirmPendingTx` with the debt ID. This Tx will then be added to the `confirmedTransactions` list - and permanently recorded on the Ethereum blockchain.

Users may confirm individual pending transactions, or the whole list.

## Deploying EtherSplit Locally to a Development Blockchain

You may fork and clone this repo to run a development instance. EtherSplit was built with Truffle, and this is the easiest way to deploy it.

Once cloned, deploy contracts to your development blockchain with:

```
> truffle compile
> truffle migrate
```

Then, in the /client folder, launch the React app:

`> npm run start`

You can create Agremeents, register, invite users and create debts through the UI - signing transactions with Metamask.

## Calling Contract Functions via Truffle

All contract functions can be called via the Truffle console in the usual way:

**Grab the factory:**

```
let factoryInstance = await AgreementFactory.deployed()
```

 **Create a new Agreement:**

```
let tx = await Agreement.createNewAgreement() 
let agreementAddress = tx.logs[0].args.agreementAddr
let agreementInstance = Agreement.at(agreementAddress)
```

**Interact with the Agreement:**

```
await agreementInstance.setName(“Rick”)
let accounts = await web3.eth.getAccounts()
await agreementInstance.inviteFriend(accounts[1))   // invite the second development account to join
await agreementInsance.registerUser2({from: accounts[1])
```

