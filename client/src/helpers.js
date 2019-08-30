// Return properties of the balance for the current_user's point of view: its color, prefix and sign +ve or -ve.
export const getBalanceTraits = (current_user, balance, user_1, user_2) => {
  let color;
  let prefix = '';
  let sign = ' ';

  if (balance === "0.00") {
    color = 'black-text'
  } else if (current_user === user_1 && Number(balance) < 0) {
    color = 'red-text accent-4'
    prefix = 'You Owe'
    sign = ' -'
  } else if (current_user === user_1 && Number(balance) >= 0) {
    color = 'teal-text text-lighten-1'
    prefix = 'You Are Owed'
  } else if (current_user === user_2 && Number(balance) < 0) {
    color = 'teal-text text-lighten-1'
    prefix = 'You Are Owed'
  } else if (current_user === user_2 && Number(balance) >= 0) {
    color = 'red-text text-accent-4'
    prefix = 'You Owe'
    sign = ' -'
  }
  return { color, prefix, sign };
}

export const absBalance = (balance) => {
  return Math.abs(balance).toFixed(2)
}

export const getBalance = async (agreement) => {
  const balancePennies = await agreement.balance();
  const balancePounds = (balancePennies.toNumber() / 100.0).toFixed(2)
  return balancePounds;
}

export const showWaitingToast = () => {
  window.Materialize.toast('Waiting for the blockchain...')
}

export const removeWaitingToast = () => {
  let toasts = document.getElementsByClassName("toast")
  for (let i = 0; i < toasts.length; i++) {
    if (toasts[i].innerHTML === 'Waiting for the blockchain...') {
      toasts[i].remove();
    }
  }
}

/* Calls to the blockchain via Infura don't always succeed during busy / high-load times. 
 This function attempts the call(s) thrice. */
export const makeTwoAttempts = async (callback) => {
  let attempts = 0;
  const maxAttempts = 3
  let success; 

  while (true) {
    try {
      await callback();
      success = true;
      return success;

    } catch (error) {
      attempts += 1
      if (attempts < maxAttempts) {
        console.log(error)
        console.log("Re-trying ...")
        continue; // if no web3, goto next attempt
      } else {
        console.log(error);
        success = false;
        return success;
      }
    }
  }
}
