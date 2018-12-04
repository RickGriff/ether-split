import React, { Component } from 'react'
import ReactDOM from 'react-dom'
import {Collapsible, CollapsibleItem} from 'react-materialize'
import Moment from 'react-moment';

function ConfirmedTxs(props) {
  const {confirmed_txs, getName, getDate } = props
  // map Confirmed Txs to JSX elements for rendering
  const confirmedTxs = confirmed_txs.map(tx => {
    return (
      <CollapsibleItem header= {`${tx.description}`} key={tx.list_id}>
      <div>#{tx.list_id} </div>
      <div> { getName(tx.debtor) } owes { tx.amount } </div>
      <div> For: { tx.description } </div>
      <div> Debt added by { getName(tx.creator) } </div>
      <div> Confirmed by { getName(tx.confirmer) } </div>
      <div> Contract Transaction ID: { tx.id } </div>
      <div> Date created: <Moment unix>{tx.timestamp}</Moment> </div>
      </CollapsibleItem>
    )
  });

  return(
    <div className = "row">
    <h4>Confirmed Transactions</h4>
    <br/>
    <Collapsible popout>
    { confirmedTxs }
    </Collapsible>
    </div>
  )
}

export default ConfirmedTxs;
