pragma solidity ^0.5.0;

import 'openzeppelin-solidity/contracts/math/SafeMath.sol';

/// @Author RickGriff
/// EtherSplit dApp
contract AgreementFactory {

  address public factoryOwner;

  mapping(address => bool) public allAgreements;

  /// Map user to list of agreements they've created or joined
  mapping(address => address[]) public userToAgreements;

  /// Map user to list of agreements they've been invited to
  mapping(address => address[]) public userToInvites;

  event AgreementCreated (address from, address agreementAddr);
  event AgreementAdded (address agreementAddr, bool inAllAgreementsList);

  constructor() public {
    factoryOwner = msg.sender;
  }

  function createNewAgreement() public  {
    Agreement newAgreement = new Agreement(msg.sender);
    /// Add agreement addr to allAgreements and user's list
    address agreementAddress = address(newAgreement);
    allAgreements[agreementAddress] = true;
    userToAgreements[msg.sender].push(agreementAddress);
    emit AgreementCreated(msg.sender, agreementAddress);
    emit AgreementAdded(agreementAddress, allAgreements[agreementAddress]);
  }

  function getUsersAgreements(address _user) public view returns (address[] memory ) {
    return( userToAgreements[_user] );
  }

  function getMyAgreements() public view returns (address[] memory ) {
    return( userToAgreements[msg.sender] );
  }

  function getMyInvites() public view returns (address[] memory ) {
    return( userToInvites[msg.sender] );
  }

  /// Called by a child Agreement when a new user registers on the child.
  function newRegisteredUser(address _user) public _onlyChildContract {
    userToAgreements[_user].push(msg.sender);
  }

  /// Called by a child Agreement when a new account is invited to the child.
  function newInvite(address _friend) public _onlyChildContract {
    userToInvites[_friend].push(msg.sender);
  }

  /// Length getters and modifiers
  function getMyAgreementsCount() public view returns(uint myAgreementsCount) {
    return userToAgreements[msg.sender].length;
  }

  function getMyInvitesCount() public view returns(uint myAgreementsCount) {
    return userToInvites[msg.sender].length;
  }

  function getUsersAgreementsCount(address _user) public view returns(uint usersAgreementsCount) {
    return userToAgreements[_user].length;
  }

  modifier _onlyChildContract {
    require( allAgreements[msg.sender] == true, 'Sending contract not listed as a child of AgreementFactory');
    _;
  }
}

