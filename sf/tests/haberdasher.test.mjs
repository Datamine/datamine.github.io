import test from 'node:test';
import assert from 'node:assert/strict';
import {createEconomy} from '../economy.js';
import {HAT_CATALOG,hatById,ownedHat} from '../hat-catalog.js';
import {getHatGeometry} from '../hat-models.js';
import {haberdasherDialogue} from '../haberdashery.js';
import {getCharacterMesh,drawCharacter,CHARACTER_BONES} from '../characters.js';
import {normalizeCharacter,characterAppearance,drawCharacterPreview} from '../character-config.js';
import {Mesh} from '../geometry.js';
import {drawHaberdasherShop,HABERDASHER_SIGNS} from '../haberdasher-shop.js';
import {HABERDASHER} from '../haberdasher-layout.js';
import {SOUTHERN_HOUSING} from '../southern-layout.js';
import {airportRoadDistance} from '../airship.js';
import {buildingNPCService} from '../building-interactions.js';

test('the permanent hat catalog spans one to one hundred thousand coins and every purchase is atomic',()=>{
    assert.equal(HAT_CATALOG.length,11);assert.equal(HAT_CATALOG[0].price,1);assert.equal(HAT_CATALOG.at(-1).price,100000);
    assert.equal(new Set(HAT_CATALOG.map(h=>h.prestige)).size,HAT_CATALOG.length);
    for(const h of HAT_CATALOG){
        const writes=[],e=createEconomy({coins:h.price},s=>writes.push(s));
        assert.equal(e.buyHat(h.id).ok,true);assert.equal(e.state.coins,0);assert.deepEqual(e.state.ownedHats,[h.id]);assert.equal(writes.length,1);
        assert.equal(writes[0].coins,0);assert.deepEqual(writes[0].ownedHats,[h.id]);
        assert.equal(e.buyHat(h.id).ok,false);assert.equal(writes.length,1);assert.deepEqual(createEconomy(writes[0]).state,e.state);
        const poor=createEconomy({coins:h.price-1});assert.equal(poor.buyHat(h.id).ok,false);assert.equal(poor.state.coins,h.price-1);assert.deepEqual(poor.state.ownedHats,[]);
    }
    const e=createEconomy({coins:100,ownedHats:['paper','paper','imaginary',null]});assert.deepEqual(e.state.ownedHats,['paper']);assert.equal(e.buyHat('imaginary').ok,false);assert.equal(e.state.coins,100);
    assert.equal(ownedHat(e.state.ownedHats,'none'),true);assert.equal(ownedHat(e.state.ownedHats,'paper'),true);assert.equal(ownedHat(e.state.ownedHats,'crown'),false);
});

test('buying fits the hat, owned hats can be worn again for free, and unaffordable choices change nothing',()=>{
    const e=createEconomy({coins:51}),worn=[],npc={name:'Haberdasher'},open=()=>haberdasherDialogue(npc,e,id=>worn.push(id));
    assert.equal(open().choices[0].accept().ok,true);assert.equal(e.state.coins,50);assert.equal(worn.at(-1),'paper');
    assert.equal(open().choices.find(c=>c.label.startsWith('Panama')).accept().ok,true);assert.equal(e.state.coins,0);assert.equal(worn.at(-1),'panama');
    assert.equal(open().choices[0].accept().ok,true);assert.equal(e.state.coins,0);assert.equal(worn.at(-1),'paper');
    const before=[...worn];assert.equal(open().choices.at(-1).accept().ok,false);assert.equal(e.state.coins,0);assert.deepEqual(worn,before);
    assert.match(open().choices[0].label,/Wear owned/);assert.equal(buildingNPCService({kind:'haberdasher'}),'haberdasher');
});

