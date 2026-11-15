import {pose} from './geometry.js';

export const ROCKET_CABIN_HEIGHT=4.7;
const rocketEase=t=>t*t*(3-2*t),rocketLerp=(a,b,t)=>a+(b-a)*t;
const rocketClamp=t=>Math.max(0,Math.min(1,t));
// The pad mesh and the rider share these measurements. The ladder is outside
// the hull; only the final, level step passes through the north-facing hatch.
export const ROCKET_ACCESS=Object.freeze({ladderZ:-1.04,riderZ:-1.3,halfWidth:.24,rungSpacing:.28,walk:.8,grip:.25,climb:4.2,enter:.8,seal:.45});
const rocketBoardingDuration=ROCKET_ACCESS.walk+ROCKET_ACCESS.grip+ROCKET_ACCESS.climb+ROCKET_ACCESS.enter+ROCKET_ACCESS.seal;

function rocketAccessPose(site,elapsed,descending=false,start=null){
    const a=ROCKET_ACCESS,t=rocketClamp(elapsed/rocketBoardingDuration)*rocketBoardingDuration;
    const entry=start||{x:site.entry.x+.5,y:site.base+.04,z:site.entry.y+.5},foot={x:site.x,y:site.base+.04,z:site.z+a.riderZ},top={...foot,y:site.base+.14+ROCKET_CABIN_HEIGHT};
    const along=(p,q,f)=>({x:rocketLerp(p.x,q.x,f),y:rocketLerp(p.y,q.y,f),z:rocketLerp(p.z,q.z,f)});
    const walkEnd=a.walk,gripEnd=walkEnd+a.grip,climbEnd=gripEnd+a.climb,enterEnd=climbEnd+a.enter;
    let position,mode='idle',motion=0,angle=Math.PI/2,phase=0,stage,hatch=1,occupied=false;
    if(t<walkEnd){
        const f=rocketEase(t/a.walk),distance=Math.hypot(foot.x-entry.x,foot.z-entry.z);
        position=along(entry,foot,f);mode='move';motion=Math.sin(Math.PI*f);stage='approach';hatch=rocketEase(t/a.walk);
        angle=Math.atan2(foot.z-entry.z,foot.x-entry.x)+(descending?Math.PI:0);phase=distance*f*Math.PI*2/.92;
    }else if(t<gripEnd){
        position={...foot};mode='climb';motion=rocketEase((t-walkEnd)/a.grip);stage='grip';
    }else if(t<climbEnd){
        const f=(t-gripEnd)/a.climb,lift=rocketEase(f);
        position=along(foot,top,lift);mode='climb';motion=rocketEase(rocketClamp((1-f)/.065));stage='ladder';
        // One full limb cycle per two rungs. Reversing the route reverses the
        // same contacts, rather than playing a walking loop while descending.
        phase=(position.y-foot.y)*Math.PI*2/(a.rungSpacing*2);
    }else if(t<enterEnd){
        const f=rocketEase((t-climbEnd)/a.enter);
        position=along(top,{...top,z:site.z},f);mode='move';motion=Math.sin(Math.PI*f);stage='hatch';occupied=f>.45;
        angle=descending?-Math.PI/2:Math.PI/2;phase=Math.abs(a.riderZ)*f*Math.PI*2/.92;
    }else{
        position={x:site.x,y:top.y,z:site.z};stage='seal';hatch=1-rocketEase((t-enterEnd)/a.seal);occupied=true;
    }
    return {position,pose:{mode,motion,angle,phase,stage},hatch,occupied};
}

/** A reusable shuttle physically follows the regional coordinates. The rider
 * occupies an open viewing cabin; the camera stays anchored to the rider. */
