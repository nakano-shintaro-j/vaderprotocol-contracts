const { expect } = require("chai");
var Utils = artifacts.require('./Utils')
var Vether = artifacts.require('./Vether')
var Vader = artifacts.require('./Vader')
var VSD = artifacts.require('./VSD')
var Vault = artifacts.require('./Vault')
var Asset = artifacts.require('./Token1')
var Anchor = artifacts.require('./Token2')

const BigNumber = require('bignumber.js')
const truffleAssert = require('truffle-assertions')

function BN2Str(BN) { return ((new BigNumber(BN)).toFixed()) }
function getBN(BN) { return (new BigNumber(BN)) }

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

var utils; var vader; var vether; var usdv; var vault; var anchor; var asset;
var acc0; var acc1; var acc2; var acc3; var acc0; var acc5;
const one = 10**18

before(async function() {
  accounts = await ethers.getSigners();
  acc0 = await accounts[0].getAddress()
  acc1 = await accounts[1].getAddress()
  acc2 = await accounts[2].getAddress()
  acc3 = await accounts[3].getAddress()

  utils = await Utils.new();
  vether = await Vether.new();
  vader = await Vader.new(vether.address);
  usdv = await VSD.new(vader.address, utils.address);
  vault = await Vault.new(vader.address, usdv.address, utils.address);
  asset = await Asset.new();
  anchor = await Anchor.new();

  console.log('acc0:', acc0)
  console.log('acc1:', acc1)
  console.log('acc2:', acc2)
  console.log('utils:', utils.address)
  console.log('vether:', vether.address)
  console.log('vader:', vader.address)
  console.log('usdv:', usdv.address)
  console.log('vault:', vault.address)

  await usdv.setVault(vault.address)
  expect(await usdv.VAULT()).to.equal(vault.address);

  await vether.transfer(acc1, BN2Str(6006)) 
  await anchor.transfer(acc1, BN2Str(2000))
  await anchor.approve(vault.address, BN2Str(one), {from:acc1})
  await asset.transfer(acc1, BN2Str(2000))
  await asset.approve(vault.address, BN2Str(one), {from:acc1})
// acc  | VTH | VADER  | VSD | Anr  |  Ass |
// vault|   0 |    0 |    0 |    0 |    0 |
// acc1 |2002 |    0 |    0 | 2000 | 2000 |

  await vether.approve(vader.address, '6000', {from:acc1})
  await vader.upgrade(BN2Str(6000), {from:acc1}) 
  await usdv.convert(BN2Str(3000), {from:acc1})
// acc  | VTH | VADER  | VSD | Anr  |  Ass |
// vault|   0 |    0 |    0 |    0 |    0 |
// acc1 |   0 | 3000 | 3000 | 2000 | 2000 |

})


describe("Deploy", function() {
  it("Should deploy", async function() {
    expect(await vault.DAO()).to.equal(acc0);
    expect(await vault.UTILS()).to.equal(utils.address);
    expect(await vault.VADER()).to.equal(vader.address);
    expect(await vault.VSD()).to.equal(usdv.address);
  });
});


describe("Add liquidity", function() {
  it("Should add anchor", async function() {
    let tx = await vault.addLiquidity(vader.address, '1000', anchor.address, '1000', {from:acc1})
    // console.log(BN2Str(tx.logs[0].args.baseAmount))
    // console.log(BN2Str(tx.logs[0].args.tokenAmount))
    // console.log(BN2Str(tx.logs[0].args.liquidityUnits))
    // console.log(BN2Str(tx.logs[0].args.totalUnits))

    expect(BN2Str(await vault.mapToken_Units(anchor.address))).to.equal('1000');
    expect(BN2Str(await vault.mapToken_baseAmount(anchor.address))).to.equal(BN2Str(1000));
    expect(BN2Str(await vault.mapToken_tokenAmount(anchor.address))).to.equal('1000');
    expect(BN2Str(await vault.mapTokenMember_Units(anchor.address, acc1))).to.equal('1000');
  });
  it("Should add asset vdr-usdv", async function() {
    let tx = await vault.addLiquidity(usdv.address, '1000', vader.address, '1000', {from:acc1})
    // console.log(BN2Str(tx.logs[0].args.baseAmount))
    // console.log(BN2Str(tx.logs[0].args.tokenAmount))
    // console.log(BN2Str(tx.logs[0].args.liquidityUnits))
    // console.log(BN2Str(tx.logs[0].args.totalUnits))

    expect(BN2Str(await vault.mapToken_Units(vader.address))).to.equal('1000');
    expect(BN2Str(await vault.mapToken_baseAmount(vader.address))).to.equal(BN2Str(1000));
    expect(BN2Str(await vault.mapToken_tokenAmount(vader.address))).to.equal('1000');
    expect(BN2Str(await vault.mapTokenMember_Units(vader.address, acc1))).to.equal('1000');
  });
  it("Should add asset", async function() {
    let tx = await vault.addLiquidity(usdv.address, '1000', asset.address, '1000', {from:acc1})
    // console.log(BN2Str(tx.logs[0].args.baseAmount))
    // console.log(BN2Str(tx.logs[0].args.tokenAmount))
    // console.log(BN2Str(tx.logs[0].args.liquidityUnits))
    // console.log(BN2Str(tx.logs[0].args.totalUnits))

    expect(BN2Str(await vault.mapToken_Units(asset.address))).to.equal('1000');
    expect(BN2Str(await vault.mapToken_baseAmount(asset.address))).to.equal(BN2Str(1000));
    expect(BN2Str(await vault.mapToken_tokenAmount(asset.address))).to.equal('1000');
    expect(BN2Str(await vault.mapTokenMember_Units(asset.address, acc1))).to.equal('1000');
  });
});
// acc  | VTH | VADER  | VSD | Anr  |  Ass |
// vault|   0 | 2000 | 2000 | 1000 | 1000 |
// acc1 |   0 | 1000 | 1000 | 1000 | 1000 |

