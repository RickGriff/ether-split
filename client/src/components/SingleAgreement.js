import React, { Component } from "react";
import Agreement from "../contracts/Agreement.json";
import getWeb3 from "../utils/getWeb3";
import truffleContract from "truffle-contract";
import ESNavbar from './ESNavbar.js'
import ConfirmedTxs from './ConfirmedTxs.js'
import PendingTxs from './PendingTxs.js'
import CreatePending from './CreatePending.js'
import EnterName from './EnterName.js'
import InviteFriend from './InviteFriend.js'
import RegisterUser2 from './RegisterUser2.js'
import AgreementBody from './AgreementBody.js'
import { Input, Collapsible, CollapsibleItem, Button } from 'react-materialize';

//import "./App.css";

class SingleAgreement extends Component {

  state = {
    web3: null,
    accounts: null,
    contract: null,
    user_1: null,
    user_2: null,
    user_1_name: null,
    user_2_name: null,
    current_user: null,
    invited_friend: null,
    // arrays of 'Transaction' objects
    user1_pending_txs: [],
    user2_pending_txs: [],
    confirmed_txs: [],
    test_state: null
  };

  componentDidMount = async () => {
    try {
      const agreementAddress = this.props.match.params.address;
      const web3 = await getWeb3(); // Get network provider and web3 instance.
      const accounts = await web3.eth.getAccounts();
      const Contract = truffleContract(Agreement);   // Get the contract instance.
      Contract.setProvider(web3.currentProvider);
      const agreement = await Contract.at(agreementAddress);

      //Get the users and balance
      const current_user = accounts[0]
      const user_1 = await agreement.user_1({ from: accounts[0] });
      const user_2 = await agreement.user_2({ from: accounts[0] });
      const user_1_name = await agreement.user_1_name({ from: accounts[0] });
      const user_2_name = await agreement.user_2_name({ from: accounts[0] });
      const invited_friend = await agreement.invited_friend({ from: accounts[0] });
      const balance = (await agreement.balance( { from: accounts[0] })).toNumber();
      //Get pending transactions
      const all_pending_txs = await this.getAllPendingTxs(agreement, accounts[0])
      const user1_pending_txs = all_pending_txs[0]
      const user2_pending_txs = all_pending_txs[1]
      const confirmed_txs = await this.getConfirmedTxs(agreement, accounts[0]);

      // Set web3, accounts contract, users and transactions to the state.
      this.setState({ web3, accounts, current_user, user_1, user_2, user_1_name, user_2_name, invited_friend, user1_pending_txs, user2_pending_txs, confirmed_txs, balance,  contract: agreement}, this.logState);

    } catch (error) {
      // Catch any errors for above operations
      alert(
      `Failed to load web3, accounts, contract, users, or transactions. Check console for details.`
    );
    console.log(error);
  }
};

inviteFriend = async (e) => {
  e.preventDefault();
  const friend = e.target.address.value
  const { accounts, contract } = this.state;
  await contract.inviteFriend(friend, { from: accounts[0] });
  const invited_friend = await contract.invited_friend({from: accounts[0]});
  this.setState({invited_friend})
}

registerUser2 = async () => {
  const { accounts, contract, user_1_name } = this.state;
  await contract.registerUser2({from: accounts[0]});
  const user_2 = await contract.user_2({from: accounts[0]})
  this.setState({user_2})
  window.Materialize.toast('You have entered a new EtherSplit contract with '+user_1_name+'!', 8000)
}

confirmAll = async () => {
  const { accounts, contract } = this.state;
  await contract.confirmAll({ from: accounts[0] });
  // update pending TX list and confirmed Tx list
  const updatedPending = await this.getAllPendingTxs(contract)
  const updatedConfirmed = await this.getConfirmedTxs(contract);
  const updatedBalance = (await contract.balance({from: accounts[0]})).toNumber();
  this.setState({user1_pending_txs: updatedPending[0], user2_pending_txs: updatedPending[1], confirmed_txs: updatedConfirmed, balance: updatedBalance})
  window.Materialize.toast('All pending transactions confirmed.', 5000)
}

confirmSingleTx = async (list_id) => {
  const { accounts, contract } = this.state;
  // As list_id starts at 1, pass (list_id - 1) as argument to the contract call.
  await contract.confirmSingleTx(list_id - 1, { from: accounts[0], gas: 1000000});
  // update pending TX list and confirmed Tx list
  const updatedPending = await this.getAllPendingTxs(contract)
  const updatedConfirmed = await this.getConfirmedTxs(contract)
  const updatedBalance = (await contract.balance({from: accounts[0]})).toNumber();
  this.setState({user1_pending_txs: updatedPending[0], user2_pending_txs: updatedPending[1], confirmed_txs: updatedConfirmed, balance: updatedBalance})
  window.Materialize.toast('Transaction confirmed.', 5000)
}

getAllPendingTxs = async (contract, fromAddress) => {
  let length1;
  let length2;
  const txList1 = [];
  const txList2 = [];
  const txLists = [];
  //loop through and get all user_1's pending tx
  length1 = (await contract.pendingTxs1Length({from: fromAddress})).toNumber();
  for (var i=0; i < length1; i++){
    const tx = await contract.pendingTransactions_1(i, {from: fromAddress})
    tx.list_id = i+1;  // start indices at 1
    txList1.push(this.cleanTx(tx))
  }
  // get all user_2's pending tx
  length2 = (await contract.pendingTxs2Length({from: fromAddress})).toNumber();
  for (var j=0; j < length2; j++){
    const tx = await contract.pendingTransactions_2(j)
    tx.list_id = j+1;
    txList2.push(this.cleanTx(tx))
  }
  txLists.push(txList1)
  txLists.push(txList2)
  return txLists
}

getConfirmedTxs = async (contract, fromAddress) => {
  const { accounts }= this.state;
  const length = (await contract.confirmedTxsLength({from: fromAddress})).toNumber();
  const txList = [];

  for (var i=0; i < length; i++){  // make separate contract calls to grab each confirmedTx
    const tx = await contract.confirmedTransactions(i, {from: fromAddress});
    tx.list_id = i+1;
    txList.push(this.cleanTx(tx))
  }
  console.log("hi")
  return txList;
}

cleanTx = (tx) => {
  // return a clean representation of a transaction, for use in React state
  const {list_id, amount, creator, confirmer, debtor, split, description, index, timestamp } = tx;

  const clean_tx = {
    list_id: list_id,
    amount: amount.toNumber(),
    creator: creator,
    confirmer: confirmer,
    debtor: debtor,
    split: split.toString(),
    description: description,
    id: index.toNumber(),
    timestamp: timestamp.toNumber()
  }
  return clean_tx
}

trimError = (error) => {
  if (error.message.includes('Invalid "from" address')) {
    return  'Invalid "From" address. You may only create transactions from an address registered on this agreement.'
  } else {
    return error.message
  }
}

createPending = async (e) => {
  e.preventDefault();
  const { accounts, contract } = this.state;
  // grab the form data
  const amount = e.target.amount.value;
  const debtor = e.target.debtor.value;
  const split = e.target.split.checked;
  const description = e.target.description.value;

  if (!(amount && description)) {
      window.Materialize.toast('Please enter an amount and description!', 5000)
      return null
    }

  try {
    await contract.createPending(amount, split, debtor, description, {from: accounts[0]})
  }
  catch(error) { // return the error message
    window.Materialize.toast(this.trimError(error), 6000)
    return null
  }

  const updatedPending = await this.getAllPendingTxs(contract)
  await this.setState({user1_pending_txs: updatedPending[0], user2_pending_txs: updatedPending[1] });
  window.Materialize.toast('Pending Transaction created.', 4000)
}

getName = (address) => {
  const {user_1, user_2 } = this.state;
  let name;
  if (address === user_1) {
    name = (this.state.user_1_name || "User 1")
  } else if ( address === user_2 ) {
    name = (this.state.user_2_name || "User 2" )
  }
  return name
}

isEmptyAddress = (address) => {
  return address === "0x0000000000000000000000000000000000000000";
}

logState = () => {
  console.log("The state is:")
  console.log(this.state)
}

setName = async (e) => {
  const { current_user, user_1, user_2, contract, accounts } = this.state;
  e.preventDefault();
  const name = e.target.name.value;
  console.log(name)
  await contract.setName(name, {from: accounts[0]});
  let recordedName;
  if (current_user === user_1) {
    recordedName =  await contract.user_1_name();
    this.setState({user_1_name: recordedName}, this.logState);
  } else if (current_user === user_2) {
    recordedName =  await contract.user_2_name();
    this.setState({user_2_name: recordedName}, this.logState);
  }
}

txTraits = (tx) => {
  // return the sign and color for a tx, based on whether current_user is the debtor
  let sign = "";
  let color = "";
  if (this.state.current_user === tx.debtor) {
    sign = "- "
    color = "red-text text-accent-4"
  }
  return { color, sign }
}

userBal = () => {
  //return properties of the balance for the current_user's point of view: it's color, prefix and sign +ve or -ve.
  const { current_user, balance, user_1, user_2 } = this.state;
  let color;
  let prefix =  '';
  let sign = '';

  if (balance === 0) {
    color = 'black-text'
  } else if (current_user === user_1 && balance < 0) {
    color = 'red-text accent-4'
    prefix = 'You Owe'
    sign = '-'
  } else if (current_user === user_1 && balance >= 0) {
    color = 'teal-text text-lighten-1'
    prefix = 'You Are Owed'
  } else if (current_user === user_2 && balance < 0) {
    color = 'teal-text text-lighten-1'
    prefix = 'You Are Owed'
  } else if (current_user === user_2 && balance >= 0) {
    color = 'red-text text-accent-4'
    prefix = 'You Owe'
    sign = '-'
  }
  return  { color, prefix, sign };
}

userPendingTxs = () => {
  //returns the current user's pending transactions
  const { current_user, user_1, user_2, user1_pending_txs, user2_pending_txs } = this.state;

  if (current_user === user_1) {
    return user1_pending_txs;
  } else if (current_user === user_2) {
    return user2_pending_txs;
  }
}

absBalance = () => {
  return Math.abs(this.state.balance)
}

accountRegistered = () => {
  const { current_user, user_1, user_2 } = this.state;
  return current_user === user_1 || current_user === user_2;
}

isUser1 = () => {
  return this.state.current_user === this.state.user_1
}

hasNoInvitedFriend = () => {
  return this.isEmptyAddress(this.state.invited_friend)
}

hasTwoUsers = () => {
  return !this.isEmptyAddress(this.state.user_1) && !this.isEmptyAddress(this.state.user_2)
}

isInvitedFriend = () => {
  return this.state.current_user === this.state.invited_friend
}

render() {
  if (!this.state.web3) {
    return <div className="container">
      <div className="progress">
        <div className="indeterminate">
        </div>
      </div>
      <h4>Loading Web3, accounts, and contract...</h4>
    </div>
  }

  if (!this.state.current_user) {
    return <div className="container">
      <div className="progress">
        <div className="indeterminate">
        </div>
      </div>
      <h4>Please sign in to Metamask and refresh to access your agreement!</h4>
    </div>
  }

  if (!this.accountRegistered() && !this.isInvitedFriend()) {
    return <div className="container">
      <h4>Sorry, your Eth account address has not been registered on or invited to this agreement yet.</h4>
    </div>
  }

  return (
    <div className="Agreement">
      <ESNavbar userName={this.getName(this.state.current_user)}
        sign={this.userBal().sign}
        accountRegistered={this.accountRegistered}
        balance={this.absBalance()}
        singleAgreement = {true}
        currentAccount = {this.current_user}/>

      <div className="container">
        <div className="card-panel">
          <h1>EtherSplit Agreement</h1>
          {/*Enter Name form - display if account registered, but no name submitted yet*/}
          {this.accountRegistered() && ["User 1", "User 2"].includes(this.getName(this.state.current_user)) ?
            <EnterName setName={this.setName} /> : null
          }
            <br/>
          <div className ="row left-align truncate">
            {(this.accountRegistered() && this.getName(this.state.current_user) !== "") ?
              <p>Welcome to EtherSplit, {this.getName(this.state.current_user)}!</p>
              : <p>Welcome to EtherSplit!</p>
            }
            <div>Contract Address: {this.state.contract.address}</div>
            <div>Your address: {this.state.current_user}</div>

            <div>User_1's Name: {this.getName(this.state.user_1)}</div>
            <div>User_2's Name: {this.getName(this.state.user_2)}</div>

            <div>User_1's address: {this.state.user_1}</div>
            <div>User_2's address: {this.state.user_2}</div>
            <div>Invited Friend's Address: {this.state.invited_friend}</div>
          </div>
          <br/>
          {/* Invite Friend form, visible to user_1 when no friend invited yet */}
          {this.isUser1() && this.hasNoInvitedFriend() ?
            <InviteFriend inviteFriend={this.inviteFriend} /> : null
           }
          {/* Register User2 button, visible to the invited friend */}
          {this.isInvitedFriend() && this.isEmptyAddress(this.state.user_2) ?
            <RegisterUser2 registerUser2 = {this.registerUser2} user1Name = {this.state.user_1_name} /> : null
          }
            <div>
            <div className={this.hasTwoUsers() && !this.hasNoInvitedFriend() ? "hidden" : null }>
              <h3> Awaiting registration from the invited address. </h3>
            </div>
          {/* Render SingleAgreementBody if account is registered for this agreement */}
          { this.accountRegistered() ?
            <AgreementBody
              accountRegistered = {this.accountRegistered}
              hasTwoUsers = {this.hasTwoUsers}
              createPending = {this.createPending}
              getName = {this.getName}
              userBal = {this.userBal}
              txTraits = {this.txTraits}
              absBalance = {this.absBalance}
              userPendingTxs = {this.userPendingTxs}
              confirmSingleTx = {this.confirmSingleTx}
              confirmAll = {this.confirmAll}
              current_user = {this.state.current_user}
              user_1 = {this.state.user_1}
              user_2 = {this.state.user_2}
              user_1_name = {this.state.user_1_name}
              user_2_name = {this.state.user_2_name}
              user1_pending_txs = {this.state.user1_pending_txs}
              user2_pending_txs = {this.state.user2_pending_txs}
              confirmed_txs = {this.state.confirmed_txs}
            /> : null
          }
          </div>
          </div>
        </div>
      </div>
      );
    }
  }
