import React, { Component } from "react";
import { BrowserRouter, Route, Switch } from 'react-router-dom';
import Agreement from "../contracts/Agreement.json";
import AgreementFactory from "../contracts/AgreementFactory.json";
import getWeb3 from "../utils/getWeb3";
import truffleContract from "truffle-contract";
import ESNavbar from './ESNavbar.js'
import ConfirmedTxs from './ConfirmedTxs.js'
import PendingTxs from './PendingTxs.js'
import CreatePending from './CreatePending.js'
import EnterName from './EnterName.js'
import InviteFriend from './InviteFriend.js'
import RegisterUser2 from './RegisterUser2.js'
import { Input, Collapsible, CollapsibleItem, Button } from 'react-materialize';

// import "../App.css";

class Factory extends Component {

  state = {
    web3: null,
    accounts: null,
    factory: null,
    currentAccount: null,
    myInvites: [],
    myInvitesData: {},
    myAgreements: [],
    myAgreementsData: {}
  };

  componentDidMount = async () => {
    try {
      const web3 = await getWeb3(); // Get network provider and web3 instance.
      console.log("web3 is:")
      console.log(web3)
      const accounts = await web3.eth.getAccounts();
      const currentAccount = accounts[0];
      console.log("accounts[0] is:")
      console.log(accounts[0])
      const Contract = truffleContract(AgreementFactory);   // Get the contract instance.
      Contract.setProvider(web3.currentProvider);
      const factory = await Contract.deployed();
      this.logState();
      const myInvites = await factory.getMyInvites({from: accounts[0]});
      const myAgreements = await factory.getMyAgreements({from: accounts[0]});
      console.log("myAgreements are:")
      console.log(myAgreements)
      console.log("myInvites are:")
      console.log(myInvites)
      const myAgreementsData = await this.getAllAgreementsData(web3, myAgreements, {from: accounts[0]});
      const myInvitesData = await this.getAllAgreementsData(web3, myInvites, {from: accounts[0]});
      console.log("myAgreementsData before set as State is:")
      console.log(myAgreementsData)
     this.setState({ web3, accounts, currentAccount, factory, myInvites, myAgreements, myAgreementsData, myInvitesData }, this.logState)
    } catch (error) {
      // Catch any errors for above operations
      alert(
      `Failed to load web3, accounts, contract, users, or transactions. Check console for details.`
    );
      console.log(error);
    }
  };

  getAgreementData = async (web3, address) => {
    // returns balance and usernames for the input contract
    const AgreementInstance = truffleContract(Agreement);
    AgreementInstance.setProvider(web3.currentProvider);
    const agreement = await AgreementInstance.at(address);
    const user_1_name = await agreement.user_1_name();
    const user_2_name = await agreement.user_2_name();
    const balance = (await agreement.balance()).toNumber();
    const creator = await agreement.user_1();
    // console.log("address is: "+address+". bal, u1name, u2 name and creator are")
    // console.log(balance, user_1_name, user_2_name, creator)
    return [balance, user_1_name, user_2_name, creator]
  }

  getAllAgreementsData = async (web3, agreements) => {
    const allAgreementsData = {};
    for (const addr of agreements) {
      const data = await this.getAgreementData(web3, addr);  //get data from each individual agreement
      allAgreementsData[addr] = { "balance": data[0], "user_1_name": data[1], "user_2_name": data[2], "creator": data[3]  }
    }
    return allAgreementsData;
  }

  logState = () => {
    console.log("The state is:")
    console.log(this.state)
  }

  createNewAgreement = async () => {
    const {currentAccount, factory, web3 } = this.state;
    await factory.createNewAgreement({from: currentAccount});
    const updatedMyAgreements = await factory.getMyAgreements({from: currentAccount});
    const updatedAgreementsData = await this.getAllAgreementsData(web3, updatedMyAgreements);
    this.setState({ myAgreements: updatedMyAgreements, myAgreementsData: updatedAgreementsData }, this.logState)
    window.Materialize.toast('You have created a new agreement!', 8000)
  }

  routeChange = (addr) => {
    const path = '/agreements/' + addr;
    console.log('path from routeChange func is: ')
    console.log(path)
    //this.setState({agreementToLoad: addr})
    this.props.history.push(path);
  }

  displayCreator = (creator, user_1_name) => {
    if (creator === this.state.currentAccount) {
      return "Created by You"
    } else if (user_1_name === "") {
      return (
        <div>
          <p>Created by account address: </p>
          <p>{creator}</p>
        </div>
      )
    } else if (user_1_name !== "") {
      return "Created by " + user_1_name
    }
  }

