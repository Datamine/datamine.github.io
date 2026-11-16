import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Mesh} from '../geometry.js';
import {sunsetHouseProfile,ROOF_STYLES} from '../housing.js';
import {describeCharacter,sightPrimaryVerb} from '../descriptions.js';
import {MERCHANTS} from '../economy.js';
import {createTahoe,tahoeHeight,tahoeNormal,TAHOE} from '../tahoe.js';
import {PROMETHEUS,drawPrometheus,drawPrometheusFlame,prometheusTorchLight} from '../prometheus.js';
import {createAirship,AIRSHIP_TERMINAL,AIRPORT_SPACEPORT,SPACEPORT_PIER} from '../airship.js';

test('Sunset rowhouses have two residential floors and varied roof silhouettes',()=>{
    const roofs=new Set();for(let i=0;i<=100;i++){const p=sunsetHouseProfile(i/100);assert.equal(p.storeys,2);assert.ok(p.H>=3&&p.H<3.5);roofs.add(p.roof);}assert.deepEqual([...roofs].sort(),[...ROOF_STYLES].sort());
});

test('character examinations are stable observations distinct from their dialogue',()=>{
    const descriptions=new Set();for(const [kind,person] of Object.entries(MERCHANTS)){const text=describeCharacter({kind,...person});assert.ok(text.length>50);assert.notEqual(text,person.intro);descriptions.add(text);}assert.equal(descriptions.size,Object.keys(MERCHANTS).length);
    for(let i=0;i<20;i++){const person={id:'citizen-'+i,label:i%2?'Woman':'Man'};assert.equal(describeCharacter(person),describeCharacter({...person}));descriptions.add(describeCharacter(person));}assert.ok(descriptions.size>10);
    assert.match(describeCharacter({named:'Nia'}),/Mazarine/);assert.match(describeCharacter({id:'cotogna-diner-0'}),/pasta/);
});

test('scenery defaults to Examine while working destinations retain their real actions',()=>{
    for(const kind of ['monument','ferry','pyramid','museum','garden','bridge','hill','painted'])assert.equal(sightPrimaryVerb({kind}),'Examine');
    assert.equal(sightPrimaryVerb({kind:'spaceport'}),'Examine');assert.equal(sightPrimaryVerb({kind:'whale'}),'Jump over');assert.equal(sightPrimaryVerb({id:'sutro'}),'Climb');
});

test('the entire gondola cabin footprint clears the mountain along the actual cable path',()=>{
    const t=createTahoe(),angle=Math.atan2(TAHOE.peak.z-TAHOE.base.z,TAHOE.peak.x-TAHOE.base.x),c=Math.cos(angle),s=Math.sin(angle);
    for(let i=0;i<=2048;i++){const p=t.gondolaAt(i/2048);for(const u of [-.85,.85])for(const v of [-.62,.62]){const ground=tahoeHeight(p.x+u*c-v*s,p.z+u*s+v*c);assert.ok(p.y-.1>ground+.025,'cabin clips terrain at '+i);}}
    for(let i=0;i<t.cablePath.length;i++)assert.deepEqual(t.gondolaAt(i/(t.cablePath.length-1)),t.cablePath[i]);
    const n=tahoeNormal(TAHOE.peak.x+50,TAHOE.peak.z+30),near=tahoeNormal(TAHOE.peak.x+50.02,TAHOE.peak.z+30);assert.ok(Math.abs(Math.hypot(...n)-1)<1e-10);assert.ok(Math.hypot(...n.map((v,i)=>v-near[i]))<.01);
});

test('the spaceport pier connects to the airport without an invisible water gap',()=>{
    const a=createAirship(),p=SPACEPORT_PIER;assert.ok(AIRPORT_SPACEPORT.x>94.8);assert.ok(p.west<94.8&&p.east>p.pad.west);
    const route=a.path(AIRSHIP_TERMINAL.boarding,AIRPORT_SPACEPORT.entry,()=>null);assert.ok(route?.length);let from=AIRSHIP_TERMINAL.boarding;for(const point of route){assert.ok(a.segment(from,point));from=point;}
    assert.ok(!a.contains(AIRPORT_SPACEPORT.x,AIRPORT_SPACEPORT.z),'the parked rocket is solid');
    for(let x=94.5;x<=100;x+=.1)assert.ok(a.contains(x,120.1));assert.equal(a.contains(97,118),false,'water beside the pier stays water');
});

test('Prometheus has a detailed bronze figure and a permanently emissive animated torch',()=>{
    assert.equal(PROMETHEUS.z,2.5*1.5,'Prometheus must sit directly east of Alcatraz');assert.ok(PROMETHEUS.x>42*1.5);
    assert.ok(Math.abs(PROMETHEUS.torch.z-(PROMETHEUS.z-1.25))<1e-9,'the fire moves with the statue');
    const m=new Mesh(),s=drawPrometheus(m,new Map());assert.ok(m.data.every(Number.isFinite));assert.ok(s.count/33>28000&&s.count/33<36000,'the sculpted figure stays within its static geometry budget');assert.ok(s.hi[1]>14);assert.equal(s.kind,'monument');
    for(let i=0;i<m.data.length;i+=11){
        assert.ok(Math.abs(Math.hypot(...m.data.slice(i+3,i+6))-1)<1e-7,'curved surfaces need valid unit normals');
        for(let axis=0;axis<3;axis++)assert.ok(m.data[i+axis]>=s.lo[axis]-1e-7&&m.data[i+axis]<=s.hi[axis]+1e-7,'sculpted details must fit the picking bounds');
    }
    const a=new Mesh(),b=new Mesh();drawPrometheusFlame(a,0);drawPrometheusFlame(b,1100);assert.ok(a.data.every(Number.isFinite)&&b.data.every(Number.isFinite));assert.notDeepEqual(a.data,b.data);assert.ok(a.data.length/33<2400,'the permanent flame keeps a small per-frame mesh');
    for(let i=0;i<a.data.length;i+=11){assert.equal(a.data[i+9],-1.25);assert.ok(a.data[i+10]>.9);assert.ok(a.data[i+1]>=PROMETHEUS.torch.y-.08);}
    const glow=prometheusTorchLight();assert.ok(glow.strength>0&&glow.radius>1);assert.equal(glow.poolStrength,0);
});

test('the alpine texture sheet has four labeled, self-contained world-space materials',async()=>{
    const svg=await readFile(new URL('../../textures/alpine-materials.svg',import.meta.url),'utf8');assert.match(svg,/width="1024" height="1024"/);
    for(const name of ['wind-packed-snow','groomed-snow','fractured-granite','pine-forest-floor'])assert.ok(svg.includes('id="alpine-'+name+'"'));
    const ids=new Set([...svg.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));for(const [,ref] of svg.matchAll(/url\(#([^)]+)\)/g))assert.ok(ids.has(ref));assert.doesNotMatch(svg,/<image|https?:\/\/(?!www\.w3\.org)/);
});