export default SingleAgreement;



// Extracted SingleAgreement Body:

// <div className={this.hasTwoUsers() ? null : "hidden"}>
//   <div className ="row">
//     <div className=" col s7">
//       <Collapsible popout>
//         <CollapsibleItem header= 'Create New Transaction' className='create-pending truncate'>
//           <CreatePending createPending={this.createPending}
//             user_1={this.state.user_1}
//             user_2={this.state.user_2}
//             userName1={this.getName(this.state.user_1)}
//             userName2={this.getName(this.state.user_2)}
//           />
//         </CollapsibleItem>
//       </Collapsible>
//     </div>
//     <div className=" col s5">
//       <h3 className ="hide-on-small-only">Balance: <span className={this.userBal().color}>{this.userBal().sign}£{this.absBalance()}</span></h3>
//     </div>
//   </div>
//   {/*List current user's Pending Txs*/}
//   <div className="row">
//     <div className=" col s6">
//       <h4>My Pending Tx</h4>
//       { this.userPendingTxs().length > 0 ?
//         <div className="input-field">
//           <button className="btn waves-effect waves-light" onClick={this.confirmAll}>Confirm All</button>
//         </div> : null
//       }
//       <br/>
//       <PendingTxs
//         showMine={true}
//         current_user = {this.state.current_user}
//         user_1={this.state.user_1} user_2={this.state.user_2}
//         user1_pending_txs={this.state.user1_pending_txs}
//         user2_pending_txs={this.state.user2_pending_txs}
//         confirmSingleTx={this.confirmSingleTx}
//         getName = {this.getName} />
//       </div>
//       <div className="col s6">
//         <h4>Their Pending Tx</h4>
//         <br/>
//         <br/>
//         <br/>
//         <PendingTxs
//           showMine={false}
//           current_user = {this.state.current_user}
//           user_1={this.state.user_1} user_2={this.state.user_2}
//           user1_pending_txs={this.state.user1_pending_txs}
//           user2_pending_txs={this.state.user2_pending_txs}
//           confirmSingleTx={this.confirmSingleTx}
//           getName = {this.getName} />
//         </div>
//       </div>
//       <br/>
//       <br/>
//       {/* List Confirmed Txs */}
//       <div className="row">
//         <ConfirmedTxs confirmed_txs={this.state.confirmed_txs}
//           getName={this.getName}
//           current_user = {this.state.current_user}/>
//         </div>
//       </div>
