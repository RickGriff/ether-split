import React from 'react';
import { Input, Button } from 'react-materialize';

function EnterName(props) {

  const { setName } = props

  return (
    <div className="row">
      <form  onSubmit={setName}>
          <div className="col s2">
            <p>Please enter your name</p>
          </div>
          <div className="valign-wrapper col s6">
            <Input placeholder="Name" name="name" s={12} />
            <Button className ="input-field" waves='light'>Submit</Button>
          </div>
      </form>
    </div>
  )
}

export default EnterName;
