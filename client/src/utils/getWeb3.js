import Web3 from "web3";

//NOTE:  EventListener removed (line 8) - was causing pages to freeze - the getWeb3 promise never resolved,
// when pages were served by the React router.
//See: https://stackoverflow.com/questions/53366103/await-keeps-on-waiting-react-react-router
const getWeb3 = async () => {

  // window.addEventListener("load", () => {
  let web3Instance;

  // Modern dApp browser - request access to user's accounts
  if (window.ethereum) {
    try {
      let ethereum = window.ethereum
      await ethereum.enable();
      web3Instance = new Web3(ethereum);

    } catch (err) {
      console.log("User denied account access")
    }

  // Legacy dApp browsers - expose accts by default
  } else if (window.web3) {
    web3Instance = await new Web3(window.web3.currentProvider);
  }
  // Non-dapp browsers
  else {
    web3Instance = false;
    console.log('Non-Ethereum browser detected. Install a dApp browser (i.e. MetaMask) to interact with EtherSplit.');
  }
  return web3Instance;
}

export default getWeb3;
