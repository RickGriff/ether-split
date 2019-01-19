import React, { Component } from 'react';
import { Input } from 'react-materialize';

class CreatePending extends Component {

  state = {
    desc_content: '',
    amount_content: ''
  };

  handleSubmit = async (e) => {
    e.preventDefault();
    await this.props.createPending(e);
    this.setState({
      desc_content: '',
      amount_content: '',
    }, this.logState);
  }

  handleAmountChange = (e) =>{
    this.setState({
      amount_content: e.target.value
    })
  }

  handleDescChange = (e) =>{
    this.setState({
      desc_content: e.target.value
    })
  }

  render (){
    return (
      <form onSubmit={this.handleSubmit}>
        <div className="row">
          <button className="btn waves-effect waves-light" type="submit">Create Pending TX</button>
          <div className="col s4">
            <label htmlFor="amount">
              <Input type='number' placeholder='Amount (£)' name='amount' value={this.state.amount_content} onChange={this.handleAmountChange} />
            </label>
          </div>
        </div>
        <div className="row">
          <div className="col s6">
            <label htmlFor="debtor">
              <Input type='select' name='debtor' label='Who owes who?' defaultValue='1'>
                <option value={this.props.user_1}>{this.props.userName1} owes {this.props.userName2} </option>
                <option value={this.props.user_2}>{this.props.userName2} owes {this.props.userName1}</option>
              </Input>
            </label>
          </div>
          <div className ="col s2">
            <label htmlFor='split'>
              <input type='checkbox' name='split' />
              <span>Split transaction?</span>
            </label>
          </div>
        </div>
        <div className="row">
          <div className="col s12">
            <label htmlFor="description"></label>
            <Input type='text' placeholder='Transaction description' name='description' value={this.state.desc_content} onChange={this.handleDescChange} />
          </div>
        </div>
      </form>
    )
  }
}

export default CreatePending;
