import React, { Component } from "react";
import Agreement from "../contracts/Agreement.json";
import AgreementFactory from "../contracts/AgreementFactory.json";
import getWeb3 from "../utils/getWeb3";
import truffleContract from "truffle-contract";
import ESNavbar from './ESNavbar.js';
import { getBalanceTraits, absBalance, showWaitingToast, removeWaitingToast } from '../helpers.js';

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
    let attempts = 0;
    const maxAttempts = 2
    while (true) {
      try {

        this.getAllInitialData();
        break;

      } catch (error) {
        attempts += 1
        if (attempts < maxAttempts) {
          console.log(error)
          console.log("Re-trying componentDidMount ...")
          continue;
        } else {
          window.Materialize.toast(
          `Failed to load web3, accounts, contract, users, or transactions -- check console for details. Please make sure your MetaMask or chosen
          digital Ether wallet is enabled.`, 6000);
          console.log(error);
          break;
        }
      }
    }
  };

  getAllInitialData = async () => {
    const web3 = await getWeb3(); // Get network provider and web3 instance.
    
    const accounts = await web3.eth.getAccounts();
    const currentAccount = accounts[0];
    this.setState({currentAccount})
    
    const Contract = truffleContract(AgreementFactory);    // Get the contract representation, from the JSON artifact
    Contract.setProvider(web3.currentProvider);
    const factory = await Contract.deployed(); // Get the deployed contract instance.
    const myInvites = await factory.getMyInvites({from: accounts[0]});
    const myAgreements = await factory.getMyAgreements({from: accounts[0]});  // get addresses of user's agreements
    
    const myAgreementsData = await this.getAllMyAgreementsData(web3, myAgreements, {from: accounts[0]});
    const myInvitesData = await this.getAllMyAgreementsData(web3, myInvites, {from: accounts[0]});
    
    this.setState({ web3, accounts, currentAccount, factory, myInvites, myAgreements, myAgreementsData, myInvitesData }, this.logState)
  }

  getAllMyAgreementsData = async (web3, agreements) => {
    const allAgreementsData = {};
    for (const addr of agreements) {
      const data = await this.getAgreementData(web3, addr);  //get data from each individual agreement
      allAgreementsData[addr] = data;
    }
    return allAgreementsData;
  }

  getAgreementData = async (web3, address) => {
    const AgreementInstance = truffleContract(Agreement);
    AgreementInstance.setProvider(web3.currentProvider);
    const agreement = await AgreementInstance.at(address);
    const user_1_name = await agreement.user_1_name();
    const user_2_name = await agreement.user_2_name();
    const balance = (await agreement.balance()).toNumber() / 100.0;
    const creator = await agreement.user_1();
    const user_2 = await agreement.user_2();
    const balanceTraits = getBalanceTraits(this.state.currentAccount, balance, creator, user_2)

    return {balance, user_1_name, user_2_name, creator, balanceTraits}
  }

  logState = () => {
    console.log("The state is:")
    console.log(this.state)
  }

  createNewAgreement = async () => {
    const {currentAccount, factory, web3 } = this.state;
    showWaitingToast();
    await factory.createNewAgreement({from: currentAccount});
    const updatedMyAgreements = await factory.getMyAgreements({from: currentAccount});
    const updatedAgreementsData = await this.getAllMyAgreementsData(web3, updatedMyAgreements);
    removeWaitingToast();
    this.setState({ myAgreements: updatedMyAgreements, myAgreementsData: updatedAgreementsData }, this.logState)
    window.Materialize.toast('You have created a new agreement!', 8000)
  }

  routeChange = (addr) => {
    const path = '/agreements/' + addr;
    console.log('path from routeChange func is: ')
    console.log(path)
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
      const creator = myAgreementsData[addr]["creator"]
      const user_1_name = myAgreementsData[addr]["user_1_name"]
      const balance = myAgreementsData[addr]["balance"]
      const balanceTraits = myAgreementsData[addr]["balanceTraits"]

      MyAgreements.push(
      <div className="card" key={addr}>
        <div className="row factory-agreement-top">
          <div className ="col s7 truncate">
            <p>Agreement Contract Address:</p>
            <p>{addr}</p>
          </div>
          <div className ="col s5">
            <h5 className ="truncate">Balance: <span className={balanceTraits.color}>{balanceTraits.sign}£{absBalance(balance)}</span></h5>
            {/* <h3 className ="hide-on-small-only">Balance: <span className={balanceTraits.color}>{balanceTraits.sign}£{absBalance(balance)}</span></h3> */}
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

      // If agreement already in myAgreements - don't render it in the invites list.
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
