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
          <div className="col s12">
            <label htmlFor="debtor">
              <Input s={10} type='select' name='debtorAndSplit' label='Who owes who?' defaultValue='1'>
                <option id="1" value={this.props.user_1}>{this.props.userName2} paid, {this.props.userName1} owes full amount</option>
                <option id="2" value={this.props.user_2}>{this.props.userName1} paid, {this.props.userName2} owes full amount</option>
                 {/* Options 3 & 4 for split transactions --*/}
                <option id="3" value={this.props.user_1 + " splitTx"}>{this.props.userName2} paid, and split equally</option>
                <option id="4" value={this.props.user_2 + " splitTx"}>{this.props.userName1} paid, and split equally</option>
              </Input>
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
