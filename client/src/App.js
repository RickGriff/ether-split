import React, { Component } from "react";
import ReactDOM from 'react-dom';
import Agreement from "./contracts/Agreement.json";
import getWeb3 from "./utils/getWeb3";
import truffleContract from "truffle-contract";
import ESNavbar from './components/ESNavbar.js'
import ConfirmedTxs from './components/ConfirmedTxs.js'
import PendingTxs from './components/PendingTxs.js'
import CreatePending from './components/CreatePending.js'
import { Input } from 'react-materialize';

import "./App.css";

class App extends Component {
  state = {
    web3: null,
    accounts: null,
    contract: null,
    user_1: null,
    user_2: null,
    current_user: null,
    invited_friend: null,
    current_pending_txs: [], //array of transaction objects
    user1_pending_txs: [],
    user2_pending_txs: [],
    confirmed_txs: [],
    test: null
  };

  componentDidMount = async () => {
    try {
      const web3 = await getWeb3(); // Get network provider and web3 instance.
      const accounts = await web3.eth.getAccounts();

      const Contract = truffleContract(Agreement);   // Get the contract instance.
      Contract.setProvider(web3.currentProvider);
      const agreement = await Contract.deployed();

      //Get the users and balance
      const current_user = accounts[0]
      const user_1 = await agreement.user_1({ from: accounts[0] });
      const user_2 = await agreement.user_2({ from: accounts[0] });
      const invited_friend = await agreement.invited_friend({ from: accounts[0] });
      const balance = (await agreement.balance( { from: accounts[0] })).toNumber();
      //Get pending transactions
      // const current_pending_txs = await this.getPendingTxs(current_user, agreement, user_1, user_2)

      const all_pending_txs = await this.getAllPendingTxs(agreement)
      const user1_pending_txs = all_pending_txs[0]
      const user2_pending_txs = all_pending_txs[1]
      const confirmed_txs = await this.getConfirmedTxs(agreement);

      // Set web3, accounts contract, users and transactions to the state.
      this.setState({ web3, accounts, current_user, user_1, user_2, invited_friend, user1_pending_txs, user2_pending_txs, confirmed_txs, balance, contract: agreement});

      console.log('the state is:')
      console.log(this.state)

    } catch (error) {
      // Catch any errors for any of the above operations.
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
    const { accounts, contract } = this.state;
    await contract.registerUser2({ from: accounts[0] });
    const user_2 = await contract.user_2({ from: accounts[0] })
    this.setState({user_2})
  }

  confirmAll = async () => {
    const { current_user, user_1, user_2, accounts, contract } = this.state;
    await contract.confirmAll({ from: accounts[0] });

    // update pending TX list and confirmed Tx list
    const updatedPending = await this.getAllPendingTxs(contract)
    const updatedConfirmed = await this.getConfirmedTxs(contract);
    const updatedBalance = (await contract.balance()).toNumber();
    this.setState({user1_pending_txs: updatedPending[0], user2_pending_txs: updatedPending[1], confirmed_txs: updatedConfirmed, balance: updatedBalance})
    window.Materialize.toast('All pending transactions confirmed.', 5000)
  }

  confirmSingleTx = async (list_id) => {
    const {current_user, user_1, user_2, accounts, contract } = this.state;
    console.log("was clicked")
    console.log(list_id)
    // console.log("id:" + id)
    // console.log("accounts[0]:" + accounts[0])
    // console.log("current_user:" + current_user)

    // As list_id starts at one, pass (list_id - 1) as argument to the contract call.
    await contract.confirmSingleTx(list_id - 1, { from: accounts[0], gas: 1000000});
    console.log("after contract call line")
    // console.log("got past the contract call")

    // update pending TX list and confirmed Tx list
    //  const updatedPending = await this.getPendingTxs(current_user, contract, user_1, user_2)

    const updatedPending = await this.getAllPendingTxs(contract)
    const updatedConfirmed = await this.getConfirmedTxs(contract)
    const updatedBalance = (await contract.balance()).toNumber();
    this.setState({user1_pending_txs: updatedPending[0], user2_pending_txs: updatedPending[1], confirmed_txs: updatedConfirmed, balance: updatedBalance})
    window.Materialize.toast('Transaction confirmed.', 5000)
}

  getPendingTxs = async(current_user, contract, user_1, user_2 ) => {
    // returns array of the user's pending transactions
    let length;
    const txList = [];

    if (current_user === user_1) {
      length = (await contract.pendingTxs1Length()).toNumber();
      //loop through and get each pending tx
      for (var i=0; i < length; i++){
        const tx = await contract.pendingTransactions_1(i)
        tx.list_id = i;
        txList.push(this.cleanTx(tx))
      }
    } else if (current_user === user_2) {
      length = (await contract.pendingTxs2Length()).toNumber();
      //loop through and get each pending tx
      for (var j=0; j < length; j++){
        const tx = await contract.pendingTransactions_2(j)
        tx.list_id = j;
        txList.push(this.cleanTx(tx))
      }
    }
    return txList
  }

  getAllPendingTxs = async(contract) => {
    let length1;
    let length2;
    const txList1 = [];
    const txList2 = [];
    const txLists = [];

    //loop through and get all user_1's pending tx
    length1 = (await contract.pendingTxs1Length()).toNumber();
    for (var i=0; i < length1; i++){
      const tx = await contract.pendingTransactions_1(i)
      tx.list_id = i+1;
      txList1.push(this.cleanTx(tx))
    }

    // get all user_2's pending tx
    length2 = (await contract.pendingTxs2Length()).toNumber();
    for (var j=0; j < length2; j++){
      const tx = await contract.pendingTransactions_2(j)
      tx.list_id = j+1;
      txList2.push(this.cleanTx(tx))
    }

    txLists.push(txList1)
    txLists.push(txList2)
    return txLists
  }

  getConfirmedTxs = async (contract) => {
    const length = (await contract.confirmedTxsLength()).toNumber();
    const txList = [];

    for (var i=0; i < length; i++){
      const tx = await contract.confirmedTransactions(i);
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

  createPending = async (e) => {
    e.preventDefault();
    const { accounts, contract } = this.state;
    const amount = e.target.amount.value;
    const debtor = e.target.debtor.value;
    const split = e.target.split.checked;
    const description = e.target.description.value;

    if (amount && description) {
      await contract.createPending(amount, split, debtor, description, {from: accounts[0]})
      const updatedPending = await this.getAllPendingTxs(contract)
      await this.setState({user1_pending_txs: updatedPending[0], user2_pending_txs: updatedPending[1] });
      window.Materialize.toast('Pending Transaction created.', 5000)
    } else {
       window.Materialize.toast('Please enter an amount and description!', 5000)
    }
  }

  getName = (address) => {
    const {user_1, user_2 } = this.state
    if (address === user_1) {
      return "Alice"
    } else if ( address === user_2 ) {
      return "Bob"
    }
  }

  render() {
    if (!this.state.current_user) {
      return <div className="container">
      <div class="progress">
          <div class="indeterminate">
            </div>
          </div>
          <h4>Please sign in to Metamask and refresh to access your agreement!</h4>
      </div>

    }
    if (!this.state.web3) {
      return <div>Loading Web3, accounts, and contract...</div>;
    }

    return (
    <div className="App">
    <ESNavbar userName ={this.getName(this.state.current_user)} balance={this.state.balance} />

        <div className="container">
        <div class="card-panel">
        <h1>EtherSplit Agreement</h1>
        <p>Welcome to EtherSplit, {this.getName(this.state.current_user)}!</p>
        <div>Contract Address: {this.state.contract.address}</div>
        <div>Current User's Metamask address: {this.state.current_user}</div>
        <div>User_1's Name: {this.getName(this.state.user_1)}</div>
        <div>User_1's address: {this.state.user_1}</div>
        <div>User_2's Name: {this.getName(this.state.user_2)}</div>
        <div>User_2's address: {this.state.user_2}</div>
        <div>Invited Friend's Address: {this.state.invited_friend}</div>
        <br/>
        <br/>

        {/* Invite Friend form, visible to user_1 when no friend invited yet */}
        {this.state.current_user === this.state.user_1 && !this.state.invited_friend ?
        <form className="col s12" onSubmit={this.inviteFriend}>
          <div className="row">
            <div className="input-field col s3">
              <button className="btn waves-effect waves-light" type="submit">Invite Friend</button>
            </div>
            <div className="input-field inline col s6">
              <label htmlFor="name"></label>
              <input id="invited-friend" type="text" name="address" className="validate" />
            </div>
          </div>
        </form> : null
         }

        {/* Register User2 button, visible to the invited friend */}
        {this.state.current_user === this.state.invited_friend && !this.state.user_2 ?
        <div className="row">
          <div className="input-field col s3">
            <button className="btn waves-effect waves-light" onClick={this.registerUser2}>Register as User 2</button>
          </div>
        </div> : null
        }

        {/* Create Pending Transaction form */}
        <CreatePending createPending={this.createPending}
                       user_1={this.state.user_1}
                       user_2={this.state.user_2}
                       userName1={this.getName(this.state.user_1)}
                       userName2={this.getName(this.state.user_2)}
                       />

        {/* Display Balance */}
        <div className="row">
          <div className=" col s12">
            <h3>Balance: { this.state.balance }</h3>
          </div>
        </div>

            {/* List current user's Pending Txs */}
            <div className="row">
              <div className=" col s6">
                <h4>My Pending Tx</h4>
                <div className="input-field">
                  <button className="btn waves-effect waves-light" onClick={this.confirmAll}>Confirm All</button>
                </div>
                <br/>
                <PendingTxs
                showMine={true}
                current_user = {this.state.current_user}
                user_1={this.state.user_1} user_2={this.state.user_2}
                user1_pending_txs={this.state.user1_pending_txs}
                user2_pending_txs={this.state.user2_pending_txs}
                confirmSingleTx={this.confirmSingleTx}
                getName = {this.getName} />
              </div>
              {/* List other user's Pending Txs */}
              <div className=" col s6">
                <h4>Their Pending Tx</h4>
                <br/>
                <br/>
                <br/>
                <PendingTxs
                showMine={false}
                current_user = {this.state.current_user}
                user_1={this.state.user_1} user_2={this.state.user_2}
                user1_pending_txs={this.state.user1_pending_txs}
                user2_pending_txs={this.state.user2_pending_txs}
                confirmSingleTx={this.confirmSingleTx}
                getName = {this.getName} />
              </div>
            </div>

            {/* List Confirmed Txs */}
            <ConfirmedTxs confirmed_txs={this.state.confirmed_txs} getName={this.getName} getDate = {this.getDate}/>
          </div>
        </div>
        </div>

        );
      }
    }

    export default App;

    //<input type="text" name="debtor" placeholder="Debtor's Address" className="validate" />

    // <div class="navbar">
    // <nav>
    //   <div class="nav-wrapper light-blue lighten-3">
    //     <a href="#" class="brand-logo right">EtherSplit</a>
    //     <ul id="nav-mobile" class="left hide-on-med-and-down">
    //       <li><a>User: {this.getName(this.state.current_user)}</a></li>
    //       <li><a>Balance: </a></li>
    //     </ul>
    //   </div>
    // </nav>
    // </div>


    // <div class="card-panel s7">
    // <form className="col s12" onSubmit={this.createPending}>
    //   <div className="row">
    //     <button className="btn waves-effect waves-light" type="submit">Create Pending TX</button>
    //     <div className="col s2">
    //       <label htmlFor="amount">
    //         <input type="number" placeholder="Amount" name="amount" className="validate" />
    //       </label>
    //     </div>
    //   </div>
    //   <div className="row">
    //     <div className="col s6">
    //       <label htmlFor="debtor">
    //         <Input type='select' name='debtor' label='Debtor' defaultValue='1'>
    //           <option value={this.state.user_1}>{this.getName(this.state.user_1)}</option>
    //           <option value={this.state.user_2}>{this.getName(this.state.user_2)}</option>
    //         </Input>
    //       </label>
    //     </div>
    //     <div className ="col s2">
    //       <label htmlFor="split">
    //         <input type="checkbox" name="split" id="split" />
    //         <span>Split transaction?</span>
    //       </label>
    //     </div>
    //   </div>
    //   <div className="row">
    //     <div className="col s6">
    //       <label htmlFor="name"></label>
    //       <input type="text" placeholder="Transaction description" name="description" />
    //     </div>
    //   </div>
    // </form>
    // </div>
