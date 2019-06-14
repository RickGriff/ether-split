import React from 'react'
import { Collapsible } from 'react-materialize'
import Moment from 'react-moment';

function ConfirmedTxs(props) {
  const {confirmed_txs, getName, current_user, txTraits} = props
  // map Confirmed Txs to JSX elements for rendering

  const orderedTxs = confirmed_txs.sort((a, b) => (b.timestamp - a.timestamp))

  const ConfirmedTxs = orderedTxs.map(tx => {
    return (
      <li key ={tx.id}>
        <div className = "collapsible-header">
          <i className="material-icons">
            {current_user === tx.debtor ? 'remove' : 'add'}
          </i>
          {tx.description}
          <span className="badge">
            <span className={txTraits(tx).color}>{txTraits(tx).sign}£{tx.amount}</span>
          </span>
        </div>
        <div className = "collapsible-body">
          <div>#{tx.id} </div>
          <div> { getName(tx.debtor) } owes £{ tx.amount } </div>
          <div> For: { tx.description } </div>
          <div> Debt added by { getName(tx.creator) } </div>
          <div> Confirmed by { getName(tx.confirmer) } </div>
          <div> Date created: <Moment unix>{tx.timestamp}</Moment> </div>
          <div> Contract Transaction ID: { tx.id } </div>
          <br/>
        </div>
      </li>
    )
  });

  return(
    <div className = "row">
    <h4>Confirmed Transactions</h4>
    <br/>
    <Collapsible popout>
    { ConfirmedTxs }
    </Collapsible>
    </div>
  )
}

export default ConfirmedTxs;
