import {Mesh,rayBox,rayTriangle} from './geometry.js';
import {BAY_BRIDGE_WIDTH,bayBridgeRoute} from './downtown.js';
import {TAHOE,TAHOE_VILLAGE,nearTahoe,regionalGroundHeight} from './tahoe.js';
import {EAST_BAY_COAST_X} from './geography.js';

/** A deliberately short East Bay approach gets walkers to the Ferrari quickly;
 * the long regional drive then follows I-80 and US-50 toward the Sierra. */
export const EAST_BAY_DEALERSHIP=Object.freeze({x:126,z:18});
export const TAHOE_HIGHWAY=Object.freeze([[EAST_BAY_COAST_X,26],[EAST_BAY_DEALERSHIP.x,EAST_BAY_DEALERSHIP.z],[270,-85],[390,-260],[720,-505],[1030,-715],[1200,-745],[1410,-870],[1560,-960],[1705,-1060],[TAHOE.base.x+10,TAHOE.base.z+16],[TAHOE.base.x+10,TAHOE.base.z+10],[TAHOE_VILLAGE.arrival.x,TAHOE_VILLAGE.arrival.z]].map(Object.freeze));
export function createRegionalRoad({scale=1.5,groundHeight=regionalGroundHeight,cityGate=null,route=null}={}){
    const halfWidth=BAY_BRIDGE_WIDTH/2,gradeReach=.95,bridge=route||bayBridgeRoute(scale,groundHeight),points=bridge.map(([x,y,z])=>({x,y,z,width:halfWidth}));
    if(cityGate)points.unshift({x:cityGate.x+.5,y:groundHeight(cityGate.x+.5,cityGate.y+.5)+.025,z:cityGate.y+.5,width:halfWidth});
    const bridgeCount=route?1:points.length;let dealerIndex=0;
    for(const [x,z] of route?[]:TAHOE_HIGHWAY){
        const from=points.at(-1),n=Math.max(1,Math.ceil(Math.hypot(x-from.x,z-from.z)/3));
        // Grade a shoulder around the narrower deck so nearby terrain cannot
        // poke through the surface at the boundary of the detailed Tahoe mesh.
        for(let i=1;i<=n;i++){
            const t=i/n,xx=from.x+(x-from.x)*t,zz=from.z+(z-from.z)*t,ground=Math.max(groundHeight(xx,zz),groundHeight(xx-gradeReach,zz),groundHeight(xx+gradeReach,zz),groundHeight(xx,zz-gradeReach),groundHeight(xx,zz+gradeReach))+.045;
            const land=Math.max(0,Math.min(1,(xx-EAST_BAY_COAST_X)/6)),blend=land*land*(3-2*land),deck=xx<EAST_BAY_COAST_X?2.5:Math.max(ground,2.5+(ground-2.5)*blend);
            points.push({x:xx,y:deck,z:zz,width:halfWidth});
        }
        if(x===EAST_BAY_DEALERSHIP.x&&z===EAST_BAY_DEALERSHIP.z)dealerIndex=points.length-1;
    }
    const segments=[],buckets=new Map(),cell=16;
    for(let i=1;i<points.length;i++){
        const a=points[i-1],b=points[i],dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz),nx=-dz/length,nz=dx/length,w=Math.min(a.width,b.width),at=(p,side)=>[p.x+nx*side*w,p.y,p.z+nz*side*w],quad=[at(a,-1),at(a,1),at(b,1),at(b,-1)];
        const segment={a,b,dx,dz,length,nx,nz,w,quad,index:i-1,lo:[Math.min(a.x,b.x)-w,Math.min(a.y,b.y)-.2,Math.min(a.z,b.z)-w],hi:[Math.max(a.x,b.x)+w,Math.max(a.y,b.y)+.2,Math.max(a.z,b.z)+w]};segments.push(segment);
        for(let z=Math.floor((segment.lo[2]-.15)/cell);z<=Math.floor((segment.hi[2]+.15)/cell);z++)for(let x=Math.floor((segment.lo[0]-.15)/cell);x<=Math.floor((segment.hi[0]+.15)/cell);x++){const key=x+','+z;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(segment);}
    }
    const joints=[];
    for(let i=Math.max(1,bridgeCount-1);i<segments.length;i++){
        const before=segments[i-1],after=segments[i],turn=(before.dx*after.dz-before.dz*after.dx)/(before.length*after.length);if(Math.abs(turn)<1e-5)continue;
        const p=after.a,outer=turn<0?1:-1,w=Math.min(before.w,after.w),tri=[[p.x,p.y,p.z],[p.x+before.nx*outer*w,p.y,p.z+before.nz*outer*w],[p.x+after.nx*outer*w,p.y,p.z+after.nz*outer*w]];
        if(turn>0)tri.reverse();joints.push({tri,lo:[p.x-w,p.y-.2,p.z-w],hi:[p.x+w,p.y+.2,p.z+w]});
    }
    const gate=side=>{const p=side==='tahoe'?points.at(-1):points[0];return {x:p.x-.5,y:p.z-.5};};
    function at(x,z,clearance=.16){
        let best=null;
        for(const s of buckets.get(Math.floor(x/cell)+','+Math.floor(z/cell))||[]){const t=Math.max(0,Math.min(1,((x-s.a.x)*s.dx+(z-s.a.z)*s.dz)/(s.length*s.length))),distance=Math.hypot(x-s.a.x-s.dx*t,z-s.a.z-s.dz*t);if(distance<=s.w-clearance&&(!best||distance<best.distance))best={segment:s,t,distance,height:s.a.y+(s.b.y-s.a.y)*t};}
        return best;
    }
    /** Edge clicks select the road while the destination leaves room for the
     * avatar's feet inside the rails. Also tolerates minimap pixel rounding. */
    function targetAt(x,z){
        const hit=at(x,z,-.15);if(!hit)return null;
        const s=hit.segment,cx=s.a.x+s.dx*hit.t,cz=s.a.z+s.dz*hit.t,limit=s.w-.18,offset=Math.max(-limit,Math.min(limit,(x-cx)*s.nx+(z-cz)*s.nz));
        return {x:cx+s.nx*offset-.5,y:cz+s.nz*offset-.5};
    }
    function contains(x,z){return !!at(x,z);}
    function segment(a,b){const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/.2));for(let i=0;i<=n;i++)if(!contains(a.x+(b.x-a.x)*i/n+.5,a.y+(b.y-a.y)*i/n+.5))return false;return true;}
    function along(from,to){
        const a=at(from.x+.5,from.y+.5),b=at(to.x+.5,to.y+.5);if(!a||!b)return null;
        const result=[],start=a.segment.index+a.t,end=b.segment.index+b.t;
        if(start<end){for(let i=Math.floor(start)+1;i<end;i++)result.push({x:points[i].x-.5,y:points[i].z-.5});}
        else for(let i=Math.ceil(start)-1;i>end;i--)result.push({x:points[i].x-.5,y:points[i].z-.5});
        result.push({...to});return result;
    }
    function path(from,to,{cityPath,tahoePath}){
        const side=p=>contains(p.x+.5,p.y+.5)?'road':nearTahoe(p.x+.5,p.y+.5)?'tahoe':'city',a=side(from),b=side(to),local=(kind,p,q)=>kind==='tahoe'?tahoePath(p,q):cityPath(p,q);
        if(a===b&&a!=='road')return local(a,from,to);
        const start=a==='road'?from:gate(a),end=b==='road'?to:gate(b),head=a==='road'?[]:local(a,from,start),tail=b==='road'?[]:local(b,end,to),middle=along(start,end);
        if(!head||!tail||!middle)return null;
        const result=[];let previous=from;
        for(const point of [...head,...middle,...tail])if(Math.hypot(point.x-previous.x,point.y-previous.y)>1e-7){result.push(point);previous=point;}
        return result;
    }
    function mesh(){
        const m=new Mesh();
        for(const s of segments.slice(bridgeCount-1)){
            m.quad(...s.quad,'#78817c','asphalt');
            const point=(p,offset,h=0)=>[p.x+s.nx*offset,p.y+h,p.z+s.nz*offset];
            for(const side of [-1,1]){const edge=side*s.w;if(!route&&s.a.x>=EAST_BAY_COAST_X)continue;m.quad(point(s.a,edge),point(s.b,edge),point(s.b,edge,.1),point(s.a,edge,.1),'#b8b8a4','concrete');m.rod(point(s.a,edge,.18),point(s.b,edge,.18),.018,'#aabcb5',4);}
            if(s.index%2===0){
                const half=Math.min(.45,s.length*.34),f=half/s.length,at=(t,side)=>[s.a.x+s.dx*t+s.nx*side,s.a.y+(s.b.y-s.a.y)*t+.006,s.a.z+s.dz*t+s.nz*side];
                m.quad(at(.5-f,-.025),at(.5+f,-.025),at(.5+f,.025),at(.5-f,.025),'#d7cb98');
            }
            if(!route&&s.a.x<EAST_BAY_COAST_X&&s.index%4===0)m.cylinder(s.a.x,-.2,s.a.z,.12,s.a.y+.1,'#9aafa5',10);
        }
        for(const joint of joints)m.tri(...joint.tri,'#78817c','asphalt');
        return m;
    }
    function raycast(ray,maxDistance=220){let best=maxDistance,point=null;for(const s of segments){const box=rayBox(ray,s.lo,s.hi);if(box===null||box>best)continue;for(const tri of [[s.quad[0],s.quad[1],s.quad[2]],[s.quad[0],s.quad[2],s.quad[3]]]){const t=rayTriangle(ray,...tri);if(t!==null&&t<best){best=t;point=ray.origin.map((v,i)=>v+ray.dir[i]*t);}}}for(const joint of joints){const box=rayBox(ray,joint.lo,joint.hi);if(box===null||box>best)continue;const hit=rayTriangle(ray,...joint.tri);if(hit!==null&&hit<best){best=hit;point=ray.origin.map((v,i)=>v+ray.dir[i]*hit);}}return point?{point,distance:best}:null;}
    return {points,segments,joints,dealerIndex,at,targetAt,contains,segment,path,along,mesh,raycast,gate};
}