  render() {
    if (!this.state.currentAccount) {
      return <div className="container">
        <div className="progress">
          <div className="indeterminate">
          </div>
        </div>
        <h4>Please sign in to Metamask and refresh to access your agreements.</h4>
      </div>
    }

    // build the array of user's JSX agreements
    const myAgreementsData = this.state.myAgreementsData;
    const MyAgreements = []
    for (const addr in myAgreementsData) {
      const creator = this.state.myAgreementsData[addr]["creator"]
      const user_1_name = this.state.myAgreementsData[addr]["user_1_name"]

      MyAgreements.push(
      <div className="card">
        <div className="row factory-agreement-top">
          <div className ="col s7 truncate">
            <p>Agreement contract address:</p>
            <p>{addr}</p>
          </div>
          <div className ="col s3">
            <h5 className ="truncate">Balance: {myAgreementsData[addr]["balance"]}</h5>
          </div>

        </div>
        <div className ="row factory-agreement-bottom">
          <div className ="col s7 truncate">
            {this.displayCreator(creator, user_1_name)}
          </div>
          <div className ="input-field col s3">
              <button className="btn waves-effect waves-light" onClick={() => this.routeChange(addr)}> View Agreement</button>
          </div>
        </div>
      </div>
      )
    }

    // build the array of user's JSX invites
    const myInvitesData = this.state.myInvitesData;
    const MyInvites = []
    for (const addr in myInvitesData) {
      const creator = this.state.myInvitesData[addr]["creator"]
      const user_1_name = this.state.myInvitesData[addr]["user_1_name"]

      // If agreement already in myAgreements -
      // if user has already registered - don't render it in the invites list.
      if (this.state.myAgreementsData[addr]) {
        continue;
      }

      MyInvites.push(
      <div className="card">
        <div className="row factory-agreement-top">
          <div className ="col s7 truncate">
            <p>Agreement contract address:</p>
            <p>{addr}</p>
          </div>
        </div>
        <div className ="row factory-agreement-bottom">
          <div className ="col s7 truncate">
            {this.displayCreator(creator, user_1_name)}
          </div>
          <div className ="input-field col s3">
              <button className="btn waves-effect waves-light" onClick={() => this.routeChange(addr)}> View Agreement</button>
          </div>
        </div>
      </div>
      )
    }

    return (
      <div className ="App">
        <ESNavbar
          factory = {true}
          currentAccount = {this.state.currentAccount}/>
        <div className = "container">
          <h1> Your EtherSplit Agreements </h1>
          { MyAgreements }
          { MyInvites.length > 0 ?
            <div>
              <h3> Your Invitations to EtherSplit Agreements </h3>
              { MyInvites }
            </div>  : null
          }
          <div className="row">
            <div className="input-field col s6">
              <button className="btn waves-effect waves-light" onClick={this.createNewAgreement}>Create New Agreement</button>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

export default Factory;


//
// class App extends Component {
//   state = {
//     web3: null,
//     accounts: null,
//     contract: null,
//     user_1: null,
//     user_2: null,
//     user_1_name: null,
//     user_2_name: null,
//     current_user: null,
//     invited_friend: null,
//     // arrays of 'Transaction' objects
//     user1_pending_txs: [],
//     user2_pending_txs: [],
//     confirmed_txs: [],
//     test_state: null
//   };
//
//   componentDidMount = async () => {
//     try {
//       const web3 = await getWeb3(); // Get network provider and web3 instance.
//       const accounts = await web3.eth.getAccounts();
//
//       const Contract = truffleContract(Agreement);   // Get the contract instance.
//       Contract.setProvider(web3.currentProvider);
//       const agreement = await Contract.deployed();
//
//       //Get the users and balance
//       const current_user = accounts[0]
//       const user_1 = await agreement.user_1({ from: accounts[0] });
//       const user_2 = await agreement.user_2({ from: accounts[0] });
//       const user_1_name = await agreement.user_1_name({ from: accounts[0] });
//       const user_2_name = await agreement.user_2_name({ from: accounts[0] });
//       const invited_friend = await agreement.invited_friend({ from: accounts[0] });
//       const balance = (await agreement.balance( { from: accounts[0] })).toNumber();
//       //Get pending transactions
//       const all_pending_txs = await this.getAllPendingTxs(agreement)
//       const user1_pending_txs = all_pending_txs[0]
//       const user2_pending_txs = all_pending_txs[1]
//       const confirmed_txs = await this.getConfirmedTxs(agreement);
//
//       // Set web3, accounts contract, users and transactions to the state.
//       this.setState({ web3, accounts, current_user, user_1, user_2, user_1_name, user_2_name, invited_friend, user1_pending_txs, user2_pending_txs, confirmed_txs, balance,  contract: agreement});
//
//       console.log('the state is:')
//       console.log(this.state)
//
//     } catch (error) {
//       // Catch any errors for above operations
//       alert(
//       `Failed to load web3, accounts, contract, users, or transactions. Check console for details.`
//     );
//     console.log(error);
//   }
// };
//
// inviteFriend = async (e) => {
//   e.preventDefault();
//   const friend = e.target.address.value
//   const { accounts, contract } = this.state;
//   await contract.inviteFriend(friend, { from: accounts[0] });
//   const invited_friend = await contract.invited_friend({from: accounts[0]});
//   this.setState({invited_friend})
// }
//
// registerUser2 = async () => {
//   const { accounts, contract, user_1_name } = this.state;
//   await contract.registerUser2({ from: accounts[0] });
//   const user_2 = await contract.user_2({ from: accounts[0] })
//   this.setState({user_2})
//   window.Materialize.toast('You have entered a new EtherSplit contract with '+user_1_name+'!', 8000)
// }
//
// confirmAll = async () => {
//   const { accounts, contract } = this.state;
//   await contract.confirmAll({ from: accounts[0] });
//   // update pending TX list and confirmed Tx list
//   const updatedPending = await this.getAllPendingTxs(contract)
//   const updatedConfirmed = await this.getConfirmedTxs(contract);
//   const updatedBalance = (await contract.balance()).toNumber();
//   this.setState({user1_pending_txs: updatedPending[0], user2_pending_txs: updatedPending[1], confirmed_txs: updatedConfirmed, balance: updatedBalance})
//   window.Materialize.toast('All pending transactions confirmed.', 5000)
// }
//
// confirmSingleTx = async (list_id) => {
//   const { accounts, contract } = this.state;
//   // As list_id starts at 1, pass (list_id - 1) as argument to the contract call.
//   await contract.confirmSingleTx(list_id - 1, { from: accounts[0], gas: 1000000});
//   // update pending TX list and confirmed Tx list
//   const updatedPending = await this.getAllPendingTxs(contract)
//   const updatedConfirmed = await this.getConfirmedTxs(contract)
//   const updatedBalance = (await contract.balance()).toNumber();
//   this.setState({user1_pending_txs: updatedPending[0], user2_pending_txs: updatedPending[1], confirmed_txs: updatedConfirmed, balance: updatedBalance})
//   window.Materialize.toast('Transaction confirmed.', 5000)
// }
//
// getAllPendingTxs = async (contract) => {
//   let length1;
//   let length2;
//   const txList1 = [];
//   const txList2 = [];
//   const txLists = [];
//   //loop through and get all user_1's pending tx
//   length1 = (await contract.pendingTxs1Length()).toNumber();
//   for (var i=0; i < length1; i++){
//     const tx = await contract.pendingTransactions_1(i)
//     tx.list_id = i+1;
//     txList1.push(this.cleanTx(tx))
//   }
//   // get all user_2's pending tx
//   length2 = (await contract.pendingTxs2Length()).toNumber();
//   for (var j=0; j < length2; j++){
//     const tx = await contract.pendingTransactions_2(j)
//     tx.list_id = j+1;
//     txList2.push(this.cleanTx(tx))
//   }
//   txLists.push(txList1)
//   txLists.push(txList2)
//   return txLists
// }
//
// getConfirmedTxs = async (contract) => {
//   const length = (await contract.confirmedTxsLength()).toNumber();
//   const txList = [];
//
//   for (var i=0; i < length; i++){
//     const tx = await contract.confirmedTransactions(i);
//     tx.list_id = i+1;
//     txList.push(this.cleanTx(tx))
//   }
//   console.log("hi")
//   return txList;
// }
//
// cleanTx = (tx) => {
//   // return a clean representation of a transaction, for use in React state
//   const {list_id, amount, creator, confirmer, debtor, split, description, index, timestamp } = tx;
//
//   const clean_tx = {
//     list_id: list_id,
//     amount: amount.toNumber(),
//     creator: creator,
//     confirmer: confirmer,
//     debtor: debtor,
//     split: split.toString(),
//     description: description,
//     id: index.toNumber(),
//     timestamp: timestamp.toNumber()
//   }
//   return clean_tx
// }
//
// createPending = async (e) => {
//   e.preventDefault();
//   const { accounts, contract } = this.state;
//   const amount = e.target.amount.value;
//   const debtor = e.target.debtor.value;
//   const split = e.target.split.checked;
//   const description = e.target.description.value;
//
//   if (amount && description) {
//     await contract.createPending(amount, split, debtor, description, {from: accounts[0]})
//     const updatedPending = await this.getAllPendingTxs(contract)
//     await this.setState({user1_pending_txs: updatedPending[0], user2_pending_txs: updatedPending[1] });
//     window.Materialize.toast('Pending Transaction created.', 5000)
//   } else {
//     window.Materialize.toast('Please enter an amount and description!', 5000)
//   }
// }
//
// getName = (address) => {
//   const {user_1, user_2 } = this.state;
//   let name;
//   if (address === user_1) {
//     name = (this.state.user_1_name || "User 1")
//   } else if ( address === user_2 ) {
//     name = (this.state.user_2_name || "User 2" )
//   }
//   return name
// }
//
// isEmptyAddress = (address) => {
//   return address === "0x0000000000000000000000000000000000000000";
// }
//
// logState = () => {
//   console.log("The state is:")
//   console.log(this.state)
// }
//
// setName = async (e) => {
//   const { current_user, user_1, user_2, contract, accounts } = this.state;
//   e.preventDefault();
//   const name = e.target.name.value;
//   console.log(name)
//   await contract.setName(name, {from: accounts[0]});
//   let recordedName;
//   if (current_user === user_1) {
//     recordedName =  await contract.user_1_name();
//     this.setState({user_1_name: recordedName}, this.logState);
//   } else if (current_user === user_2) {
//     recordedName =  await contract.user_2_name();
//     this.setState({user_2_name: recordedName}, this.logState);
//   }
// }
//
// userBal = () => {
//   //return properties of the balance for the current_user's point of view: it's color, prefix and sign +ve or -ve.
//   const { current_user, balance, user_1, user_2 } = this.state;
//   let color;
//   let prefix =  '';
//   let sign = '';
//
//   if (balance === 0) {
//     color = 'black-text'
//   } else if (current_user === user_1 && balance < 0) {
//     color = 'red-text accent-4'
//     prefix = 'You Owe'
//     sign = '-'
//   } else if (current_user === user_1 && balance >= 0) {
//     color = 'teal-text text-lighten-1'
//     prefix = 'You Are Owed'
//   } else if (current_user === user_2 && balance < 0) {
//     color = 'teal-text text-lighten-1'
//     prefix = 'You Are Owed'
//   } else if (current_user === user_2 && balance >= 0) {
//     color = 'red-text text-accent-4'
//     prefix = 'You Owe'
//     sign = '-'
//   }
//   return  { color, prefix, sign };
// }
//
// userPendingTxs = () => {
//   //returns the current user's pending transactions
//   const { current_user, user_1, user_2, user1_pending_txs, user2_pending_txs } = this.state;
//
//   if (current_user === user_1) {
//     return user1_pending_txs;
//   } else if (current_user === user_2) {
//     return user2_pending_txs;
//   }
// }
//
// absBalance = () => {
//   return Math.abs(this.state.balance)
// }
//
// accountRegistered = () => {
//   const { current_user, user_1, user_2 } = this.state;
//   return current_user === user_1 || current_user === user_2;
// }
//
// noInvitedFriend = () => {
//   return this.isEmptyAddress(this.state.invited_friend);
// }
//
// isUser1 = () => {
//   return this.state.current_user === this.state.user_1
// }
//
// isInvitedFriend = () => {
//   return this.state.current_user === this.state.invited_friend
// }
//
// render() {
//   if (!this.state.web3) {
//     return <div className="container">
//       <div className="progress">
//         <div className="indeterminate">
//         </div>
//       </div>
//       <h4>Loading Web3, accounts, and contract...</h4>
//     </div>
//   }
//
//   if (!this.state.current_user) {
//     return <div className="container">
//       <div className="progress">
//         <div className="indeterminate">
//         </div>
//       </div>
//       <h4>Please sign in to Metamask and refresh to access your agreement!</h4>
//     </div>
//   }
//
//   return (
//     <div className="App">
//       <ESNavbar userName={this.getName(this.state.current_user)}
//         sign={this.userBal().sign}
//         accountRegistered={this.accountRegistered}
//         balance={this.absBalance()} />
//       <div className="container">
//         <div className="card-panel">
//           <h1>EtherSplit Agreement</h1>
//           {/*Enter Name form - display if account registered, but no name submitted yet*/}
//           {this.accountRegistered() && ["User 1", "User 2"].includes(this.getName(this.state.current_user)) ?
//             <EnterName setName={this.setName} /> : null
//           }
//             <br/>
//           <div className ="row left-align">
//             {(this.accountRegistered() && this.getName(this.state.current_user) !== "") ?
//               <p>Welcome to EtherSplit, {this.getName(this.state.current_user)}!</p>
//               : <p>Welcome to EtherSplit!</p>
//             }
//             <div>Contract Address: {this.state.contract.address}</div>
//             <div>Your address: {this.state.current_user}</div>
//
//             <div>User_1's Name: {this.getName(this.state.user_1)}</div>
//             <div>User_2's Name: {this.getName(this.state.user_2)}</div>
//
//             <div>User_1's address: {this.state.user_1}</div>
//             <div>User_2's address: {this.state.user_2}</div>
//             <div>Invited Friend's Address: {this.state.invited_friend}</div>
//           </div>
//           <br/>
//           <br/>
//           {/* Invite Friend form, visible to user_1 when no friend invited yet */}
//           {this.isUser1() ?
//             <InviteFriend inviteFriend={this.inviteFriend} /> : null
//            }
//           {/* Register User2 button, visible to the invited friend */}
//           {this.isInvitedFriend() && this.isEmptyAddress(this.state.user_2) ?
//             <RegisterUser2 registerUser2 = {this.registerUser2} /> : null
//           }
//           { this.accountRegistered() ?
//             // List the Balance, Tx form and Tx data only if account is registered
//             <div>
//             <div className ="row">
//               <div className=" col s7">
//                 <Collapsible popout>
//                   <CollapsibleItem header= 'Create New Transaction' className='create-pending'>
//                     <CreatePending createPending={this.createPending}
//                       user_1={this.state.user_1}
//                       user_2={this.state.user_2}
//                       userName1={this.getName(this.state.user_1)}
//                       userName2={this.getName(this.state.user_2)}
//                     />
//                   </CollapsibleItem>
//                 </Collapsible>
//               </div>
//               <div className=" col s5">
//                 <h3>Balance: <span className={this.userBal().color}>{this.userBal().sign}£{this.absBalance()}</span></h3>
//               </div>
//             </div>
//           {/*List current user's Pending Txs*/}
//           <div className="row">
//             <div className=" col s6">
//               <h4>My Pending Tx</h4>
//               { this.userPendingTxs().length > 0 ?
//                 <div className="input-field">
//                   <button className="btn waves-effect waves-light" onClick={this.confirmAll}>Confirm All</button>
//                 </div> : null
//               }
//               <br/>
//               <PendingTxs
//                 showMine={true}
//                 current_user = {this.state.current_user}
//                 user_1={this.state.user_1} user_2={this.state.user_2}
//                 user1_pending_txs={this.state.user1_pending_txs}
//                 user2_pending_txs={this.state.user2_pending_txs}
//                 confirmSingleTx={this.confirmSingleTx}
//                 getName = {this.getName} />
//               </div>
//               <div className="col s6">
//                 <h4>Their Pending Tx</h4>
//                 <br/>
//                 <br/>
//                 <br/>
//                 <PendingTxs
//                   showMine={false}
//                   current_user = {this.state.current_user}
//                   user_1={this.state.user_1} user_2={this.state.user_2}
//                   user1_pending_txs={this.state.user1_pending_txs}
//                   user2_pending_txs={this.state.user2_pending_txs}
//                   confirmSingleTx={this.confirmSingleTx}
//                   getName = {this.getName} />
//               </div>
//             </div>
//             <br/>
//             <br/>
//             {/* List Confirmed Txs */}
//             <div className="row">
//               <ConfirmedTxs confirmed_txs={this.state.confirmed_txs}
//                 getName={this.getName}
//                 current_user = {this.state.current_user}/>
//             </div>
//             </div>  : null
//           }
//           </div>
//         </div>
//       </div>
//       );
//     }
//   }
