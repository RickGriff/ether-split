import React from 'react'

function ESNavbar(props) {

  const {userName, balance, sign, accountRegistered, singleAgreement, currentAccount, factory } = props

  return (
    <div className="navbar">
      <nav>
        <div className="nav-wrapper teal lighten-1">
          <a href="/" className="brand-logo right">EtherSplit</a>

          {/*render different navbars according to the page - factory, or singleAgreement */}
          {singleAgreement && accountRegistered()  ?
            <ul id="nav-mobile" className="left hide-on-med-and-down">
              <li><a>User: {userName}</a></li>
              <li><a>Balance: {sign} £{balance}</a></li>
              <li><a href ='/'>Back to My Agreements</a></li>
            </ul>  : null
          }

          {factory ?
            <ul id="nav-mobile" className="left hide-on-med-and-down">
              <li><a>Your address: {currentAccount}</a></li>
            </ul>  : null
          }

        </div>
      </nav>
    </div>
  )
}

export default ESNavbar;
