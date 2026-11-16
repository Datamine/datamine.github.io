import {pose} from './geometry.js';
import {drawCharacter} from './characters.js';

export const WINDSURF_LAUNCH=Object.freeze({shore:[29.2,11.2],water:[29.2,8.7]});

/** Open-water sailing has no distance or map bounds. Authored coast polygons
 * give exact segment checks and a small, lazily cached visibility graph. */
export function createWindsurfing({scale,isSea=()=>true,obstacles=[]}){
    const launch={x:WINDSURF_LAUNCH.water[0]*scale-.5,y:WINDSURF_LAUNCH.water[1]*scale-.5};
    const state={riding:false,mode:'windsurf',launch,shore:null,jump:null};
    const inside=(x,y,poly)=>{let found=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])found=!found;}return found;};
    const edges=obstacles.flatMap(poly=>poly.map((p,i)=>[p,poly[(i+1)%poly.length]]));
    let graph=null;
    function water(x,z){return Number.isFinite(x)&&Number.isFinite(z)&&isSea(x,z)&&!obstacles.some(p=>inside(x,z,p));}
    function segment(a,b){
        if(!water(a.x+.5,a.y+.5)||!water(b.x+.5,b.y+.5))return false;
        const px=a.x+.5,py=a.y+.5,dx=b.x-a.x,dy=b.y-a.y;
        for(const [p,q] of edges){
            const ex=q[0]-p[0],ey=q[1]-p[1],ox=p[0]-px,oy=p[1]-py,den=dx*ey-dy*ex;
            if(Math.abs(den)<1e-10){
                if(Math.abs(ox*dy-oy*dx)>1e-8)continue;
                const length2=dx*dx+dy*dy;if(length2<1e-12)continue;
                const t=(ox*dx+oy*dy)/length2,u=((q[0]-px)*dx+(q[1]-py)*dy)/length2;
                if(Math.max(t,u)>=0&&Math.min(t,u)<=1)return false;
            }else{
                const t=(ox*ey-oy*ex)/den,u=(ox*dy-oy*dx)/den;
                if(t>=-1e-9&&t<=1+1e-9&&u>=-1e-9&&u<=1+1e-9)return false;
            }
        }
        if(obstacles.length)return true;
        // Predicate-only callers can describe a small custom shoreline.
        const steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/.2));
        for(let i=0;i<=steps;i++)if(!water(a.x+(b.x-a.x)*i/steps+.5,a.y+(b.y-a.y)*i/steps+.5))return false;
        return true;
    }
    function coastGraph(){
        if(graph)return graph;
        const nodes=[];
        for(const poly of obstacles){
            const winding=Math.sign(poly.reduce((area,p,i)=>{const q=poly[(i+1)%poly.length];return area+p[0]*q[1]-q[0]*p[1];},0))||1;
            for(let i=0;i<poly.length;i++){
                const p=poly[i],a=poly[(i+poly.length-1)%poly.length],b=poly[(i+1)%poly.length],al=Math.hypot(p[0]-a[0],p[1]-a[1]),bl=Math.hypot(b[0]-p[0],b[1]-p[1]);
                if(!al||!bl)continue;
                const n=[winding*(p[1]-a[1])/al,-winding*(p[0]-a[0])/al],q=[winding*(b[1]-p[1])/bl,-winding*(b[0]-p[0])/bl],length=Math.hypot(n[0]+q[0],n[1]+q[1])||1;
                const u=[(n[0]+q[0])/length,(n[1]+q[1])/length],offset=.4/Math.max(.2,u[0]*n[0]+u[1]*n[1]);
                const at={x:p[0]+u[0]*offset-.5,y:p[1]+u[1]*offset-.5};if(water(at.x+.5,at.y+.5))nodes.push(at);
            }
        }
        const links=nodes.map(()=>[]);
        for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++)if(segment(nodes[i],nodes[j])){links[i].push(j);links[j].push(i);}
        return graph={nodes,links};
    }
    function path(from,to){
        if(!water(from.x+.5,from.y+.5)||!water(to.x+.5,to.y+.5))return null;
        if(segment(from,to))return Math.hypot(from.x-to.x,from.y-to.y)<.0001?[]:[{...to}];
        if(obstacles.length){
            const coast=coastGraph(),nodes=[from,to,...coast.nodes],links=[[],[],...coast.links.map(list=>list.map(i=>i+2))];
            for(let i=2;i<nodes.length;i++)for(const end of [0,1])if(segment(nodes[end],nodes[i])){links[end].push(i);links[i].push(end);}
            const costs=new Float64Array(nodes.length),parent=new Int32Array(nodes.length),closed=new Uint8Array(nodes.length);costs.fill(Infinity);parent.fill(-1);costs[0]=0;
            for(let count=0;count<nodes.length;count++){
                let next=-1,best=Infinity;
                for(let i=0;i<nodes.length;i++){const estimate=costs[i]+Math.hypot(nodes[i].x-to.x,nodes[i].y-to.y);if(!closed[i]&&estimate<best){next=i;best=estimate;}}
                if(next<0)return null;
                if(next===1){const result=[];for(let i=1;i!==0;i=parent[i])result.push({...nodes[i]});return result.reverse();}
                closed[next]=1;for(const i of links[next]){const cost=costs[next]+Math.hypot(nodes[i].x-nodes[next].x,nodes[i].y-nodes[next].y);if(cost<costs[i]){costs[i]=cost;parent[i]=next;}}
            }
            return null;
        }
        const bends=[{x:(from.x+to.x)/2,y:6*scale-.5},{x:from.x,y:6*scale-.5},{x:to.x,y:6*scale-.5}];
        const bend=bends.filter(p=>segment(from,p)&&segment(p,to)).sort((a,b)=>Math.hypot(from.x-a.x,from.y-a.y)+Math.hypot(to.x-a.x,to.y-a.y)-Math.hypot(from.x-b.x,from.y-b.y)-Math.hypot(to.x-b.x,to.y-b.y))[0];
        return bend?[bend,{...to}]:null;
    }
    function jumpApproach(from,target){
        const near=Math.atan2(from.y+.5-target.z,from.x+.5-target.x);
        for(const a of [near,target.angle+Math.PI/2,target.angle-Math.PI/2,near+Math.PI/2,near-Math.PI/2]){
            const dx=Math.cos(a)*4.5,dz=Math.sin(a)*4.5,takeoff={x:target.x+dx-.5,y:target.z+dz-.5},landing={x:target.x-dx-.5,y:target.z-dz-.5};
            if(segment(takeoff,landing)&&path(from,takeoff))return takeoff;
        }
        return null;
    }
    function jumpOver(from,target){
        if(!state.riding||state.jump)return false;
        const dx=target.x-from.x-.5,dz=target.z-from.y-.5,distance=Math.hypot(dx,dz),to={x:from.x+dx*2,y:from.y+dz*2};
        if(!Number.isFinite(distance)||distance<3||distance>6||!segment(from,to))return false;
        state.jump={from:{x:from.x,y:from.y},to,x:from.x,y:from.y,height:0,pitch:.18,angle:Math.atan2(dz,dx),elapsed:0,duration:distance*2/7.2};return true;
    }
    function updateJump(dt){
        const jump=state.jump;if(!jump)return false;
        jump.elapsed=Math.min(jump.duration,jump.elapsed+Math.max(0,dt));const f=jump.elapsed/jump.duration;
        jump.x=jump.from.x+(jump.to.x-jump.from.x)*f;jump.y=jump.from.y+(jump.to.y-jump.from.y)*f;
        jump.height=Math.sin(Math.PI*f)*3.4;jump.pitch=Math.cos(Math.PI*f)*.18;
        if(f===1){jump.height=0;state.jump=null;return true;}return false;
    }
    function cancelJump(){state.jump=null;}
    function pursuitRoute(from,to,{landPath,clear}){
        const shore=state.shore,dx=launch.x-shore.x,dy=launch.y-shore.y,length2=dx*dx+dy*dy,t=((from.x-shore.x)*dx+(from.y-shore.y)*dy)/length2;
        const onLaunch=t>1e-5&&t<1-1e-5&&Math.hypot(from.x-shore.x-t*dx,from.y-shore.y-t*dy)<.2,targetSea=water(to.x+.5,to.y+.5);
        // Finish crossing the shore before replanning on land or water. Without
        // this, repeated plans send an officer back to the launch every time.
        if(onLaunch){const tail=targetSea?path(launch,to):landPath(to,shore);return tail?[{...(targetSea?launch:shore)},...tail]:null;}
        const atSea=water(from.x+.5,from.y+.5);
        if(atSea&&targetSea)return path(from,to);
        if(atSea){const seaPath=path(from,launch),tail=landPath(to,shore);return seaPath&&tail?[...seaPath,{...shore},...tail]:null;}
        if(!clear(from))return null;
        if(targetSea){const approach=landPath(shore,from),tail=path(launch,to);return approach&&tail?[...approach,{...launch},...tail]:null;}
        return landPath(to,from);
    }
    return {state,water,segment,path,pursuitRoute,jumpApproach,jumpOver,updateJump,cancelJump};
}

