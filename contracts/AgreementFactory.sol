pragma solidity ^0.5.0;

contract AgreementFactory {

  address public creator;

  mapping(address => bool) public allAgreements;

  // map users to lists of agreements they're part of
  mapping(address => address[]) public userToAgreements;

  // map users to agreements they've been invited to
  mapping(address => address[]) public userToInvites;

  event AgreementCreated (address from, address agreementAddr);
  event AgreementAdded (address agreementAddr, bool inAllAgreementsList);

  constructor() public {
    creator = msg.sender;
  }

  function createNewAgreement() public  {
    Agreement newAgreement = new Agreement(msg.sender);
    address agreementAddress = address(newAgreement);
    allAgreements[agreementAddress] = true;
    userToAgreements[msg.sender].push(agreementAddress); // push agreement to user's list of agreements
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

  function newRegisteredUser(address _user) public _onlyChildContract {
    userToAgreements[_user].push(msg.sender); //add sending contract's address to user's list of agreements
  }

  function newInvite(address _friend) public _onlyChildContract {
    userToInvites[_friend].push(msg.sender); //add sending contract's address to user's list of invites
  }

  // Length getters and modifiers

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

  address public parentFactory;  // address of the AgreementFactory
  address public user_1;
  address public invited_friend;
  address public user_2;
  string public user_1_name;
  string public user_2_name;

  int public balance;  // the net balance of who owes who.  Positive if user_2 owes more, negative if user_1 owes more.

  uint public txCounter; // counts the number of purchases created.

  // initialize uint lengths of transaction arrays. Useful because public variables have automatic getters, so we
  // can easily grab array lengths for testing and healthchecks.
  uint public pendingTxs1Length;
  uint public pendingTxs2Length;
  uint public confirmedTxsLength;

  mapping( address => Tx[] ) public pendingTransactions; // map user to the list of their pending transactions.

  // Solidity doesn't allow elems in nested arrays to be directly called via web3. So explicitly set each user's Tx array, for external calls
  Tx[] public pendingTransactions_1 = pendingTransactions[user_1];
  Tx[] public pendingTransactions_2 = pendingTransactions[user_2];

  Tx[] public confirmedTransactions;

  // the basic transaction object
  struct Tx {
    uint amount;
    bool split;
    address creator;
    address confirmer;
    address debtor;
    string description;
    uint index;  // useful for tracking transactions, since they can move from a 'pending' array to 'confirmed' array.
    uint timestamp;
  }

  //  ***** constructor and user registration functions *****

  constructor(address _creator) public {
    parentFactory = msg.sender;
    user_1 = _creator;
  }

  function setName(string memory _name) onlyUser public {
    if (msg.sender == user_1) {
      require(bytes(user_1_name).length == 0, "You already set your name!");
      user_1_name = _name;
    } else if (msg.sender == user_2) {
      require(bytes(user_2_name).length == 0, "You already set your name!");
      user_2_name = _name;
    }
  }

  function inviteFriend(address _friend) onlyUser1 onlyUser2NotRegistered public {
    //user_1 can re-set invited_friend address, until a second user registers.  After that, this func reverts.
    require(_friend != msg.sender, 'You cant invite yourself!');
    require(invited_friend == address(0), 'You have already invited someone!');
    invited_friend = _friend;
    AgreementFactory factory = AgreementFactory(parentFactory);
    factory.newInvite(_friend);
  }

  function registerUser2() onlyInvitedFriend onlyUser2NotRegistered public {
    user_2 = msg.sender;
    require(user_2 == msg.sender); // check it's successfully set
    AgreementFactory factory = AgreementFactory(parentFactory); // grab the factory
    factory.newRegisteredUser(user_2); //  Call parent's registerUser2 func
  }

  // ****** Functions for creating and confirming transactions
  function createPending(uint _amount, bool _split, address _debtor, string  memory _description) onlyUser onlyBothRegistered public {
    require( _debtor == user_1 || _debtor == user_2, 'debtor must be a registered user' );
    require( bytes(_description).length < 35, 'Description too long' );   // string length isn't always *exactly* bytes length - but this nevertheless enforces a short description
    // create new pending tx
    Tx memory newPendingTx;

    // set the other user as confirmer
    newPendingTx.confirmer = getOtherUser(msg.sender);

    uint timeNow = timeStamp();

    // set remaining attributes
    newPendingTx.amount = _amount;
    newPendingTx.split = _split;
    newPendingTx.creator = msg.sender;
    newPendingTx.debtor = _debtor;
    newPendingTx.description = _description;
    newPendingTx.index = txCounter;
    newPendingTx.timestamp = timeNow;

    // append new tx to the confirmer's pending tx array, and updated Tx counter and lengths
    pendingTransactions[newPendingTx.confirmer].push(newPendingTx);
    txCounter = txCounter + 1; //update tx counter

    pendingTransactions_1 = pendingTransactions[user_1];
    pendingTransactions_2 = pendingTransactions[user_2];
    pendingTxs1Length = getPendingTxsLength1();
    pendingTxs2Length = getPendingTxsLength2();
  }

  function confirmAll() onlyUser onlyBothRegistered public {
    Tx[] storage allPendingTx = pendingTransactions[msg.sender];
    Tx[] memory memAllPendingTx = allPendingTx;  // copy pending txs to memory

    allPendingTx.length = 0; // delete all pending txs in storage

    int balanceChange  = 0;
    for (uint i = 0; i < memAllPendingTx.length; i++) {
      confirmedTransactions.push(memAllPendingTx[i]);  // add Tx to confirmed array
      balanceChange = balanceChange + changeInBalance(memAllPendingTx[i]); // add the tx amount to the balance change
    }
    // update lengths and balance

    pendingTransactions_1 = pendingTransactions[user_1];
    pendingTransactions_2 = pendingTransactions[user_2];
    pendingTxs1Length = getPendingTxsLength1();
    pendingTxs2Length = getPendingTxsLength2();
    confirmedTxsLength = getConfirmedTxsLength();
    balance = balance + balanceChange;
  }

  function confirmSingleTx(uint _txIndex) onlyUser onlyBothRegistered public {
    Tx[] storage allPendingTx =  pendingTransactions[msg.sender];

    uint len = allPendingTx.length;
    Tx memory transaction = allPendingTx[_txIndex];  // copy tx to memory

    // delete transaction fron pendingTx. This approach preserves array length, but not order
    delete allPendingTx[_txIndex];
    allPendingTx[_txIndex] = allPendingTx[len - 1];   // copy last element to empty slot
    delete allPendingTx[len - 1];   // delete last element
    allPendingTx.length--;  // decrease array size by one to remove empty slot

    // append Tx to confirmed transactions
    confirmedTransactions.push(transaction);

    //update stored lengths
    pendingTransactions_1 = pendingTransactions[user_1];
    pendingTransactions_2 = pendingTransactions[user_2];
    pendingTxs1Length = getPendingTxsLength1();
    pendingTxs2Length = getPendingTxsLength2();
    confirmedTxsLength = getConfirmedTxsLength();

    balance = balance + changeInBalance(transaction);
  }

  function balanceHealthCheck () onlyUser public view returns (int _testBal, int _bal, bool) {
    // calculates balance from total confirmed tx history. Checks == to running balance.
    int testBalance = 0;
    for (uint i = 0; i < confirmedTransactions.length; i++) {
      testBalance = testBalance + changeInBalance(confirmedTransactions[i]);
    }

    if (testBalance != balance) {
      return(testBalance, balance, false);
    } else if (testBalance == balance) {
      return(testBalance, balance, true);
    }
  }

  // ***** Helper and getter functions *****
  function changeInBalance(Tx memory _purchase) private view returns (int _change) {
    // returns the change to a balance caused by a purchase
    int change = 0;
    if (_purchase.split == true) {
      return change;  // no overall change to balance when an expense is split
    } else if (_purchase.debtor == user_1) {
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

  // Length getters for lists of confirmed & pending txs
  function getPendingTxsLength1() internal view returns(uint) {
    return pendingTransactions[user_1].length;
  }

  function getPendingTxsLength2() internal view returns(uint) {
    return pendingTransactions[user_2].length;
  }

  function getConfirmedTxsLength() internal view returns(uint) {
    return confirmedTransactions.length;
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

  modifier onlyBothRegistered {
    require (user_1 != address(0) && user_2 != address(0), 'Two users must be registered');
    _;
  }
}
