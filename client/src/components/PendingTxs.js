import React, { Component } from 'react'
import ReactDOM from 'react-dom'
import {Collapsible, CollapsibleItem} from 'react-materialize'
import Moment from 'react-moment';

Moment.globalFormat = 'D MMM YYYY';

function PendingTxs(props) {
  const {showMine, current_user, user_1, user_2, user1_pending_txs, user2_pending_txs, confirmSingleTx, getName } = props

  let pending_txs; // txs to be rendered

  // Grab the correct pending txs. Set according to the current_user
  // & whether to shows theirs or other user's.
  if (current_user === user_1  && showMine === true) {
    pending_txs = user1_pending_txs
  } else if (current_user === user_2 && showMine === true) {
    pending_txs = user2_pending_txs
  } else if (current_user === user_1 && showMine === false) {
    pending_txs = user2_pending_txs
  } else if (current_user === user_2 && showMine === false) {
      pending_txs = user1_pending_txs
  } else {
    pending_txs = [];
  }

  const PendingTxs = pending_txs.map(tx => {
    return (
      <CollapsibleItem header= {`${tx.description}`} key= {tx.list_id}>
      <div>#{tx.list_id} </div>
      <div> { getName(tx.debtor) } owes { tx.amount } </div>
      <div> For: { tx.description } </div>
      <div> Debt added by { getName(tx.creator) } </div>
      <div> Date created: <Moment unix>{tx.timestamp}</Moment> </div>
      <div> Contract Transaction ID: { tx.id } </div>
      { showMine ?
        <div className="input-field col s3">
          <button className="btn waves-effect waves-light" onClick={() => {props.confirmSingleTx(tx.list_id)}}>Confirm</button>
          </div> : ""
      }
      <br/>
      <br/>
      </CollapsibleItem>
    )
  });


  return (
    <div className = "row">
    <Collapsible popout>
    {  PendingTxs }
    </Collapsible>
    </div>
  )
}

export default PendingTxs;
