import React, { Component } from 'react';
import Agreement from '../contracts/Agreement.json';
import getWeb3 from '../utils/getWeb3';
import truffleContract from 'truffle-contract';
import ESNavbar from './ESNavbar.js';
import EnterName from './EnterName.js';
import InviteFriend from './InviteFriend.js';
import RegisterUser2 from './RegisterUser2.js';
import AgreementBody from './AgreementBody.js';
import { getBalance, getBalanceTraits, absBalance, showWaitingToast, removeWaitingToast, makeTwoAttempts } from '../helpers.js';

class SingleAgreement extends Component {

  state = {
    web3: "unset",
    accounts: null,
    contract: null,
    user_1: null,
    user_2: null,
    user_1_name: null,
    user_2_name: null,
    current_user: null,
    invited_friend: null,
    user1_pending_txs: [],
    user2_pending_txs: [],
    confirmed_txs: [],
    test_state: null,
    setName_clicks: 0,
    inviteFriend_clicks: 0,
    balance_traits: null,
    dataLoaded: null
  };

  componentDidMount = async () => {
    const dataLoaded = await makeTwoAttempts(this.getInitialUserAndContractData)
    this.setState({dataLoaded})
  }

  getInitialUserAndContractData = async () => {
    const agreementAddress = this.props.match.params.address;  // address is passed from Factory.js state --> Router --> SingleAgreement
    const web3 = await getWeb3();  // Get network provider and web3 instance
    this.setState({ web3 });

    if (web3 === null || web3 === undefined) throw ("Unable to obtain web3 instance.")
    if (web3 === false) return null // if user has no web3 provider, do not attempt further calls to the blockchain 

    const accounts = await web3.eth.getAccounts();
    const Contract = truffleContract(Agreement);   // Get the contract representation, from the JSON artifact

    Contract.setProvider(web3.currentProvider);
    const agreement = await Contract.at(agreementAddress); // Get the deployed contract instance.

    //Get the users and balance
    const current_user = accounts[0]
    const user_1 = await agreement.user_1({ from: accounts[0] });
    const user_2 = await agreement.user_2({ from: accounts[0] });
    const user_1_name = await agreement.user_1_name({ from: accounts[0] });
    const user_2_name = await agreement.user_2_name({ from: accounts[0] });
    const invited_friend = await agreement.invited_friend({ from: accounts[0] });
    const balance = await getBalance(agreement);

    const balanceTraits = getBalanceTraits(current_user, balance, user_1, user_2);

    //Get pending and confirmed transactions
    const all_pending_txs = await this.getAllPendingTxs(agreement, accounts[0])
    const user1_pending_txs = all_pending_txs[0]
    const user2_pending_txs = all_pending_txs[1]
    const confirmed_txs = await this.getConfirmedTxs(agreement, accounts[0]);

    // Set web3, accounts contract, users and transactions to the state.
    this.setState({ web3, accounts, current_user, user_1, user_2, user_1_name, user_2_name, invited_friend, user1_pending_txs, user2_pending_txs, confirmed_txs, balance, balanceTraits, contract: agreement }, this.logState);
  }

  inviteFriend = async (e) => {
    e.preventDefault();
    const friend = e.target.address.value
    const { accounts, contract, inviteFriend_clicks } = this.state;
    let clicks = inviteFriend_clicks;

    if (clicks === 0) {
      clicks += 1;
      window.Materialize.toast(
        "Please check your friend's address is correct! Mistakes can not be reversed. Please click 'Invite' again to set it.", 7000)
      this.setState({ inviteFriend_clicks: clicks }, this.logState);
    } else if (clicks > 0) {
      clicks += 1;
      showWaitingToast();
      await contract.inviteFriend(friend, { from: accounts[0] });
      const invited_friend = await contract.invited_friend({ from: accounts[0] });
      removeWaitingToast();
      this.setState({ invited_friend, inviteFriend_clicks: clicks })
    }
  }

  registerUser2 = async () => {
    const { accounts, contract } = this.state;

    showWaitingToast();
    await contract.registerUser2({ from: accounts[0] });
    const user_2 = await contract.user_2({ from: accounts[0] })
    removeWaitingToast();

    this.setState({ user_2 })
    window.Materialize.toast('You have entered a new EtherSplit contract!', 8000)
  }

