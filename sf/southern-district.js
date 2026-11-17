import {pose} from './geometry.js';
import {drawFacadeWindow} from './windows.js';
import {SECOND_STREET_X,AIRSHIP_TERMINAL,AIRPORT_SPACEPORT} from './airship.js';
import {drawRocketPad} from './rocket.js';

export const TAX_HQ=Object.freeze({x:SECOND_STREET_X-10,z:135.1,entry:{x:SECOND_STREET_X-10.5,y:131.4}});
export const SF_SPACEPORT=AIRPORT_SPACEPORT;
export const SPACEPORT_HOUSES=Object.freeze({x:SECOND_STREET_X-2.7,z:133,w:5.4,d:3.4});
export const RAIL_PIT=Object.freeze({west:SECOND_STREET_X-12,east:SECOND_STREET_X-8,north:139,south:143.5,floor:.12});
export function inRailPit(x,z){return x>RAIL_PIT.west&&x<RAIL_PIT.east&&z>RAIL_PIT.north&&z<RAIL_PIT.south;}

// Keep the officials' forecourt, headquarters, rail sign, and excavation open.
// Tree planting adds a canopy margin beyond these public grounds.
export const CIVIC_GROUNDS=Object.freeze({west:TAX_HQ.x-3.5,east:TAX_HQ.x+3.5,north:TAX_HQ.entry.y-3,south:RAIL_PIT.south+.2});
export function inCivicGrounds(x,z,margin=0){const p=CIVIC_GROUNDS;return x>=p.west-margin&&x<=p.east+margin&&z>=p.north-margin&&z<=p.south+margin;}

export function drawPlaque(m,signs,text,x,y,z,w,h,front=true){
    const uv=signs.get(text);if(!uv)return;
    const p=[[x-w/2,y,z],[x+w/2,y,z],[x+w/2,y+h,z],[x-w/2,y+h,z]];
    m.quad(...(front?p:[p[1],p[0],p[3],p[2]]),'#ffffff',uv);
}

export function drawSouthernDistrict(m,signs,{terrain=null,includeRailPit=true}={}){
    const base=AIRSHIP_TERMINAL.base,buildings=[];
    let start=m.data.length;const {x,z}=TAX_HQ;
    pose(m,x,base,z,0,()=>{
        m.box(-2.7,0,-1.7,5.4,.2,3.4,'#a8a992','stone');
        m.box(-2.5,.2,-1.5,5,2.9,3,'#bfbea5','stone');
        for(const xx of [-1.95,-1.2,.7,1.45])for(const yy of [.6,1.8])drawFacadeWindow(m,{plane:-1.5,along:xx,y:yy,w:.46,h:.75,far:true,trim:'#d6c577',seed:xx+yy});
        m.box(-.39,.2,-1.54,.78,1.65,.04,'#49645b','wood');
        for(const xx of [-.85,.85]){
            m.cylinder(xx,.22,-1.58,.09,2.65,'#e0c874',16,.075,'stone');m.cylinder(xx,2.85,-1.58,.15,.16,'#d3b456',16);
        }
        m.box(-2.68,3.1,-1.65,5.36,.18,3.3,'#d8cd96','stone');
        m.box(-2.45,3.28,-1.4,4.9,.15,2.8,'#7d8a79','roof');
        m.tri([-1.2,3.3,-1.7],[0,4.2,-1.7],[1.2,3.3,-1.7],'#d3bd6a','stone');
        m.sphere(0,3.6,-1.73,.19,.19,.04,'#e9cb60',20,10,{metal:.5});
    });
    drawPlaque(m,signs,'TAX AUTHORITY',x,base+2.6,z-1.65,3.2,.34,false);
    buildings.push({id:'tax-hq',label:'Tax Authority Headquarters',kind:'tax-hq',entry:TAX_HQ.entry,start,count:m.data.length-start,lo:[x-2.7,base,z-1.75],hi:[x+2.7,base+4.2,z+1.7]});
    const pad=drawRocketPad(m,SF_SPACEPORT,signs);buildings.push({id:'sf-spaceport',label:'SpaceX spaceport',kind:'spaceport',entry:SF_SPACEPORT.entry,...pad});
    if(includeRailPit)buildings.push(drawRailPit(m,signs,terrain));
    return buildings;
}

