
const Agreement = artifacts.require("Agreement");

contract("Agreement", accounts => {
  const [firstAccount, secondAccount, thirdAccount] = accounts;

  describe('Deployment and user registration', function() {
    beforeEach(async () => {
      agreement = await Agreement.new();
      await agreement.inviteFriend(secondAccount);
    });

    it("registers the deploying account as user_1", async () => {
      let user_1 = await agreement.user_1.call()
      assert.equal(user_1, firstAccount);
    });

    it("sets the invited friend's address", async () => {
      let invited_friend = await agreement.invited_friend.call()
      assert.equal(invited_friend, secondAccount);
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

    it("does not allow more invites after 2 users are registered", async () => {
      await agreement.registerUser2({from: secondAccount});
      try {
        await agreement.inviteFriend(thirdAccount, {from: firstAccount});  // uninivited account tries to register
        assert.fail();
      } catch (err) {
        assert.include(err.message, 'revert');
      }
    });
  });

  describe ("Sets user's name",  function () {
    beforeEach(async () => {
      agreement = await Agreement.new();
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
      agreement = await Agreement.new();
      await agreement.inviteFriend(secondAccount);
      await agreement.registerUser2({from: secondAccount});
      counter_before = await agreement.txCounter.call();
    });

    describe('As user_1', function() {
      beforeEach(async () => {
        await agreement.createPending(amount=50, split=false, debtor=secondAccount, description='I bought him sushi');
      });

      it("creates a pending transaction", async () => {
        assert.equal(await agreement.pendingTxs1Length.call(), 0);
        assert.equal(await agreement.pendingTxs2Length.call(), 1);  // tx is added to user_2's pending tx list
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
        assert.equal(await agreement.pendingTxs1Length.call(), 1); // tx is added to user_1's pending tx list
        assert.equal(await agreement.pendingTxs2Length.call(), 0);
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

    it("reverts when debtor is not specified", async () => {
      try {
        // no debtor specified
        await agreement.createPending(amount=50, split=false, description='I bought him sushi');
        assert.fail();
      } catch (err) {
        assert.include(err.message, 'Invalid number of arguments');
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
  });

  describe("Confirming transactions", function() {
    beforeEach(
      async () => {
        agreement = await Agreement.new();
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
        let p1_length = await agreement.pendingTxs1Length.call();
        let p2_length = await agreement.pendingTxs2Length.call();
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
            let pending_tx_length = await agreement.pendingTxs1Length.call();
            assert.equal(pending_tx_length.toNumber(), 0);
          });

          it("adds all user_1's pending tx to confirmedTransactions", async () => {
            let conf_txs_length_before = await agreement.confirmedTxsLength.call()
            assert.equal(conf_txs_length_before.toNumber(), 0 );

            await agreement.confirmAll();

            let conf_txs_length_after = await agreement.confirmedTxsLength.call()
            assert.equal(conf_txs_length_after.toNumber(), 3);
          });

          it("doesn't affect user_2's pending tx", async () => {
            let p2_length_before = await agreement.pendingTxs2Length.call();
            assert.equal(p2_length_before.toNumber(), 3);

            await agreement.confirmAll();

            let p2_length_after = await agreement.pendingTxs2Length.call();
            assert.equal(p2_length_after.toNumber(), 3);
          });

          it("updates balance in storage", async () => {
            let bal_before = await agreement.balance.call();

            await agreement.confirmAll();

            let bal_after = await agreement.balance.call();
            assert.equal(bal_after.toNumber(), bal_before.toNumber() - 501, ); // user_2 bought two things for user_1, of value 501.
          });
        });

        describe("confirmAll as user_2", function() {
          it("deletes all user_2's pending transactions", async () => {
            await agreement.confirmAll({from: secondAccount});
            let pending_tx_length = await agreement.pendingTxs2Length.call();
            assert.equal(pending_tx_length.toNumber(), 0);
          });

          it("adds all user_2's pending tx to confirmedTransactions", async () => {
            let conf_txs_length_before = await agreement.confirmedTxsLength.call()
            assert.equal(conf_txs_length_before.toNumber(), 0 );

            await agreement.confirmAll({from: secondAccount});

            let conf_txs_length_after = await agreement.confirmedTxsLength.call()
            assert.equal(conf_txs_length_after.toNumber(), 3 );
          });

          it("doesn't affect user_1's pending tx", async () => {
            let p1_length_before = await agreement.pendingTxs1Length.call();
            assert.equal(p1_length_before.toNumber(), 3);

            await agreement.confirmAll({from: secondAccount});

            let p1_length_after = await agreement.pendingTxs1Length.call();
            assert.equal(p1_length_after.toNumber(), 3);
          });

          it("updates balance in storage", async () => {
            let bal_before = await agreement.balance.call();

            await agreement.confirmAll({from: secondAccount});

            let bal_after = await agreement.balance.call();
            assert.equal(bal_after.toNumber(), bal_before.toNumber() - 20, ); // user_1 owed 50, user_2 owed 30.
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
            let p1_length_before = await agreement.pendingTxs1Length.call();

            await agreement.confirmSingleTx(0);

            let p1_length_after = await agreement.pendingTxs1Length.call();
            assert.equal(p1_length_before.toNumber() - 1, p1_length_after.toNumber());
          });

          it("adds it to confirmedTx array", async () => {
            let tx = await agreement.pendingTransactions_1(0);

            await agreement.confirmSingleTx(0);

            let latest_confirmed = await agreement.confirmedTransactions(0);
            assert.equal(latest_confirmed[6].toNumber(), tx[6].toNumber(), "the transaction is now in the confirmed txs list") // check the txs have the same index
          });

          it("increases confirmedTx length by one", async () => {
            let conf_length_before = await agreement.confirmedTxsLength.call();

            await agreement.confirmSingleTx(0);

            let conf_length_after = await agreement.confirmedTxsLength.call();
            assert.equal(conf_length_before.toNumber() + 1, conf_length_after.toNumber());
          });

          it("doesn't affect user_2's pending tx", async () => {
            let p2_length_before = await agreement.pendingTxs2Length.call();
            assert.equal(p2_length_before.toNumber(), 3);

            await agreement.confirmSingleTx(0);

            let p2_length_after = await agreement.pendingTxs2Length.call();
            assert.equal(p2_length_after.toNumber(), 3);
          });

          it("updates balance in storage", async () => {
            let bal_before = await agreement.balance.call();

            await agreement.confirmSingleTx(0);

            let bal_after = await agreement.balance.call();
            assert.equal(bal_after.toNumber(), bal_before.toNumber() - 500, ); // user_1 owed 50, user_2 owed 30.
          });

          it("doesn't change balance if purchase was split", async () => {
            let bal_before = await agreement.balance.call();
            await agreement.confirmSingleTx(2);  // confirm the split tx
            let bal_after = await agreement.balance.call();
            assert.equal(bal_after.toNumber(), bal_before.toNumber())
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
            let p2_length_before = await agreement.pendingTxs1Length.call();

            await agreement.confirmSingleTx(0, {from: secondAccount});

            let p2_length_after = await agreement.pendingTxs2Length.call();
            assert.equal(p2_length_before.toNumber() - 1, p2_length_after.toNumber());
          });

          it("adds it to confirmedTx array", async () => {
            let tx = await agreement.pendingTransactions_2(0);

            await agreement.confirmSingleTx(0, {from: secondAccount});

            let latest_confirmed = await agreement.confirmedTransactions(0);
            assert.equal(latest_confirmed[6].toNumber(), tx[6].toNumber(), "the transaction is now in the confirmed txs list") // check the txs have the same index
          });

          it("increases confirmedTx length by one", async () => {
            let conf_length_before = await agreement.confirmedTxsLength.call();

            await agreement.confirmSingleTx(0, {from: secondAccount});

            let conf_length_after = await agreement.confirmedTxsLength.call();
            assert.equal(conf_length_before.toNumber() + 1, conf_length_after.toNumber());
          });

          it("doesn't affect user_1's pending tx", async () => {
            let p1_length_before = await agreement.pendingTxs1Length.call();
            assert.equal(p1_length_before.toNumber(), 3);

            await agreement.confirmSingleTx(0, {from: secondAccount});

            let p1_length_after = await agreement.pendingTxs1Length.call();
            assert.equal(p1_length_after.toNumber(), 3);
          });

          it("updates balance in storage", async () => {
            let bal_before = await agreement.balance.call();

            await agreement.confirmSingleTx(0, {from: secondAccount});

            let bal_after = await agreement.balance.call();
            assert.equal(bal_after.toNumber(), bal_before.toNumber() + 30, ); // user_1 owed 50, user_2 owed 30.
          });

          it("doesn't change balance if purchase was split", async () => {
            let bal_before = await agreement.balance.call();
            await agreement.confirmSingleTx(2);  // confirm the split tx
            let bal_after = await agreement.balance.call();
            assert.equal(bal_after.toNumber(), bal_before.toNumber())
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

      describe('balanceHealthcheck', function() {

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
      });
    });

    describe('Attempt to transact with contract with only 1 user registered', function() {
      beforeEach(async () => {
        agreement = await Agreement.new();
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
