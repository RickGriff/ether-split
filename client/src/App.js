import React, { Component } from "react";
import Agreement from "./contracts/Agreement.json";
import getWeb3 from "./utils/getWeb3";
import truffleContract from "truffle-contract";

import "./App.css";

class App extends Component {
  state = { storageValue: 0, web3: null, accounts: null, contract: null, user_1: null, user_2: null };

  componentDidMount = async () => {
    try {
      // Get network provider and web3 instance.
      const web3 = await getWeb3();

      // Use web3 to get the user's accounts.
      const accounts = await web3.eth.getAccounts();

      // Get the contract instance.
      const Contract = truffleContract(Agreement);
      Contract.setProvider(web3.currentProvider);
      const instance = await Contract.deployed();

      // Set web3, accounts, and contract to the state, and then proceed with an
      // example of interacting with the contract's methods.
      this.setState({ web3, accounts, contract: instance }, this.getUser1);
    } catch (error) {
      // Catch any errors for any of the above operations.
      alert(
        `Failed to load web3, accounts, or contract. Check console for details.`
      );
      console.log(error);
    }
  };

  getUser1 =  async () => {
    const { accounts, contract } = this.state;
    const user_1 = await contract.user_1({ from: accounts[0] });
    this.setState({user_1: user_1})
  }

  getUser2 =  async () => {
    const { accounts, contract } = this.state;
    const user_2 = await contract.user_2({ from: accounts[0] });
    this.setState({user_2: user_2})
  }


  runExample = async () => {
    const { accounts, contract } = this.state;

    // Stores a given value, 5 by default.
    await contract.set(5, { from: accounts[0] });

    // Get the value from the contract to prove it worked.
    const response = await contract.get();

    // Update state with the result.
    this.setState({ storageValue: response.toNumber() });
  };

  render() {
    if (!this.state.web3) {
      return <div>Loading Web3, accounts, and contract...</div>;
    }
    return (
      <div className="App">
        <h1>EtherSplit Agreement</h1>
        <p>
          Welcome to EtherSplit!
        </p>
        <div>User_1's address: {this.state.user_1}</div>
        <div>User_2's address: {this.state.user_2}</div>
      </div>
    );
  }
}

export default App;
