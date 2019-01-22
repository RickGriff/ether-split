import React from 'react'

function ESNavbar(props) {

  const {userName, balance, sign, accountRegistered, singleAgreement, currentAccount, factory } = props

  let navButtons;

  if (singleAgreement && accountRegistered()) {
    navButtons =
    <div>
      <li><a>User: {userName}</a></li>
      <li><a>Balance: {sign} £{balance}</a></li>
      <li><a href ='/'>Back to My Agreements</a></li>
    </div>

  } else if (singleAgreement && !accountRegistered()) {
    navButtons = <li><a href ='/'>Back to My Agreements</a></li>

  } else if (factory) {
    navButtons = <li><a>Your address: {currentAccount}</a></li>
  }


  return (
    <div className="navbar">
      <nav>
        <div className="nav-wrapper teal lighten-1">
          <a href="/" className="brand-logo right">EtherSplit</a>

          {/*render different navbars according based on the page & whether account is registered */}
          <ul id="nav-mobile" className="left hide-on-med-and-down">
          {navButtons}
          </ul>
        </div>
      </nav>
    </div>
  )
}

export default ESNavbar;
