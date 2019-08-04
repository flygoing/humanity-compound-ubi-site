var CompoundPool = artifacts.require("CompoundPool.sol");
var UniversalBasicIncome = artifacts.require("UniversalBasicIncome.sol");

const NAME = "Humanity Compound Dai Pool"
const SYMBOL = "HCDP"
const COMPTROLLER = "0x3d9819210a31b4961b30ef54be2aed79b9c9cd3b"
const CDAI = "0xf5dce57282a584d2746faf1593d3121fcac444dc"
const DAI = "0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359"

const HUMANITY_REGISTRY = "0x4ee46dc4962c2c2f6bcd4c098a0e2b28f66a5e90"
module.exports = async function(deployer) {
  await deployer.deploy(CompoundPool, NAME, SYMBOL, COMPTROLLER, CDAI, DAI, "0x0000000000000000000000000000000000000000");
  await deployer.deploy(UniversalBasicIncome, HUMANITY_REGISTRY, DAI, CompoundPool.address)
  const UBI = await UniversalBasicIncome.deployed()
  const BANK = await CompoundPool.deployed()
  await BANK.updateBeneficiary(UBI.address)
};
