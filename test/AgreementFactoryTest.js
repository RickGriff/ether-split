
const AgreementFactory = artifacts.require("AgreementFactory");
const Agreement = artifacts.require("Agreement");
const truffleAssert = require('truffle-assertions');

contract("AgreementFactory", accounts => {
  const [firstAccount, secondAccount, thirdAccount, fourthAccount] = accounts;

  describe ('Deployment', function (){
    it("registers the deploying account as creator", async () => {
      const agreementFactory = await AgreementFactory.new();
      let factoryOwner = await agreementFactory.factoryOwner.call();
      assert.equal(factoryOwner, firstAccount)
    });
  });

  describe('Agreement creation and getters', function (){
    before(async () => {
      agreementFactory = await AgreementFactory.new();
      //objects below are tx receipts -  not contract instances
      agreementTx = await agreementFactory.createNewAgreement();
      agreementTx2 = await agreementFactory.createNewAgreement({from: secondAccount});
      agreementTx3 = await agreementFactory.createNewAgreement({from: secondAccount});
    });

    it('Creates agreements from the expected accounts', async () => {
      truffleAssert.eventEmitted(agreementTx, 'AgreementCreated', (ev) =>{
        return ev.from === firstAccount;
      });
      truffleAssert.eventEmitted(agreementTx2, 'AgreementCreated', (ev) =>{
        return ev.from === secondAccount;
      });
      truffleAssert.eventEmitted(agreementTx3, 'AgreementCreated', (ev) =>{
        return ev.from === secondAccount;
      });
    });

    it('adds each agreement to allAgreements mapping', async () => {
      truffleAssert.eventEmitted(agreementTx, 'AgreementAdded', (ev)=>{
        return ev.inAllAgreementsList === true;
      });
      truffleAssert.eventEmitted(agreementTx2, 'AgreementAdded', (ev)=>{
        return ev.inAllAgreementsList === true;
      });
      truffleAssert.eventEmitted(agreementTx3, 'AgreementAdded', (ev)=>{
        return ev.inAllAgreementsList === true;
      });
    });

    describe('getUsersAgreements', function (){
      it("returns agreement created by firstAccount", async () => {
        let agreements1 = await agreementFactory.getUsersAgreements(firstAccount)
        assert.equal(agreements1.length, 1)
        truffleAssert.eventEmitted(agreementTx, 'AgreementCreated', (ev) => {
          return ev.agreementAddr === agreements1[0];
        });
      });

      it("returns agreement created by secondAccount", async () => {
        let agreements2 = await agreementFactory.getUsersAgreements(secondAccount)
        assert.equal(agreements2.length, 2)
        // check the addresses of both agreements created by secondAccount are in the returned array
        truffleAssert.eventEmitted(agreementTx2, 'AgreementCreated', (ev) => {
          return ev.agreementAddr === agreements2[0];
        });
        truffleAssert.eventEmitted(agreementTx3, 'AgreementCreated', (ev) => {
          return ev.agreementAddr === agreements2[1];
        });
      });

      it("returns empty array for account that didn't create an agreement", async () => {
        let agreements3 = await agreementFactory.getUsersAgreements(thirdAccount)
        assert.equal(agreements3.length, 0)
      });
    });

    describe('getMyAgreements', function (){
      describe('from firstAccount', function (){
        it("returns firstAccount's agreement",  async () => {
          let agreements1 = await agreementFactory.getMyAgreements()
          assert.equal(agreements1.length, 1)
          truffleAssert.eventEmitted(agreementTx, 'AgreementCreated', (ev) => {
            return ev.agreementAddr === agreements1[0];
          });
        });
      });

      describe('from secondAccount', function (){
        it("returns secondAccount's agreements",  async () => {
          let agreements2 = await agreementFactory.getMyAgreements({from: secondAccount})
          assert.equal(agreements2.length, 2)
          // check the addresses of both agreements created by secondAccount are in the returned array
          truffleAssert.eventEmitted(agreementTx2, 'AgreementCreated', (ev) => {
            return ev.agreementAddr === agreements2[0];
          });
          truffleAssert.eventEmitted(agreementTx3, 'AgreementCreated', (ev) => {
            return ev.agreementAddr === agreements2[1];
          });
        });
      });

      describe('from thirdAccount', function (){
        it("returns empty array",  async () => {
          let agreements3 = await agreementFactory.getMyAgreements({from: thirdAccount})
          assert.equal(agreements3.length, 0)
        });
      });
    });
  });

  describe('newRegisteredUser', function (){
    beforeEach(async () => {
      agreementFactory = await AgreementFactory.new();
      agreementTx = await agreementFactory.createNewAgreement(); // the tx receipt of the new agreement
      agreementAddr = agreementTx.logs[0].args[1];  // grab the created agreement address from event logs
      agreementCreator = agreementTx.logs[0].args[0]; // grab the creator's addr from logs
      agreement = await Agreement.at(agreementAddr);
    });

    describe('secondAccount joins existing agreement1', function (){
      it("adds agreement to user's list of agreements", async () => {
        await agreement.inviteFriend(secondAccount)
        assert.deepEqual(await agreementFactory.getUsersAgreements(secondAccount), [] )
        await agreement.registerUser2({from: secondAccount})
        assert.deepEqual(await agreementFactory.getUsersAgreements(secondAccount), [agreementAddr])
       });
    })

    describe('secondAccount creates agreement2, and joins existing agreement1', function (){
       it("adds agreement to user's list of agreements", async () => {
         let agreementTx2 = await agreementFactory.createNewAgreement({from: secondAccount})
         let agreement2Addr = agreementTx2.logs[0].args[1];
         await agreement.inviteFriend(secondAccount);
         assert.deepEqual(await agreementFactory.getUsersAgreements(secondAccount), [agreement2Addr] )
         await agreement.registerUser2({from: secondAccount})
         assert.deepEqual(await agreementFactory.getUsersAgreements(secondAccount), [agreement2Addr, agreementAddr])
      });
    });

    it('reverts when called by a non-contract account', async () => {
      try {
        let factoryTx = await agreementFactory.newRegisteredUser(fourthAccount, {from: fourthAccount});  // uninivited account tries to register
        assert.fail();
      } catch (err) {
        assert.include(err.message, 'revert');
      }
    });
  });

  describe('newInvite', function (){
    beforeEach(async () => {
      agreementFactory = await AgreementFactory.new();
      agreementTx = await agreementFactory.createNewAgreement(); // the tx receipt of the new agreement
      agreementAddr = agreementTx.logs[0].args[1];  // grab the created agreement address from event logs
      agreementCreator = agreementTx.logs[0].args[0]; // grab the creator's addr from logs
      agreement = await Agreement.at(agreementAddr);
    });

    it('reverts when called by a non-contract account', async () => {
      try {
        let factoryTx = await agreementFactory.newInvite(fourthAccount, {from: fourthAccount});  // uninivited account tries to register
        assert.fail();
      } catch (err) {
        assert.include(err.message, 'revert');
      }
    });

    describe('creator invites secondAccount', function (){
      it("adds agreement to user's list of invites", async () => {
        assert.deepEqual(await agreementFactory.getMyInvites({from: secondAccount}), [] )
        await agreement.inviteFriend(secondAccount) // this func in turn calls the parent factory's newInvite() func
        assert.deepEqual(await agreementFactory.getMyInvites({from: secondAccount}), [agreementAddr])
      });
    });
  });
});