export function createRocketTravel({groundHeight=()=>0}={}){
    const state={active:false,phase:'ground',elapsed:0,from:null,to:null,position:null,vehicle:null,thrust:0,pose:null,hatch:0,occupied:false};
    const durations={boarding:rocketBoardingDuration,ascending:6,cruising:24,descending:6,disembarking:rocketBoardingDuration};
    let boardingEntry=null;
    function start(from,to,entry=null){
        if(state.active)return false;
        boardingEntry=entry?{...entry}:null;const access=rocketAccessPose(from,0,false,boardingEntry);
        Object.assign(state,{active:true,phase:'boarding',elapsed:0,from,to,...access,vehicle:{x:from.x,y:from.base+.14,z:from.z},thrust:0});return true;
    }
    function update(dt){
        if(!state.active)return null;
        let remaining=Math.max(0,dt);
        while(state.active){
            const duration=durations[state.phase],step=Math.min(remaining,duration-state.elapsed);state.elapsed+=step;remaining-=step;
            const f=rocketEase(state.elapsed/duration),a=state.from,b=state.to,cabin=ROCKET_CABIN_HEIGHT,baseA=a.base+.14,baseB=b.base+.14;
            if(state.phase==='boarding'){
                Object.assign(state,rocketAccessPose(a,state.elapsed,false,boardingEntry));
            }else if(state.phase==='disembarking'){
                Object.assign(state,rocketAccessPose(b,duration-state.elapsed,true));
            }else{
                let x=a.x,z=a.z,y=baseA;
                if(state.phase==='ascending')y=rocketLerp(baseA,baseA+120,f);
                if(state.phase==='cruising'){x=rocketLerp(a.x,b.x,f);z=rocketLerp(a.z,b.z,f);y=Math.max(groundHeight(x,z)+14,rocketLerp(baseA,baseB,f)+120+Math.sin(Math.PI*f)*240);}
                if(state.phase==='descending'){x=b.x;z=b.z;y=rocketLerp(baseB+120,baseB,f);}
                state.vehicle={x,y,z};state.position={x,y:y+cabin,z};state.pose={mode:'idle',motion:0,angle:Math.PI/2,phase:0,stage:'cabin'};state.hatch=0;state.occupied=true;
            }
            state.thrust=state.phase==='ascending'?1:state.phase==='descending'?.6:state.phase==='cruising'?.35:0;
            if(state.elapsed<duration)return null;
            const phases=Object.keys(durations),next=phases[phases.indexOf(state.phase)+1];
            if(!next){state.active=false;state.phase='ground';state.thrust=0;state.pose.motion=0;state.hatch=0;state.occupied=false;state.position={x:b.entry.x+.5,y:b.base+.04,z:b.entry.y+.5};return 'arrived';}
            state.phase=next;state.elapsed=0;if(!remaining)return null;
        }
        return null;
    }
    function cancel(){state.active=false;state.phase='ground';state.position=null;state.vehicle=null;state.thrust=0;state.pose=null;state.hatch=0;state.occupied=false;}
    return {state,start,update,cancel,duration:Object.values(durations).reduce((a,b)=>a+b,0)};
}

export function drawRocketPad(m,site,signs){
    const {x,z,base}=site,start=m.data.length;
    m.cylinder(x,base,z,2.5,.12,'#8d9997',48,2.5,'concrete');
    for(let i=0;i<48;i++){const a=i*Math.PI/24,b=(i+1)*Math.PI/24;m.rod([x+Math.cos(a)*2.1,base+.14,z+Math.sin(a)*2.1],[x+Math.cos(b)*2.1,base+.14,z+Math.sin(b)*2.1],.025,'#dedaca',4);}
    for(const side of [-1,1])m.box(x+side*.6-.05,base+.125,z-.8,.1,.008,1.6,'#e7e6d8');m.box(x-.6,base+.125,z-.05,1.2,.008,.1,'#e7e6d8');
    m.box(x+2.1,base,z-.5,.3,6.3,.3,'#71868a',{metal:.25});
    for(let i=0;i<6;i++){m.rod([x+2.1,base+i,z-.5],[x+2.4,base+i+1,z-.2],.02,'#a7b5b4',5);m.rod([x+2.1,base+i+1,z-.5],[x+2.4,base+i,z-.2],.02,'#a7b5b4',5);}
    m.box(x+1.0,base+5.4,z-.45,1.25,.12,.25,'#b0bcb7',{metal:.2});
    const access=ROCKET_ACCESS,landing=base+.14+ROCKET_CABIN_HEIGHT,ladder=z+access.ladderZ;
    // A bolted service ladder and landing replace the unsupported diagonal
    // stair treads. The open handrail extensions leave room to step aboard.
    for(const side of [-1,1]){
        m.rod([x+side*access.halfWidth,base+.06,ladder],[x+side*access.halfWidth,landing+1.55,ladder],.032,'#b6c2bf',10,{metal:.25});
        m.rod([x+side*.5,landing,z-1.12],[x+side*.5,landing+1.02,z-1.12],.026,'#aab9b6',8);
        for(const y of [.55,1.02])m.rod([x+side*.5,landing+y,z-1.12],[x+side*.5,landing+y,z-.56],.022,'#b9c7c0',8);
        for(const y of [.5,2.1,3.7])m.rod([x+side*access.halfWidth,base+y,ladder],[x+side*access.halfWidth,base+y,z-.64],.022,'#7e9292',8);
    }
    for(let y=base+.147;y<landing-.1;y+=access.rungSpacing)m.rod([x-access.halfWidth,y,ladder],[x+access.halfWidth,y,ladder],.024,'#d2d8c9',10,{metal:.2});
    m.box(x-.49,landing-.09,z-1.12,.98,.09,.58,'#8c9d99',{metal:.2});
    for(let i=0;i<8;i++)m.box(x-.46+i*.125,landing+.004,z-1.1,.012,.008,.55,'#c1cbc3');
    m.box(x-.34,base+.008,z-1.59,.68,.018,.53,'#cfbb72','concrete');
    const uv=signs.get('SPACEX · 1 COIN');
    if(uv){m.box(x-2.35,base,z-2.8,.07,1.5,.07,'#829390');m.quad([x-.05,base+1.1,z-2.83],[x-2.8,base+1.1,z-2.83],[x-2.8,base+1.5,z-2.83],[x-.05,base+1.5,z-2.83],'#ffffff',uv);}
    return {start,count:m.data.length-start,lo:[x-2.8,base,z-2.95],hi:[x+2.5,base+8.5,z+2.5]};
}

