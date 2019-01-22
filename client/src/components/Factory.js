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
