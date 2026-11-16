import test from 'node:test';
import assert from 'node:assert/strict';
import {Mesh} from '../geometry.js';
import {RESEARCH_CAMPUSES,researchCampusWalkable} from '../research-layout.js';
import {RESEARCHERS,createResearchDialogue} from '../research-dialogue.js';
import {RESEARCH_SIGNS,drawResearchCampuses,createResearcherNPCs,moveResearcherNPCs} from '../research-campuses.js';
import {describeCharacter,sightPrimaryVerb} from '../descriptions.js';
import {createAirship} from '../airship.js';
import {RESEARCH_ART} from '../research-art.js';

test('the institutes have distinct authored models, façade signs, and shared collision footprints',()=>{
    const m=new Mesh(),signs=new Map([...RESEARCH_SIGNS,...RESEARCH_ART.map(a=>a.id)].map(s=>[s,[[0,0],[1,0],[1,1],[0,1]]])),sites=drawResearchCampuses(m,signs);
    assert.equal(sites.length,2);assert.ok(m.data.every(Number.isFinite));assert.ok(m.data.length/33<18000);
    assert.deepEqual(sites.map(s=>s.label),RESEARCH_CAMPUSES.map(c=>c.label));
    for(const [i,s] of sites.entries()){
        const c=RESEARCH_CAMPUSES[i];assert.equal(sightPrimaryVerb(s),'Enter');
        assert.ok(s.count>0);assert.ok(s.hi[1]-s.lo[1]>3);
        assert.equal(researchCampusWalkable(c.x,c.z),true,'the indoor aisle is open');
        assert.equal(researchCampusWalkable(c.x-c.w/2,c.z),false,'side walls remain solid');
        assert.equal(researchCampusWalkable(c.x,c.z+c.d/2),true,'the doorway stays open');
        assert.equal(researchCampusWalkable(c.x,173.3),false,'the fountain or sculpture is solid');
        assert.equal(researchCampusWalkable(c.x,174.5),false,'the occupied bench is solid');
        assert.equal(researchCampusWalkable(c.x-2.5,173.8),true,'the courtyard remains walkable');
    }
});

test('six different researchers offer repeatable branching conversations and individual examinations',()=>{
    const npcs=createResearcherNPCs(),access=createAirship();assert.equal(npcs.length,6);assert.equal(new Set(npcs.map(n=>n.id)).size,6);
    assert.equal(new Set(npcs.map(n=>describeCharacter(n))).size,6);
    for(const c of RESEARCH_CAMPUSES)assert.equal(npcs.filter(n=>n.campus===c.id).length,3);
    let branches=0;
    function checkChoices(choices){
        assert.ok(choices.length>=2);
        for(const choice of choices){assert.ok(choice.label);assert.equal(choice.trade,undefined);assert.equal(choice.accept,undefined);
            if(choice.next){branches++;assert.ok(choice.next.intro);checkChoices(choice.next.choices);}else assert.ok(choice.receipt.length>30);
        }
    }
    for(const npc of npcs){
        const d=createResearchDialogue(npc);assert.equal(d.repeat,true);assert.equal(d.name,npc.name);assert.equal(d.decline,'Leave');
        assert.notEqual(d.intro,describeCharacter(npc));checkChoices(d.choices);
        assert.ok(access.contains(npc.approach.x+.5,npc.approach.y+.5));
    }
    assert.ok(branches>=2);assert.equal(RESEARCHERS.length,6);
});

test('campus paths go around buildings and courtyard obstacles without cutting through them',()=>{
    const a=createAirship();
    for(const c of RESEARCH_CAMPUSES)for(const [x,z] of [[c.x,c.north+.2],[c.west+.6,173.8],[c.east-.6,173.8],[c.x,c.z],[c.x-.5,c.z-1]]){
        const target={x:x-.5,y:z-.5},route=a.path(c.entry,target,()=>null);assert.ok(route?.length);
        let previous=c.entry;for(const point of route){assert.ok(a.segment(previous,point));previous=point;}
        assert.deepEqual(previous,target);
    }
});

test('all academics stroll, pause and turn along courtyard loops with distance-driven footfalls',()=>{
    const npcs=createResearcherNPCs(),initial=npcs.map(n=>({x:n.x,z:n.z,phase:n.phase})),walked=new Set(),paused=new Set();
    for(let frame=0;frame<2400;frame++){
        const previous=npcs.map(n=>({x:n.x,z:n.z,phase:n.phase}));moveResearcherNPCs(npcs,.05);
        for(const [i,n] of npcs.entries()){
            assert.ok(researchCampusWalkable(n.x,n.z),n.id+' crossed a building or courtyard obstacle');
            const distance=Math.hypot(n.x-previous[i].x,n.z-previous[i].z);
            assert.ok(distance<=n.speed*.05+1e-8,'walking speed must stay bounded');
            if(n.moving){walked.add(n.id);assert.ok(n.phase>previous[i].phase);}
            else if(n.stops)paused.add(n.id);
            assert.ok(Number.isFinite(n.angle));assert.ok(n.motion>=0&&n.motion<=1);
        }
    }
    assert.equal(walked.size,6);assert.equal(paused.size,6);
    for(const [i,n] of npcs.entries()){
        assert.ok(n.phase>initial[i].phase+10);assert.ok(n.stops>4);
        assert.deepEqual(n.approach,{x:n.x-.5,y:n.z+.15},'conversation approach follows the moving person');
    }
});

test('academics wait for approaching players and stay still during conversations, then resume',()=>{
    const npcs=createResearcherNPCs(),npc=npcs[0];moveResearcherNPCs(npcs,2);
    const before={x:npc.x,z:npc.z,phase:npc.phase};npc.waiting=true;
    moveResearcherNPCs(npcs,10,{lookAt:{x:npc.x,z:npc.z+3}});
    assert.deepEqual({x:npc.x,z:npc.z,phase:npc.phase},before);assert.ok(Math.abs(npc.angle-Math.PI/2)<1e-8);
    npc.waiting=false;npc.hold=2;
    moveResearcherNPCs(npcs,10,{paused:true});assert.equal(npc.hold,2);
    assert.deepEqual({x:npc.x,z:npc.z,phase:npc.phase},before);
    for(let i=0;i<160;i++)moveResearcherNPCs(npcs,.05);
    assert.ok(npc.phase>before.phase);assert.equal(npc.hold,0);
});
