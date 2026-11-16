import {createNavigationGrid} from './navigation.js';
import {CHARACTER_CLIPS} from './characters.js';

const roamingSeed=id=>{let n=0;for(const c of id)n=(n*31+c.charCodeAt(0))>>>0;return (n%997)/997;};

/** Prepare small, bounded patrols once against the world's real adjacency
 * rules. Runtime movement only follows those routes; it never pathfinds. */
export function createNPCRoaming(npcs,{eligible,walkable,canTravel,ground,approachFor,span=3}){
    const people=[],unavailable=[],resolution=4,width=Math.max(3,Math.floor(span*resolution/2)*2-1),size=width/resolution,half=size/2;
    for(const npc of npcs){
        if(!eligible(npc))continue;
        const home={x:npc.x-.5,y:npc.z-.5},west=home.x-half,north=home.y-half,seed=roamingSeed(npc.id),originalApproach=approachFor(npc);
        const local=p=>({x:p.x-west,y:p.y-north}),world=p=>({x:p.x+west,y:p.y+north});
        const free=(x,y)=>walkable(x,y,npc);
        const segment=(a,b)=>{
            const from=world(a),to=world(b);if(!canTravel(from.x,from.y,to.x,to.y))return false;
            const n=Math.max(1,Math.ceil(Math.hypot(a.x-b.x,a.y-b.y)/.08));
            for(let i=0;i<=n;i++)if(!free(from.x+(to.x-from.x)*i/n,from.y+(to.y-from.y)*i/n))return false;return true;
        };
        const mask=Uint8Array.from({length:width*width},(_,id)=>free(west+(id%width+.5)/resolution,north+(Math.floor(id/width)+.5)/resolution)?1:0);
        const graph=createNavigationGrid({width,resolution,mask,canTraverse:segment,canLink:segment}),start=local(home),candidates=[];
        for(let id=0;id<mask.length;id++)if(mask[id]){const p=graph.pointAt(id);if(graph.connected(start,p)&&Math.hypot(p.x-start.x,p.y-start.y)>.45)candidates.push(p);}
        const points=[{...home,stop:true}];let previous=start;
        for(let direction=0;direction<3;direction++){
            const angle=(seed+direction/3)*Math.PI*2,score=p=>(p.x-start.x)*Math.cos(angle)+(p.y-start.y)*Math.sin(angle);
            const target=candidates.filter(p=>Math.hypot(p.x-previous.x,p.y-previous.y)>.5).sort((a,b)=>score(b)-score(a))[0];
            if(!target)continue;const route=graph.path(previous,target);if(!route?.length)continue;
            for(const p of route)points.push({...world(p),stop:false});points.at(-1).stop=true;previous=target;
        }
        const back=graph.path(previous,start);if(back)for(const p of back)points.push({...world(p),stop:false});
        if(points.length<3||!back){unavailable.push(npc.id);continue;}
        points.at(-1).stop=true;
        const preferred=originalApproach?Math.atan2(originalApproach.y-home.y,originalApproach.x-home.x):npc.angle;
        npc.roam={home:{...home},bounds:{west,north,east:west+size,south:north+size},points,index:1,pause:.4+seed*2.2,speed:.48+seed*.24,seed,stops:0,restAngle:npc.angle,approachAngle:preferred};
        npc.hold=0;npc.waiting=false;npc.moving=false;npc.motion=0;npc.phase=seed*Math.PI*2;
        Object.defineProperty(npc,'approach',{configurable:true,enumerable:true,get:()=>approach(npc)});
        people.push(npc);
    }
    function approach(npc){
        const r=npc.roam,home={x:npc.x-.5,y:npc.z-.5};
        for(const radius of [.8,.65,1])for(const turn of [0,1,-1,2,-2,3,-3,4]){
            const a=r.approachAngle+turn*Math.PI/4,x=home.x+Math.cos(a)*radius,y=home.y+Math.sin(a)*radius;
            if(walkable(x,y,npc)&&canTravel(home.x,home.y,x,y))return {x,y};
        }
        return home;
    }
    function update(dt,{paused=false,lookAt=null,disabled=()=>false}={}){
        if(dt<=0)return;
        for(const npc of people){
            const r=npc.roam,held=npc.waiting||npc.hold>0;let remaining=dt,distance=0,facing=npc.angle;
            if(npc.hold>0&&!paused)npc.hold=Math.max(0,npc.hold-dt);
            if(!paused&&!held&&!disabled(npc))while(remaining>1e-8){
                if(r.pause>0){const used=Math.min(remaining,r.pause);r.pause-=used;remaining-=used;facing=r.restAngle;continue;}
                const next=r.points[r.index],dx=next.x+.5-npc.x,dz=next.y+.5-npc.z,d=Math.hypot(dx,dz),step=Math.min(d,r.speed*remaining);
                if(d>1e-8){npc.x+=dx/d*step;npc.z+=dz/d*step;distance+=step;remaining-=step/r.speed;facing=Math.atan2(dz,dx);}
                if(d-step<1e-8){r.index=r.index===r.points.length-1?1:r.index+1;if(next.stop){r.stops++;r.pause=1.4+((r.stops*7+Math.round(r.seed*23))%11)*.24;}}
            }
            npc.base=ground(npc.x,npc.z)+.025;npc.moving=distance>1e-8;npc.phase+=distance*Math.PI*2/CHARACTER_CLIPS.walk.stride;
            npc.motion+=(Number(npc.moving)-npc.motion)*(1-Math.exp(-dt*12));
            if(held&&lookAt)facing=Math.atan2(lookAt.z-npc.z,lookAt.x-npc.x);
            npc.angle+=Math.max(-dt*3,Math.min(dt*3,Math.atan2(Math.sin(facing-npc.angle),Math.cos(facing-npc.angle))));
        }
    }
    return {people,unavailable,update,approach};
}
