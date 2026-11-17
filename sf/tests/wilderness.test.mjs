import test from 'node:test';
import assert from 'node:assert/strict';
import {ITEM_STATS,itemById,selectedWeapon} from '../item-stats.js';
import {MONSTER_DROPS,MONSTER_STATS,rollMonsterDrops} from '../monster-drops.js';
import {createWilderness} from '../wilderness.js';
import {drawWildMonster} from '../wilderness-models.js';
import {Mesh} from '../geometry.js';
import {weaponDamageRange,createHitpoints} from '../combat.js';
import {createDeli} from '../deli.js';
import {createEconomy} from '../economy.js';
import {normalizeCharacter,characterAppearance} from '../character-config.js';
import {drawCharacter} from '../characters.js';
import {theyLiveDialogue,createTheyLiveQuest} from '../they-live.js';

const sequence=values=>()=>values.shift()??.5;
test('drop catalogs have exact 1/20 and 1/50 boundaries; giant success chooses one ice piece',()=>{
    assert.equal(rollMonsterDrops('bear',()=>.05).length,0);assert.equal(rollMonsterDrops('bear',()=>.05-Number.EPSILON)[0].lootKind,'peptides');
    for(const kind of ['snow-giant','ice-giant']){
        assert.deepEqual(rollMonsterDrops(kind,()=>.02),[]);
        assert.equal(rollMonsterDrops(kind,sequence([.02-Number.EPSILON,0]))[0].itemId,'ice-top');
        const pants=rollMonsterDrops(kind,sequence([0,.999999]));assert.equal(pants.length,1);assert.equal(pants[0].itemId,'ice-pants');
    }
    for(const rules of Object.values(MONSTER_DROPS))for(const rule of rules){assert.ok(Number.isInteger(rule.oneIn)&&rule.oneIn>=1);for(const id of rule.choose||[rule.item])assert.ok(itemById(id));}
    assert.equal(rollMonsterDrops('cow')[0].lootKind,'sandwich');
});
test('weapon/food stats live in the item catalog and the axe fills the damage gap',()=>{
    const average=id=>{const r=weaponDamageRange(1,id);return (r.min+r.max)/2;};assert.ok(average('bayonet')<average('battleaxe'));assert.ok(average('battleaxe')<average('railgun'));
    assert.equal(MONSTER_STATS.kraken.hp,300);assert.equal(MONSTER_STATS.bear.level,10);assert.equal(MONSTER_STATS.bear.hp,20);
    assert.equal(selectedWeapon('battleaxe',{}),'unarmed');assert.equal(selectedWeapon('battleaxe',{battleaxe:true}),'battleaxe');
    assert.ok(ITEM_STATS.sandwich.inNOutPrice<ITEM_STATS.sandwich.pickupPrice);
});
test('a friendly bear never attacks unprovoked; petting makes peace and death rolls only once',()=>{
    const hits=[],drops=[],game=createWilderness({spawns:[{id:'bear',combatKind:'bear',x:0,z:0}],random:()=>0,onDrop:item=>drops.push(item),onDamage:(p,n)=>hits.push(n)}),p={id:'p',x:.4,z:0,weapon:'railgun',level:1};
    game.update(10,[p]);assert.equal(hits.length,0);const bear=game.actors[0];assert.ok(Math.hypot(bear.x,bear.z)>1,'the bear should wander');Object.assign(p,{x:bear.x+.4,z:bear.z});assert.equal(game.pet('bear',p).ok,true);
    game.strike('bear',p);game.update(.7,[p]);assert.ok(hits.length>0);game.pet('bear',p);const count=hits.length;game.update(3,[p]);assert.equal(hits.length,count);
    while(game.actors[0].hp)game.strike('bear',p);assert.equal(drops.length,1);assert.equal(drops[0].lootKind,'peptides');assert.equal(game.strike('bear',p).ok,false);
    game.update(MONSTER_STATS.bear.respawn,[p]);assert.equal(game.actors[0].hp,20);assert.equal(game.actors[0].enemy,null);
});
test('giants require many hits, retaliate, leash to their home and respawn',()=>{
    for(const kind of ['snow-giant','ice-giant']){let count=0,harm=0;const game=createWilderness({spawns:[{id:kind,combatKind:kind,x:0,z:0}],random:()=>.5,onDamage:()=>harm++}),p={id:'p',x:.5,z:0,weapon:'railgun',level:1};
        while(game.actors[0].hp){game.strike(kind,p);game.update(.8,[p]);count++;}assert.ok(count>=14);assert.ok(harm>3);game.update(MONSTER_STATS[kind].respawn,[]);assert.equal(game.actors[0].hp,MONSTER_STATS[kind].hp);
        game.strike(kind,p);game.update(1,[{...p,x:100}]);assert.equal(game.actors[0].enemy,null);
    }
});
test('bear, giant, icy armor and battleaxe geometry is finite and changes the actual rigged mesh',()=>{
    for(const combatKind of ['bear','snow-giant','ice-giant'])for(const phase of [0,1.2,3.1]){const m=new Mesh();drawWildMonster(m,{combatKind,x:0,z:0,base:0,angle:.4,motion:1,phase,affection:2},800);assert.ok(m.data.length>0&&m.data.every(Number.isFinite));assert.ok(m.data.length/33<5000);}
    const plain=new Mesh(),ice=new Mesh(),settings=normalizeCharacter({weapon:'battleaxe',iceTop:true,icePants:true,gender:'woman'});drawCharacter(plain,0,0,0);drawCharacter(ice,0,0,0,0,1,false,settings.skin,settings.shirt,characterAppearance(settings));assert.ok(ice.data.length>plain.data.length&&ice.data.every(Number.isFinite));
});
test('In-N-Out sells the same healing food for two coins and preserves insufficient-funds behavior',()=>{
    const economy=createEconomy({coins:5}),health=createHitpoints({hp:1}),deli=createDeli({economy,health,origin:{x:0,y:0},routeTo:()=>[],canTravel:()=>true});
    assert.equal(deli.pickup('in-n-out').ok,true);assert.equal(economy.state.coins,3);assert.equal(deli.eat().ok,true);assert.equal(health.state.hp,19);
    assert.equal(deli.pickup().ok,true);assert.equal(economy.state.coins,0);assert.equal(deli.pickup('in-n-out').ok,false);assert.equal(deli.state.sandwiches,1);
});
test('only a completed alien quest opens the battleaxe stock; its purchase survives economy restoration',()=>{
    const quest=createTheyLiveQuest(),npc={id:'industrial-armorer',questRole:'armorer'};assert.ok(!theyLiveDialogue(npc,quest).choices);
    quest.state.completed=true;const shop=theyLiveDialogue(npc,quest,{buyBattleaxe:()=>({ok:true})});assert.match(shop.choices[0].label,/50 coins/);
    const economy=createEconomy({coins:60});assert.equal(economy.buyEquipment('battleaxe').ok,true);assert.equal(economy.state.coins,10);assert.equal(economy.buyEquipment('battleaxe').ok,false);assert.ok(createEconomy(economy.state).state.ownedEquipment.includes('battleaxe'));
});
