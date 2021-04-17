const { expect } = require("chai");
var Utils = artifacts.require('./Utils')
var Vether = artifacts.require('./Vether')
var Vader = artifacts.require('./Vader')
var USDV = artifacts.require('./USDV')
var Vault = artifacts.require('./Vault')
var Router = artifacts.require('./Router')
var Asset = artifacts.require('./Token1')
var Anchor = artifacts.require('./Token2')

const BigNumber = require('bignumber.js')
const truffleAssert = require('truffle-assertions')

function BN2Str(BN) { return ((new BigNumber(BN)).toFixed()) }
function getBN(BN) { return (new BigNumber(BN)) }

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

var utils; var vader; var vether; var usdv; var vault; var anchor; 
var asset; var asset2; var asset3;
var anchor0; var anchor1; var anchor2; var anchor3; var anchor4;  var anchor5; 
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
  vader = await Vader.new();
  usdv = await USDV.new();
  router = await Router.new();
  vault = await Vault.new();

})


describe("Deploy Router", function() {
  it("Should deploy", async function() {
    await vader.init(vether.address, usdv.address, utils.address)
    await usdv.init(vader.address, router.address)
    await router.init(vader.address, usdv.address, vault.address);
    await vault.init(vader.address, usdv.address, router.address);

    await vader.startEmissions()

    asset = await Asset.new();
    asset2 = await Asset.new();
    asset3 = await Asset.new();
    anchor = await Anchor.new();

    await vether.transfer(acc1, BN2Str(7407)) 
    await anchor.transfer(acc1, BN2Str(2000))
    await anchor.approve(router.address, BN2Str(one), {from:acc1})

    await vether.approve(vader.address, '7400', {from:acc1})
    await vader.upgrade(BN2Str(7400), {from:acc1}) 

    await asset.transfer(acc1, BN2Str(2000))
    await asset.approve(router.address, BN2Str(one), {from:acc1})
    await asset2.transfer(acc1, BN2Str(2000))
    await asset2.approve(router.address, BN2Str(one), {from:acc1})
    await asset3.transfer(acc1, BN2Str(2000))
    await asset3.approve(router.address, BN2Str(one), {from:acc1})

    await usdv.convertToUSDV(BN2Str(3000), {from:acc1})
    await usdv.transfer(acc0, '1', {from:acc1})
    await usdv.transfer(acc1, '1', {from:acc0})

    expect(await router.DAO()).to.equal(acc0);
    expect(await router.UTILS()).to.equal(utils.address);
    expect(await router.VADER()).to.equal(vader.address);
    expect(await router.USDV()).to.equal(usdv.address);

    expect(BN2Str(await vader.getDailyEmission())).to.equal('4');
    expect(BN2Str(await usdv.reserveUSDV())).to.equal('4');
    expect(BN2Str(await router.reserveUSDV())).to.equal('3');
    expect(BN2Str(await router.reserveVADER())).to.equal('5');
  });
});


describe("Add liquidity", function() {
  it("Should add anchor", async function() {
    await router.addLiquidity(vader.address, '1000', anchor.address, '1000', {from:acc1})
    expect(BN2Str(await vault.getUnits(anchor.address))).to.equal('1000');
    expect(BN2Str(await vault.getBaseAmount(anchor.address))).to.equal(BN2Str(1000));
    expect(BN2Str(await vault.getTokenAmount(anchor.address))).to.equal('1000');
    expect(BN2Str(await vault.getMemberUnits(anchor.address, acc1))).to.equal('1000');
  });
  it("Should add asset", async function() {
    let tx = await router.addLiquidity(usdv.address, '1000', asset.address, '1000', {from:acc1})
    expect(BN2Str(await vault.mapToken_Units(asset.address))).to.equal('1000');
    expect(BN2Str(await vault.mapToken_baseAmount(asset.address))).to.equal(BN2Str(1000));
    expect(BN2Str(await vault.mapToken_tokenAmount(asset.address))).to.equal('1000');
    expect(BN2Str(await vault.mapTokenMember_Units(asset.address, acc1))).to.equal('1000');
  });
  it("Should add asset2", async function() {
    let tx = await router.addLiquidity(usdv.address, '999', asset2.address, '999', {from:acc1})
    expect(BN2Str(await vault.mapToken_Units(asset2.address))).to.equal('999');
    expect(BN2Str(await vault.mapToken_baseAmount(asset2.address))).to.equal('999');
    expect(BN2Str(await vault.mapToken_tokenAmount(asset2.address))).to.equal('999');
    expect(BN2Str(await vault.mapTokenMember_Units(asset2.address, acc1))).to.equal('999');
  });
  it("Should add asset3", async function() {
    await router.addLiquidity(usdv.address, '999', asset3.address, '999', {from:acc1})
    expect(BN2Str(await vault.mapToken_Units(asset3.address))).to.equal('999');
    expect(BN2Str(await vault.mapToken_baseAmount(asset3.address))).to.equal('999');
    expect(BN2Str(await vault.mapToken_tokenAmount(asset3.address))).to.equal('999');
    expect(BN2Str(await vault.mapTokenMember_Units(asset3.address, acc1))).to.equal('999');
  });
});

