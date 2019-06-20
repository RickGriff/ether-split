import React from 'react';

function InviteFriend(props) {

  const { inviteFriend } = props

  return (
    <form className="col s12" onSubmit={inviteFriend}>
      <div className="row">
        <div className="input-field col s3">
          <button className="btn waves-effect waves-light" type="submit">Invite Friend</button>
        </div>
        <div className="input-field inline col s6">
          <label htmlFor="name"></label>
          <input id="invited-friend" type="text" placeholder="Paste your friend's address" name="address" className="validate" />
        </div>
      </div>
    </form>
  )
}

export default InviteFriend;
