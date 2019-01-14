var AgreementFactory = artifacts.require("./AgreementFactory.sol");

module.exports = function(deployer) {
  deployer.deploy(AgreementFactory);
};
