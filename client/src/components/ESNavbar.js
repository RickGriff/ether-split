import React, { Component } from 'react'
import ReactDOM from 'react-dom'

function ESNavbar(props) {

  const {userName, balance } = props

  return (
    <div class="navbar">
      <nav>
        <div class="nav-wrapper light-blue lighten-3">
          <a href="#" class="brand-logo right">EtherSplit</a>
          <ul id="nav-mobile" class="left hide-on-med-and-down">
            <li><a>User: {userName}</a></li>
            <li><a>Balance: {balance}</a></li>
          </ul>
        </div>
      </nav>
    </div>
  )
}

export default ESNavbar;