  confirmAll = async () => {
    const { accounts, contract, current_user, user_1, user_2 } = this.state;

    showWaitingToast();
    await contract.confirmAll({ from: accounts[0] });
    // update pending TX list and confirmed Tx list
    const updatedPending = await this.getAllPendingTxs(contract)
    const updatedConfirmed = await this.getConfirmedTxs(contract);
    const updatedBalance = await getBalance(contract);
    const updatedBalTraits = getBalanceTraits(current_user, updatedBalance, user_1, user_2);
    removeWaitingToast();

    this.setState({ user1_pending_txs: updatedPending[0], user2_pending_txs: updatedPending[1], confirmed_txs: updatedConfirmed, balance: updatedBalance, balanceTraits: updatedBalTraits })
    window.Materialize.toast('All pending transactions confirmed.', 5000)
  }

  confirmSingleTx = async (tx_id) => {
    const { accounts, contract, current_user, user_1, user_2 } = this.state;

    showWaitingToast();
    await contract.confirmSingleTx(tx_id, { from: accounts[0] });
    // update pending Tx list and confirmed Tx list
    const updatedPending = await this.getAllPendingTxs(contract);
    const updatedConfirmed = await this.getConfirmedTxs(contract);
    const updatedBalance = await getBalance(contract);
    const updatedBalTraits = getBalanceTraits(current_user, updatedBalance, user_1, user_2);
    removeWaitingToast();

    this.setState({ user1_pending_txs: updatedPending[0], user2_pending_txs: updatedPending[1], confirmed_txs: updatedConfirmed, balance: updatedBalance, balanceTraits: updatedBalTraits })
    window.Materialize.toast('Transaction confirmed.', 5000)
  }

  deletePendingTx = async (tx_id) => {
    const { accounts, contract } = this.state;

    showWaitingToast();
    await contract.userDeletePendingTx(tx_id, { from: accounts[0] });
    const updatedPending = await this.getAllPendingTxs(contract)
    removeWaitingToast();

    this.setState({ user1_pending_txs: updatedPending[0], user2_pending_txs: updatedPending[1] })
    window.Materialize.toast('Transaction confirmed.', 5000)
  }

  getAllPendingTxs = async (contract, fromAddress) => {
    let length1;
    let length2;
    const txList1 = [];
    const txList2 = [];
    const txLists = [];
    //loop through and get all user_1's pending tx
    length1 = (await contract.getPendingTxsLength1({ from: fromAddress })).toNumber();
    for (let i = 0; i < length1; i++) {
      const id = await contract.pendingTxsList1(i, { from: fromAddress })
      const tx = await contract.pendingTxs1(id, { from: fromAddress })
      txList1.push(this.cleanTx(tx))
    }
    // get all user_2's pending tx
    length2 = (await contract.getPendingTxsLength2({ from: fromAddress })).toNumber();
    for (let j = 0; j < length2; j++) {
      const id = await contract.pendingTxsList2(j, { from: fromAddress })
      const tx = await contract.pendingTxs2(id, { from: fromAddress })
      txList2.push(this.cleanTx(tx))
    }
    txLists.push(txList1)
    txLists.push(txList2)
    return txLists
  }

  getConfirmedTxs = async (contract, fromAddress) => {
    const length = (await contract.getConfirmedTxsLength({ from: fromAddress })).toNumber();
    const txList = [];

    for (var i = 0; i < length; i++) {  // make separate contract calls to grab each confirmedTx
      const id = await contract.confirmedTxsList(i, { from: fromAddress })
      const tx = await contract.confirmedTxs(id, { from: fromAddress })
      txList.push(this.cleanTx(tx))
    }
    return txList;
  }

  createPending = async (e) => {
    e.preventDefault();

    const description = e.target.description.value;
    const debtorAndSplit = e.target.debtorAndSplit.value;
    // grab debtor and split from the single string sent by form 
    let split;
    const debtor = debtorAndSplit.split(" ")[0]
    const isSplitTx = debtorAndSplit.split(" ")[1]
    split = (isSplitTx === "splitTx" ? true : false)

    const amount = e.target.amount.value;
    if (!this.validateAmount(amount)) return null; // proceed if amount is valid 

    const amountPennies = Number(amount) * 100;

    if (!(amountPennies && description)) {
      window.Materialize.toast('Please enter an amount and description!', 5000)
      return null
    }

    showWaitingToast();
    await this.tryCallCreatePending(amountPennies, split, debtor, description)
    await this.updatePendingTxsState()
    removeWaitingToast();

    window.Materialize.toast('Pending Transaction created.', 4000)
  }

  tryCallCreatePending = async (amountPennies, split, debtor, description) => {
    const { accounts, contract } = this.state;
    try {
      await contract.createPending(amountPennies, split, debtor, description, { from: accounts[0] })
    }
    catch (error) { // return the error message
      window.Materialize.toast(this.trimError(error), 8000)
      return null
    }
  }

