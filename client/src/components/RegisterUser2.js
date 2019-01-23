import React from 'react';

function RegisterUser2(props) {
  const { registerUser2, getName, user_1} = props

  return (
    <div>
      <h3> {getName(user_1)} has invited you to register...</h3>
        <div className="input-field center-align reg-user2">
          <button className="btn waves-effect waves-light" onClick={registerUser2}>Register as User 2</button>
        </div>
   </div>
  )
}

export default RegisterUser2;
