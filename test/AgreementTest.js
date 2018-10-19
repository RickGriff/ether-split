
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
});