/** Use the same corridor geometry for the Golden Gate's rendered deck, picking
 * and navigation. Logical coordinates retain the city's half-tile offset. */
export function createGoldenGateCrossing({scale=1.5,cityGate,groundHeight,marinHeight}){
    const x=18.8*scale,route=[[cityGate.x+.5,groundHeight(cityGate.x+.5,cityGate.y+.5)+.025,cityGate.y+.5]];
    // Grade the southern approach too: the Presidio rises above the span's
    // level deck, so a single straight ramp would disappear into the hillside.
    for(const end of [[x,2,10*scale],[x,2,10],[x,2,.5*scale]]){
        const from=route.at(-1),n=end[2]<10?1:Math.ceil(Math.hypot(end[0]-from[0],end[2]-from[2])/.15);
        for(let i=1;i<=n;i++){
            const t=i/n,xx=from[0]+(end[0]-from[0])*t,z=from[2]+(end[2]-from[2])*t,baseline=from[1]+(end[1]-from[1])*t;
            const h=z>10?Math.max(groundHeight(xx,z),groundHeight(xx-.5,z),groundHeight(xx+.5,z))+.04:2;
            route.push([xx,Math.max(baseline,h),z]);
        }
    }
    // Continue onto the headland, grading the walkway above the terrain rather
    // than stopping in the water at the end of the suspension span.
    for(let z=.5*scale-.25;z>=-3*scale;z-=.25){
        const h=Math.max(marinHeight(x-.5,z),marinHeight(x,z),marinHeight(x+.5,z))+.04;
        route.push([x,Math.max(h,2*Math.max(0,1-(.5*scale-z)/(2*scale))),z]);
    }
    const road=createRegionalRoad({route}),city=road.gate('city'),marin=road.gate('tahoe');
    function path(from,to,{cityPath}){
        const a=road.contains(from.x+.5,from.y+.5),b=road.contains(to.x+.5,to.y+.5);
        if(!a&&!b)return cityPath(from,to);
        const head=a?[]:cityPath(from,city),tail=b?[]:cityPath(city,to),middle=road.along(a?from:city,b?to:city);
        if(!head||!tail||!middle)return null;
        const result=[];let previous=from;
        for(const p of [...head,...middle,...tail])if(Math.hypot(p.x-previous.x,p.y-previous.y)>1e-7){result.push(p);previous=p;}
        return result;
    }
    return {...road,path,gate:side=>side==='marin'?marin:city};
}

export function drawHighwayMinimap(ctx,projection,road){
    ctx.beginPath();road.points.forEach((p,i)=>{const q=projection.point(p.x,p.z);if(i)ctx.lineTo(q.x,q.y);else ctx.moveTo(q.x,q.y);});ctx.lineWidth=3;ctx.strokeStyle='#d4cdb6';ctx.stroke();ctx.lineWidth=1.5;ctx.strokeStyle='#7e8781';ctx.stroke();
}