  updatePendingTxsState = async () => {
    const { contract } = this.state
    const updatedPending = await this.getAllPendingTxs(contract)
    await this.setState({ user1_pending_txs: updatedPending[0], user2_pending_txs: updatedPending[1] });
  }

  validateAmount = (num) => {
    // check num is a positive monetary number, up to 2 decimal places
    if (!(/^\d+(\.\d{1,2})?$/.test(num))) {
      window.Materialize.toast('Please enter a valid, positive amount', 5000)
      return false
    }
    return true
  }

  trimError = (error) => {
    if (error.message.includes('Invalid "from" address')) {
      return 'Invalid "From" address. You may only create transactions from an address registered on this agreement.'
    } else {
      return error.message
    }
  }

  setName = async (e) => {
    const { current_user, user_1, user_2, contract, accounts, setName_clicks } = this.state;
    let clicks = setName_clicks;
    e.preventDefault();

    if (clicks === 0) {
      clicks += 1;
      window.Materialize.toast(
        'Please check your name for this agreement is correct! It will be permanently recorded on the blockchain. Please click Submit again to set it.', 7000)
      this.setState({ setName_clicks: clicks }, this.logState);
    } else if (clicks > 0) {
      clicks += 1;
      const name = e.target.name.value;
      showWaitingToast()
      await contract.setName(name, { from: accounts[0] });

      let recordedName;
      if (current_user === user_1) {
        recordedName = await contract.user_1_name();
        removeWaitingToast()
        this.setState({ user_1_name: recordedName, setName_clicks: clicks }, this.logState);
      } else if (current_user === user_2) {
        recordedName = await contract.user_2_name();
        removeWaitingToast()
        this.setState({ user_2_name: recordedName, setName_clicks: clicks }, this.logState);
      }
    }
  }

  /*****  Helper Functions  *****/
  logState = () => {
    console.log("The React state is:")
    console.log(this.state)
  }

  // return the sign and color for a tx, based on whether current_user is the debtor
  txTraits = (tx) => {
    let sign = "";
    let color = "";
    if (this.state.current_user === tx.debtor) {
      sign = "- "
      color = "red-text text-accent-4"
    }
    return { color, sign }
  }

  // return a clean representation of a transaction, for use in React state
  cleanTx = (tx) => {
    const { amount, split, creator, confirmer, debtor, description, id, timestamp, index } = tx;
    const amountPounds = (Number(amount) / 100.0).toFixed(2)

    const clean_tx = {
      amount: amountPounds,   // convert pennies to pounds
      split: split.toString(),
      creator: creator,
      confirmer: confirmer,
      debtor: debtor,
      description: description,
      id: id.toNumber(),
      timestamp: timestamp.toNumber(),
      contract_index: index.toNumber()
    }
    return clean_tx
  }

  getName = (address) => {
    const { user_1, user_2 } = this.state;
    let name;
    if (address === user_1) {
      name = (this.state.user_1_name || null)
    } else if (address === user_2) {
      name = (this.state.user_2_name || null)
    }
    return name
  }

  //return the current user's pending transactions
  userPendingTxs = () => {
    const { current_user, user_1, user_2, user1_pending_txs, user2_pending_txs } = this.state;

    if (current_user === user_1) {
      return user1_pending_txs;
    } else if (current_user === user_2) {
      return user2_pending_txs;
    }
  }

  accountRegistered = () => {
    const { current_user, user_1, user_2 } = this.state;
    return current_user === user_1 || current_user === user_2;
  }

  isEmptyAddress = (address) => {
    return address === "0x0000000000000000000000000000000000000000";
  }

  isUser1 = () => {
    return this.state.current_user === this.state.user_1
  }

  getOtherUser = () => {
    const { current_user, user_1, user_2 } = this.state;
    return current_user === user_1 ? user_2 : user_1

  }
  getOtherUsersName = () => {
    const otherUser = this.getOtherUser()
    return this.getName(otherUser)
  }

  hasNoInvitedFriend = () => {
    return this.isEmptyAddress(this.state.invited_friend)
  }

  hasInvitedFriend = () => {
    return !this.isEmptyAddress(this.state.invited_friend)
  }

  hasTwoUsers = () => {
    return !this.isEmptyAddress(this.state.user_1) && !this.isEmptyAddress(this.state.user_2)
  }

  isInvitedFriend = () => {
    return this.state.current_user === this.state.invited_friend
  }

