import test from 'node:test';
import assert from 'node:assert/strict';
import {Mesh} from '../geometry.js';
import {CAVE_TILES,CAVE_NAVIGATION,ILLUMINATI_CAVE,privateMapInstance,instanceTile,sameMapInstance} from '../map-instances.js';
import {createStealthBomber,bombTileArea,cowInBombArea,bomberLanding,createBomberDescent,bomberDescentPoint,BOMBER_SPEED} from '../stealth-bomber.js';
import {createIlluminatiCaveMesh,drawStealthBomber,drawBombEffect,drawParachute,drawBomberCrash} from '../illuminati-models.js';
import {createSecretAdventures} from '../secret-adventures.js';
import {createEconomy} from '../economy.js';
import {rocketCruiseSpeed} from '../rocket.js';

test('every cave tile has a material and the entrance connects to the hangar around the aircraft',()=>{
    assert.equal(CAVE_TILES.length,28*28);assert.ok(CAVE_TILES.every(t=>['rock','stone','hangar'].includes(t.type)));
    const from={x:ILLUMINATI_CAVE.entrance.x-.5,y:ILLUMINATI_CAVE.entrance.z-.5},to={x:ILLUMINATI_CAVE.boarding.x-.5,y:ILLUMINATI_CAVE.boarding.z-.5},path=CAVE_NAVIGATION.path(from,to);assert.ok(path?.length);
    let previous=from;for(const point of path){assert.ok(CAVE_NAVIGATION.segment(previous,point));previous=point;}
    assert.equal(CAVE_NAVIGATION.free(13,11),false,'the parked aircraft is an actual navigation obstacle');
    const instance=privateMapInstance('illuminati','alice');assert.equal(instanceTile(instance,13.5,24.5).type,'stone');assert.equal(instanceTile(instance,-1,24),null);
    assert.equal(sameMapInstance({instance},{instance:privateMapInstance('illuminati','bob')}),false);
});
test('flight stays above terrain and bomb geometry only includes live cows inside nine tiles',()=>{
    const bomber=createStealthBomber({ground:()=>80});bomber.board();bomber.target(40,106);bomber.update(1);assert.ok(bomber.state.position.x>-24);assert.equal(bomber.state.position.y,85);
    const area=bombTileArea(35.2,175.8);assert.equal(cowInBombArea({combatKind:'cow',hp:20,x:35,z:175},area),true);
    assert.equal(cowInBombArea({combatKind:'kraken',hp:100,x:35,z:175},area),false);assert.equal(cowInBombArea({combatKind:'cow',hp:20,x:37,z:175},area),false);
});
test('B-2 cruises at airship speed, boosts to rocket cruise speed, and releases boost immediately',()=>{
    const boost=rocketCruiseSpeed({x:0,z:0},{x:2400,z:0}),bomber=createStealthBomber({ground:()=>2,cruiseHeight:()=>31,boostSpeed:()=>boost});bomber.board({x:0,y:0,z:0});bomber.target(3000,0);
    bomber.update(1);assert.equal(bomber.state.position.x,BOMBER_SPEED);assert.equal(bomber.state.position.y,31);
    bomber.update(1,{boost:true});assert.equal(bomber.state.position.x,BOMBER_SPEED+boost);assert.equal(bomber.state.boost,true);
    bomber.update(1);assert.equal(bomber.state.position.x,BOMBER_SPEED*2+boost);assert.equal(bomber.state.boost,false);
});
test('ejection finds walkable shore and follows a bounded descent without permitting more flight',()=>{
    const to=bomberLanding(-12,10,{free:(x,z)=>x>=0&&z>=0,ground:()=>2});assert.ok(to.x>=0);assert.equal(to.y,2);
    const bomber=createStealthBomber();bomber.board({x:-12,y:25,z:10});const flight=createBomberDescent(bomber.state.position,to,.2);assert.equal(bomber.eject(flight),true);assert.equal(bomber.target(100,100),false);assert.equal(bomber.eject(flight),false);
    bomber.update(flight.duration/2,{boost:true});assert.ok(bomber.state.position.y>to.y&&bomber.state.position.y<flight.from.y);assert.equal(bomber.state.boost,false);
    assert.equal(bomber.update(flight.duration),'landed');assert.deepEqual(bomber.state.position,to);assert.deepEqual(bomberDescentPoint(flight,10000),to);
    assert.equal(bomberLanding(0,0,{free:()=>false,ground:()=>0}),null);
});
test('offline parachuting lands on native walkable terrain, retains the replacement and does not inflict crash damage',()=>{
    let time=0,impacts=0;const messages=[],changes=[],game=createSecretAdventures({saved:{initiated:true},economy:createEconomy({coins:0}),guildMember:()=>true,guildSite:{x:1,y:1,w:4,d:4},getPlayer:()=>({x:2,z:2}),ground:()=>1,landingFree:(x,z)=>x>=0,transition:m=>changes.push(m),onMessage:m=>messages.push(m),onOfflineBomb:()=>impacts++,frameTime:()=>time});
    game.enterCave();game.boardBomber();assert.equal(game.ejectBomber().ok,true);assert.equal(game.bomber.state.phase,'parachuting');assert.equal(game.dropBomb().ok,false);assert.equal(game.crashes.length,1);
    const duration=game.bomber.state.descent.duration;time=duration*1000;game.update(duration);assert.equal(game.bomber.state.active,false);assert.ok(changes.at(-1).position.x>=0);assert.match(messages.at(-1),/Illuminati will pay/);assert.equal(impacts,0);
    game.enterCave();assert.equal(game.boardBomber().ok,true,'a replacement is available without another payment');
});
test('parachute and abandoned bomber meshes stay finite and their small explosion disappears',()=>{
    const crash={from:{x:0,y:25,z:0},to:{x:30,y:1,z:0},heading:0,started:0};
    for(const t of [0,1200,3999,4000,4500,6100,6201]){const m=new Mesh();drawParachute(m,{x:0,y:15,z:0},.3,t);assert.ok(m.data.length>0&&m.data.every(Number.isFinite));const effect=new Mesh();drawBomberCrash(effect,crash,t);assert.ok(effect.data.every(Number.isFinite));assert.equal(effect.data.length>0,t<6200);}
});
test('cave surfaces, camera-facing wall groups and the B-2 are finite reusable meshes',()=>{
    const cave=createIlluminatiCaveMesh(),plane=new Mesh();drawStealthBomber(plane,{x:0,y:35,z:0},.6,{bank:.25});
    assert.equal(cave.walls.length,4);for(const mesh of [cave,...cave.walls.map(w=>w.mesh),plane])assert.ok(mesh.data.length>0&&mesh.data.every(Number.isFinite));
    assert.ok(plane.data.length/33<1500,'the flying wing is a small low-poly model');
});
test('bomb visuals remain valid throughout free fall, impact, smoke and disappearance',()=>{
    for(const elapsed of [0,750,1499,1500,1850,2100,2199,2201]){
        const m=new Mesh();drawBombEffect(m,{x:35.5,z:175.5,from:{y:35},started:0},elapsed,1.6);assert.ok(m.data.every(Number.isFinite));
        if(elapsed<2200)assert.ok(m.data.length>0);else assert.equal(m.data.length,0);
    }
});
