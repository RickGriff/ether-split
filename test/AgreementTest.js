
const Agreement = artifacts.require("Agreement");

contract("Agreement", accounts => {
  const [firstAccount, secondAccount, thirdAccount] = accounts;

describe('Deployment and user registration', function() {
  //deployment sets user_1
  it("registers user_1", async () => {
       const agreement = await Agreement.new();
      assert.equal(await agreement.user_1.call(), firstAccount);
    });

  //user_1 can invite a friend
  it("sets the invited friends address", async () => {
    const agreement = await Agreement.new();
    await agreement.inviteFriend(secondAccount);
    assert.equal(await agreement.invited_friend.call(), secondAccount);
  });

  //invited friend can register as user_2
  it("registers invited friend as user_2", async () => {
    const agreement = await Agreement.new();
    await agreement.inviteFriend(secondAccount);  // invite secondAccount from user_1. There is likely a better way to simulate an invited friend.
    await agreement.registerUser2({from: secondAccount});  // register as user_2, from secondAccount
    assert.equal(await agreement.user_2.call(), secondAccount);
  });

  //uninvited acccount can NOT register
  it("does not allow uninvited account to register", async () => {
    const agreement = await Agreement.new();
    await agreement.inviteFriend(secondAccount);  // invite secondAccount from user_1
    try {
        await agreement.registerUser2({from: thirdAccount});  // uninivited account tries to register
        assert.fail();
      } catch (err) {
        assert.ok(/revert/.test(err.message));
      }
    });

  //Can't invite new friend once there are 2 users
  it("does not allow more invites after 2 users are registered", async () => {
    const agreement = await Agreement.new();
    await agreement.inviteFriend(secondAccount);
    await agreement.registerUser2({from: secondAccount});
    try {
        await agreement.inviteFriend(thirdAccount, {from: firstAccount});  // uninivited account tries to register
        assert.fail();
      } catch (err) {
        assert.ok(/revert/.test(err.message));
      }
    });
  });

  describe('Create pending transactions', function() {
    let agreement;

  beforeEach(async () => {
    agreement = await Agreement.new();
    await agreement.inviteFriend(secondAccount);
    await agreement.registerUser2({from: secondAccount});
  });

    it("creates a pending transaction as user_1", async () => {
      await agreement.createPending(
        amount=50,
        split=false,
        debtor=secondAccount,
        description='I bought him sushi',
      );

      assert.equal(await agreement.pendingTxs1Length.call(), 0);
      assert.equal(await agreement.pendingTxs2Length.call(), 1);  // tx is added to user_2's pending tx list
    });

    it("creates a pending transaction as user_2", async () => {
      await agreement.createPending(
        amount=1000,
        split=false,
        debtor=firstAccount,
        description='I bought her a dog',
        {from: secondAccount}  // user_2 creates tx
      );

      assert.equal(await agreement.pendingTxs1Length.call(), 1); // tx is added to user_1's pending tx list
      assert.equal(await agreement.pendingTxs2Length.call(), 0);
    });
  });

  describe("Confirm all pending transactions", function() {
    let agreement;
    // TODO Implement more concise instantiation of registered users / pending txs for use in tests
    beforeEach(async () => {
      agreement = await Agreement.new();
      await agreement.inviteFriend(secondAccount);
      await agreement.registerUser2({from: secondAccount});
      // create 2 pending transactions as user_1
      await agreement.createPending(
        amount=30,
        split=false,
        debtor=secondAccount,
        description='I bought her sushi',
      );
      await agreement.createPending(
        amount=50,
        split=false,
        debtor=firstAccount,
        description='She bought me Nandos',
      );
      // create 2 pending transactions as user_2
      await agreement.createPending(
        amount=500,
        split=false,
        debtor=firstAccount,
        description='I bought him a bike',
        {from: secondAccount}  // user_2 creates tx
      );
      await agreement.createPending(
        amount=1,
        split=false,
        debtor=firstAccount,
        description='I bought him a newspaper',
        {from: secondAccount}
      );
      });

      it ("has pending transactions for each user", async () => {
        assert.equal(await agreement.pendingTxs1Length.call().valueOf(), 2);
        assert.equal(await agreement.pendingTxs2Length.call().valueOf(), 2);
      });


      context("As user_1:", function() {
        it("deletes all user_1's pending transactions", async () => {
          await agreement.confirmAll();
          let pending_tx_length = await agreement.pendingTxs1Length.call();
          assert.equal(pending_tx_length.toNumber(), 0);
        });

        it("adds all user_1's pending tx to confirmedTransactions", async () => {

          let conf_txs_length_before = await agreement.confirmedTxsLength.call()
          assert.equal(conf_txs_length_before.toNumber(), 0 );
          // first_tx = await agreement.pendingTransactions_1.call(0);
          // second_tx = await agreement.pendingTransactions_1.call(1);

          await agreement.confirmAll();

          let conf_txs_length_after = await agreement.confirmedTxsLength.call()
          assert.equal(conf_txs_length_after.toNumber(), 2);
          // assert.equal(first, await agreement.confirmedTransactions.call(0));
          // assert.equal(second, await agreement.confirmedTransactions.call(1));
        });

        it("doesn't affect user_2's pending tx", async () => {
          let p2_length_before = await agreement.pendingTxs2Length.call();
          assert.equal(p2_length_before.toNumber(), 2);

          await agreement.confirmAll();

          let p2_length_after = await agreement.pendingTxs2Length.call();
          assert.equal(p2_length_after.toNumber(), 2);
        });

        it("updates balance in storage", async () => {
          let bal_before = await agreement.balance.call();

          await agreement.confirmAll();

          let bal_after = await agreement.balance.call();
          assert.equal(bal_after.toNumber(), bal_before.toNumber() - 501, ); // user_2 bought two things for user_1, of value 501.
        });
      });

      context("As user_2:", function() {
        it("deletes all user_2's pending transactions", async () => {
          await agreement.confirmAll({from: secondAccount});
          let pending_tx_length = await agreement.pendingTxs2Length.call();
          assert.equal(pending_tx_length.toNumber(), 0);
        });

        it("adds all user_2's pending tx to confirmedTransactions", async () => {
          let conf_txs_length_before = await agreement.confirmedTxsLength.call()
          assert.equal(conf_txs_length_before.toNumber(), 0 );
          // first_tx = await agreement.pendingTransactions_1.call(0);
          // second_tx = await agreement.pendingTransactions_1.call(1);
          await agreement.confirmAll({from: secondAccount});

          let conf_txs_length_after = await agreement.confirmedTxsLength.call()
          assert.equal(conf_txs_length_after.toNumber(), 2 );
          // assert.equal(first, await agreement.confirmedTransactions.call(0));
          // assert.equal(second, await agreement.confirmedTransactions.call(1));
        });

        it("doesn't affect user_1's pending tx", async () => {
          let p1_length_before = await agreement.pendingTxs1Length.call();
          assert.equal(p1_length_before.toNumber(), 2);

          await agreement.confirmAll({from: secondAccount});

          let p1_length_after = await agreement.pendingTxs1Length.call();
          assert.equal(p1_length_after.toNumber(), 2);
        });

        it("updates balance in storage", async () => {
          let bal_before = await agreement.balance.call();

          await agreement.confirmAll({from: secondAccount});

          let bal_after = await agreement.balance.call();
          assert.equal(bal_after.toNumber(), bal_before.toNumber() - 20, ); // user_1 owed 50, user_2 owed 30.
        });
      });
  });
});
