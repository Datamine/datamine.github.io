import test from 'node:test';
import assert from 'node:assert/strict';
import { createFerrari } from '../ferrari.js';
import { createRegionalRoad } from '../regional-road.js';
import { createEconomy } from '../economy.js';
import { createFuelDialogue, refuelFerrariFromCan } from '../fuel.js';

test('a stranded Ferrari can be recovered with a saved portable can bought without the car', () => {
  const car = createFerrari(createRegionalRoad());
  car.mount();
  // Partial tanks and detours can stop far short of the designed fuel stops.
  car.state.fuel = 0.08;
  const destination = car.sample(car.length);
  car.driveTo(destination.x, destination.z);
  let event;
  for (let i = 0; i < 1000 && event !== 'empty'; i++) event = car.update(1 / 30);
  assert.equal(event, 'empty');
  car.park();
  const stranded = car.state.distance;
  const station = car.stations.find((s) => s.id === 'fuel-outbound');
  assert.ok(Math.abs(stranded - station.distance) > 6);
  let saved;
  const purse = createEconomy({ coins: 37 }, (s) => (saved = s)),
    dialogue = createFuelDialogue(station, car, purse);
  assert.equal(
    dialogue.choices.length,
    1,
    'portable fuel must be sold when the Ferrari is far away',
  );
  assert.match(dialogue.choices[0].label, /Fuel can/);
  assert.equal(dialogue.choices[0].accept().ok, true);
  assert.equal(purse.state.coins, 0);
  assert.equal(purse.state.fuelCans, 1);
  assert.equal(car.state.fuel, 0);
  assert.equal(car.state.distance, stranded);
  const restored = createEconomy(saved);
  assert.equal(restored.state.fuelCans, 1);
  assert.equal(refuelFerrariFromCan(car, restored).ok, true);
  assert.equal(restored.state.fuelCans, 0);
  assert.equal(car.state.fuel, 1);
  assert.equal(car.state.distance, stranded);
  car.mount();
  car.driveTo(destination.x, destination.z);
  car.update(1);
  assert.ok(car.state.distance > stranded, 'the recovered car can drive again');
});

test('every station offers cans, preserves its price, and permits recovery with an empty purse', () => {
  const car = createFerrari(createRegionalRoad());
  car.mount();
  car.park();
  for (const station of car.stations) {
    const purse = createEconomy({ coins: 19 }),
      d = createFuelDialogue(station, car, purse),
      can = d.choices.find((c) => c.label.startsWith('Fuel can'));
    assert.ok(can);
    assert.equal(can.accept().ok, true);
    assert.equal(purse.state.coins, station.paid ? 0 : 19);
    assert.equal(purse.state.fuelCans, 1);
    const empty = createEconomy({ coins: 0 });
    assert.equal(
      createFuelDialogue(station, car, empty)
        .choices.find((c) => c.label.startsWith('Fuel can'))
        .accept().ok,
      true,
    );
  }
});

test('missing cans, full tanks, and an unborrowed car never consume inventory or grant fuel', () => {
  const car = createFerrari(createRegionalRoad()),
    purse = createEconomy({ fuelCans: 1 });
  assert.equal(refuelFerrariFromCan(car, purse).ok, false);
  assert.equal(purse.state.fuelCans, 1);
  car.mount();
  assert.equal(refuelFerrariFromCan(car, purse).ok, false);
  assert.equal(purse.state.fuelCans, 1);
  car.state.fuel = 0;
  const empty = createEconomy();
  assert.equal(refuelFerrariFromCan(car, empty).ok, false);
  assert.equal(car.state.fuel, 0);
  assert.equal(empty.state.fuelCans, 0);
  assert.equal(
    createEconomy({ coins: 2, equity: 1, grain: 3 }).state.fuelCans,
    0,
    'old saves gain an empty can inventory',
  );
  for (const value of [-1, NaN, Infinity, 1.5, '2'])
    assert.equal(createEconomy({ fuelCans: value }).state.fuelCans, 0);
});

test('direct pump refueling still requires the car and cannot charge for a remote fill', () => {
  const car = createFerrari(createRegionalRoad()),
    purse = createEconomy({ coins: 42 }),
    station = car.stations[0];
  car.state.distance = station.distance;
  car.state.fuel = 0;
  let d = createFuelDialogue(station, car, purse),
    fill = d.choices.find((c) => c.label.startsWith('Refuel'));
  car.state.distance -= 20;
  assert.equal(fill.accept().ok, false);
  assert.equal(purse.state.coins, 42);
  assert.equal(car.state.fuel, 0);
  car.state.distance = station.distance;
  d = createFuelDialogue(station, car, purse);
  fill = d.choices.find((c) => c.label.startsWith('Refuel'));
  assert.equal(fill.accept().ok, true);
  assert.equal(car.state.fuel, 1);
  assert.equal(purse.state.coins, 0);
});
