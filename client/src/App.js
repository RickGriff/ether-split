import React, { Component } from "react";
import { BrowserRouter, Route, Switch } from 'react-router-dom';
import Factory from "./components/Factory.js"
import SingleAgreement from "./components/SingleAgreement.js"

import "./App.css";

class App extends Component {
  constructor() {
    super();
    this.M = window.M; /*"window.M" will make sure that you have access to the M included in the earlier materialize cdn script tag, so that you don't get errors like "M is undefined" */
  }

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