/** Rounded board, actual sail panels, rigging, and a rider holding the boom. */
export function drawWindsurfer(m,x,z,base,angle,time,{rider=true,moving=false,police=false,reduced=false,pitch=0,appearance={}}={}){
    const bob=reduced?0:Math.sin(time*.0017+x)*.025;
    pose(m,x,base+bob,z,angle,()=>{
        const start=m.data.length;
        const blue=police?'#365776':'#2d8f9b',gold=police?'#b7cfdf':'#e6b758';
        const rim=(i,y,shrink=1)=>{const a=i*Math.PI/12;return [Math.cos(a)*1.22*shrink,y,Math.sin(a)*.29*shrink];};
        for(let i=0;i<24;i++){m.quad(rim(i+1,.035),rim(i,.035),rim(i,.115,.94),rim(i+1,.115,.94),blue);m.tri([0,.115,0],rim(i+1,.115,.94),rim(i,.115,.94),'#e8ddba');}
        m.box(-.63,.12,-.19,.64,.015,.38,'#5b7475','roof');
        m.rod([.28,.13,0],[.06,2.94,.13],.025,'#d8e0cd',10);
        const mast=[.06,2.94,.13],clew=[-1.09,1.02,.28],tack=[.28,.25,0],mid=[.15,1.55,.065];
        m.tri(mast,mid,clew,blue);m.tri(clew,mid,mast,blue);
        m.tri(mid,tack,clew,gold);m.tri(clew,tack,mid,gold);
        for(const [a,b] of [[mast,clew],[clew,tack],[tack,mast],[mid,clew]])m.rod(a,b,.014,'#e8e2ca',6);
        m.rod([.2,1.28,-.03],[-.93,1.05,.23],.026,'#424f50',8);
        for(const u of [-.48,-.22])m.rod([u,.15,-.14],[u,.15,.05],.024,'#4b5856',6);
        if(rider)drawCharacter(m,-.49,-.28,.14,0,0,false,appearance.skin||'#bd9369',police?'#304b66':appearance.shirt||'#485c64',{
            pants:police?'#2d4055':'#485c64',...appearance,mode:'surf',time:reduced?0:time*.001,cap:police,uniform:police,backpack:false
        });
        if(moving)for(const side of [-1,1])for(let i=0;i<3;i++)m.rod([-1.05-i*.4,.025,side*(.17+i*.12)],[-1.35-i*.4,.025,side*(.2+i*.14)],.017,'#bad5cd',4);
        // The rider, rather than the center of the board, is the camera anchor.
        if(rider)for(let v=start;v<m.data.length;v+=11){m.data[v]+=.49;m.data[v+2]+=.28;}
        if(pitch){const c=Math.cos(pitch),s=Math.sin(pitch);for(let v=start;v<m.data.length;v+=11){const xx=m.data[v],yy=m.data[v+1],nx=m.data[v+3],ny=m.data[v+4];m.data[v]=xx*c-yy*s;m.data[v+1]=xx*s+yy*c;m.data[v+3]=nx*c-ny*s;m.data[v+4]=nx*s+ny*c;}}
    });
}
