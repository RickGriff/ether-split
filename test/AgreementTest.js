const AgreementFactory = artifacts.require("AgreementFactory");
const Agreement = artifacts.require("Agreement");
const truffleAssert = require('truffle-assertions');

contract("Agreement", accounts => {
  const [firstAccount, secondAccount, thirdAccount] = accounts;

  describe('Deployment and user registration', function () {
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
      await agreement.registerUser2({ from: secondAccount });  // register as user_2, from secondAccount
      let invited_friend = await agreement.invited_friend.call()
      let user_2 = await agreement.user_2.call()

      assert.equal(user_2, invited_friend);
      assert.equal(user_2, secondAccount);
    });

    it("reverts when uninvited account tries to register", async () => {
      try {
        await agreement.registerUser2({ from: thirdAccount });  // uninivited account tries to register
        assert.fail();
      } catch (err) {
        assert.include(err.message, 'revert');
      }
    });
  });

  describe("Sets user's name", function () {
    beforeEach(async () => {
      //simulate agreement creation from firstAccount, via AgreementFactory
      agreementFactory = await AgreementFactory.new();
      agreementTx = await agreementFactory.createNewAgreement();
      agreementAddr = agreementTx.logs[0].args[1];  // grab the created agreement address from event logs
      agreement = await Agreement.at(agreementAddr);
      await agreement.inviteFriend(secondAccount);
      await agreement.registerUser2({ from: secondAccount });
    });

    describe("As user 1", function () {
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

    describe("As user 2", function () {
      it("sets the name", async () => {
        assert.equal(await agreement.user_2_name.call(), "")
        await agreement.setName("Bob", { from: secondAccount })
        assert.equal(await agreement.user_2_name.call(), "Bob")
      });

      it("reverts on attempted name change", async () => {
        await agreement.setName("Bob", { from: secondAccount })
        try {
          await agreement.setName("Billy", { from: secondAccount })
          assert.fail();
        } catch (err) {
          assert.include(err.message, 'revert');
        }
        assert.equal(await agreement.user_2_name.call(), "Bob")
      });
    });

    describe("As unregistered address", function () {
      it("reverts when attempting to set a name", async () => {
        try {
          await agreement.setName("Chrystal", { from: thirdAccount })
          assert.fail();
        } catch (err) {
          assert.include(err.message, 'revert');
        }
      });
    });
  });

  describe('Create pending transaction', function () {
    let agreement;
    let counter_before;

    beforeEach(async () => {
      //simulate agreement creation from firstAccount, via AgreementFactory
      agreementFactory = await AgreementFactory.new();
      agreementTx = await agreementFactory.createNewAgreement();
      agreementAddr = agreementTx.logs[0].args[1];  // grab the created agreement address from event logs
      agreement = await Agreement.at(agreementAddr);
      await agreement.inviteFriend(secondAccount);
      await agreement.registerUser2({ from: secondAccount });
      counter_before = await agreement.txCounter.call();
    });

    it("reverts when debtor is not specified", async () => {
      try {
        // no debtor specified
        await agreement.createPending(amount = 50, split = false, description = 'I bought him sushi');
        assert.fail();
      } catch (err) {
        assert.include(err.message, 'Invalid number of parameters');
      }
    });

    it("reverts when unregistered accounts try to create a pending tx", async () => {
      try {
        // unregistered account tries to add a debt
        await agreement.createPending(amount = 90000, split = false, debtor = firstAccount, description = 'I bought him a lambo', { from: thirdAccount });
        assert.fail();
      } catch (err) {
        assert.include(err.message, 'revert');
      }
    });

    describe('As user_1', function () {
      beforeEach(async () => {
        await agreement.createPending(
          amount = 50,
          split = false,
          debtor = secondAccount,
          description = 'I bought him sushi'
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
        let transaction = await agreement.pendingTxs2(1); // grab tx with id = 1
        amount = transaction[0].toNumber()
        split = transaction[1]
        creator = transaction[2]
        confirmer = transaction[3]
        debtor = transaction[4]
        description = transaction[5]
        id = transaction[6].toNumber()
        timestamp = transaction[7].toNumber()
        index = transaction[8].toNumber()

        assert.equal(amount, 50)
        assert.equal(split, false)
        assert.equal(creator, firstAccount)
        assert.equal(debtor, secondAccount)
        assert.equal(confirmer, secondAccount)
        assert.equal(description, "I bought him sushi")
        assert.equal(id, 1)
        assert.isNumber(timestamp)
        assert.equal(index, 0)
      });
    });

    describe('As user_2', function () {
      beforeEach(async () => {
        await agreement.createPending(
          amount = 1000,
          split = false,
          debtor = firstAccount,
          description = 'I bought her a dog',
          { from: secondAccount }  // user_2 creates tx
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
        let transaction = await agreement.pendingTxs1(1);
        amount = transaction[0].toNumber()
        split = transaction[1]
        creator = transaction[2]
        confirmer = transaction[3]
        debtor = transaction[4]
        description = transaction[5]
        id = transaction[6].toNumber()
        timestamp = transaction[7].toNumber()
        index = transaction[8].toNumber()

        assert.equal(amount, 1000)
        assert.equal(split, false)
        assert.equal(creator, secondAccount)
        assert.equal(debtor, firstAccount)
        assert.equal(confirmer, firstAccount)
        assert.equal(description, "I bought her a dog")
        assert.equal(id, 1)
        assert.isNumber(timestamp)
        assert.equal(index, 0)
      });
    });

    describe('Create split transaction', function () {
      describe('As user_1', function () {
        beforeEach(async () => {
          await agreement.createPending(
            amount = 50,
            split = true,
            debtor = secondAccount,
            description = 'We split sushi'
          );
        });

        it("Creates a pending transaction with owed amount equal to half the cost", async () => {
          let transaction = await agreement.pendingTxs2(1);
          amount = transaction[0].toNumber()
          split = transaction[1]
          creator = transaction[2]
          confirmer = transaction[3]
          debtor = transaction[4]
          description = transaction[5]
          id = transaction[6].toNumber()
          timestamp = transaction[7].toNumber()
          index = transaction[8].toNumber()

          assert.equal(amount, 25)
          assert.equal(split, true)
          assert.equal(creator, firstAccount)
          assert.equal(debtor, secondAccount)
          assert.equal(confirmer, secondAccount)
          assert.equal(description, "We split sushi")
          assert.equal(id, 1)
          assert.isNumber(timestamp)
          assert.equal(index, 0)
        });
      });

      // as user 2
      describe('As user_2', function () {
        beforeEach(async () => {
          await agreement.createPending(
            amount = 1000,
            split = true,
            debtor = firstAccount,
            description = 'I bought us a dog',
            { from: secondAccount }
          );
        });

        it("Creates a pending transaction with owed amount equal to half the cost", async () => {
          let transaction = await agreement.pendingTxs1(1);
          amount = transaction[0].toNumber()
          split = transaction[1]
          creator = transaction[2]
          confirmer = transaction[3]
          debtor = transaction[4]
          description = transaction[5]
          id = transaction[6].toNumber()
          timestamp = transaction[7].toNumber()
          index = transaction[8].toNumber()

          assert.equal(amount, 500)
          assert.equal(split, true)
          assert.equal(creator, secondAccount)
          assert.equal(debtor, firstAccount)
          assert.equal(confirmer, firstAccount)
          assert.equal(description, "I bought us a dog")
          assert.equal(id, 1)
          assert.isNumber(timestamp)
          assert.equal(index, 0)
        });
      });
    });
  });

  describe("Confirming and deleting transactions", function () {
    beforeEach(
      async () => {
        //simulate agreement creation from firstAccount, via AgreementFactory
        agreementFactory = await AgreementFactory.new();
        agreementTx = await agreementFactory.createNewAgreement();
        agreementAddr = agreementTx.logs[0].args[1];  // grab the created agreement address from event logs
        agreement = await Agreement.at(agreementAddr);
        await agreement.inviteFriend(secondAccount);
        await agreement.registerUser2({ from: secondAccount });

        // create 3 pending transactions as user_1
        await agreement.createPending(amount = 30, split = false, debtor = secondAccount, description = 'I bought her sushi');
        await agreement.createPending(amount = 50, split = false, debtor = firstAccount, description = 'She bought me Nandos');
        await agreement.createPending(amount = 50, split = true, debtor = firstAccount, description = 'we split lunch');

        // create 3 pending transactions as user_2
        await agreement.createPending(amount = 500, split = false, debtor = firstAccount, description = 'I bought him a bike', { from: secondAccount });
        await agreement.createPending(amount = 1, split = false, debtor = firstAccount, description = 'I bought him a newspaper', { from: secondAccount });
        await agreement.createPending(amount = 100, split = true, debtor = firstAccount, description = 'we split dinner', { from: secondAccount });
      });

    it("has pending transactions for each user", async () => {
      let p1_length = await agreement.getPendingTxsLength1.call();
      let p2_length = await agreement.getPendingTxsLength2.call();
      assert.equal(p1_length.toNumber(), 3);
      assert.equal(p2_length.toNumber(), 3);
    });

    describe("confirmAll pending transactions", function () {
      it("reverts when unregistered account try to confirmAll", async () => {
        try {
          await agreement.confirmAll({ from: thirdAccount })   // unregistered account tries to add a deb  );
          assert.fail();
        } catch (err) {
          assert.include(err.message, 'revert');
        }
      });

      describe("confirmAll As user_1", function () {
        it("deletes all user_1's pending transactions", async () => {
          let receipt = await agreement.confirmAll();

          let pending_tx_length = await agreement.getPendingTxsLength1();
          assert.equal(pending_tx_length.toNumber(), 0);
        });

        it("adds all user_1's pending tx to confirmedTransactions", async () => {
          let conf_txs_length_before = await agreement.getConfirmedTxsLength()
          assert.equal(conf_txs_length_before.toNumber(), 0);

          await agreement.confirmAll();

          let conf_txs_length_after = await agreement.getConfirmedTxsLength()
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
          assert.equal(bal_after.toNumber(), bal_before.toNumber() - 551); // tx amounts: 500 + 1 + 100/2
        });
      });

      describe("confirmAll as user_2", function () {
        it("deletes all user_2's pending transactions", async () => {
          await agreement.confirmAll({ from: secondAccount });
          let pending_tx_length = await agreement.getPendingTxsLength2.call();
          assert.equal(pending_tx_length.toNumber(), 0);
        });

        it("adds all user_2's pending tx to confirmedTransactions", async () => {
          let conf_txs_length_before = await agreement.getConfirmedTxsLength.call()
          assert.equal(conf_txs_length_before.toNumber(), 0);

          await agreement.confirmAll({ from: secondAccount });

          let conf_txs_length_after = await agreement.getConfirmedTxsLength.call()
          assert.equal(conf_txs_length_after.toNumber(), 3);
        });

        it("doesn't affect user_1's pending tx", async () => {
          let p1_length_before = await agreement.getPendingTxsLength1.call();
          assert.equal(p1_length_before.toNumber(), 3);

          await agreement.confirmAll({ from: secondAccount });

          let p1_length_after = await agreement.getPendingTxsLength1.call();
          assert.equal(p1_length_after.toNumber(), 3);
        });

        it("updates balance in storage", async () => {
          let bal_before = await agreement.balance.call();

          await agreement.confirmAll({ from: secondAccount });

          let bal_after = await agreement.balance.call();
          assert.equal(bal_after.toNumber(), bal_before.toNumber() - 45); // tx amounts: 50 - 30  +50/2
        });
      });
    });

    describe("confirmSingleTx", function () {
      it("reverts when unregistered account try to confirmSingleTx", async () => {
        try {
          await agreement.confirmSingleTx(0, { from: thirdAccount })   // unregistered account tries to add a deb  );
          assert.fail();
        } catch (err) {
          assert.include(err.message, 'revert');
        }
      });

      describe("confirmSingleTx as user_1", function () {
        it("reduces length of pendingTxList by one", async () => {
          /// when user_1 deletes, tx is removed from user_2's list
          let length_before = await agreement.getPendingTxsLength1();

          await agreement.confirmSingleTx(4); // tx ID 4 is the first tx created by user_2, to be confirmed by user_1
          let length_after = await agreement.getPendingTxsLength1();
          assert.equal(length_after.toNumber(), length_before.toNumber() - 1);
        });

        it("removes the pending Tx ID from the pendingTxList", async () => {
          let tx_struct = await agreement.pendingTxs1(4);
          let tx_id = tx_struct[6].toNumber();

          await agreement.confirmSingleTx(4);

          let pending_txs_length = await agreement.getPendingTxsLength1();
          let pending_txs = []

          for (let i = 0; i < pending_txs_length; i++) {  // check that tx_ID is no longer present
            let list_element = await agreement.pendingTxsList1(i)
            pending_txs.push(list_element.toNumber())
          }
          assert.notInclude(pending_txs, tx_id)
        });

        it("adds it to confirmedTx array", async () => {
          let tx_id = await agreement.pendingTxsList1(0); // tx at slot 0

          await agreement.confirmSingleTx(4); // tx with ID = 4

          conf_length = await agreement.getConfirmedTxsLength()

          let latest_confirmed = await agreement.confirmedTxsList(conf_length - 1)
          assert.equal(latest_confirmed.toNumber(), tx_id.toNumber()) // check the txs have the same id
        });

        it("increases confirmedTx length by one", async () => {
          let conf_length_before = await agreement.getConfirmedTxsLength();

          await agreement.confirmSingleTx(4);

          let conf_length_after = await agreement.getConfirmedTxsLength();
          assert.equal(conf_length_before.toNumber() + 1, conf_length_after.toNumber());
        });

        it("doesn't affect user_2's pending tx", async () => {
          let p2_length_before = await agreement.getPendingTxsLength2();

          await agreement.confirmSingleTx(4);

          let p2_length_after = await agreement.getPendingTxsLength2();
          assert.equal(p2_length_after.toNumber(), p2_length_before.toNumber());
        });

        it("updates balance in storage", async () => {
          let bal_before = await agreement.balance();

          await agreement.confirmSingleTx(4);

          let bal_after = await agreement.balance();
          assert.equal(bal_after.toNumber(), bal_before.toNumber() - 500);
        });
      });

      describe("confirmSingleTx as user_2", function () {
        it("reduces length of pendingTxList by one", async () => {
          /// when user_1 deletes, tx is removed from user_2's list
          let length_before = await agreement.getPendingTxsLength2();
          await agreement.confirmSingleTx(2, { from: secondAccount });
          let length_after = await agreement.getPendingTxsLength2();
          assert.equal(length_after.toNumber(), length_before.toNumber() - 1);
        });

        it("removes the pending Tx ID from the pendingTxList", async () => {
          let tx_struct = await agreement.pendingTxs2(2);
          let tx_id = tx_struct[6].toNumber();

          await agreement.confirmSingleTx(2, { from: secondAccount });

          let pending_txs_length = await agreement.getPendingTxsLength2();
          let pending_txs = []

          for (let i = 0; i < pending_txs_length; i++) {  // check that tx_ID is no longer present
            let list_element = await agreement.pendingTxsList2(i)
            pending_txs.push(list_element.toNumber())
          }
          assert.notInclude(pending_txs, tx_id)
        });

        it("adds it to confirmedTx array", async () => {
          let tx_id = await agreement.pendingTxsList2(1);  // tx at slot 1
          await agreement.confirmSingleTx(2, { from: secondAccount });  // tx with ID = 2

          conf_length = await agreement.getConfirmedTxsLength()

          let latest_confirmed = await agreement.confirmedTxsList(conf_length - 1)
          assert.equal(latest_confirmed.toNumber(), tx_id.toNumber()) // check the txs have the same id
        });

        it("increases confirmedTx length by one", async () => {
          let conf_length_before = await agreement.getConfirmedTxsLength.call();

          await agreement.confirmSingleTx(2, { from: secondAccount });

          let conf_length_after = await agreement.getConfirmedTxsLength();
          assert.equal(conf_length_before.toNumber() + 1, conf_length_after.toNumber());
        });

        it("doesn't affect user_1's pending tx", async () => {
          let p1_length_before = await agreement.getPendingTxsLength1.call();

          await agreement.confirmSingleTx(2, { from: secondAccount });

          let p1_length_after = await agreement.getPendingTxsLength1.call();
          assert.equal(p1_length_after.toNumber(), p1_length_after.toNumber());
        });

        it("updates balance in storage", async () => {
          let bal_before = await agreement.balance.call();

          await agreement.confirmSingleTx(2, { from: secondAccount });

          let bal_after = await agreement.balance.call();
          assert.equal(bal_after.toNumber(), bal_before.toNumber() - 50);
        });
      });
    });

    describe('userDeletePendingTx', function () {
      it("reverts when unregistered account tries to deletePending", async () => {
        try {
          await agreement.userDeletePendingTx(1, { from: thirdAccount });
          assert.fail();
        } catch (err) {
          assert.include(err.message, 'revert');
        }
      });

      it("reverts when user_1 tries to delete a pendingTx user_2 created", async () => {
        try {
          await agreement.userDeletePendingTx(4);
          assert.fail();
        } catch (err) {
          assert.include(err.message, 'revert');
        }
      });

      it("reverts when user_2 tries to delete a pendingTx user_1 created", async () => {
        try {
          await agreement.userDeletePendingTx(1, { from: secondAccount });
          assert.fail();
        } catch (err) {
          assert.include(err.message, 'revert');
        }
      });

      it("reverts when user tries to delete a pendingTx that doesn't exist", async () => {
        try {
          await agreement.userDeletePendingTx(7);
          assert.fail();
        } catch (err) {
          assert.include(err.message, 'revert');
        }
      });

      it("reduces length of pendingTxList by one", async () => {
        /// when user_1 deletes, tx is removed from user_2's list
        let length_before = await agreement.getPendingTxsLength2();
        await agreement.userDeletePendingTx(2);
        let length_after = await agreement.getPendingTxsLength2();
        assert.equal(length_after.toNumber(), length_before.toNumber() - 1);
      });

      it("logs the index of the deleted tx in an event", async () => {
        let transaction = await agreement.userDeletePendingTx(1); // delete tx with ID 1
        let tx_index = transaction.logs[0].args[1].toNumber()

        assert.equal(tx_index, 0)  // check tx was element with index 0 in the pendingTx list 
      });

      it("removes the pending Tx ID from the pendingTxList", async () => {
        let tx_struct = await agreement.pendingTxs2(1);
        let tx_id = tx_struct[6].toNumber();
        let index = tx_struct[8].toNumber();

        await agreement.userDeletePendingTx(1);

        let pending_txs_length = await agreement.getPendingTxsLength2();
        let pending_txs = []

        for (let i = 0; i < pending_txs_length; i++) {  // check that tx_ID is no longer present
          let list_element = await agreement.pendingTxsList2(i)
          pending_txs.push(list_element.toNumber())
        }
        assert.notInclude(pending_txs, tx_id)
      });

      it("moves the last tx ID in the pendingTxList to the empty slot left by the deleted tx ID", async () => {
        let tx_struct = await agreement.pendingTxs2(2)
        let index = tx_struct[8].toNumber();
        let pending_txs_length = await agreement.getPendingTxsLength2();
        let last_txID_beforeMove = await agreement.pendingTxsList2(pending_txs_length - 1)  // grab id of tx at end of pendingTxs list
        await agreement.userDeletePendingTx(2);

        let new_txID_at_index = await agreement.pendingTxsList2(index);
        assert.equal(new_txID_at_index.toNumber(), last_txID_beforeMove.toNumber());
      });
    });

    describe('balanceHealthCheck', function () {
      it("Verifies the running balance equals sum of all confirmed txs", async () => {
        let start_balances = await agreement.balanceHealthCheck();

        assert.equal(start_balances[0].toNumber(), start_balances[1].toNumber());
        assert.isTrue(start_balances[2]);

        await agreement.confirmAll();
        await agreement.confirmAll({ from: secondAccount });

        let latest_balances = await agreement.balanceHealthCheck.call();
        assert.equal(latest_balances[0].toNumber(), latest_balances[1].toNumber());
        assert.isTrue(start_balances[2]);
      });

      it("Reverts when called from unathorized account", async () => {
        try {
          await agreement.balanceHealthCheck({ from: thirdAccount });
          assert.fail();
        } catch (err) {
          assert.include(err.message, 'revert');
        }
      });
    });
  });

  describe('Attempt to transact with contract with only 1 user registered', function () {
    beforeEach(async () => {
      //simulate agreement creation from firstAccount, via AgreementFactory
      agreementFactory = await AgreementFactory.new();
      agreementTx = await agreementFactory.createNewAgreement();
      agreementAddr = agreementTx.logs[0].args[1];
      agreement = await Agreement.at(agreementAddr);
    });

    it("reverts when user_1 tries to createPending", async () => {
      try {
        await agreement.createPending(
          amount = 50,
          split = false,
          debtor = secondAccount,
          description = 'I bought him sushi',
        );
        assert.fail();
      } catch (err) {
        assert.include(err.message, 'revert');
      }
    });

    //Somewhat redundant, as user_1 has no pending tx's to confirm
    it("reverts when user_1 tries to confirm all transactions", async () => {
      try {
        await agreement.confirmAll();
        assert.fail();
      } catch (err) {
        assert.include(err.message, 'revert');
      }
    });

    it("reverts when user_1 tries to confirm a single tx", async () => {
      try {
        await agreement.confirmSingleTx(0);
        assert.fail();
      } catch (err) {
        assert.include(err.message, 'revert');
      }
    });
  });
});