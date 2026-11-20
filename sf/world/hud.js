import { createUIJob, createDOMView } from '../ui/scheduler.js';
import { sampleRocketHop } from '../rocket-hop.js';
import { TABLET_PLACES } from '../teleport-tablets.js';
import { equipmentOwned, equipmentDefense } from '../item-stats.js';
import { ownedHat } from '../hat-catalog.js';
import { KRAKEN_CAPE_TEXT } from '../jurassic-layout.js';
import { equipmentOptions, fillEquipmentSelect } from '../equipment-options.js';
import { skillStatus } from '../progression.js';
import { TAHOE, nearTahoe } from '../tahoe.js';
import { HAIRSTYLES } from '../config/hairstyles.js';
import { normalizeCharacter, drawCharacterPreview } from '../character-config.js';
import { SURF_TRICKS } from '../surfing.js';

/** Hud services for the browser scene.
 * Dependencies are explicit live scene bindings, preserving initialization
 * order without globals. This module only reads bindings when a method runs. */
export function createHud(context) {
  const $ = context.headless ? () => null : createDOMView(document);
  const updateAdventureUI = createUIJob(renderAdventureUI);

  function updatePurse(state) {
    if (context.headless) return;
    if (context.built) {
      context.questMenu?.render();
      updatePhoneControl();
    }
    $('sf-coins').textContent = state.coins;
    $('sf-inventory').textContent =
      state.equity +
      ' equity · ' +
      state.grain +
      ' grain' +
      (state.sand
        ? ' · ' + state.sand + ' Ocean Beach sand sack' + (state.sand === 1 ? '' : 's')
        : '') +
      (state.softwareCopies ? ' · ' + state.softwareCopies + ' sales software' : '') +
      (state.iphoneOwned ? ' · iPhone' : '') +
      (state.saltLetters ? ' · 1 conservation letter' : '') +
      (state.fish ? ' · 1 live fish' : '') +
      (state.bouquets
        ? ' · ' + state.bouquets + ' bouquet' + (state.bouquets === 1 ? '' : 's')
        : '') +
      (state.fuelCans
        ? ' · ' + state.fuelCans + ' fuel can' + (state.fuelCans === 1 ? '' : 's')
        : '');
    $('sf-fuel-can-button').hidden = !state.fuelCans;
    $('sf-fuel-can-button').textContent = 'Use fuel can · ' + state.fuelCans;
    try {
      localStorage.setItem('sf-purse-v1', JSON.stringify(state));
    } catch {}
  }

  function updateAirshipButton() {
    const flying = context.airship.state.active,
      climbing = context.sutroClimb.state.active,
      returning = ['returning', 'descending'].includes(context.airship.state.phase),
      button = $('sf-airship-button');
    document.querySelector('.sf-actions').dataset.mode = climbing
      ? 'climbing'
      : flying
        ? 'flying'
        : 'ground';
    button.hidden = climbing;
    button.disabled = !!context.chase?.state.jailed || returning;
    button.setAttribute('aria-pressed', String(flying));
    button.replaceChildren(
      document.createTextNode(returning ? 'Returning…' : flying ? 'Return to terminal' : 'Airship'),
    );
    if (!returning) {
      const key = document.createElement('span');
      key.className = 'sf-key';
      key.textContent = 'A';
      button.append(key);
    }
    $('sf-bike-button').hidden = flying || climbing;
    $('sf-surf-button').hidden = flying || climbing;
    $('sf-rope-button').hidden = !context.airship.state.active;
    $('sf-rope-button').disabled =
      !!context.chase?.state.jailed ||
      context.rope.climbing ||
      (!context.rope.state.deployed && context.airship.state.phase !== 'flying');
    $('sf-rope-button').textContent = context.rope.climbing
      ? 'Climbing…'
      : context.rope.onGround
        ? 'Climb rope'
        : context.rope.state.deployed
          ? 'Rope options'
          : 'Drop rope';
  }

  function updateRocketControls() {
    for (const id of [
      'sf-bike-button',
      'sf-surf-button',
      'sf-airship-button',
      'sf-rope-button',
      'sf-climb-button',
    ])
      $(id).disabled = context.rocket.state.active;
  }

  function updateTahoeButton() {
    const button = $('sf-ski-button'),
      near = nearTahoe(context.player.x + 0.5, context.player.y + 0.5),
      mode = context.tahoe.state.mode;
    button.hidden = !near;
    button.disabled =
      context.rocket.state.active ||
      mode === 'gondola' ||
      (mode === 'ski' && context.tahoe.state.airTime <= 0);
    button.textContent =
      mode === 'gondola'
        ? 'Riding gondola…'
        : mode === 'ski'
          ? context.tahoe.state.airTime > 0
            ? 'Flip · Space'
            : 'Skiing…'
          : Math.hypot(
                context.player.x + 0.5 - TAHOE.peak.x,
                context.player.y + 0.5 - TAHOE.peak.z,
              ) < 10
            ? context.tahoe.state.rented
              ? 'Ski down'
              : 'Rent skis · 1 coin'
            : 'Ride gondola';
    if (near) {
      $('sf-bike-button').hidden = true;
      $('sf-surf-button').hidden = true;
      $('sf-airship-button').hidden = !context.airship.state.active || mode !== 'ground';
      $('sf-rope-button').hidden = !context.airship.state.active || mode !== 'ground';
    }
  }

  function updateClimbButton() {
    const active = context.sutroClimb.state.active,
      button = $('sf-climb-button'),
      descending = context.sutroClimb.state.phase === 'descending';
    button.hidden = !active;
    updateAirshipButton();
    button.disabled = !!context.chase?.state.jailed || descending || context.sutroTravelPending;
    button.replaceChildren(document.createTextNode(descending ? 'Climbing down…' : 'Climb down'));
    if (!descending) {
      const key = document.createElement('span');
      key.className = 'sf-key';
      key.textContent = 'E';
      button.append(key);
    }
  }

  function updateBikeButton() {
    const near =
      !context.currentInterior &&
      Math.hypot(context.player.x - context.bike.x, context.player.y - context.bike.y) < 2.5;
    const button = $('sf-bike-button'),
      mode = context.bike.riding ? 'riding' : near ? 'near' : 'far';
    if (button.dataset.mode === mode) return;
    button.dataset.mode = mode;
    button.replaceChildren(
      document.createTextNode(
        context.bike.riding ? 'Park bike ' : near ? 'Ride bike ' : 'Find bike ',
      ),
    );
    const key = document.createElement('span');
    key.className = 'sf-key';
    key.textContent = 'B';
    button.append(key);
    button.setAttribute('aria-pressed', String(context.bike.riding));
  }

  function updateSurfButton() {
    const b = $('sf-surf-button'),
      text = context.surf.state.riding ? 'Return to shore · F' : 'Windsurf · F';
    if (b.textContent !== text) b.textContent = text;
    b.setAttribute('aria-pressed', String(context.surf.state.riding));
    const p = $('sf-pacifica-surf-button'),
      active = context.surf.state.riding && context.surf.state.mode === 'surf',
      label = active ? 'Return to beach · U' : 'Surf · U';
    if (p.textContent !== label) p.textContent = label;
    p.setAttribute('aria-pressed', String(active));
  }

  function renderAdventureUI() {
    if (context.headless) return;
    const tablets = context.tabletService?.inventory() || {};
    for (const id of TABLET_PLACES) {
      const b = $('sf-tablet-' + id);
      b.hidden = !tablets[id];
      b.disabled = !!context.tabletService?.state.active || !context.canUseTablet();
      b.textContent = (id === 'tahoe' ? 'Tahoe' : 'Downtown') + ' tablet · ' + (tablets[id] || 0);
      b.title = 'Break a ' + id + ' teleportation tablet';
    }
    const coffee = context.bankService?.snapshot().coffee || 0;
    $('sf-drink-coffee').hidden = !coffee;
    $('sf-drink-coffee').disabled =
      context.capture.state.active ||
      !!context.secretWorld?.bomber.state.active ||
      !!context.chase?.state.jailed;
    const bankBalance = context.bankService?.snapshot().balance || 0;
    $('sf-bank-character').textContent =
      'Green Bank · ' +
      bankBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) +
      ' coins deposited · 5% per hour';
    const aircraft = !!context.secretWorld?.bomber.state.active,
      parachuting = context.secretWorld?.bomber.state.phase === 'parachuting',
      bombSeconds = context.secretWorld?.bomber.bombSeconds || 0;
    $('sf-bomber-controls').hidden = !aircraft;
    $('sf-bomber-bomb').disabled =
      !aircraft ||
      parachuting ||
      bombSeconds > 0 ||
      (!context.multiplayer?.state.connected && !!context.multiplayer);
    $('sf-bomber-bomb').textContent = bombSeconds
      ? 'Reloading · ' + bombSeconds + 's'
      : 'Drop bomb · Space';
    $('sf-bomber-land').disabled = parachuting;
    $('sf-bomber-roll').disabled =
      parachuting || context.secretWorld?.bomber.state.rollElapsed !== null;
    $('sf-bomber-flight').textContent = parachuting
      ? 'Parachuting to safety'
      : context.secretWorld?.bomber.state.boost
        ? 'B-2 · Rocket-speed boost'
        : 'Personal B-2 · Hold Shift to boost';
    const layer = $('sf-instance-level'),
      kind = context.secretWorld?.kind || 'world';
    layer.hidden = kind === 'world';
    layer.textContent =
      kind === 'illuminati' ? 'Underground · Private hangar' : 'Private kraken waters';
    updatePhoneControl();
    const hopButton = $('sf-rocket-hop');
    hopButton.hidden =
      context.playerLook.back !== 'new-year-rocket' ||
      !(
        context.multiplayer?.state.inventory?.decorativeRocket?.burningUntil >
        Date.now() + (context.multiplayer?.state.serverOffset || 0)
      );
    hopButton.disabled = !canRocketHop() || playerRocketHop().active || context.hoppingRocket;
    const pitch = context.social.state.pitch,
      sales = $('sf-sales-status');
    sales.hidden = !pitch;
    if (pitch) {
      const text =
        'Sales pitch · ' +
        Math.ceil(pitch.remaining) +
        's · ' +
        Math.round(pitch.chance * 100) +
        '% chance';
      if (sales.textContent !== text) sales.textContent = text;
    }
    const phone = $('sf-phone-status'),
      cab = $('sf-robotaxi-status');
    phone.hidden = !context.economy.state.iphoneOwned;
    cab.hidden = !context.economy.state.robotaxiOwned;
    const phoneText = context.economy.state.iphoneEquipped
      ? 'iPhone · +25% earnings · −5 HP in ' + Math.ceil(120 - context.tech.state.doomElapsed) + 's'
      : 'iPhone · put away';
    if (phone.textContent !== phoneText) phone.textContent = phoneText;
    const cabText =
      'Robotaxi · ' +
      (context.economy.state.iphoneEquipped ? 25 : 20) +
      ' coins/min · fare in ' +
      Math.ceil(60 - context.tech.state.taxiElapsed) +
      's';
    if (cab.textContent !== cabText) cab.textContent = cabText;
    $('sf-roll-button').disabled = context.forwardRoll.state.active || !context.canForwardRoll();
    if (
      context.fishing.state.active &&
      (context.player.path.length ||
        context.bike.riding ||
        context.motorcycle?.state.riding ||
        context.skateboard.riding ||
        context.surf.state.riding ||
        context.ferrari?.state.riding ||
        context.rocket.state.active ||
        context.flying() ||
        context.rope.climbing ||
        context.sutroClimb.state.active ||
        context.training ||
        context.capture.state.active ||
        context.chase?.state.jailed ||
        context.currentInterior)
    )
      context.fishing.cancel();
    if (
      context.motorcycle?.state.riding &&
      (context.bike.riding ||
        context.surf.state.riding ||
        context.ferrari?.state.riding ||
        context.rocket.state.active ||
        context.flying() ||
        context.rope.climbing ||
        context.sutroClimb.state.active ||
        context.tahoe.state.mode !== 'ground' ||
        context.chase?.state.jailed ||
        context.training ||
        context.currentInterior)
    )
      context.motorcycle.park(context.player.x, context.player.y, context.player.angle);
    const motor = $('sf-motorcycle-button');
    motor.hidden = !context.motorcycle?.state.rented;
    motor.disabled = !!(
      context.capture.state.active ||
      context.chase?.state.jailed ||
      context.rocket.state.active
    );
    motor.setAttribute('aria-pressed', String(!!context.motorcycle?.state.riding));
    const motorText = context.motorcycle?.state.riding ? 'Park motorcycle · M' : 'Motorcycle · M';
    if (motor.textContent !== motorText) motor.textContent = motorText;
    if (
      context.skateboard.riding &&
      (context.bike.riding ||
        context.motorcycle?.state.riding ||
        context.surf.state.riding ||
        context.ferrari?.state.riding ||
        context.rocket.state.active ||
        context.flying() ||
        context.rope.climbing ||
        context.sutroClimb.state.active ||
        context.tahoe.state.mode !== 'ground' ||
        context.chase?.state.jailed ||
        context.training ||
        context.currentInterior)
    )
      context.skateboard.riding = false;
    const q = context.quests.theyLive.state,
      items = [
        q.evidence && !q.permit ? 'Alien Evidence Certificate' : null,
        q.permit ? 'Alien-removal permit' : null,
        q.bayonet ? 'Bayonet' : null,
        q.skateboard ? 'Skateboard' : null,
      ]
        .filter(Boolean)
        .join(' · ');
    const inventory = $('sf-quest-inventory');
    inventory.hidden = !items;
    if (inventory.textContent !== items) inventory.textContent = items;
    const skate = $('sf-skateboard-button');
    skate.hidden = !q.skateboard;
    skate.disabled = !!(
      context.capture.state.active ||
      context.chase?.state.jailed ||
      context.rocket.state.active
    );
    skate.setAttribute('aria-pressed', String(context.skateboard.riding));
    const skateText = context.skateboard.riding ? 'Put away board · K' : 'Skateboard · K';
    if (skate.textContent !== skateText) skate.textContent = skateText;
    $('sf-skate-tricks').hidden = !context.skateboard.riding;
    for (const button of context.world.querySelectorAll('[data-skate-trick]'))
      button.disabled =
        context.skateTricks.state.active ||
        context.capture.state.active ||
        context.chase?.state.jailed;
    const employment = $('sf-employment'),
      working =
        context.aiLabJob.state.hired &&
        context.placeAt(context.player.x, context.player.y)?.id === 'ai-lab';
    employment.hidden = !context.aiLabJob.state.hired;
    const jobText = working
      ? context.economy.state.iphoneEquipped
        ? 'AI Lab · earning 1.25 coins / 2s'
        : 'AI Lab · earning 1 coin / 2s'
      : 'AI Lab · employed';
    if (employment.textContent !== jobText) employment.textContent = jobText;
    const railgun = $('sf-railgun-button');
    railgun.hidden = !context.expeditions.state.railgun;
    railgun.textContent =
      context.playerWeapon() === 'railgun' ? 'Railgun equipped · G' : 'Equip railgun · G';
    railgun.setAttribute('aria-pressed', String(context.playerWeapon() === 'railgun'));
    updateDecorativeRocketControl();
    const hpText = 'Hitpoints ' + context.health.state.hp + '/' + context.health.state.max,
      enemy =
        context.alienCombat?.battle.state ||
        context.multiplayerWorld?.combatTarget ||
        (context.expeditions.state.target?.max ? context.expeditions.state.target : null);
    if ($('sf-hitpoints-text').textContent !== hpText) $('sf-hitpoints-text').textContent = hpText;
    $('sf-hitpoints-meter').max = context.health.state.max;
    $('sf-hitpoints-meter').value = context.health.state.hp;
    const hps = skillStatus(context.health.state.xp);
    $('sf-hp-level').textContent =
      'Hitpoints Level ' +
      hps.level +
      (hps.next ? ' · ' + hps.percent.toFixed(1) + '% to ' + hps.next : ' · Maximum level');
    $('sf-enemy-health').hidden = !enemy;
    if (enemy)
      $('sf-enemy-health').textContent =
        (context.alienCombat
          ? 'Green spectre'
          : context.npcLabel(
              context.multiplayerWorld?.combatTarget || context.expeditions.state.target,
            )) +
        ' · ' +
        enemy.hp +
        '/' +
        enemy.max +
        ' HP';
    const food = $('sf-eat-sandwich');
    food.hidden = !context.deli?.state.sandwiches;
    food.textContent =
      'Eat sandwich · ' +
      (context.deli?.state.sandwiches || 0) +
      '/' +
      (equipmentOwned(context.economy.state, 'backpack') ? 20 : 5);
    food.disabled =
      context.health.state.hp === context.health.state.max || context.capture.state.active;
    const order = $('sf-order-doordash');
    order.disabled =
      !!context.deli?.state.pending || context.capture.state.active || context.chase?.state.jailed;
    order.textContent = context.deli?.state.pending ? 'DoorDash en route…' : 'DoorDash · 4 coins';
    const guild = context.guildStatus(),
      guildText =
        (guild.member
          ? 'Freemasons’ Guild · Member'
          : 'Freemasons’ Guild · Rank ' +
            (guild.rank || 1) +
            ' · ' +
            (guild.visits || 0) +
            '/24 promotions') +
        ' · ' +
        guild.peptides +
        ' peptides';
    if ($('sf-guild-status').textContent !== guildText)
      $('sf-guild-status').textContent = guildText;
    const s = context.strength.status,
      text =
        'Strength Level ' +
        s.level +
        (s.next ? ' · ' + s.percent.toFixed(1) + '% to ' + s.next : ' · Maximum level');
    if ($('sf-strength-text').textContent !== text) $('sf-strength-text').textContent = text;
    $('sf-strength-progress').value = s.percent;
    $('sf-strength-progress').setAttribute(
      'aria-label',
      s.next ? s.percent.toFixed(1) + '% toward strength level ' + s.next : 'Strength level 50',
    );
    $('sf-gym-button').textContent = context.training ? 'Stop training' : 'SF Fitness';
    const wave = context.surf.state.riding && context.surf.state.mode === 'surf';
    $('sf-wave-controls').hidden = !wave;
    if (wave) {
      const r = context.waveSurf.state.ride,
        riding = !!r,
        status = riding ? 'Riding wave' : 'Paddling';
      if ($('sf-wave-status').textContent !== status) $('sf-wave-status').textContent = status;
      $('sf-wave-catch').hidden = riding;
      for (const b of context.world.querySelectorAll('[data-surf-trick]')) {
        const t = SURF_TRICKS.find((t) => t.id === b.dataset.surfTrick);
        b.disabled =
          !riding ||
          !!context.waveSurf.state.trick ||
          r.elapsed < 0.4 ||
          r.duration - r.elapsed < t.duration + 0.1;
      }
    }
    updateSurfButton();
    $('sf-ferrari-button').textContent = context.ferrari?.state.riding
      ? 'Park Ferrari · R'
      : 'Ferrari · R';
    $('sf-fuel-card').hidden = !context.ferrari?.state.riding;
    if (context.ferrari) {
      $('sf-fuel-meter').value = context.ferrari.state.fuel;
      $('sf-fuel-text').textContent = Math.round(context.ferrari.state.fuel * 100) + '% gas';
    }
  }

  function updateSunglassesControl() {
    const input = context.world.querySelector('[data-character="sunglasses"]');
    input.disabled = !context.sunglasses.state.owned;
    input.closest('label').hidden = !context.sunglasses.state.owned;
    input.checked = context.playerLook.sunglasses;
    $('sf-sunglasses-hint').hidden = !context.sunglasses.state.owned;
    $('sf-sunglasses-hint').textContent = context.sunglasses.state.owned
      ? 'Wear them to reveal disguises and hidden commands.'
      : '';
  }

  function updatePhoneControl() {
    if (context.headless) return;
    const input = $('sf-iphone-equipped');
    input.disabled = !context.economy.state.iphoneOwned;
    input.closest('label').hidden = !context.economy.state.iphoneOwned;
    input.checked = context.economy.state.iphoneEquipped;
    $('sf-iphone-hint').hidden = !context.economy.state.iphoneOwned;
    $('sf-iphone-hint').textContent = context.economy.state.iphoneOwned
      ? 'When equipped: +25% earnings; 5 HP per 2 minutes. Death or arrest loses the phone.'
      : '';
  }

  function wardrobeOptions() {
    return equipmentOptions(context.economy.state, {
      bayonet: context.quests.theyLive.state.bayonet,
      railgun: context.expeditions.state.railgun,
      cape: context.expeditions.state.cape,
    });
  }

  function updateHatControl() {
    if (context.headless) return;
    fillEquipmentSelect(
      context.world.querySelector('[data-character="hat"]'),
      wardrobeOptions().hat,
      context.playerLook.hat,
    );
    $('sf-hat-hint').textContent = '';
  }

  function wearHat(id) {
    if (!ownedHat(context.economy.state.ownedHats, id)) return false;
    context.playerLook = normalizeCharacter({ ...context.playerLook, hat: id });
    if (!context.headless) {
      try {
        localStorage.setItem('sf-character-v1', JSON.stringify(context.playerLook));
      } catch {}
      updateHatControl();
      if (!$('sf-character').hidden)
        drawCharacterPreview($('sf-character-preview'), {
          ...context.playerLook,
          rocketBurnUntil:
            context.multiplayer?.state.inventory?.decorativeRocket?.burningUntil || 0,
          phone: context.economy.state.iphoneEquipped,
        });
    }
    return true;
  }

  function updateEquipmentControl() {
    if (context.headless) return;
    const options = wardrobeOptions();
    for (const key of ['weapon', 'back', 'neck', 'torso', 'legs']) {
      const field = context.world.querySelector('[data-character="' + key + '"]');
      fillEquipmentSelect(field, options[key], context.playerLook[key]);
      if (!options[key].some((o) => o.value === String(context.playerLook[key])))
        context.playerLook[key] = options[key][0].value;
    }
    context.playerLook = normalizeCharacter(context.playerLook);
    context.playerLook.cape = context.playerLook.back === 'cape';
    $('sf-equipment-hint').textContent =
      'Defense bonus: ' +
      equipmentDefense(context.playerLook) +
      ' damage blocked per incoming combat hit.';
    updateDecorativeRocketControl();
  }

  function updateCapeControl() {
    const hint = $('sf-cape-hint');
    hint.hidden = !context.expeditions.state.cape;
    hint.textContent = context.expeditions.state.cape ? KRAKEN_CAPE_TEXT : '';
  }

  function playerRocketHop() {
    const time = Date.now() + (context.multiplayer?.state.serverOffset || 0),
      onFoot =
        context.playerLook.back === 'new-year-rocket' &&
        !context.player.sitting &&
        !context.training &&
        !context.forwardRoll.state.active &&
        context.health.state.hp > 0 &&
        context.canUseTablet();
    return sampleRocketHop(
      onFoot ? context.multiplayer?.state.inventory?.decorativeRocket?.hopStartedAt : 0,
      time,
    );
  }

  function canRocketHop() {
    return (
      context.playerLook.back === 'new-year-rocket' &&
      !context.player.sitting &&
      !context.training &&
      !context.forwardRoll.state.active &&
      context.canUseTablet() &&
      context.multiplayer?.state.connected &&
      context.multiplayer.state.inventory?.decorativeRocket?.burningUntil >
        Date.now() + (context.multiplayer.state.serverOffset || 0)
    );
  }

  async function hopRocket() {
    if (context.hoppingRocket || !canRocketHop() || playerRocketHop().active) return false;
    context.hoppingRocket = true;
    try {
      const result = await context.multiplayer.command('rocketHop');
      if (!result.ok && result.message) context.announce(result.message, 'Rocket');
      return result.ok;
    } finally {
      context.hoppingRocket = false;
      updateAdventureUI();
      context.canvas.focus({ preventScroll: true });
    }
  }

  function updateDecorativeRocketControl() {
    if (context.headless) return;
    const button = $('sf-light-decorative-rocket'),
      status = context.multiplayer?.state.inventory?.decorativeRocket || {},
      seconds = Math.max(
        0,
        Math.ceil(
          ((status.readyAt || 0) - (Date.now() + (context.multiplayer?.state.serverOffset || 0))) /
            1000,
        ),
      );
    button.hidden =
      context.playerLook.back !== 'new-year-rocket' ||
      !equipmentOwned(context.economy.state, 'new-year-rocket');
    button.disabled = context.lightingDecorativeRocket || seconds > 0;
    button.textContent = context.lightingDecorativeRocket
      ? 'Lighting…'
      : seconds
        ? 'Rocket ready in ' + seconds + 's'
        : 'Light rocket · 10 seconds';
  }

  async function lightDecorativeRocket() {
    if (context.lightingDecorativeRocket || !context.multiplayer?.state.connected) return;
    context.lightingDecorativeRocket = true;
    updateDecorativeRocketControl();
    try {
      const result = await context.multiplayer.command('lightDecorativeRocket');
      if (result.ok) {
        context.playerLook.rocketBurnUntil = result.burningUntil;
        closeCharacter();
      }
      if (result.message) context.announce(result.message, 'You');
    } finally {
      context.lightingDecorativeRocket = false;
      updateDecorativeRocketControl();
    }
  }

  function updateHairstyleControl() {
    const field = context.world.querySelector('[data-character="hairstyle"]');
    field.replaceChildren();
    for (const style of HAIRSTYLES[context.playerLook.gender]) {
      const option = document.createElement('option');
      option.value = style.id;
      option.textContent = style.label;
      field.append(option);
    }
    field.value = context.playerLook.hairstyle;
  }

  function changeCharacter(field) {
    const key = field.dataset.character;
    if (
      (key === 'torso' || key === 'legs') &&
      !['shirt', 'trousers'].includes(field.value) &&
      !equipmentOwned(context.economy.state, field.value)
    ) {
      field.value = context.playerLook[key];
      return;
    }
    if (key === 'weapon' && field.selectedOptions[0]?.disabled) return;
    if (key === 'sunglasses' && !context.sunglasses.state.owned) {
      field.checked = false;
      return;
    }
    if (key === 'hat' && !ownedHat(context.economy.state.ownedHats, field.value)) {
      field.value = context.playerLook.hat;
      return;
    }
    if (key === 'cape' && !context.expeditions.state.cape) {
      field.checked = false;
      return;
    }
    context.playerLook = normalizeCharacter({
      ...context.playerLook,
      [key]:
        field.type === 'checkbox'
          ? field.checked
          : ['iceTop', 'icePants'].includes(key)
            ? field.value === 'true'
            : field.value,
    });
    try {
      localStorage.setItem('sf-character-v1', JSON.stringify(context.playerLook));
    } catch {}
    if (['back', 'neck', 'weapon', 'torso', 'legs', 'sunglasses', 'hat'].includes(key))
      context.multiplayer?.command('equipAppearance', { look: context.playerLook });
    if (key === 'gender') updateHairstyleControl();
    if (key === 'torso' || key === 'legs') updateEquipmentControl();
    context.signTextureControls.setRevealed?.(context.playerLook.sunglasses);
    drawCharacterPreview($('sf-character-preview'), {
      ...context.playerLook,
      rocketBurnUntil: context.multiplayer?.state.inventory?.decorativeRocket?.burningUntil || 0,
      phone: context.economy.state.iphoneEquipped,
    });
  }

  function showCharacter() {
    context.collectionMenu?.close();
    if (context.bankMenu?.active) context.bankMenu.close();
    context.questMenu?.close();
    context.closeMenu();
    context.closeReader();
    closeHelp();
    context.dialogue.close();
    context.keys.clear();
    context.player.path = [];
    context.player.speed = 0;
    context.setDancing(false);
    updateSunglassesControl();
    updateHatControl();
    updatePhoneControl();
    updateHairstyleControl();
    for (const field of context.world.querySelectorAll('[data-character]')) {
      if (field.type === 'checkbox') field.checked = context.playerLook[field.dataset.character];
      else field.value = context.playerLook[field.dataset.character];
    }
    updateCapeControl();
    updateEquipmentControl();
    $('sf-character').hidden = false;
    $('sf-reader-shade').hidden = false;
    drawCharacterPreview($('sf-character-preview'), {
      ...context.playerLook,
      rocketBurnUntil: context.multiplayer?.state.inventory?.decorativeRocket?.burningUntil || 0,
      phone: context.economy.state.iphoneEquipped,
    });
    $('sf-close-character').focus({ preventScroll: true });
  }

  function closeCharacter() {
    if (context.headless || $('sf-character').hidden) return;
    $('sf-character').hidden = true;
    $('sf-reader-shade').hidden = true;
    context.canvas.focus({ preventScroll: true });
  }

  function sayPhrase(text) {
    if (!context.active) return false;
    context.multiplayerWorld?.say(text);
    context.playerSpeechUntil = performance.now() + 3000;
    $('sf-player-speech').textContent = text;
    context.canvas.focus({ preventScroll: true });
    return true;
  }

  function showHelp() {
    context.collectionMenu?.close();
    if (context.bankMenu?.active) context.bankMenu.close();
    context.questMenu?.close();
    closeCharacter();
    context.closeReader();
    context.closeMenu();
    context.keys.clear();
    context.player.speed = 0;
    $('sf-help').hidden = false;
    $('sf-reader-shade').hidden = false;
    $('sf-close-help').focus({ preventScroll: true });
  }

  function closeHelp() {
    $('sf-help').hidden = true;
    $('sf-reader-shade').hidden = true;
    context.canvas.focus({ preventScroll: true });
  }
  return {
    updatePurse,
    updateAirshipButton,
    updateRocketControls,
    updateTahoeButton,
    updateClimbButton,
    updateBikeButton,
    updateSurfButton,
    updateAdventureUI,
    updateSunglassesControl,
    updatePhoneControl,
    updateHatControl,
    wearHat,
    updateCapeControl,
    playerRocketHop,
    canRocketHop,
    hopRocket,
    lightDecorativeRocket,
    changeCharacter,
    showCharacter,
    closeCharacter,
    sayPhrase,
    showHelp,
    closeHelp,
  };
}