describe("Should Curate", function() {
  it("Curate first pool", async function() {
    expect(await vault.isAsset(asset.address)).to.equal(true);
    expect(await router.isCurated(asset.address)).to.equal(false);
    expect(BN2Str(await router.curatedPoolLimit())).to.equal('1');
    expect(BN2Str(await router.curatedPoolCount())).to.equal('0');
    await router.curatePool(asset.address, {from:acc1})
    expect(await router.isCurated(asset.address)).to.equal(true);
    expect(BN2Str(await router.curatedPoolCount())).to.equal('1');
  });
  it("Fail curate second", async function() {
    await router.curatePool(asset2.address, {from:acc1})
    expect(await router.isCurated(asset2.address)).to.equal(false);
    expect(BN2Str(await router.curatedPoolCount())).to.equal('1');
  });
  it("Increase limit", async function() {
    await router.setParams('1', '1', '2', {from:acc0})
    expect(BN2Str(await router.curatedPoolLimit())).to.equal('2');
    await router.curatePool(asset2.address, {from:acc1})
    expect(await router.isCurated(asset2.address)).to.equal(true);
    expect(BN2Str(await router.curatedPoolCount())).to.equal('2');

  });
  it("Replace 1-for-1", async function() {
    await router.replacePool(asset2.address, asset3.address, {from:acc1})
    expect(await router.isCurated(asset2.address)).to.equal(true);
    expect(await router.isCurated(asset3.address)).to.equal(false);

    await router.addLiquidity(usdv.address, '1', asset3.address, '1', {from:acc1})
    await router.replacePool(asset2.address, asset3.address, {from:acc1})
    expect(await router.isCurated(asset2.address)).to.equal(false);
    expect(await router.isCurated(asset3.address)).to.equal(true);
  });

});

describe("Should Do Rewards and Protection", function() {
  it("Not curated, No rewards", async function() {
    expect(await router.isCurated(asset2.address)).to.equal(false);
    expect(BN2Str(await router.reserveUSDV())).to.equal('8');
    expect(BN2Str(await router.getRewardShare(asset2.address))).to.equal('0');
  });
  it("Curated, Rewards", async function() {
    await router.curatePool(asset.address, {from:acc1})
    expect(BN2Str(await router.reserveUSDV())).to.equal('8');
    expect(BN2Str(await router.getRewardShare(asset.address))).to.equal('2');
  });
  it("Not curated, No Protection", async function() {
    for(let i = 0; i<9; i++){
      await router.swap('100', asset2.address, usdv.address, {from:acc1})
    }
    let coverage = await router.getCoverage(acc1, asset2.address)
    expect(BN2Str(await router.getProtection(acc1, asset2.address, "10000", coverage))).to.equal('0');
  });
  it("Curated, Protection", async function() {
    for(let i = 0; i<9; i++){
      await router.swap('100', asset.address, usdv.address, {from:acc1})
    }
    let coverage = await router.getCoverage(acc1, asset2.address)
    expect(BN2Str(await router.getProtection(acc1, asset2.address, "10000", coverage))).to.equal('0');
  });
});