  render() {
    if (this.state.dataLoaded === false || this.state.web3 === null || this.state.web3 === undefined) {
      return <div className="container">
        <h4>Failed to connect to the Blockchain. Please refresh the app.</h4>
      </div>
    } else if (this.state.web3 === "unset") {
      return <div className="container">
        <div className="progress">
          <div className="indeterminate">
          </div>
        </div>
        <h4>Loading your agreement...</h4>
      </div>
    }  else if (this.state.web3 === false) {
      return <div className="container">
        <h4>Non-dApp Browser detected. Please install or re-load your Ethereum wallet (e.g. MetaMask)</h4>
      </div>
    }

    if (!this.state.current_user) {
      return <div className="container">
        <div className="progress">
          <div className="indeterminate">
          </div>
        </div>
        <h4>Loading your Agreement...</h4>
        <br/>
        <h5><em>(Make sure you're signed in to MetaMask!)</em></h5>
      </div>
    }

    if (!this.accountRegistered() && !this.isInvitedFriend()) {
      return <div className="container">
        <h4>Sorry, your Ethereum account address has not been registered on or invited to this agreement yet.</h4>
        <br />
        <h5><a href='/'>Back to My Agreements</a></h5>
      </div>
    }

    return (
      <div className="Agreement">
        <ESNavbar userName={this.getName(this.state.current_user)}
          sign={this.state.balanceTraits.sign}
          accountRegistered={this.accountRegistered}
          balance={absBalance(this.state.balance)}
          singleAgreement={true}
          currentAccount={this.current_user} />

        <div className="container">
          <div className="card-panel">
            <h1>EtherSplit Agreement</h1>
            {/*Enter Name form - display if account registered, but no name submitted yet*/}
            {this.accountRegistered() && !this.getName(this.state.current_user) ?
              <EnterName setName={this.setName} /> : null
            }
            <br />
            <div className="row left-align truncate">
              <div className="col s10">
                <div className="card-panel truncate">
                  {this.accountRegistered() && this.getName(this.state.current_user) ?
                    <h5>Welcome to EtherSplit, {this.getName(this.state.current_user)}!</h5>
                    : <p>Welcome to EtherSplit!</p>
                  }
                  <div>Contract address: {this.state.contract.address}</div>
                  <div>Your address: {this.state.current_user}</div>

                  {this.hasTwoUsers() ?
                    <div>
                      <div>Other user: {this.getOtherUsersName()}</div>
                      <div>{this.getOtherUsersName()}'s address: {this.getOtherUser()}</div>
                    </div>
                    : null
                  }

                  {this.hasInvitedFriend() && !this.hasTwoUsers() ?
                    <div>Invited friend's address: {this.state.invited_friend}</div> : null
                  }
                </div>
              </div>
            </div>
            <br />
            {/* Invite Friend form, visible to user_1 when no friend invited yet */}
            {this.isUser1() && this.hasNoInvitedFriend() ?
              <InviteFriend inviteFriend={this.inviteFriend} /> : null
            }
            {/* Register User2 button, visible to the invited friend */}
            {this.isInvitedFriend() && this.isEmptyAddress(this.state.user_2) ?
              <RegisterUser2
                registerUser2={this.registerUser2}
                getName={this.getName}
                user_1={this.state.user_1}
              /> : null
            }
            <div>
              <div className={this.isUser1() && this.hasInvitedFriend() && !this.hasTwoUsers() ? null : "hidden"}>
                <h3> Awaiting registration from the invited address. </h3>
              </div>
              {/* Render SingleAgreementBody if account is registered for this agreement */}
              {this.accountRegistered() ?
                <AgreementBody
                  accountRegistered={this.accountRegistered}
                  hasTwoUsers={this.hasTwoUsers}
                  createPending={this.createPending}
                  getName={this.getName}
                  balance={this.state.balance}
                  balanceTraits={this.state.balanceTraits}
                  txTraits={this.txTraits}
                  absBalance={absBalance}
                  userPendingTxs={this.userPendingTxs}
                  confirmSingleTx={this.confirmSingleTx}
                  deletePendingTx={this.deletePendingTx}
                  confirmAll={this.confirmAll}
                  current_user={this.state.current_user}
                  user_1={this.state.user_1}
                  user_2={this.state.user_2}
                  user_1_name={this.state.user_1_name}
                  user_2_name={this.state.user_2_name}
                  user1_pending_txs={this.state.user1_pending_txs}
                  user2_pending_txs={this.state.user2_pending_txs}
                  confirmed_txs={this.state.confirmed_txs}
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
