import React from 'react'

function ESNavbar(props) {

  const {userName, balance, sign, accountRegistered } = props

  return (
    <div className="navbar">
      <nav>
        <div className="nav-wrapper teal lighten-1">
          <a href="#" className="brand-logo right">EtherSplit</a>

          {accountRegistered() ?
            <ul id="nav-mobile" className="left hide-on-med-and-down">
              <li><a>User: {userName}</a></li>
              <li><a>Balance: {sign} £{balance}</a></li>
            </ul> : null
          }
        </div>
      </nav>
    </div>
  )
}

export default ESNavbar;
