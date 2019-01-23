import React, { Component } from "react";
import { BrowserRouter, Route, Switch } from 'react-router-dom';
import Factory from "./components/Factory.js"
import SingleAgreement from "./components/SingleAgreement.js"

import "./App.css";

class App extends Component {
  render() {
    return (
    <BrowserRouter>
      <div className ="App" >
        <Switch >
        <Route exact path ='/' component={Factory} />
        <Route
          path ='/agreements/:address'
          component = {SingleAgreement}
        />
        </Switch>
      </div>
    </BrowserRouter>
    )
  }
}

export default App;
