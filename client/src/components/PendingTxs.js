import React from 'react'
import {Collapsible } from 'react-materialize'
import Moment from 'react-moment';

Moment.globalFormat = 'D MMM YYYY';

function PendingTxs(props) {
  const {
    showMine, 
    current_user, 
    user_1, user_2, 
    user1_pending_txs, 
    user2_pending_txs, 
    confirmSingleTx, 
    deletePendingTx,
    getName, 
    txTraits 
  } = props

  let pending_txs; // txs to be rendered

  // Grab the correct pending txs. Set according to the current_user,
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

  const orderedTxs = pending_txs.sort((a, b) => (b.timestamp - a.timestamp))

  const PendingTxs = orderedTxs.map(tx => {
    return (
      <li key ={tx.id}>
        <div className = "collapsible-header truncate">
          <i className="material-icons">
            {current_user === tx.debtor ? 'remove' : 'add'}
          </i>
          {tx.description}
          <span className="badge">
            <span className={txTraits(tx).color}>{txTraits(tx).sign}£{tx.amount}</span>
          </span>
        </div>
        <div className = "collapsible-body">
          <div>#{tx.list_id} </div>
          <div> { getName(tx.debtor) } owes £{ tx.amount } </div>
          <div> For: { tx.description } </div>
          <div> Debt added by { getName(tx.creator) } </div>
          <div> Date created: <Moment unix>{tx.timestamp}</Moment> </div>
          <div> Contract Transaction ID: { tx.id } </div>
          <div className="row">
            { showMine ?
              <div className="input-field col s3">
                <button className="btn waves-effect waves-light" onClick={() => {confirmSingleTx(tx.id)}}>Confirm</button>
              </div> : 
              <div className="input-field col s3">
                <button className="btn waves-effect waves-light red lighten-2" onClick={() => {deletePendingTx(tx.id)}}>Delete</button>
              </div>
            }
          </div>
        </div>
      </li>

    )
  });

  return (
    <div className = "row">
      <Collapsible popout>
        { PendingTxs }
      </Collapsible>
    </div>
  )
}

export default PendingTxs;