contract Agreement {

  using SafeMath for uint;

  address public parentFactory;
  address public parentFactoryOwner;
  address public user_1;
  address public invited_friend;
  address public user_2;
  string public user_1_name;
  string public user_2_name;

  /* The net balance of who owes who, in pennies. 
  Positive if user_2 owes more, negative if user_1 owes more. */
  int public balance;  

  uint public txCounter = 0; 

  mapping (uint => Tx) public pendingTxs1; /// Transactions pending confirmation from user_1
  uint[] public pendingTxsList1; /// unordered list of user_1's pending Tx IDs

  mapping (uint => Tx) public pendingTxs2; 
  uint[] public pendingTxsList2; 

  mapping (uint => Tx) public confirmedTxs;
  uint[] public confirmedTxsList;

  /// Basic transaction object
  struct Tx {
    uint amount;
    bool split;
    address creator;
    address confirmer;
    address debtor;
    string description;
    uint id;
    uint timestamp;
    uint index;  
  }

  ///  ****** constructor and user registration functions ******
  constructor(address _creator) public {
    parentFactory = msg.sender;
    AgreementFactory factory = AgreementFactory(parentFactory);
    parentFactoryOwner = factory.factoryOwner();
    user_1 = _creator;
  }

   event logNewPendingTx (uint id, uint listIndex, uint amount, address creator);
   event logDeletedTx (uint id, uint listIndex, uint amount, address creator);

  /// Store the user's name
  function setName(string memory _name) onlyUser public {
    if (msg.sender == user_1) {
      require(bytes(user_1_name).length == 0, "You already set your name!");
      user_1_name = _name;
    } else if (msg.sender == user_2) {
      require(bytes(user_2_name).length == 0, "You already set your name!");
      user_2_name = _name;
    }
  }

  /// Set the invited friend's address
  function inviteFriend(address _friend) onlyUser1 onlyUser2NotRegistered public {
    require(_friend != msg.sender, 'You cant invite yourself!');
    require(invited_friend == address(0), 'You have already invited someone!');
    invited_friend = _friend;
    AgreementFactory factory = AgreementFactory(parentFactory);
    factory.newInvite(_friend);
  }

  function registerUser2() onlyInvitedFriend onlyUser2NotRegistered public {
    user_2 = msg.sender;
    require(user_2 == msg.sender); /// check user_2 was set
    /// send the registration data to parent factory
    AgreementFactory factory = AgreementFactory(parentFactory);
    factory.newRegisteredUser(user_2);
  }


  /// ****** Functions for creating and confirming transactions ******

  /// Create a pending Tx, to be confirmed by the other user
  function createPending(uint _amount, bool _split, address _debtor, string  memory _description) onlyUser onlyBothRegistered public {
    require( _debtor == user_1 || _debtor == user_2, 'debtor must be a registered user' );
    require( bytes(_description).length < 35, 'Description too long' );
    txCounter = txCounter.add(1);

    /* since Solidity dislikes initialization inside conditionals, 
    initialize list  & mapping for msg.sender == user_1, and reassign if msg.sender == user_2. */
    uint[] storage pendingTxsList = pendingTxsList2;
    mapping (uint => Tx) storage pendingTxs = pendingTxs2;
    
    if (msg.sender == user_2) {
      pendingTxsList = pendingTxsList1;
      pendingTxs = pendingTxs1;
    }

    uint timeNow = timeStamp();
    Tx memory newPendingTx;

    newPendingTx.confirmer = getOtherUser(msg.sender);

    /// If Tx cost was split, set the amounted owed to half of Tx amount
    if (_split == true) {
      newPendingTx.amount = _amount / 2;
    } else if(_split == false) {
      newPendingTx.amount = _amount;
    }

    /// set remaining Tx struct attributes
    newPendingTx.split = _split;
    newPendingTx.creator = msg.sender;
    newPendingTx.debtor = _debtor;
    newPendingTx.description = _description;
    newPendingTx.id = txCounter;
    newPendingTx.timestamp = timeNow;
    // push the Tx ID to the list - and assign the corresponding list index to the Tx.index property
    newPendingTx.index = pendingTxsList.push(newPendingTx.id) - 1;  

    /// insert new Tx to the confirmer's pending Tx mapping
    pendingTxs[txCounter] = newPendingTx;
    emit logNewPendingTx(newPendingTx.id, newPendingTx.index, newPendingTx.amount, newPendingTx.creator);
  }

  function userDeletePendingTx(uint _id) onlyUser onlyBothRegistered public returns(uint) {
    /// grab *other* user's pending Txs, and check that msg.sender created it
    mapping (uint => Tx) storage pendingTxs = pendingTxs2;
    if (msg.sender == user_2) {
      pendingTxs = pendingTxs1;
    } 
    require(msg.sender == pendingTxs[_id].creator, "a user can only delete a pending tx they created" );

    address otherUser = getOtherUser(msg.sender);
    return deletePendingTx(_id, otherUser); // returns id of deleted Tx
  }

  function confirmAll() onlyUser onlyBothRegistered public {
    int balanceChange;

    uint[] storage pendingTxsList = pendingTxsList1;
    mapping (uint => Tx) storage pendingTxs = pendingTxs1;

    if (msg.sender == user_2) {
      pendingTxsList = pendingTxsList2;
      pendingTxs = pendingTxs2;
    }
    
    for (uint i = 0; i < pendingTxsList.length; i++) {
      uint id = pendingTxsList[i];
      require(!isConfirmedTx(id), "Tx is already confirmed");
      confirmedTxs[id] = pendingTxs[id]; /// insert tx to mapping
      confirmedTxsList.push(id); /// append tx id to list

      balanceChange = balanceChange + changeInBalance(pendingTxs[id]);
    }

    pendingTxsList.length = 0;
    balance = balance + balanceChange;
  }

  function confirmSingleTx(uint _id) onlyUser onlyBothRegistered public {
    mapping (uint => Tx) storage pendingTxs = pendingTxs1;
    if (msg.sender == user_2) {
      pendingTxs = pendingTxs2;
    } 
    require(msg.sender == pendingTxs[_id].confirmer, "User can only confirm their own pending Txs" );
    require(getOtherUser(msg.sender) == pendingTxs[_id].creator, "User can only confirm pending Txs created by other user " );
    
    Tx memory transaction = pendingTxs[_id];

    deletePendingTx(_id, msg.sender); /// Remove tx ID from user's pendingTx list
   
    /// Update confirmedTx mapping and ID list
    require(!isConfirmedTx(_id), "Tx is already confirmed");
    confirmedTxs[_id] = transaction;
    confirmedTxsList.push(_id);
   
    balance = balance + changeInBalance(transaction);
  }

  /** Calculates balance from scratch from total confirmed Tx history,
  * and checks it is equal to running balance.
  */
  function balanceHealthCheck() onlyUserOrFactoryOwner public view returns (int _testBal, int _bal, bool) {
    int testBalance = 0;

    for (uint i = 0; i < confirmedTxsList.length; i++) {
      uint tx_id = confirmedTxsList[i];
      testBalance = testBalance + changeInBalance(confirmedTxs[tx_id]);
    }

    if (testBalance != balance) {
      return(testBalance, balance, false);
    } else if (testBalance == balance) {
      return(testBalance, balance, true);
    }
  }

  /// ****** Helper and getter functions ******

  function deletePendingTx (uint _id, address _user) private returns (uint) {
    require (_user == user_1 || _user == user_2, "deletePendingTx must receive either user_1 or user_2");
    
    uint[] storage pendingTxsList = pendingTxsList2;
    mapping (uint => Tx) storage pendingTxs = pendingTxs2;
    
    if (_user == user_1) {
      pendingTxsList = pendingTxsList1;
      pendingTxs = pendingTxs1;
      require(isPendingTx1(_id), "Tx ID is not in user_1's pending Tx list");
    } else if (_user == user_2) {
      pendingTxsList = pendingTxsList2;
      pendingTxs = pendingTxs2;
      require(isPendingTx2(_id), "Tx ID is not in user_2's pending Tx list");
    }
      /* delete the pendingTx from the list.  
    We dont need to remove the mapping - the list of tx IDs is what determines existence.
    This approach preserves array length, but not order. */
    uint indexToDelete = pendingTxs[_id].index;
    uint txIDToMove = pendingTxsList[pendingTxsList.length - 1]; // grab the last tx in list
    pendingTxsList[indexToDelete] = txIDToMove; /// move last tx to emtpy slot, replacing the deleted one
    pendingTxs[txIDToMove].index = indexToDelete; /// in the mapping, update the index pointer of the tx that moved

    pendingTxsList.length--;
    emit logDeletedTx(_id, indexToDelete, pendingTxs[_id].amount, pendingTxs[_id].creator );
    return indexToDelete;
  }



  function isPendingTx1(uint _id) public view returns(bool isIndeed) {
    if(pendingTxsList1.length == 0) return false;
    return (pendingTxsList1[pendingTxs1[_id].index] == _id);
  }

  function isPendingTx2(uint _id) public view returns(bool isIndeed) {
    if(pendingTxsList2.length == 0) return false;
    return (pendingTxsList2[pendingTxs2[_id].index] == _id);
  }

  function isConfirmedTx(uint _id) public view returns(bool isIndeed) {
    if(confirmedTxsList.length == 0) return false;
    return (confirmedTxsList[confirmedTxs[_id].index] == _id);
  }

  /// Return the change to a balance caused by a purchase
  function changeInBalance(Tx memory _purchase) private view returns (int _change) {
    int change = 0;
    if (_purchase.debtor == user_1) {
      change = -int(_purchase.amount);
      return change;
    } else if (_purchase.debtor == user_2) {
      change = int(_purchase.amount);
      return change;
    }
  }

  function getOtherUser(address _user) private view returns (address) {
    require(_user == user_1 || _user == user_2, 'user must be registered');
    if (_user == user_1) {
      return user_2;
    } else if (_user == user_2) {
      return user_1;
    }
  }

  function timeStamp() private view returns (uint) {
    return block.timestamp;
  }

  /// Length getters for lists of Txs
  function getPendingTxsLength1() public view returns(uint) {
    return pendingTxsList1.length;
  }

  function getPendingTxsLength2() public view returns(uint) {
    return pendingTxsList2.length;
  }

  function getConfirmedTxsLength() public view returns(uint) {
    return confirmedTxsList.length;
  }

  /// ****** Modifiers *****
  modifier onlyUser {
    require(msg.sender == user_1 || msg.sender == user_2, 'Must be a registered user');
    _;
  }

  modifier onlyUserOrFactoryOwner {
    require(msg.sender == parentFactoryOwner || (msg.sender == user_1 || msg.sender == user_2), 'Must be a registered user');
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

  modifier onlyBothRegistered {
    require (user_1 != address(0) && user_2 != address(0), 'Two users must be registered');
    _;
  }
}