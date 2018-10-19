pragma solidity ^0.4.24;

// TODO sort out tabs lol

contract Agreement {
  address public user_1;
  address public invited_friend;
  address public user_2;

 //  ***** constructor and user registration functions *****

  constructor() public {
    user_1 = msg.sender;
  }

  function inviteFriend(address _friend) onlyUser1 onlyUser2NotRegistered public {
    invited_friend = _friend;
    }

    function registerUser2() onlyInvitedFriend onlyUser2NotRegistered public {
         user_2 = msg.sender;
     }


// ******** Modifiers *********
modifier onlyUser {
       require(msg.sender == user_1 || msg.sender == user_2, 'Must be a registered user');
       _;
   }

  modifier onlyUser1 {
    require(msg.sender == user_1, 'Must be registered user 1');
    _;
  }

  modifier onlyInvitedFriend {
        require(msg.sender == invited_friend, 'Must be the invited friend');
        _;
    }

  modifier onlyUser2NotRegistered {
    require (user_2 == address(0), 'User 2 already registered');
     _;
  }
}
