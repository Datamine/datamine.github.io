import test from 'node:test';
import assert from 'node:assert/strict';
import {createSunglasses,drawDroppedSunglasses} from '../sunglasses.js';
import {normalizeCharacter,characterAppearance} from '../character-config.js';
import {getCharacterMesh,drawCharacter} from '../characters.js';
import {Mesh} from '../geometry.js';
import {BILLBOARD_ART} from '../billboards.js';
import {createSignTexture} from '../materials.js';

test('sunglasses can be collected once, persist ownership, and have an explicit wear preference',()=>{
    const saved=[],item=createSunglasses({},value=>saved.push(value));assert.equal(item.state.owned,false);
    assert.equal(item.pickUp().ok,true);assert.equal(item.pickUp().ok,false);assert.equal(saved.length,1);
    assert.equal(createSunglasses(saved[0]).state.owned,true);assert.equal(createSunglasses({owned:'true'}).state.owned,false);
    assert.equal(normalizeCharacter({sunglasses:'false'}).sunglasses,false);assert.equal(normalizeCharacter({sunglasses:true}).sunglasses,true);
    assert.equal(characterAppearance(normalizeCharacter({sunglasses:true})).sunglasses,true);
});

test('worn sunglasses use the animated head rig and the beach pickup has bounded finite geometry',()=>{
    const bare=getCharacterMesh({backpack:false}),shades=getCharacterMesh({backpack:false,sunglasses:true});
    assert.notEqual(bare,shades);assert.ok(shades.indices.length>bare.indices.length);assert.equal(getCharacterMesh({backpack:false}),bare);
    for(const action of ['dance','pet',null]){const m=new Mesh();drawCharacter(m,0,0,0,1,.7,false,'#bd9369','#707b4b',{sunglasses:true,action,time:1});assert.ok(m.data.every(Number.isFinite));}
    const m=new Mesh();drawDroppedSunglasses(m,{x:0,z:0},2,0,{reduced:true});assert.ok(m.data.every(Number.isFinite));assert.ok(m.data.length/33<300);
});

test('every billboard reveals its message, late images cannot cover it, and removing glasses restores the ads',()=>{
    const oldDocument=globalThis.document,oldImage=globalThis.Image,images=[],text=[],draws=[];
    let uploads=0,unit=5,binding='terrain';
    const context={fillRect(){},strokeRect(){},fillText(...args){text.push(args);},drawImage(...args){draws.push(args);}},canvas={getContext:()=>context};
    globalThis.document={createElement:()=>canvas};globalThis.Image=class{constructor(){images.push(this);}};
    const gl={TEXTURE0:0,ACTIVE_TEXTURE:1,TEXTURE_BINDING_2D:2,createTexture:()=>({}),bindTexture(_,v){binding=v;},activeTexture(v){unit=v;},getParameter:k=>k===1?unit:binding,isContextLost:()=>false,texImage2D(){uploads++;},texParameteri(){}};
    try{
        const controls={},signs=new Map();createSignTexture(gl,['Ordinary storefront'],signs,{artwork:BILLBOARD_ART,billboardController:controls});
        const uv=JSON.stringify([...signs]);text.length=0;binding='terrain';unit=5;
        assert.equal(controls.setRevealed(true),true);assert.equal(binding,'terrain');assert.equal(unit,5);
        for(const a of BILLBOARD_ART)for(const line of a.message.split('\n'))assert.ok(text.some(t=>t[0]===line));
        assert.ok(text.every(t=>t[2]>=64),'storefront lettering remains outside the rewritten billboard cells');
        images[0].onload();assert.equal(draws.length,0,'late artwork cannot overwrite the revealed message');
        const count=uploads;assert.equal(controls.setRevealed(true),false);assert.equal(uploads,count);
        assert.equal(controls.setRevealed(false),true);assert.equal(draws.length,1,'the loaded original is restored immediately');
        for(const image of images.slice(1))image.onload();assert.equal(draws.length,BILLBOARD_ART.length);
        assert.equal(JSON.stringify([...signs]),uv,'toggling does not rebuild geometry or change UVs');
    }finally{if(oldDocument===undefined)delete globalThis.document;else globalThis.document=oldDocument;if(oldImage===undefined)delete globalThis.Image;else globalThis.Image=oldImage;}
});
