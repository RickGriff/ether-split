import React from 'react'

function ESNavbar(props) {

  const {userName, balance, sign, accountRegistered, singleAgreement, currentAccount, factory } = props

  return (
    <div className="navbar">
      <nav>
        <div className="nav-wrapper teal lighten-1">
          <a href="/" className="brand-logo right">EtherSplit</a>

          {/*render different navbars according based on the page & whether account is registered */}
          <ul id="nav-mobile" className="left hide-on-med-and-down">
          {singleAgreement && accountRegistered()  ?
            <div>
              <li><a>User: {userName}</a></li>
              <li><a>Balance: {sign} £{balance}</a></li>
              <li><a href ='/'>Back to My Agreements</a></li>
            </div> : null
          }

          {singleAgreement ?
          <li><a href ='/'>Back to My Agreements</a></li> : null
          }

          {factory ?
            <li><a>Your address: {currentAccount}</a></li>  : null
          }
          </ul>
        </div>
      </nav>
    </div>
  )
}

export default ESNavbar;
