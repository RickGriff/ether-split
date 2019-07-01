// Return properties of the balance for the current_user's point of view: its color, prefix and sign +ve or -ve.
export const getBalanceTraits = (current_user, balance, user_1, user_2) => {
  let color;
  let prefix = '';
  let sign = '';

  if (balance === 0) {
    color = 'black-text'
  } else if (current_user === user_1 && balance < 0) {
    color = 'red-text accent-4'
    prefix = 'You Owe'
    sign = '-'
  } else if (current_user === user_1 && balance >= 0) {
    color = 'teal-text text-lighten-1'
    prefix = 'You Are Owed'
  } else if (current_user === user_2 && balance < 0) {
    color = 'teal-text text-lighten-1'
    prefix = 'You Are Owed'
  } else if (current_user === user_2 && balance >= 0) {
    color = 'red-text text-accent-4'
    prefix = 'You Owe'
    sign = '-'
  }
  return { color, prefix, sign };
}

export const absBalance = (balance) => {
  return Math.abs(balance)
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
