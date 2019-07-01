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