/** The excavation closes against the final graded land, after nearby house
 * plots have been cut. The rim vertices are shared with the terrain boundary. */
export function drawRailPit(m,signs,terrain=null){
    const start=m.data.length,p=RAIL_PIT,base=AIRSHIP_TERMINAL.base,x=TAX_HQ.x;
    const corners=[[p.west,p.north],[p.east,p.north],[p.east,p.south],[p.west,p.south]];
    const ground=(x,z)=>terrain?terrain.height(x,z):base;
    const rim=terrain?terrain.pitRim():corners.map(([x,z])=>[x,base,z]);
    m.quad([p.west,p.floor,p.north],[p.west,p.floor,p.south],[p.east,p.floor,p.south],[p.east,p.floor,p.north],'#9a8668','dirt');
    for(const [i,a] of rim.entries()){
        const b=rim[(i+1)%rim.length];
        m.quad(a,[a[0],p.floor,a[2]],[b[0],p.floor,b[2]],b,'#ac9571','dirt');
        m.rod([a[0],a[1]+.55,a[2]],[b[0],b[1]+.55,b[2]],.012,'#9a9e89',6);
    }
    for(let i=0;i<4;i++){
        const a=corners[i],b=corners[(i+1)%4],n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1]));
        for(let j=0;j<n;j++){const x=a[0]+(b[0]-a[0])*j/n,z=a[1]+(b[1]-a[1])*j/n;m.cylinder(x,ground(x,z),z,.023,.7,'#7e8d80',8);}
    }
    const signZ=p.south+.22;
    for(const xx of [x-1.8,x+1.8])m.box(xx,ground(xx,signZ),signZ-.04,.07,1.3,.08,'#8d7351','wood');
    drawPlaque(m,signs,'California high-speed rail',x,ground(x,signZ)+.9,signZ,4.4,.45,true);
    return {id:'rail-pit',label:'California high-speed rail',kind:'rail-pit',navigationAccess:'observe-only',entry:{x:x-.5,y:p.north-1},start,count:m.data.length-start,lo:[Math.min(p.west,x-2.2),p.floor,p.north],hi:[Math.max(p.east,x+2.2),Math.max(...rim.map(p=>p[1]),ground(x,signZ))+1.5,signZ+.08]};
}

export function taxDialogue(economy){
    const reply='We are building California high-speed rail right here in our backyard.';
    return {name:'Tax authority',repeat:true,skin:'#b99b75',hair:'#342f27',shirt:'#d4b85d',intro:'Welcome to the Tax Authority Headquarters. How may we serve you?',question:'What would you like to do?',decline:'Leave',choices:[
        {label:'Pay taxes · all coins',accept:()=>{const amount=economy.state.coins,result=economy.trade('tax');return {...result,message:'You pay '+amount+' coins in taxes. Thank you for your contribution.'};}},
        {label:'Question them',next:{skipIntro:true,question:'What would you like to say?',choices:[{label:'Where is my money going?',receipt:reply},{label:'What goods and services are being provided to me?',receipt:reply}]}}
    ]};
}

export function moveTaxAuthorities(npcs,dt,time,paused=false){
    for(const npc of npcs)if(npc.kind==='tax'){
        npc.hold=Math.max(0,(npc.hold||0)-dt);if(paused||npc.hold>0)continue;
        const t=time*.00025+npc.index*Math.PI/2,old=[npc.x,npc.z];npc.x=TAX_HQ.x+Math.sin(t)*1.9;npc.z=130.5+Math.cos(t)*.7;npc.angle=Math.atan2(npc.z-old[1],npc.x-old[0]);npc.phase=(npc.phase||0)+dt*2;
    }
}
