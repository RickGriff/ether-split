import React, { Component } from "react";
import ConfirmedTxs from './ConfirmedTxs.js'
import PendingTxs from './PendingTxs.js'
import CreatePending from './CreatePending.js'
import { Collapsible, CollapsibleItem } from 'react-materialize';

class AgreementBody extends Component {

  render () {

  const {
    hasTwoUsers,
    createPending,
    getName,
    balance,
    balanceTraits,
    txTraits,
    current_user,
    user_1,
    user_2,
    absBalance,
    userPendingTxs,
    user1_pending_txs,
    user2_pending_txs,
    confirmSingleTx,
    deletePendingTx,
    confirmAll,
    confirmed_txs,
    show_blockchain_preloader,
    } = this.props

    return (
      <div className={hasTwoUsers() ? null : "hidden"}>
        <div className ="row">
          <div className=" col s7">
            <Collapsible popout>
              <CollapsibleItem header= 'Create New Transaction' className='create-pending truncate'>
                <CreatePending createPending={createPending}
                  user_1={user_1}
                  user_2={user_2}
                  userName1={getName(user_1)}
                  userName2={getName(user_2)}
                />
              </CollapsibleItem>
            </Collapsible>
          </div>
          <div className=" col s5">
            <h3 className ="hide-on-small-only">Balance: <span className={balanceTraits.color}>{balanceTraits.sign}£{absBalance(balance)}</span></h3>
          </div>
        </div>
        {/*List current user's Pending Txs*/}
        <div className="row">
          <div className=" col s6">
            <h4>My Pending Transactions</h4>
            { userPendingTxs().length > 0 ?
              <div className="input-field">
                <button className="btn waves-effect waves-light" onClick={confirmAll}>Confirm All</button>
              </div> : null
            }
            <br/>
            <PendingTxs
              showMine={true}
              current_user = {current_user}
              user_1={user_1} user_2={user_2}
              user1_pending_txs={user1_pending_txs}
              user2_pending_txs={user2_pending_txs}
              confirmSingleTx={confirmSingleTx}
              getName = {getName}
              txTraits = {txTraits}
            />
            </div>
            <div className="col s6">
              <h4>Their Pending Transactions</h4>
              <br/>
              <br/>
              <br/>
              <PendingTxs
                showMine={false}
                current_user = {current_user}
                user_1={user_1} user_2={user_2}
                user1_pending_txs={user1_pending_txs}
                user2_pending_txs={user2_pending_txs}
                confirmSingleTx={confirmSingleTx}
                deletePendingTx={deletePendingTx}
                getName = {getName}
                txTraits = {txTraits}
              />
              </div>
            </div>
            <br/>
            <br/>
            {/* List Confirmed Txs */}
            <div className="row">
              <ConfirmedTxs confirmed_txs={confirmed_txs}
                getName={getName}
                current_user = {current_user}
                txTraits = {txTraits}/>
              </div>
            </div>

          )
        }
      }

      export default AgreementBody;