export function drawReusableRocket(m,position,time,{occupied=false,cameraAngle=0,thrust=0,hatch=0}={}){
    pose(m,position.x,position.y,position.z,0,()=>{
        m.cylinder(0,.3,0,.66,4.35,'#e4e8e5',40,.66,{metal:.2});
        m.cylinder(0,3.7,0,.675,.55,'#303e44',40,.675,{metal:.3});
        m.cylinder(0,4.28,0,.7,.35,'#cdd6d3',40,.7,{metal:.2});
        for(let face=0;face<4;face++)pose(m,0,0,0,face*Math.PI/2,()=>{
            m.tri([.55,.5,-.09],[1.35,.2,-.09],[.63,1.5,-.09],'#6e7d7e',{metal:.25});m.tri([.55,.5,.09],[.63,1.5,.09],[1.35,.2,.09],'#879593',{metal:.25});
            m.rod([.57,1.1,0],[1.5,-.05,0],.035,'#4e6165',8);m.box(1.3,-.1,-.15,.45,.1,.3,'#596b6b');
            if(!occupied&&face!==2)m.quad([-.26,5.1,.708],[.26,5.1,.708],[.26,5.85,.708],[-.26,5.85,.708],'#789da8','glass');
        });
        for(let i=0;i<40;i++){
            const a=i*Math.PI/20,b=a+Math.PI/20,mid=(a+b)/2,hatchFace=Math.cos(mid+Math.PI/2)>.76;
            if(hatchFace||occupied&&Math.cos(mid-cameraAngle)>0)continue;
            m.quad([Math.cos(a)*.7,4.65,Math.sin(a)*.7],[Math.cos(b)*.7,4.65,Math.sin(b)*.7],[Math.cos(b)*.7,6.65,Math.sin(b)*.7],[Math.cos(a)*.7,6.65,Math.sin(a)*.7],'#dce4e1',{metal:.2});
        }
        // A real north-facing hatch swings out before the rider reaches it.
        // The viewing cutaway remains camera-facing once the rider is inside.
        const frontCut=occupied&&Math.cos(-Math.PI/2-cameraAngle)>0;
        if(!frontCut){
            for(const side of [-1,1])m.box(side*.45-.035,4.65,-.755,.07,1.98,.23,'#7f9498',{metal:.25});
            m.box(-.48,6.59,-.755,.96,.06,.23,'#7f9498',{metal:.25});
        }
        if(hatch>.01||!frontCut)pose(m,-.45,4.72,-.75,-rocketClamp(hatch)*Math.PI*.58,()=>{
            m.box(0,0,-.035,.9,1.86,.07,'#cad5d2',{metal:.2});
            m.box(.12,.67,-.044,.66,.92,.014,'#526d79',{metal:.15});m.box(.17,.72,-.053,.56,.82,.01,'#8fb1bd','glass');
            m.rod([.74,.36,-.09],[.74,.58,-.09],.022,'#536c75',8);for(const y of [.25,1.5])m.cylinder(0,y,0,.045,.15,'#718b92',10);
        });
        m.cylinder(0,6.65,0,.72,.18,'#596d75',40,.72,{metal:.2});
        m.cylinder(0,6.83,0,.72,1.45,'#e1e7e4',40,.04,{metal:.2});
        m.cylinder(0,ROCKET_CABIN_HEIGHT-.06,0,.69,.06,'#9aa9a3',32);
        for(let i=0;i<3;i++){const a=i*Math.PI*2/3,x=Math.cos(a)*.32,z=Math.sin(a)*.32;m.cylinder(x,-.1,z,.21,.46,'#40535a',16,.12,{metal:.4});
            if(thrust){const length=(1.2+Math.sin(time*.04+i)*.16)*thrust;m.cylinder(x,-.15-length,z,.025,length,'#f3bf68',16,.18,{emissive:.8});m.cylinder(x,-.14-length*.7,z,.02,length*.7,'#d7eaf2',12,.09,{emissive:.9});}
        }
    });
}
