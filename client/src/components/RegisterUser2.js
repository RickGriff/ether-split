import React from 'react';

function RegisterUser2(props) {
  const { registerUser2 } = props

  return (
    <div className="row">
      <div className="input-field col s3">
        <button className="btn waves-effect waves-light" onClick={registerUser2}>Register as User 2</button>
      </div>
    </div>
  )
}

export default RegisterUser2;
