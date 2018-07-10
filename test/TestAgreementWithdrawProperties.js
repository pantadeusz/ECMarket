const {createManyAgreements} = require('./helpers/agreementFactory');
const {assertRevert} = require('./helpers/assertThrow');
const {AgreementEnumerations} = require('./helpers/Enumerations');
const AgreementManager = artifacts.require('AgreementManager');
const Agreement = artifacts.require('Agreement');
const StandardECMToken = artifacts.require("StandardECMToken");

contract('Agreement withdraw properties', async (accounts) => {

  const creator = accounts[0];
  const buyer = accounts[1];
  const suplicant1 = accounts[2];
  const price = 1000;
  const buyerBalance = 2000;
  const suplicantBalance = 2000;
  let testManager;
  let testWallet;
  let agreement;

  before(async () => {
    testWallet = await StandardECMToken.deployed();
    testManager = await AgreementManager.deployed();
    let createTransactions = await createManyAgreements(
      testManager, [{
        address: creator,
        count: 1,
        price: price,
        name: ["0","0"],
        description: ["0","0","0","0","0","0","0","0"]
      }]
    );
    agreement = await Agreement.at(createTransactions[0].logs[0].args.created);
    await testWallet.payIn({from: buyer, value: buyerBalance});
    await testWallet.payIn({from: suplicant1, value: suplicantBalance});
  })

  beforeEach(async () => {
    accounts.forEach(async (account) => {
      if((await testWallet.allowance.call(agreement.address,account)).toNumber() !== 0){
        await testWallet.transferFrom(agreement.address, account, price,{from: account});
      }
    })
  })

  it('withdraw should fail if user is not participant', async () => {
    await assertRevert(agreement.withdraw({from: suplicant1}));
  })

  it('withdraw should fail if user is seller', async () => {
    await assertRevert(agreement.withdraw({from: creator}));
  })

  it('withdraw should allow transfer of tokens', async () => {
    await testWallet.approve(agreement.address, price, {from: suplicant1});
    await agreement.join({from: suplicant1});
    await agreement.withdraw({from: suplicant1});
    assert.equal(
      (await testWallet.allowance.call(agreement.address,suplicant1)),
      price,
      'Allowance for suplicant1 should be '+price
    )
  })

  it('after withdraw caller will be removed from participants list', async () => {
    let participants = (await agreement.getParticipants.call()).filter((e) => {return e != 0;});
    assert.notInclude(
      participants.toString(),
      [suplicant1],
      "Creator or suplicant missing"
    );
  })

  it('after becoming buyer, withdraw should fail', async () => {

    await testWallet.approve(agreement.address, price, {from: buyer});
    await agreement.join({from: buyer});

    await testWallet.approve(agreement.address, price, {from: suplicant1});
    await agreement.join({from: suplicant1});

    await agreement.accept(buyer, {from: creator});

    await assertRevert(agreement.withdraw({from: buyer}));
  })

  it('Other suplicants will be able to withdraw tokens', async () => {
    await agreement.withdraw({from: suplicant1});
    assert.equal(
      (await testWallet.allowance.call(agreement.address,suplicant1)),
      price,
      'Allowance for suplicant1 should be '+price
    )
  })

})