test('all hat meshes are distinct cached head-bone geometry for both genders and remain finite during emotes',()=>{
    const meshes=new Set();
    for(const h of HAT_CATALOG){
        const geo=getHatGeometry(h.id);assert.ok(geo.mesh.data.every(Number.isFinite));assert.ok(geo.channels.every(c=>c>=0&&c<=2));assert.equal(getHatGeometry(h.id),geo);
        for(const gender of ['man','woman']){
            const settings=normalizeCharacter({gender,hat:h.id}),appearance=characterAppearance(settings),mesh=getCharacterMesh(appearance);meshes.add(mesh);
            const vertices=Array.from(mesh.slots).flatMap((slot,i)=>slot>=11?[i]:[]);assert.ok(vertices.length>10);
            for(const i of vertices){assert.equal(mesh.bonesA[i],CHARACTER_BONES.head);assert.equal(mesh.bonesB[i],CHARACTER_BONES.head);}
            for(const action of ['dance','caught','forward-roll']){
                const m=new Mesh();drawCharacter(m,0,0,0,.7,1,false,settings.skin,settings.shirt,{...appearance,action,actionT:.5,time:1});
                assert.ok(m.data.every(Number.isFinite));assert.ok(m.data.length/33<5000);
            }
        }
    }
    assert.equal(meshes.size,HAT_CATALOG.length*2);assert.equal(normalizeCharacter({hat:'imaginary'}).hat,'none');assert.equal(hatById('none'),null);
});

test('the tallest hats fit entirely inside the character preview',()=>{
    for(const hat of ['wizard','crown','stone-of-jordan','santa']){
        const points=[],ctx={clearRect(){},fillRect(){},beginPath(){},ellipse(){},fill(){},closePath(){},moveTo(x,y){points.push([x,y]);},lineTo(x,y){points.push([x,y]);}},canvas={width:240,height:240,getContext:()=>ctx};
        drawCharacterPreview(canvas,normalizeCharacter({hat,gender:'woman'}));
        assert.ok(points.length>0);for(const [x,y] of points){assert.ok(x>0&&x<240);assert.ok(y>5&&y<240,'hat clipped above preview');}
    }
});

test('the expensive hats have the requested names, prices and physical models, preserving old top-tier ownership',()=>{
    assert.equal(HAT_CATALOG.find(h=>h.price===50000).name,'Stone of Jordan');assert.equal(HAT_CATALOG.find(h=>h.price===75000).name,'Santa Hat');assert.equal(HAT_CATALOG.find(h=>h.price===100000).name,'Blue Partyhat');
    const old=createEconomy({coins:0,ownedHats:['crown']});assert.deepEqual(old.state.ownedHats,['crown']);assert.equal(normalizeCharacter({hat:'crown'}).hat,'crown');
    const stone=getHatGeometry('stone-of-jordan').mesh.data,xs=stone.filter((_,i)=>i%11===0);assert.ok(Math.max(...xs)-Math.min(...xs)>.55,'the Stone of Jordan is a large stone balanced on the head');
    const [r,g,b]=hatById('crown').colors[0].match(/[a-f0-9]{2}/gi).map(v=>parseInt(v,16));assert.ok(b>r&&b>g,'the partyhat is blue');
});

test('the haberdashery occupies an empty parcel and keeps its solid walls off the road',()=>{
    const m=new Mesh(),signs=new Map(HABERDASHER_SIGNS.map(s=>[s,[[0,0],[1,0],[1,1],[0,1]]])),site=drawHaberdasherShop(m,signs);
    assert.ok(m.data.every(Number.isFinite));assert.ok(m.data.length/33<12000);assert.deepEqual(site.entry,HABERDASHER.entry);
    for(const [x,z] of site.footprint)assert.ok(airportRoadDistance(x,z)>.25);
    const h=HABERDASHER;
    for(const p of SOUTHERN_HOUSING){const rotated=Math.abs(Math.sin(p.rotation))>.5,w=rotated?p.d:p.w,d=rotated?p.w:p.d;assert.ok(Math.abs(p.x-h.x)>=(w+h.w)/2||Math.abs(p.z-h.z)>=(d+h.d)/2,'shop replaces an existing house');}
});