describe("Should Swap From VADER", function() {
  it("Swap to VSD", async function() {
    let tx = await vault.swap(vader.address, '250', usdv.address, {from:acc1})
    expect(BN2Str(await vader.balanceOf(acc1))).to.equal('750');
    expect(BN2Str(await vault.mapToken_tokenAmount(vader.address))).to.equal('1250');
    expect(BN2Str(await vault.mapToken_baseAmount(vader.address))).to.equal('840');
    expect(BN2Str(await usdv.balanceOf(acc1))).to.equal('1160');
  });

it("Swap to Asset", async function() {
  let tx = await vault.swap(vader.address, '250', asset.address, {from:acc1})
  expect(BN2Str(await vader.balanceOf(acc1))).to.equal('500');
  expect(BN2Str(await vault.mapToken_tokenAmount(vader.address))).to.equal('1500');
  expect(BN2Str(await vault.mapToken_baseAmount(vader.address))).to.equal('724');
  expect(BN2Str(await vault.mapToken_baseAmount(asset.address))).to.equal('1116');
  expect(BN2Str(await vault.mapToken_tokenAmount(asset.address))).to.equal('907');
  expect(BN2Str(await asset.balanceOf(acc1))).to.equal('1093');
});

it("Swap to Anchor", async function() {
  let tx = await vault.swap(vader.address, '250', anchor.address, {from:acc1})
  expect(BN2Str(await vader.balanceOf(acc1))).to.equal('250');
  expect(BN2Str(await vault.mapToken_baseAmount(anchor.address))).to.equal('1250');
  expect(BN2Str(await vault.mapToken_tokenAmount(anchor.address))).to.equal('840');
  expect(BN2Str(await anchor.balanceOf(acc1))).to.equal('1160');
});

});
describe("Should Swap From VSD", function() {
  it("Swap to VADER", async function() {
    let tx = await vault.swap(usdv.address, '250', vader.address, {from:acc1})
    expect(BN2Str(await usdv.balanceOf(acc1))).to.equal('910');
    expect(BN2Str(await vault.mapToken_tokenAmount(vader.address))).to.equal('1214');
    expect(BN2Str(await vault.mapToken_baseAmount(vader.address))).to.equal('974');
    expect(BN2Str(await vader.balanceOf(acc1))).to.equal('536');
  });
it("Swap to Asset", async function() {
  let tx = await vault.swap(usdv.address, '250', asset.address, {from:acc1})
  expect(BN2Str(await usdv.balanceOf(acc1))).to.equal('660');
  expect(BN2Str(await vault.mapToken_baseAmount(asset.address))).to.equal('1366');
  expect(BN2Str(await vault.mapToken_tokenAmount(asset.address))).to.equal('772');
  expect(BN2Str(await asset.balanceOf(acc1))).to.equal('1228');
});

it("Swap to Anchor", async function() {
  let tx = await vault.swap(usdv.address, '250', anchor.address, {from:acc1})
  expect(BN2Str(await vader.balanceOf(acc1))).to.equal('536');
  expect(BN2Str(await vault.mapToken_baseAmount(vader.address))).to.equal('1224');
  expect(BN2Str(await vault.mapToken_tokenAmount(vader.address))).to.equal('1017');
  expect(BN2Str(await vault.mapToken_baseAmount(anchor.address))).to.equal('1447');
  expect(BN2Str(await vault.mapToken_tokenAmount(anchor.address))).to.equal('742');
  expect(BN2Str(await anchor.balanceOf(acc1))).to.equal('1258');
});



});
