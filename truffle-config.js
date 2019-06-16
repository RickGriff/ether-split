var HDWalletProvider = require("truffle-hdwallet-provider");
const MNEMONIC = require('./mm-mnem.js');

module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // to customize your Truffle configuration!
  networks: {
   development: {
     host: "127.0.0.1",
     port: 7545,
     network_id: "*" // Match any network id
   },
   ropsten: {
    provider: function() {
      return new HDWalletProvider(MNEMONIC, "https://ropsten.infura.io/v3/2ee3bc59cae341449714beac3219b6e0")
    },
    network_id: 3,
    gas: 8000000      //make sure this gas allocation isn't over 4M, which is the max
  }
 }
};
