import type { CommandResult, MultiplayerState } from './types/network.ts';
import type { Economy } from './types/controllers.ts';
import { requiredValue } from './types/assert.ts';
type BankAction = 'status' | 'deposit' | 'withdraw' | 'coffee' | 'drink';
interface BankClient {
  state: {
    connected: boolean;
    bank?: MultiplayerState['bank'];
    serverOffset?: number;
    inventory?: { coffee?: number };
  };
  command: (action: string, args?: object) => Promise<CommandResult>;
}
interface BankServiceOptions {
  client?: BankClient | null;
  onDrink?: () => void;
  now?: () => number;
}
interface BankMenuOptions {
  element: HTMLElement;
  service: ReturnType<typeof createBankService>;
  economy: Economy;
  beforeOpen: () => void;
  afterClose: () => void;
  announce: (message: string, speaker?: string) => void;
}
import { projectedBankBalance, bankWholeCoins } from './banking.ts';
import { serverCommand, serverConnected } from './server-connection.ts';

/** Balance projection is visual only. Transfers and coffee require receipts. */
export function createBankService({
  client = null,
  onDrink = () => {},
  now = Date.now,
}: BankServiceOptions) {
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
  async function act(action: BankAction, amount?: number | string) {
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

export function createBankMenu({
  element,
  service,
  economy,
  beforeOpen,
  afterClose,
  announce,
}: BankMenuOptions) {
  const form = requiredValue(element.querySelector('form'), 'Bank form'),
    amount = requiredValue(form.querySelector('input'), 'Bank amount input'),
    status = requiredValue(element.querySelector<HTMLElement>('[data-bank-status]'), 'Bank status');
  let busy = false;
  function close() {
    element.hidden = true;
    afterClose();
  }
  async function operation(action: BankAction, count?: string | number) {
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
    const value =
        (event.submitter instanceof HTMLButtonElement ? event.submitter.value : '') || 'deposit',
      action = value.startsWith('withdraw') ? 'withdraw' : 'deposit';
    operation(action, value.endsWith('-all') ? 'all' : Number(amount.value));
  });
  requiredValue(element.querySelector('[data-bank-close]'), 'Bank close').addEventListener(
    'click',
    close,
  );
  requiredValue(element.querySelector('[data-bank-coffee]'), 'Bank coffee').addEventListener(
    'click',
    () => operation('coffee'),
  );
  function update() {
    if (element.hidden) return;
    const state = service.snapshot();
    requiredValue(element.querySelector('[data-bank-balance]'), 'Bank balance').textContent =
      state.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    requiredValue(element.querySelector('[data-bank-purse]'), 'Bank purse').textContent =
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
