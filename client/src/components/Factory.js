import React, { Component } from "react";
import Agreement from "../contracts/Agreement.json";
import AgreementFactory from "../contracts/AgreementFactory.json";
import getWeb3 from "../utils/getWeb3";
import truffleContract from "truffle-contract";
import ESNavbar from './ESNavbar.js';
import { getBalance, getBalanceTraits, absBalance, showWaitingToast, removeWaitingToast, makeTwoAttempts } from '../helpers.js';

class Factory extends Component {

  state = {
    web3: "unset",
    accounts: null,
    factory: null,
    factoryAddress: null,
    currentAccount: null,
    myInvites: [],
    myInvitesData: {},
    myAgreements: [],
    myAgreementsData: {},
    dataLoaded: null
  };

  componentDidMount = async () => {
    const dataLoaded = await makeTwoAttempts(this.getAllInitialData);
    this.setState({dataLoaded});
  };

  getAllInitialData = async () => {
    let web3 = await getWeb3(); // Get network provider and web3 instance.
    this.setState({ web3 })

    if (web3 === null || web3 === undefined) throw ("Unable to obtain web3 instance.")
    if (web3 === false) return null // if user has no web3 provider, do not attempt further calls to the blockchain 

    const accounts = await web3.eth.getAccounts()
    console.log("accounts is: " + accounts)
    const currentAccount = accounts[0];
    this.setState({ currentAccount })

    const Contract = truffleContract(AgreementFactory);    // Get the contract representation, from the JSON artifact
    Contract.setProvider(web3.currentProvider);
    const factory = await Contract.deployed(); // Get the deployed contract instance.
    const factoryAddress = factory.address
    const myInvites = await factory.getMyInvites({ from: accounts[0] });
    const myAgreements = await factory.getMyAgreements({ from: accounts[0] });  // get addresses of user's agreements

    const myAgreementsData = await this.getAllMyAgreementsData(web3, myAgreements, { from: accounts[0] });
    const myInvitesData = await this.getAllMyAgreementsData(web3, myInvites, { from: accounts[0] });

    this.setState({ web3, accounts, currentAccount, factory, factoryAddress, myInvites, myAgreements, myAgreementsData, myInvitesData }, this.logState)
  }

  getAllMyAgreementsData = async (web3, agreements) => {
    const allAgreementsData = {};
    for (const addr of agreements) {
      const data = await this.getSingleAgreementData(web3, addr);  //get data from each individual agreement
      allAgreementsData[addr] = data;
    }
    return allAgreementsData;
  }

  getSingleAgreementData = async (web3, address) => {
    const AgreementInstance = truffleContract(Agreement);
    AgreementInstance.setProvider(web3.currentProvider);
    const agreement = await AgreementInstance.at(address);
    const user_1_name = await agreement.user_1_name();
    const user_2_name = await agreement.user_2_name();
    const balance = await getBalance(agreement);
    const creator = await agreement.user_1();
    const user_2 = await agreement.user_2();
    const balanceTraits = getBalanceTraits(this.state.currentAccount, balance, creator, user_2)

    return { balance, user_1_name, user_2_name, creator, balanceTraits }
  }

  logState = () => {
    console.log("The React state is:")
    console.log(this.state)
  }

  createNewAgreement = async () => {
    const { currentAccount, factory, web3 } = this.state;
    showWaitingToast();
    await factory.createNewAgreement({ from: currentAccount });
    const updatedMyAgreements = await factory.getMyAgreements({ from: currentAccount });
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

  getTwoNamedUsers = (name_1, name_2) => {
    if (name_1 !== "" && name_2 !== "") {
      return <h6>Participants: {`${name_1} & ${name_2}`}</h6>
    } else {
      return false
    }
  }

  render() {
    if (this.state.dataLoaded === false || this.state.web3 === null || this.state.web3 === undefined ) {
      return <div className="container">
        <h4>Failed to connect to the Blockchain. Please refresh the app.</h4>
      </div>
    } else if (this.state.web3 === "unset") {
      return <div className="container">
        <div className="progress">
          <div className="indeterminate"></div>
        </div>
        <h4>Loading your agreements...</h4>
      </div>
    }  else if (this.state.web3 === false) {
      return <div className="container">
        <h4>Non-dApp Browser detected. Please install or re-load your Ethereum wallet (e.g. MetaMask)</h4>
      </div>
    }

    // build the array of user's JSX agreements
    const myAgreementsData = this.state.myAgreementsData;
    const MyAgreements = []
    for (const addr in myAgreementsData) {
      const creator = myAgreementsData[addr]["creator"]
      const user_1_name = myAgreementsData[addr]["user_1_name"]
      const user_2_name = myAgreementsData[addr]["user_2_name"]
      const balance = myAgreementsData[addr]["balance"]
      const balanceTraits = myAgreementsData[addr]["balanceTraits"]

      MyAgreements.push(
        <div className="card" key={addr}>
          <div className="row factory-agreement-top">
            <div className="col s7 truncate">
              {this.getTwoNamedUsers(user_1_name, user_2_name) || this.displayCreator(creator, user_1_name)}

            </div>
            <div className="col s5">
              <h5 className="truncate">Balance: <span className={balanceTraits.color}>{balanceTraits.sign}£{absBalance(balance)}</span></h5>
            </div>
          </div>
          <div className="row factory-agreement-bottom">
            <div className="col s7 truncate">
              <p>Agreement contract address:</p>
              <p>{addr}</p>
            </div>
            <div className="input-field col s3">
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
            <div className="col s7 truncate">
              {this.displayCreator(creator, user_1_name)}
            </div>
          </div>
          <div className="row factory-agreement-bottom">
            <div className="col s7 truncate">
              <p>Agreement Contract Address:</p>
              <p>{addr}</p>
            </div>
            <div className="input-field col s3">
              <button className="btn waves-effect waves-light" onClick={() => this.routeChange(addr)}> View Agreement</button>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="App">
        <ESNavbar
          factory={true}
          currentAccount={this.state.currentAccount} />
        <div className="container">
          <h1> Your EtherSplit Agreements </h1>
          <div className="row">
            <div className="input-field col s6">
              <button className="btn waves-effect waves-light" onClick={this.createNewAgreement}>Create New Agreement</button>
            </div>
          </div>
          {MyAgreements}
          {MyInvites.length > 0 ?
            <div>
              <br />
              <h3> Your Agreement Invites </h3>
              <br />
              {MyInvites}
            </div> : null
          }
        </div>
      </div>
    )
  }
}

export default Factory;
