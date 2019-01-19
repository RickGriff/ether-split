import React from 'react'
import {Collapsible, CollapsibleItem, Badge} from 'react-materialize'
import Moment from 'react-moment';

Moment.globalFormat = 'D MMM YYYY';

function PendingTxs(props) {
  const {showMine, current_user, user_1, user_2, user1_pending_txs, user2_pending_txs, confirmSingleTx, getName, txTraits } = props

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
      <li>
        <div className = "collapsible-header truncate">
          <i class="material-icons">
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
          { showMine ?
            <div className="input-field col s3">
              <button className="btn waves-effect waves-light" onClick={() => {confirmSingleTx(tx.list_id)}}>Confirm</button>
              </div> : null
          }
          <br/>
          <br/>
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


// user balance:

//<span className={txTraits().color}>{txTraits().sign}£{tx.amount}</span>

//React Materialize Collapsible Item:

// <CollapsibleItem
//   header = {
//     <ul className = "collapse-header-list">
//       <li>{tx.description}</li>
//       <li>{tx.amount}</li>
//     </ul>
//   }
//   key= {tx.list_id}
//   icon={current_user === tx.debtor ? 'remove' : 'add'}
// >
// <div>#{tx.list_id} </div>
// <div> { getName(tx.debtor) } owes £{ tx.amount } </div>
// <div> For: { tx.description } </div>
// <div> Debt added by { getName(tx.creator) } </div>
// <div> Date created: <Moment unix>{tx.timestamp}</Moment> </div>
// <div> Contract Transaction ID: { tx.id } </div>
// { showMine ?
//   <div className="input-field col s3">
//     <button className="btn waves-effect waves-light" onClick={() => {confirmSingleTx(tx.list_id)}}>Confirm</button>
//     </div> : null
// }
// <br/>
// <br/>
// </CollapsibleItem>



// Collapsible Basic HTML - doesn't pop without JS

// <li>
//   <div className = "collapsible-header">
//     <i class="material-icons">
//       {current_user === tx.debtor ? 'remove' : 'add'}
//     </i>
//     {tx.description}
//     <span className="badge">{tx.amount}</span>
//   </div>
//   <div className = "collapsible-body">
//     <div>#{tx.list_id} </div>
//     <div> { getName(tx.debtor) } owes £{ tx.amount } </div>
//     <div> For: { tx.description } </div>
//     <div> Debt added by { getName(tx.creator) } </div>
//     <div> Date created: <Moment unix>{tx.timestamp}</Moment> </div>
//     <div> Contract Transaction ID: { tx.id } </div>
//     { showMine ?
//       <div className="input-field col s3">
//         <button className="btn waves-effect waves-light" onClick={() => {confirmSingleTx(tx.list_id)}}>Confirm</button>
//         </div> : null
//     }
//     <br/>
//     <br/>
//   </div>
// </li>
