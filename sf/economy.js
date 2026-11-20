import { MERCHANTS } from './config/npcs.js';
export { MERCHANTS };
import { GAMEPLAY } from './config/gameplay.js';
import { hatById } from './hat-catalog.js';
import { ITEM_STATS, EQUIPMENT_IDS } from './item-stats.js';
import { TRADE_PRICES } from './config/economy.js';
export { TRADE_PRICES };
export function createEconomy(saved = {}, onChange = () => {}) {
  const integer = (v, fallback) => (Number.isSafeInteger(v) && v >= 0 ? v : fallback);
  const state = {
    coins: integer(saved.coins, GAMEPLAY.startingCoins),
    equity: integer(saved.equity, 0),
    grain: integer(saved.grain, 0),
    bouquets: integer(saved.bouquets, 0),
    fuelCans: integer(saved.fuelCans, 0),
    fish: Math.min(1, integer(saved.fish, 0)),
    sand: integer(saved.sand, 0),
    saltLetters: Math.min(1, integer(saved.saltLetters, 0)),
    saltLettersDelivered: integer(saved.saltLettersDelivered, 0),
    ownedHats: Array.isArray(saved.ownedHats)
      ? [...new Set(saved.ownedHats.filter((id) => hatById(id)))]
      : [],
    iphoneOwned: saved.iphoneOwned === true,
    iphoneEquipped: saved.iphoneOwned === true && saved.iphoneEquipped === true,
    robotaxiOwned: saved.robotaxiOwned === true,
    softwareCopies: integer(saved.softwareCopies, 0),
    incomeQuarters:
      Number.isInteger(saved.incomeQuarters) &&
      saved.incomeQuarters >= 0 &&
      saved.incomeQuarters < 4
        ? saved.incomeQuarters
        : 0,
  };
  state.ownedEquipment = Array.isArray(saved.ownedEquipment)
    ? [...new Set(saved.ownedEquipment.filter((id) => EQUIPMENT_IDS.includes(id)))]
    : [];
  function buyEquipment(id) {
    const item = ITEM_STATS[id];
    if (!EQUIPMENT_IDS.includes(id) || !item?.price)
      return { ok: false, message: 'That item is not for sale.' };
    if (state.ownedEquipment.includes(id))
      return { ok: false, message: 'You already own this item.' };
    if (state.coins < item.price)
      return { ok: false, message: 'You need ' + item.price + ' coins.' };
    state.coins -= item.price;
    state.ownedEquipment.push(id);
    onChange({ ...state });
    return {
      ok: true,
      message: 'You buy a ' + item.name.toLowerCase() + '. Equip it in Character settings.',
    };
  }
  function income(amount) {
    if (!state.iphoneEquipped) return { earned: amount, bonus: 0, remainder: state.incomeQuarters };
    const quarters = (amount % 4) + state.incomeQuarters,
      bonus = Math.floor(amount / 4) + Math.floor(quarters / 4);
    return { earned: amount + bonus, bonus, remainder: quarters % 4 };
  }
  function trade(kind) {
    if (kind === 'sales-software-sale' && !state.softwareCopies)
      return {
        ok: false,
        message:
          'You have no sales software to sell. Buy a copy from the redheaded vendor for 10 coins.',
      };
    if (kind === 'salt-letter-collect' && state.saltLetters)
      return {
        ok: false,
        message:
          'You already carry a sealed conservation letter. Deliver it to the City Hall clerk before taking another.',
      };
    if (kind === 'salt-letter-deliver' && !state.saltLetters)
      return {
        ok: false,
        message:
          'You have no conservation letter to deliver. Speak to the salt conservationist southeast of the consciousness research institutes.',
      };
    if (kind === 'sand-sale' && !state.sand)
      return {
        ok: false,
        message:
          'You do not have any sand to sell. Collect a sack at the Ocean Beach sand pile and bring it to the GPU Factory.',
      };
    if (kind === 'catch-fish' && state.fish >= 1)
      return {
        ok: false,
        message:
          'You can only carry one live fish. Sell yours to the chef at Cotogna before catching another.',
      };
    if (kind === 'fish-sale' && !state.fish)
      return {
        ok: false,
        message:
          'You do not have a live fish. Try the fishing spot at Fisherman’s Wharf, then bring your catch to Cotogna.',
      };
    const changes = {
      'sales-software-buy': { coins: -TRADE_PRICES.salesSoftware, softwareCopies: 1 },
      'sales-software-sale': { coins: TRADE_PRICES.salesSoftwareResale, softwareCopies: -1 },
      'salt-letter-collect': { saltLetters: 1 },
      'salt-letter-deliver': {
        saltLetters: -1,
        saltLettersDelivered: 1,
        coins: TRADE_PRICES.saltLetter,
      },
      'collect-sand': { sand: 1 },
      'sand-sale': { coins: TRADE_PRICES.sand, sand: -1 },
      'catch-fish': { fish: 1 },
      'fish-sale': { coins: TRADE_PRICES.fish, fish: -1 },
      'ai-lab-wage': { coins: 1 },
      'sandwich-pickup': { coins: -ITEM_STATS.sandwich.pickupPrice },
      'sandwich-in-n-out': { coins: -ITEM_STATS.sandwich.inNOutPrice },
      'sandwich-delivery': { coins: -ITEM_STATS.sandwich.deliveryPrice },
      beer: { coins: -1 },
      'motorcycle-rental': { coins: -5 },
      coffee: { coins: -1 },
      'busker-tip': { coins: -1 },
      equity: { coins: -TRADE_PRICES.equity, equity: 1 },
      secondary: { coins: TRADE_PRICES.secondary, equity: -1 },
      grain: { coins: -TRADE_PRICES.grain, grain: 1 },
      feed: { grain: -1 },
      passenger: { coins: TRADE_PRICES.passenger },
      rocket: { coins: -1 },
      skis: { coins: -1 },
      tax: { coins: -state.coins },
      extortion: { coins: -state.coins },
      capital: { coins: 1000 },
      'monkey-quest': { coins: 25 },
      'fuel-can': { coins: -state.coins, fuelCans: 1 },
      'free-fuel-can': { fuelCans: 1 },
      'use-fuel-can': { fuelCans: -1 },
    }[kind];
    if (!changes) return { ok: false, message: 'That trade is unavailable.' };
    const award = changes.coins > 0 ? income(changes.coins) : null;
    if (award) changes.coins = award.earned;
    if (
      Object.entries(changes).some(
        ([key, delta]) => !Number.isSafeInteger(state[key] + delta) || state[key] + delta < 0,
      )
    )
      return {
        ok: false,
        message:
          kind === 'secondary'
            ? 'You do not have any startup equity to sell.'
            : kind === 'feed'
              ? 'You need grain. Visit the grain merchant beside Golden Gate Park.'
              : kind === 'use-fuel-can'
                ? 'You need a fuel can. Pick one up at a gas station.'
                : 'You do not have enough coins.',
      };
    for (const [key, delta] of Object.entries(changes)) state[key] += delta;
    if (award) state.incomeQuarters = award.remainder;
    onChange({ ...state });
    return award ? { ok: true, earned: award.earned, bonus: award.bonus } : { ok: true };
  }
  function buyHat(id) {
    const h = hatById(id);
    if (!h) return { ok: false, message: 'That hat is not in the catalog.' };
    if (h.dropOnly)
      return { ok: false, message: 'That hat is found on adventures, not sold in the shop.' };
    if (state.ownedHats.includes(id))
      return { ok: false, message: 'You already own this hat. Wear it from the Character menu.' };
    if (state.coins < h.price)
      return {
        ok: false,
        message:
          'You need ' +
          h.price.toLocaleString('en-US') +
          ' coins for the ' +
          h.name +
          '. Your coins have not been spent.',
      };
    state.coins -= h.price;
    state.ownedHats = [...state.ownedHats, id];
    onChange({ ...state, ownedHats: [...state.ownedHats] });
    return { ok: true };
  }
  function credit(amount) {
    if (!Number.isSafeInteger(amount) || amount < 0) return { ok: false };
    const award = income(amount);
    if (!Number.isSafeInteger(award.earned) || !Number.isSafeInteger(state.coins + award.earned))
      return { ok: false };
    state.coins += award.earned;
    state.incomeQuarters = award.remainder;
    onChange({ ...state });
    return { ok: true, earned: award.earned, bonus: award.bonus };
  }
  function buyPhone() {
    if (state.iphoneOwned)
      return { ok: false, message: 'You already own an iPhone. Equip it in Character settings.' };
    if (state.coins < TRADE_PRICES.iphone)
      return { ok: false, message: 'You need ' + TRADE_PRICES.iphone + ' coins to buy an iPhone.' };
    state.coins -= TRADE_PRICES.iphone;
    state.iphoneOwned = true;
    state.iphoneEquipped = true;
    onChange({ ...state });
    return { ok: true };
  }
  function equipPhone(on) {
    if (on && !state.iphoneOwned)
      return { ok: false, message: 'Buy an iPhone from Tim Apple first.' };
    state.iphoneEquipped = !!on && state.iphoneOwned;
    onChange({ ...state });
    return { ok: true };
  }
  function losePhone() {
    if (!state.iphoneOwned) return { ok: false };
    state.iphoneOwned = false;
    state.iphoneEquipped = false;
    onChange({ ...state });
    return { ok: true };
  }
  function buyRobotaxi() {
    if (state.robotaxiOwned)
      return { ok: false, message: 'You already own a robotaxi. It is out earning fares.' };
    if (state.coins < TRADE_PRICES.robotaxi)
      return {
        ok: false,
        message: 'You need ' + TRADE_PRICES.robotaxi + ' coins to buy a robotaxi.',
      };
    state.coins -= TRADE_PRICES.robotaxi;
    state.robotaxiOwned = true;
    onChange({ ...state });
    return { ok: true };
  }
  return {
    state,
    trade,
    credit,
    buyHat,
    buyEquipment,
    buyPhone,
    equipPhone,
    losePhone,
    buyRobotaxi,
  };
}
