const {assertRevert} = require('./helpers/assertThrow');
const {createManyAgreements} = require('./helpers/agreementFactory');
const AgreementManager = artifacts.require('AgreementManager');
const Agreement1_1 = artifacts.require('Agreement1_1');
const StandardECMToken = artifacts.require("StandardECMToken");

contract('Agreement basic management - creation, removal', async (accounts) => {

  const creator = accounts[0];
  var tests = [
    {extra: {}, title: "A1.1 (no arguments)"},
    {extra: {price: 1000}, title: "A1.1 (price)"},
    {extra: {price: 1500, contractOut: {advancePayment: 250, timeToFallback: 50}}, title: "A1.2 (contractOut)"}
  ];

  tests.forEach(function(test) {

    let testManager;
    let createTransactions = [];
    let agreementAddress = {};

    before(async () => {
      testManager = await AgreementManager.deployed();
    })

    it('Agreement creation events '+test.title, async () => {

      let before = await testManager.search.call();
      assert.isTrue(before.every((e) => {return e == 0;}),'expected to be zeros before');

      createTransactions = await createManyAgreements(
        testManager,
        [{
          address: creator,
          count: 1,
          name: ["0","0"],
          description: ["0","0","0","0","0","0","0","0"],
          extra: test.extra
        }]
      );

      assert.equal(createTransactions[0].logs.length, 1, 'one event generated');
      assert.equal(createTransactions[0].logs[0].event, 'AgreementCreation', 'event name', 'event desciption');

    })

    it('Checking if contract exists under given address '+test.title, async () => {

      agreementAddress = createTransactions[0].logs[0].args.created;

      assert.notEqual(agreementAddress, 0, 'should have valid address');

      let codeOfAgreementBefore = await web3.eth.getCode(agreementAddress);
      assert.notEqual(codeOfAgreementBefore, '0x0', 'should have some code');

    })

    it('Checking if search results match events logs '+test.title, async () => {

      let one = (await testManager.search.call()).filter((e) => {return e != 0;});
      assert.lengthOf(one, 1,'exactly one non zero');
      assert.equal(one[0], agreementAddress, 'manager should return the same address');

    })

    it('Test if agreement did selfdestruction '+test.title, async () => {
      let agreement = await Agreement1_1.at(agreementAddress);
      await agreement.remove({from: creator});

      let codeOfAgreementAfter = await web3.eth.getCode(agreementAddress);
      assert.equal(codeOfAgreementAfter, '0x0', 'should have none');

      let after = await testManager.search.call();
      assert.isTrue(after.every((e) => {return e == 0;}),'expected to be zeros after');

    })
  })

})

contract('Agreement basic management - remove selected', async (accounts) => {

  let testManager;
  let agreements;

  before(async () => {
    testManager = await AgreementManager.deployed();
  })

  it('Checking if two agreements were created', async () => {

    assert.isTrue(
      (await testManager.search.call()).every((e) => {return e == 0;}),
      'expected to be zeros before'
    );

    await createManyAgreements(testManager, [{address: accounts[0], count: 2, name: ["0","0"], description: ["0","0","0","0","0","0","0","0"]}]);

    agreements = await testManager.search.call();
    assert.equal(agreements.filter((e) => {return e != 0;}).length, 2, 'Should be two non zero records');

  })

  it('Check if event logs and search results match', async () => {

    let creationLogs = await (new Promise(function(resolve,reject) {
      testManager.AgreementCreation({},{fromBlock: 0, toBlock: 'latest'})
                                          .get((error, eventResult) => {
                                            if(error)
                                              return reject(error);
                                            else
                                              return resolve(eventResult);
                                          });
    }));

    assert.equal(creationLogs.length, 2, 'Should be two events');
    assert.include(
      agreements.toString(),
      creationLogs.map((l) => {return l.args.created}),
      'Search and logs should match'
    );

  })

  it('Test if only selected agreement is removed', async () => {

    let createdAgreements = agreements.filter((e) => {return e != 0;});
    let agreementToBeRemoved = await Agreement1_1.at(createdAgreements[0]);
    await agreementToBeRemoved.remove({from: accounts[0]});

    let after = await testManager.search.call();
    assert.notInclude(after, createdAgreements[0],'no longer exists');
    assert.include(after, createdAgreements[1], 'second agreement still tracked');
    assert.equal(await web3.eth.getCode(createdAgreements[0]), '0x0', 'should be destroyed');
    assert.notEqual(await web3.eth.getCode(createdAgreements[1]), '0x0', 'should be untouched');

  })
})

contract('Agreement1_1 basic management - permissions to remove', async (accounts) => {

  let testManager;
  let agreementsAddresses = [];

  before(async () => {
    testManager = await AgreementManager.deployed();
  })

  it('Check if correctly created', async () => {

    let before = await testManager.search.call();
    assert.isTrue(before.every((e) => {return e == 0;}),'expected to be zeros before');

    let createTransactions = await createManyAgreements(
      testManager,
      [{address: accounts[0], count: 2, name: ["0", "0"], description: ["0","0","0","0","0","0","0","0"]},{address: accounts[1], count: 1, name: ["0", "0"], description: ["0","0","0","0","0","0","0","0"]}]
    );

    agreementsAddresses = (await testManager.search.call()).filter((e) => {return e != 0;});
    assert.equal(agreementsAddresses.length, 3, 'Should be three non zero records');

  })

  it('Test if only creator can remove agreement', async () => {

    let agreements = await Promise.all(agreementsAddresses.map((e) => {return Agreement1_1.at(e);}));

    await assertRevert(agreements[2].remove({from: accounts[0]}),'3rd should revert');
    await assertRevert(agreements[0].remove({from: accounts[1]}),'1st should revert');

    assert.equal(
      (await testManager.search.call()).filter((e) => {return e != 0;}).length,
      3,
      'Should be three non zero records'
    );
  })

  it('Test if contracts still exists', async () => {
    var i;
    for(i = 0; i < agreementsAddresses.length; i++ ) {
      assert.notEqual(await web3.eth.getCode(agreementsAddresses[i]), '0x0', 'should be untouched');

    }
  })
})

contract('AgreementManager - check if agreements is registered', async(accounts) =>
{

  let testManager;
  let createTransactions = [];
  let agreement;
  before(async () => {
    testManager = await AgreementManager.deployed();
    createTransactions = await createManyAgreements(testManager, [{
      address: accounts[0],
      count: 1,
      name: ["0","0"],
      description: ["0","0","0","0","0","0","0","0"]
    }]);
  })

  it('Test if agreements create by Agreement1_1 Manager are registered', async () =>{
        agreement = createTransactions[0].logs[0].args.created;
        assert.isTrue(await testManager.checkReg.call(agreement),'agreement is register to Agreement1_1 Manager');
  })

  it('Test if checkReg func returns false on alien agreement', async () =>{
    let number = await web3.toBigNumber('200000000000000000000001');
    let alienAgreement = await Agreement1_1.new(
      testManager.address,
      accounts[1],
      accounts[2],
      number,
      100,
      ["0","0"],
      ["0","0","0","0","0","0","0","0"]
    );
    assert.isNotTrue(await testManager.checkReg.call(alienAgreement.address),'agreement should be unknow to Agreement1_1 Manager');
  })
})
