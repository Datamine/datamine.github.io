import { projectedBankBalance, bankWholeCoins } from './banking.js';
import { serverCommand, serverConnected } from './server-connection.js';

/** Balance projection is visual only. Transfers and coffee require receipts. */
export function createBankService({ client = null, onDrink = () => {}, now = Date.now }) {
  function snapshot() {
    const bank = client?.state.bank || { balance: 0, updatedAt: now() },
      time = now() + (client?.state.serverOffset || 0),
      balance = projectedBankBalance(bank, time);
    return {
      ...bank,
      balance,
      withdrawable: bankWholeCoins(balance),
      coffee: client?.state.inventory?.coffee || 0,
    };
  }
  async function act(action, amount) {
    const names = {
      status: 'bankStatus',
      deposit: 'bankDeposit',
      withdraw: 'bankWithdraw',
      coffee: 'bankCoffee',
      drink: 'bankCoffeeDrink',
    };
    const r = await serverCommand(client, names[action], { amount });
    if (r.ok && action === 'drink' && serverConnected(client)) onDrink();
    return r;
  }
  return { snapshot, act };
}

export function createBankMenu({ element, service, economy, beforeOpen, afterClose, announce }) {
  const form = element.querySelector('form'),
    amount = form.querySelector('input'),
    status = element.querySelector('[data-bank-status]');
  let busy = false;
  function close() {
    element.hidden = true;
    afterClose();
  }
  async function operation(action, count) {
    if (busy) return;
    busy = true;
    for (const b of form.querySelectorAll('button')) b.disabled = true;
    status.textContent = 'One moment, please…';
    try {
      const result = await service.act(action, count);
      status.textContent = result.message || 'Your account is up to date.';
      status.dataset.error = String(!result.ok);
      if (result.message) announce(result.message, 'Green Bank');
    } finally {
      busy = false;
      for (const b of form.querySelectorAll('button')) b.disabled = false;
      update();
    }
  }
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = event.submitter?.value || 'deposit',
      action = value.startsWith('withdraw') ? 'withdraw' : 'deposit';
    operation(action, value.endsWith('-all') ? 'all' : Number(amount.value));
  });
  element.querySelector('[data-bank-close]').addEventListener('click', close);
  element.querySelector('[data-bank-coffee]').addEventListener('click', () => operation('coffee'));
  function update() {
    if (element.hidden) return;
    const state = service.snapshot();
    element.querySelector('[data-bank-balance]').textContent = state.balance.toLocaleString(
      'en-US',
      { minimumFractionDigits: 2, maximumFractionDigits: 2 },
    );
    element.querySelector('[data-bank-purse]').textContent =
      economy.state.coins.toLocaleString('en-US');
  }
  return {
    open() {
      beforeOpen();
      element.hidden = false;
      status.textContent =
        'Welcome! How may I help? Your banked coins are separate from your purse.';
      status.dataset.error = 'false';
      service.act('status').then(update);
      update();
      amount.focus({ preventScroll: true });
    },
    close,
    update,
    get active() {
      return !element.hidden;
    },
  };
}