contract("Agreement", accounts => {
  const [firstAccount, secondAccount, thirdAccount] = accounts;

  describe('Deployment and user registration', function() {
    beforeEach(async () => {
      //simulate agreement creation from firstAccount, via AgreementFactory
      agreementFactory = await AgreementFactory.new();
      agreementTx = await agreementFactory.createNewAgreement();
      agreementAddr = agreementTx.logs[0].args[1];  // grab the created agreement address from event logs
      agreement = await Agreement.at(agreementAddr);
      await agreement.inviteFriend(secondAccount);
    });

    it("Sets the factory owner", async () => {
      let actualFactoryOwner = await agreementFactory.factoryOwner();
      let parentFactoryOwner = await agreement.parentFactoryOwner();
      assert.equal(actualFactoryOwner, parentFactoryOwner);
    });

    it("registers the deploying account as user_1", async () => {
      let user_1 = await agreement.user_1.call()
      assert.equal(user_1, firstAccount);
    });

    it("sets the invited friend's address", async () => {
      let invited_friend = await agreement.invited_friend.call()
      assert.equal(invited_friend, secondAccount);
    });

    it("does not allow invited_friend to be changed", async () => {
      let invited_friend = await agreement.invited_friend.call()
      try {
        await agreement.inviteFriend(thirdAccount);  // creator tries to invite a different friend
        assert.fail();
      } catch (err) {
        assert.include(err.message, 'revert');
      }
    });

    it("registers invited friend as user_2", async () => {
      await agreement.registerUser2({from: secondAccount});  // register as user_2, from secondAccount
      let invited_friend = await agreement.invited_friend.call()
      let user_2 = await agreement.user_2.call()

      assert.equal(user_2, invited_friend);
      assert.equal(user_2, secondAccount);
    });

    it("reverts when uninvited account tries to register", async () => {
      try {
        await agreement.registerUser2({from: thirdAccount});  // uninivited account tries to register
        assert.fail();
      } catch (err) {
        assert.include(err.message, 'revert');
      }
    });

    /* redundant test, since invited_friend can't be changed:-

    it("does not allow more invites after 2 users are registered", async () => {
      await agreement.registerUser2({from: secondAccount});
      try {
        await agreement.inviteFriend(thirdAccount, {from: firstAccount});
        assert.fail();
      } catch (err) {
        assert.include(err.message, 'revert');
      }
    });

    */
  });

  describe ("Sets user's name",  function () {
    beforeEach(async () => {
      //simulate agreement creation from firstAccount, via AgreementFactory
      agreementFactory = await AgreementFactory.new();
      agreementTx = await agreementFactory.createNewAgreement();
      agreementAddr = agreementTx.logs[0].args[1];  // grab the created agreement address from event logs
      agreement = await Agreement.at(agreementAddr);
      await agreement.inviteFriend(secondAccount);
      await agreement.registerUser2({from: secondAccount});
    });

    describe ("As user 1", function () {
      it("sets the name", async () => {
        assert.equal(await agreement.user_1_name.call(), "")
        await agreement.setName("Alice")
        assert.equal(await agreement.user_1_name.call(), "Alice")
      });

      it("reverts on attempted name change", async () => {
        await agreement.setName("Alice")
        try {
          // try to change name
          await agreement.setName("Amanda")
          assert.fail();
        } catch (err) {
          assert.include(err.message, 'revert');
        }
        assert.equal(await agreement.user_1_name.call(), "Alice")
      });
    });

    describe ("As user 2", function () {
      it("sets the name", async () => {
        assert.equal(await agreement.user_2_name.call(), "")
        await agreement.setName("Bob", {from: secondAccount})
        assert.equal(await agreement.user_2_name.call(), "Bob")
      });

      it("reverts on attempted name change", async () => {
        await agreement.setName("Bob", {from: secondAccount})
        try {
          await agreement.setName("Billy", {from: secondAccount})
          assert.fail();
        } catch (err) {
          assert.include(err.message, 'revert');
        }
        assert.equal(await agreement.user_2_name.call(), "Bob")
      });
    });

    describe ("As unregistered address", function () {
      it("reverts when attempting to set a name", async () => {
        try {
          await agreement.setName("Chrystal", {from: thirdAccount})
          assert.fail();
        } catch (err) {
          assert.include(err.message, 'revert');
        }
      });
    });
  });

  describe('Create pending transaction', function() {
    let agreement;
    let counter_before;

    beforeEach(async () => {
      //simulate agreement creation from firstAccount, via AgreementFactory
      agreementFactory = await AgreementFactory.new();
      agreementTx = await agreementFactory.createNewAgreement();
      agreementAddr = agreementTx.logs[0].args[1];  // grab the created agreement address from event logs
      agreement = await Agreement.at(agreementAddr);
      await agreement.inviteFriend(secondAccount);
      await agreement.registerUser2({from: secondAccount});
      counter_before = await agreement.txCounter.call();
    });

    it("reverts when debtor is not specified", async () => {
      try {
        // no debtor specified
        await agreement.createPending(amount=50, split=false, description='I bought him sushi');
        assert.fail();
      } catch (err) {
        assert.include(err.message, 'Invalid number of parameters');
      }
    });

    it("reverts when unregistered accounts try to create a pending tx", async () => {
      try {
        // unregistered account tries to add a debt
        await agreement.createPending( amount=90000, split=false, debtor=firstAccount, description='I bought him a lambo', {from: thirdAccount});
        assert.fail();
      } catch (err) {
        assert.include(err.message, 'revert');
      }
    });

    describe('As user_1', function() {
      beforeEach(async () => {
        await agreement.createPending(
          amount=50,
          split=false,
          debtor=secondAccount,
          description='I bought him sushi'
        );
      });

      it("creates a pending transaction", async () => {
        assert.equal(await agreement.getPendingTxsLength1.call(), 0);
        assert.equal(await agreement.getPendingTxsLength2.call(), 1);  // tx is added to user_2's pending tx list
      });

      it("increases the transaction counter by 1", async () => {
        let counter_after = await agreement.txCounter.call();
        assert.equal(counter_before.toNumber() + 1, counter_after.toNumber())
      });

      it("creates a pending tx with the correct properties", async () => {
        let transaction = await agreement.pendingTransactions_2(0);
        amount = transaction[0].toNumber()
        split = transaction[1]
        creator = transaction[2]
        confirmer = transaction[3]
        debtor = transaction[4]
        description = transaction[5]
        index = transaction[6].toNumber()
        timestamp = transaction[7].toNumber()

        assert.equal(amount, 50)
        assert.equal(split, false)
        assert.equal(creator, firstAccount)
        assert.equal(debtor, secondAccount)
        assert.equal(confirmer, secondAccount)
        assert.equal(description, "I bought him sushi")
        assert.equal(index, 0)
        assert.isNumber(timestamp)
      });
    });

    describe('As user_2', function() {
      beforeEach(async () => {
        await agreement.createPending(
          amount=1000,
          split=false,
          debtor=firstAccount,
          description='I bought her a dog',
          {from: secondAccount}  // user_2 creates tx
        );
      });

      it("creates a pending transaction", async () => {
        assert.equal(await agreement.getPendingTxsLength1.call(), 1); // tx is added to user_1's pending tx list
        assert.equal(await agreement.getPendingTxsLength2.call(), 0);
      });

      it("increases the transaction counter by 1", async () => {
        let counter_after = await agreement.txCounter.call();
        assert.equal(counter_before.toNumber() + 1, counter_after.toNumber())
      });

      it("creates a pending tx with the correct properties", async () => {
        let transaction = await agreement.pendingTransactions_1(0);
        amount = transaction[0].toNumber()
        split = transaction[1]
        creator = transaction[2]
        confirmer = transaction[3]
        debtor = transaction[4]
        description = transaction[5]
        index = transaction[6].toNumber()
        timestamp = transaction[7].toNumber()

        assert.equal(amount, 1000)
        assert.equal(split, false)
        assert.equal(creator, secondAccount)
        assert.equal(debtor, firstAccount)
        assert.equal(confirmer, firstAccount)
        assert.equal(description, "I bought her a dog")
        assert.equal(index, 0)
        assert.isNumber(timestamp)
      });
    });

    describe('Create split transaction', function() {
      describe('As user_1', function() {
        beforeEach(async () => {
          await agreement.createPending(
            amount=50,
            split=true,
            debtor=secondAccount,
            description='We split sushi'
          );
        });

        it ("Creates a pending transaction with owed amount equal to half the cost", async () => {
          let transaction = await agreement.pendingTransactions_2(0);
          amount = transaction[0].toNumber()
          split = transaction[1]
          creator = transaction[2]
          confirmer = transaction[3]
          debtor = transaction[4]
          description = transaction[5]
          index = transaction[6].toNumber()
          timestamp = transaction[7].toNumber()

          assert.equal(amount, 25)
          assert.equal(split, true)
          assert.equal(creator, firstAccount)
          assert.equal(debtor, secondAccount)
          assert.equal(confirmer, secondAccount)
          assert.equal(description, "We split sushi")
          assert.equal(index, 0)
          assert.isNumber(timestamp)
        });
      });

      // as user 2
      describe('As user_2', function() {
        beforeEach(async () => {
          await agreement.createPending(
            amount=1000,
            split=true,
            debtor=firstAccount,
            description='I bought us a dog',
            {from: secondAccount}
          );
        });

        it ("Creates a pending transaction with owed amount equal to half the cost", async () => {
          let transaction = await agreement.pendingTransactions_1(0);
          amount = transaction[0].toNumber()
          split = transaction[1]
          creator = transaction[2]
          confirmer = transaction[3]
          debtor = transaction[4]
          description = transaction[5]
          index = transaction[6].toNumber()
          timestamp = transaction[7].toNumber()

          assert.equal(amount, 500)
          assert.equal(split, true)
          assert.equal(creator, secondAccount)
          assert.equal(debtor, firstAccount)
          assert.equal(confirmer, firstAccount)
          assert.equal(description, "I bought us a dog")
          assert.equal(index, 0)
          assert.isNumber(timestamp)
        });
      });
    });
  });

  describe("Confirming transactions", function() {
    beforeEach(
      async () => {
        //simulate agreement creation from firstAccount, via AgreementFactory
        agreementFactory = await AgreementFactory.new();
        agreementTx = await agreementFactory.createNewAgreement();
        agreementAddr = agreementTx.logs[0].args[1];  // grab the created agreement address from event logs
        agreement = await Agreement.at(agreementAddr);
        await agreement.inviteFriend(secondAccount);
        await agreement.registerUser2({from: secondAccount});

        // create 3 pending transactions as user_1
        await agreement.createPending(amount=30, split=false, debtor=secondAccount, description='I bought her sushi');
        await agreement.createPending(amount=50, split=false, debtor=firstAccount, description='She bought me Nandos');
        await agreement.createPending(amount=50, split=true, debtor=firstAccount, description='we split lunch');

        // create 3 pending transactions as user_2
        await agreement.createPending(amount=500, split=false, debtor=firstAccount, description='I bought him a bike', {from: secondAccount});
        await agreement.createPending(amount=1, split=false, debtor=firstAccount, description='I bought him a newspaper', {from: secondAccount});
        await agreement.createPending(amount=100, split=true, debtor=firstAccount, description='we split dinner', {from: secondAccount});
      });

      it ("has pending transactions for each user", async () => {
        let p1_length = await agreement.getPendingTxsLength1.call();
        let p2_length = await agreement.getPendingTxsLength2.call();
        assert.equal(p1_length.toNumber(), 3);
        assert.equal(p2_length.toNumber(), 3);
      });

      describe("confirmAll pending transactions", function() {
        it("reverts when unregistered account try to confirmAll", async () => {
          try {
            await agreement.confirmAll( {from: thirdAccount})   // unregistered account tries to add a deb  );
            assert.fail();
          } catch (err) {
            assert.include(err.message, 'revert');
          }
        });

        it("reverts when unregistered account try to confirmSingleTx", async () => {
          try {
            await agreement.confirmSingleTx(0, {from: thirdAccount})   // unregistered account tries to add a deb  );
            assert.fail();
          } catch (err) {
            assert.include(err.message, 'revert');
          }
        });

        describe("confirmAll As user_1", function() {
          it("deletes all user_1's pending transactions", async () => {
            await agreement.confirmAll();
            let pending_tx_length = await agreement.getPendingTxsLength1.call();
            assert.equal(pending_tx_length.toNumber(), 0);
          });

          it("adds all user_1's pending tx to confirmedTransactions", async () => {
            let conf_txs_length_before = await agreement.getConfirmedTxsLength.call()
            assert.equal(conf_txs_length_before.toNumber(), 0 );

            await agreement.confirmAll();

            let conf_txs_length_after = await agreement.getConfirmedTxsLength.call()
            assert.equal(conf_txs_length_after.toNumber(), 3);
          });

          it("doesn't affect user_2's pending tx", async () => {
            let p2_length_before = await agreement.getPendingTxsLength2.call();
            assert.equal(p2_length_before.toNumber(), 3);

            await agreement.confirmAll();

            let p2_length_after = await agreement.getPendingTxsLength2.call();
            assert.equal(p2_length_after.toNumber(), 3);
          });

          it("updates balance in storage", async () => {
            let bal_before = await agreement.balance.call();

            await agreement.confirmAll();

            let bal_after = await agreement.balance.call();
            assert.equal(bal_after.toNumber(), bal_before.toNumber() - 551, ); // user_2 bought two things for user_1, of value 501.
          });
        });

        describe("confirmAll as user_2", function() {
          it("deletes all user_2's pending transactions", async () => {
            await agreement.confirmAll({from: secondAccount});
            let pending_tx_length = await agreement.getPendingTxsLength2.call();
            assert.equal(pending_tx_length.toNumber(), 0);
          });

          it("adds all user_2's pending tx to confirmedTransactions", async () => {
            let conf_txs_length_before = await agreement.getConfirmedTxsLength.call()
            assert.equal(conf_txs_length_before.toNumber(), 0 );

            await agreement.confirmAll({from: secondAccount});

            let conf_txs_length_after = await agreement.getConfirmedTxsLength.call()
            assert.equal(conf_txs_length_after.toNumber(), 3 );
          });

          it("doesn't affect user_1's pending tx", async () => {
            let p1_length_before = await agreement.getPendingTxsLength1.call();
            assert.equal(p1_length_before.toNumber(), 3);

            await agreement.confirmAll({from: secondAccount});

            let p1_length_after = await agreement.getPendingTxsLength1.call();
            assert.equal(p1_length_after.toNumber(), 3);
          });

          it("updates balance in storage", async () => {
            let bal_before = await agreement.balance.call();

            await agreement.confirmAll({from: secondAccount});

            let bal_after = await agreement.balance.call();
            assert.equal(bal_after.toNumber(), bal_before.toNumber() - 45, ); // user_1 owed 50, user_2 owed 30.
          });
        });

        describe("confirmSingleTx as user_1", function() {
          it("removes that tx from pending tx1", async () => {
            let tx = await agreement.pendingTransactions_1(0)

            await agreement.confirmSingleTx(0);

            let first_pending_tx = await agreement.pendingTransactions_1(0);
            assert.notEqual(tx[6].toNumber(), first_pending_tx[6].toNumber(), "the transaction is no longer in the list of pending txs") // structs are returned as tuples of values. The 7th elem of a Tx struct is it's index, hence [6].
          });

          it("decreases length of pending Tx list by 1", async () => {
            let p1_length_before = await agreement.getPendingTxsLength1.call();

            await agreement.confirmSingleTx(0);

            let p1_length_after = await agreement.getPendingTxsLength1.call();
            assert.equal(p1_length_before.toNumber() - 1, p1_length_after.toNumber());
          });

          it("adds it to confirmedTx array", async () => {
            let tx = await agreement.pendingTransactions_1(0);

            await agreement.confirmSingleTx(0);

            let latest_confirmed = await agreement.confirmedTransactions(0);
            assert.equal(latest_confirmed[6].toNumber(), tx[6].toNumber(), "the transaction is now in the confirmed txs list") // check the txs have the same index
          });

          it("increases confirmedTx length by one", async () => {
            let conf_length_before = await agreement.getConfirmedTxsLength.call();

            await agreement.confirmSingleTx(0);

            let conf_length_after = await agreement.getConfirmedTxsLength.call();
            assert.equal(conf_length_before.toNumber() + 1, conf_length_after.toNumber());
          });

          it("doesn't affect user_2's pending tx", async () => {
            let p2_length_before = await agreement.getPendingTxsLength2.call();
            assert.equal(p2_length_before.toNumber(), 3);

            await agreement.confirmSingleTx(0);

            let p2_length_after = await agreement.getPendingTxsLength2.call();
            assert.equal(p2_length_after.toNumber(), 3);
          });

          it("updates balance in storage", async () => {
            let bal_before = await agreement.balance.call();

            await agreement.confirmSingleTx(0);

            let bal_after = await agreement.balance.call();
            assert.equal(bal_after.toNumber(), bal_before.toNumber() - 500, ); // user_1 owed 50, user_2 owed 30.
          });
        });

        describe("confirmSingleTx as user_2", function() {
          it("removes that tx from pending tx2", async () => {
            let tx = await agreement.pendingTransactions_2(0)

            await agreement.confirmSingleTx(0, {from: secondAccount});

            let first_pending_tx = await agreement.pendingTransactions_2(0);
            assert.notEqual(tx[6].toNumber(), first_pending_tx[6].toNumber(), "the transaction is no longer in the list of pending txs") // structs are returned as tuples of values. The 7th elem of a Tx struct is it's index, hence [6].
          });

          it("decreases length of pending Tx list by 2", async () => {
            let p2_length_before = await agreement.getPendingTxsLength1.call();

            await agreement.confirmSingleTx(0, {from: secondAccount});

            let p2_length_after = await agreement.getPendingTxsLength2.call();
            assert.equal(p2_length_before.toNumber() - 1, p2_length_after.toNumber());
          });

          it("adds it to confirmedTx array", async () => {
            let tx = await agreement.pendingTransactions_2(0);

            await agreement.confirmSingleTx(0, {from: secondAccount});

            let latest_confirmed = await agreement.confirmedTransactions(0);
            assert.equal(latest_confirmed[6].toNumber(), tx[6].toNumber(), "the transaction is now in the confirmed txs list") // check the txs have the same index
          });

          it("increases confirmedTx length by one", async () => {
            let conf_length_before = await agreement.getConfirmedTxsLength.call();

            await agreement.confirmSingleTx(0, {from: secondAccount});

            let conf_length_after = await agreement.getConfirmedTxsLength.call();
            assert.equal(conf_length_before.toNumber() + 1, conf_length_after.toNumber());
          });

          it("doesn't affect user_1's pending tx", async () => {
            let p1_length_before = await agreement.getPendingTxsLength1.call();
            assert.equal(p1_length_before.toNumber(), 3);

            await agreement.confirmSingleTx(0, {from: secondAccount});

            let p1_length_after = await agreement.getPendingTxsLength1.call();
            assert.equal(p1_length_after.toNumber(), 3);
          });

          it("updates balance in storage", async () => {
            let bal_before = await agreement.balance.call();

            await agreement.confirmSingleTx(0, {from: secondAccount});

            let bal_after = await agreement.balance.call();
            assert.equal(bal_after.toNumber(), bal_before.toNumber() + 30, ); // user_1 owed 50, user_2 owed 30.
          });
        });

        describe("confirmAll & confirmSingleTx from an unregistered account", function () {
          it("reverts when unregistered account tries to confirmAll", async () => {
            try {
              await agreement.confirmAll({from: thirdAccount});
              assert.fail();
            } catch (err) {
              assert.include(err.message, 'revert');
            }
          });

          it("reverts when unregistered account tries to confirmSingleTx", async () => {
            try {
              await agreement.confirmSingleTx(0, {from: thirdAccount});
              assert.fail();
            } catch (err) {
              assert.include(err.message, 'revert');
            }
          });
        });
      });

      describe('balanceHealthCheck', function() {
        it("Verifies the running balance equals sum of all confirmed txs", async () => {
          let start_balances = await agreement.balanceHealthCheck.call();

          assert.equal(start_balances[0].toNumber(), start_balances[1].toNumber());
          assert.isTrue(start_balances[2]);

          await agreement.confirmAll();
          await agreement.confirmAll({from: secondAccount});

          let latest_balances = await agreement.balanceHealthCheck.call();
          assert.equal(latest_balances[0].toNumber(), latest_balances[1].toNumber());
          assert.isTrue(start_balances[2]);
        });

        it ("Reverts when called from unathorized account", async () => {
          try {
            await agreement.balanceHealthCheck({from: thirdAccount});
            assert.fail();
          } catch (err) {
            assert.include(err.message, 'revert');
          }
        });
      });

    describe('Attempt to transact with contract with only 1 user registered', function() {
      beforeEach(async () => {
        //simulate agreement creation from firstAccount, via AgreementFactory
        agreementFactory = await AgreementFactory.new();
        agreementTx = await agreementFactory.createNewAgreement();
        agreementAddr = agreementTx.logs[0].args[1];
        agreement = await Agreement.at(agreementAddr);
      });

      it("reverts when user_1 tries to createPending",  async () => {
        try {
          await agreement.createPending(
            amount=50,
            split=false,
            debtor=secondAccount,
            description='I bought him sushi',
          );
          assert.fail();
        } catch (err) {
          assert.include(err.message, 'revert');
        }
      });

      //Somewhat redundant, as user_1 has no pending tx's to confirm
      it("reverts when user_1 tries to confirm all transactions",  async () => {
        try {
          await agreement.confirmAll();
          assert.fail();
        } catch (err) {
          assert.include(err.message, 'revert');
        }
      });

      it("reverts when user_1 tries to confirm a single tx",  async () => {
        try {
          await agreement.confirmSingleTx(0);
          assert.fail();
        } catch (err) {
          assert.include(err.message, 'revert');
        }
      });
    });
  });
});
