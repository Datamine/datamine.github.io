import {Mesh,pose,unit,rayTriangle} from './geometry.js';
import {drawCharacter} from './characters.js';
import {drawPlaque} from './southern-district.js';
import {drawRocketPad} from './rocket.js';
import {EAST_BAY_COAST_X} from './geography.js';
import {drawFacadeWindow} from './windows.js';

// Mid-lake coordinates: https://waterdata.usgs.gov/monitoring-location/USGS-390618120021101/
// SF's approximately seven-mile span maps to the existing 96-tile city.
export const REGIONAL_KM_PER_TILE=11.2654/96;
const tahoeLatitude=39.10490758,tahoeLongitude=-120.0374088,tahoeSfLat=37.7749,tahoeSfLon=-122.4194;
const tahoeLakeX=48+(tahoeLongitude-tahoeSfLon)*111.195*Math.cos((tahoeLatitude+tahoeSfLat)*Math.PI/360)/REGIONAL_KM_PER_TILE;
const tahoeLakeZ=48-(tahoeLatitude-tahoeSfLat)*111.195/REGIONAL_KM_PER_TILE;
export const TAHOE=Object.freeze({x:tahoeLakeX,z:tahoeLakeZ,base:{x:tahoeLakeX-42,z:tahoeLakeZ+34},peak:{x:tahoeLakeX-232,z:tahoeLakeZ-1},lakeLevel:10,peakHeight:240});
// One village plan separates arrival road, gas forecourt, gondola and rocket.
// Rendering, NPC approaches and walking rules all consume these coordinates.
export const TAHOE_VILLAGE=Object.freeze({
    arrival:Object.freeze({x:TAHOE.base.x,z:TAHOE.base.z+10}),
    fuel:Object.freeze({x:TAHOE.base.x-5.5,z:TAHOE.base.z+4.5,w:4.8,d:3.8,entry:Object.freeze({x:TAHOE.base.x-6,y:TAHOE.base.z+6.5})}),
    spaceport:Object.freeze({x:TAHOE.base.x+7,z:TAHOE.base.z+1.5,entry:Object.freeze({x:TAHOE.base.x+6.5,y:TAHOE.base.z-1.8})})
});
export const TAHOE_VILLAGE_PAVING=Object.freeze([
    [-2.5,1.7,2.5,10.8],[-5.5,6.2,-2.5,7.2],[-.65,.9,.65,1.7],[2,-1.8,3,1.7],[3,-1.8,7.5,-.8]
].map(([west,north,east,south])=>Object.freeze({west:TAHOE.base.x+west,north:TAHOE.base.z+north,east:TAHOE.base.x+east,south:TAHOE.base.z+south})));
export function tahoeVillagePavingAt(x,z){return TAHOE_VILLAGE_PAVING.find(r=>x>=r.west&&x<=r.east&&z>=r.north&&z<=r.south)||null;}

function clipTahoePaving(poly,axis,value,positive){
    const out=[],sign=positive?1:-1;
    for(let i=0;i<poly.length;i++){
        const a=poly[i],b=poly[(i+1)%poly.length],da=(a.p[axis]-value)*sign,db=(b.p[axis]-value)*sign;
        if(da>=-1e-9)out.push(a);
        if((da>=0)!==(db>=0)){const t=da/(da-db);out.push({p:a.p.map((v,k)=>v+(b.p[k]-v)*t),n:unit(a.n.map((v,k)=>v+(b.n[k]-v)*t)),groom:a.groom+(b.groom-a.groom)*t});}
    }return out;
}
// The gondola approaches from the east/southeast. Keep the hut west of the
// station and use this same footprint for rendering, collision and rental access.
export const TAHOE_SKI_HUT=Object.freeze({x:TAHOE.peak.x-4.5,z:TAHOE.peak.z-2.5,w:2.6,d:3,rotation:-Math.PI/2,entry:Object.freeze({x:TAHOE.peak.x-3.1,y:TAHOE.peak.z-3})});
export const TAHOE_BOUNDS=Object.freeze({west:TAHOE.base.x-384,east:TAHOE.base.x+144,north:TAHOE.base.z-216,south:TAHOE.base.z+216,step:1.5});
const tahoeClamp=(v,a,b)=>Math.max(a,Math.min(b,v)),tahoeMix=(a,b,t)=>a+(b-a)*t,tahoeSmooth=t=>t*t*(3-2*t);
const tahoeLakeValue=(x,z)=>((x-TAHOE.x)/35)**2+((z-TAHOE.z)/70)**2;
export function rawTahoeHeight(x,z){
    const r=Math.hypot((x-TAHOE.peak.x)/196,(z-TAHOE.peak.z)/190),rise=228*Math.max(0,1-r)**1.25;
    const ridges=Math.max(70*Math.exp(-(((x-TAHOE.peak.x+65)/72)**2+((z-TAHOE.peak.z-125)/80)**2)),85*Math.exp(-(((x-TAHOE.peak.x+60)/70)**2+((z-TAHOE.peak.z+130)/75)**2)));
    const summit=Math.hypot(x-TAHOE.peak.x,z-TAHOE.peak.z),baseDistance=Math.hypot(x-TAHOE.base.x,z-TAHOE.base.z);
    const summitRise=tahoeMix(228,Math.max(rise,ridges),tahoeSmooth(tahoeClamp((summit-7)/17,0,1))),baseBlend=1-tahoeSmooth(tahoeClamp((baseDistance-10)/6,0,1));
    const shore=tahoeClamp((Math.sqrt(tahoeLakeValue(x,z))-1)*8,0,1);
    return tahoeLakeValue(x,z)<1?9.4:10+tahoeSmooth(shore)*(2+summitRise*(1-baseBlend));
}
/** Feet and ray picking use the same two planes as each rendered terrain cell. */
export function tahoeHeight(x,z){
    const b=TAHOE_BOUNDS,s=b.step,ix=Math.floor((x-b.west)/s),iz=Math.floor((z-b.north)/s),xx=b.west+ix*s,zz=b.north+iz*s,u=(x-xx)/s,v=(z-zz)/s;
    const a=rawTahoeHeight(xx,zz),c=rawTahoeHeight(xx+s,zz+s);
    return u>=v?a+(rawTahoeHeight(xx+s,zz)-a)*u+(c-rawTahoeHeight(xx+s,zz))*v:a+(c-rawTahoeHeight(xx,zz+s))*u+(rawTahoeHeight(xx,zz+s)-a)*v;
}
export function tahoeNormal(x,z){const d=.3;return unit([-(rawTahoeHeight(x+d,z)-rawTahoeHeight(x-d,z))/(2*d),1,-(rawTahoeHeight(x,z+d)-rawTahoeHeight(x,z-d))/(2*d)]);}
export function nearTahoe(x,z,radius){
    if(radius!==undefined)return Math.hypot(x-TAHOE.base.x,z-TAHOE.base.z)<radius;
    const b=TAHOE_BOUNDS;return x>=b.west&&x<=b.east&&z>=b.north&&z<=b.south;
}
export function regionalGroundHeight(x,z){
    if(nearTahoe(x,z))return tahoeHeight(x,z);
    if(x<EAST_BAY_COAST_X)return -.65;
    const foothills=14*Math.exp(-(((x-(TAHOE.x-260))/160)**2+((z-TAHOE.z)/210)**2));
    return 1.15+foothills+Math.sin(x*.01)*Math.sin(z*.013)*.2;
}

/** Raise the orbit above intervening terrain while keeping the target centered.
 * The caller adjusts focal length to retain the avatar's apparent size. */
export function fitTahoeCamera(target,back,distance,previousRise=0){
    const dx=back[0]*distance,dz=back[2]*distance;let rise=back[1]*distance;
    for(let i=1;i<=20;i++){const t=i/20,x=target[0]+dx*t,z=target[2]+dz*t;rise=Math.max(rise,(tahoeHeight(x,z)+.55-target[1])/t);}
    rise=Math.max(rise,previousRise*.84+rise*.16);
    const eye=[target[0]+dx,target[1]+rise,target[2]+dz],actualDistance=Math.hypot(dx,rise,dz);
    return {eye,rise,focalScale:distance/actualDistance};
}

export const SNOW_SURFACE_GLSL=`
    else if(abs(vUV.x+.75)<.025){
        col*=alpineSurface(vWorld,normalize(vNormal),vUV.y);
        vec3 snowN=normalize(vNormal),snowV=normalize(uEye-vWorld);
        float sparkle=pow(max(dot(reflect(-normalize(vec3(-.5,.9,.35)),snowN),snowV),0.),24.);
        col+=vec3(.8,.9,1.)*sparkle*.035;
    }
`;

const tahoeRouteOffsets=[[0,0],[35,-24],[65,22],[100,-8],[130,38],[160,10],[190,35]];
export const SKI_ROUTE=Object.freeze(tahoeRouteOffsets.map(([x,z])=>Object.freeze({x:TAHOE.peak.x+x,z:TAHOE.peak.z+z})));
const tahoeSmoothRoute=[];
for(let i=0;i<SKI_ROUTE.length-1;i++)for(let j=0;j<16;j++){
    const a=SKI_ROUTE[Math.max(0,i-1)],b=SKI_ROUTE[i],c=SKI_ROUTE[i+1],d=SKI_ROUTE[Math.min(SKI_ROUTE.length-1,i+2)],t=j/16;
    const curve=k=>.5*((2*b[k])+(-a[k]+c[k])*t+(2*a[k]-5*b[k]+4*c[k]-d[k])*t*t+(-a[k]+3*b[k]-3*c[k]+d[k])*t*t*t);
    tahoeSmoothRoute.push({x:curve('x'),z:curve('z')});
}
tahoeSmoothRoute.push(SKI_ROUTE.at(-1));
const tahoeRouteDistances=[0];
for(let i=1;i<tahoeSmoothRoute.length;i++){const a=tahoeSmoothRoute[i-1],b=tahoeSmoothRoute[i];tahoeRouteDistances.push(tahoeRouteDistances.at(-1)+Math.hypot(b.x-a.x,b.z-a.z,tahoeHeight(b.x,b.z)-tahoeHeight(a.x,a.z)));}
const tahoeCourseLength=tahoeRouteDistances.at(-1);
function tahoeCourseAt(distance){
    distance=tahoeClamp(distance,0,tahoeCourseLength);let i=1;while(i<tahoeRouteDistances.length-1&&distance>tahoeRouteDistances[i])i++;
    const a=tahoeSmoothRoute[i-1],b=tahoeSmoothRoute[i],t=(distance-tahoeRouteDistances[i-1])/(tahoeRouteDistances[i]-tahoeRouteDistances[i-1]),angle=Math.atan2(b.z-a.z,b.x-a.x);
    return {x:tahoeMix(a.x,b.x,t),z:tahoeMix(a.z,b.z,t),angle,index:i};
}
const tahoeDistanceSegment=(x,z,a,b)=>{const dx=b.x-a.x,dz=b.z-a.z,t=tahoeClamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz),0,1);return Math.hypot(x-a.x-t*dx,z-a.z-t*dz);};

export function createTahoe(){
    const state={mode:'ground',position:null,rented:false,travel:0,up:true,progress:0,speed:0,offset:0,steer:0,airTime:0,flipping:false,flipAngle:0,flips:0,ramps:new Set(),angle:0};
    const spaceport={...TAHOE_VILLAGE.spaceport,base:tahoeHeight(TAHOE_VILLAGE.spaceport.x,TAHOE_VILLAGE.spaceport.z)},baseEntry={x:TAHOE.base.x-.5,y:TAHOE.base.z-.5},summitEntry={x:TAHOE.peak.x-.5,y:TAHOE.peak.z-.5};
    // The cabin and wire share this sampled path. Check the entire cabin
    // footprint against terrain, including the steep shoulder near the summit.
    const cabinAngle=Math.atan2(TAHOE.peak.z-TAHOE.base.z,TAHOE.peak.x-TAHOE.base.x),co=Math.cos(cabinAngle),si=Math.sin(cabinAngle),cablePath=[];
    for(let i=0;i<=256;i++){
        const f=i/256,x=tahoeMix(TAHOE.base.x,TAHOE.peak.x,f),z=tahoeMix(TAHOE.base.z,TAHOE.peak.z,f);
        let ground=tahoeHeight(x,z);for(const u of [-.9,.9])for(const v of [-.67,.67])ground=Math.max(ground,tahoeHeight(x+u*co-v*si,z+u*si+v*co));
        const direct=tahoeMix(tahoeHeight(TAHOE.base.x,TAHOE.base.z),tahoeHeight(TAHOE.peak.x,TAHOE.peak.z),f)+.2+Math.sin(Math.PI*f)*5;
        cablePath.push({x,z,y:Math.max(direct,ground+.24+Math.sqrt(Math.max(0,Math.sin(Math.PI*f)))*2.5)});
    }
    const cableDistances=[0];for(let i=1;i<cablePath.length;i++){const a=cablePath[i-1],b=cablePath[i];cableDistances.push(cableDistances.at(-1)+Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z));}
    function contains(x,z){return x>=TAHOE_BOUNDS.west&&x<=TAHOE_BOUNDS.east&&z>=TAHOE_BOUNDS.north&&z<=TAHOE_BOUNDS.south;}
    function walkable(x,z){
        const hut=TAHOE_SKI_HUT;if(Math.abs(x-hut.x)<hut.w/2+.18&&Math.abs(z-hut.z)<hut.d/2+.18)return false;
        if(Math.hypot(x-spaceport.x,z-spaceport.z)<.92)return false;
        for(const site of [TAHOE.base,TAHOE.peak])for(const dx of [-1.5,1.5])for(const dz of [-.9,.9])if(Math.hypot(x-site.x-dx,z-site.z-dz)<.17)return false;
        const fuel=TAHOE_VILLAGE.fuel;for(const dx of [-.8,.8])if(Math.abs(x-fuel.x-dx)<.3&&Math.abs(z-fuel.z-.08)<.32)return false;
        return contains(x,z)&&tahoeLakeValue(x,z)>1.03&&(Math.hypot(x-TAHOE.base.x,z-TAHOE.base.z)<11.5||Math.hypot(x-TAHOE.peak.x,z-TAHOE.peak.z)<7||tahoeSmoothRoute.slice(1).some((b,i)=>tahoeDistanceSegment(x,z,tahoeSmoothRoute[i],b)<3.5));
    }
    function segment(a,b){const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/.3));for(let i=0;i<=n;i++)if(!walkable(tahoeMix(a.x,b.x,i/n)+.5,tahoeMix(a.y,b.y,i/n)+.5))return false;return true;}
    function path(from,to){
        if(!walkable(from.x+.5,from.y+.5)||!walkable(to.x+.5,to.y+.5))return null;if(Math.hypot(from.x-to.x,from.y-to.y)<1e-7)return [];if(segment(from,to))return [{...to}];
        const nodes=[from,to,...tahoeSmoothRoute.filter((p,i)=>i%4===0||i===tahoeSmoothRoute.length-1).map(p=>({x:p.x-.5,y:p.z-.5}))],cost=nodes.map(()=>Infinity),parents=nodes.map(()=>-1),used=new Set();cost[0]=0;
        for(let k=0;k<nodes.length;k++){let next=-1;for(let i=0;i<nodes.length;i++)if(!used.has(i)&&(next<0||cost[i]<cost[next]))next=i;if(next<0||!Number.isFinite(cost[next]))return null;
            if(next===1){const result=[];for(let i=1;i!==0;i=parents[i])result.push(nodes[i]);return result.reverse();}used.add(next);
            for(let i=0;i<nodes.length;i++)if(!used.has(i)&&segment(nodes[next],nodes[i])){const c=cost[next]+Math.hypot(nodes[i].x-nodes[next].x,nodes[i].y-nodes[next].y);if(c<cost[i]){cost[i]=c;parents[i]=next;}}
        }return null;
    }
    function gondola(up=true){if(state.mode!=='ground')return false;state.mode='gondola';state.travel=0;state.up=up;state.position=gondolaAt(up?0:1);return true;}
    function gondolaAt(f){const scaled=tahoeClamp(f,0,1)*256,i=Math.min(255,Math.floor(scaled)),a=cablePath[i],b=cablePath[i+1],t=scaled-i;return {x:tahoeMix(a.x,b.x,t),y:tahoeMix(a.y,b.y,t),z:tahoeMix(a.z,b.z,t)};}
    function gondolaProgress(f){const distance=tahoeClamp(f,0,1)*cableDistances.at(-1);let lo=0,hi=256;while(hi-lo>1){const mid=(lo+hi)>>1;if(cableDistances[mid]<distance)lo=mid;else hi=mid;}return gondolaAt((lo+(distance-cableDistances[lo])/(cableDistances[hi]-cableDistances[lo]))/256);}
    function startSki(){if(state.mode!=='ground'||!state.rented)return false;Object.assign(state,{mode:'ski',progress:0,speed:4,offset:0,steer:0,airTime:0,flipping:false,flipAngle:0,ramps:new Set()});const p=tahoeCourseAt(0);state.position={...p,y:tahoeHeight(p.x,p.z)+.1};return true;}
    function flip(){if(state.mode!=='ski'||state.airTime<=0||state.flipping)return false;state.flipping=true;state.flips++;return true;}
    function steerTo(x,z){if(state.mode!=='ski')return false;const p=tahoeCourseAt(state.progress);state.steer=tahoeClamp(-(x-p.x)*Math.sin(p.angle)+(z-p.z)*Math.cos(p.angle),-1.4,1.4);return true;}
    function update(dt){
        if(state.mode==='gondola'){
            state.travel=Math.min(1,state.travel+dt/28);const f=state.up?tahoeSmooth(state.travel):1-tahoeSmooth(state.travel);state.position=gondolaProgress(f);state.angle=cabinAngle;
            if(state.travel===1){state.mode='ground';state.position={x:state.up?TAHOE.peak.x:TAHOE.base.x,z:state.up?TAHOE.peak.z:TAHOE.base.z,y:tahoeHeight(state.up?TAHOE.peak.x:TAHOE.base.x,state.up?TAHOE.peak.z:TAHOE.base.z)};return state.up?'summit':'base';}return null;
        }
        if(state.mode!=='ski')return null;
        state.speed=Math.min(22,state.speed+dt*8);const old=state.progress;state.progress=Math.min(tahoeCourseLength,state.progress+state.speed*dt);state.offset+=(state.steer-state.offset)*Math.min(1,dt*5);
        for(const f of [.22,.43,.64,.82])if(old<tahoeCourseLength*f&&state.progress>=tahoeCourseLength*f&&!state.ramps.has(f)){state.ramps.add(f);state.airTime=1.45;state.flipping=false;}
        const wasAir=state.airTime>0;state.airTime=Math.max(0,state.airTime-dt);const air=state.airTime>0?1-state.airTime/1.45:0,p=tahoeCourseAt(state.progress);
        const x=p.x-Math.sin(p.angle)*state.offset,z=p.z+Math.cos(p.angle)*state.offset;
        state.position={x,z,y:tahoeHeight(x,z)+.1+(state.airTime>0?Math.sin(Math.PI*air)*6:0)};state.angle=p.angle;state.flipAngle=state.flipping&&state.airTime>0?air*Math.PI*2:0;
        if(state.progress===tahoeCourseLength){state.mode='ground';state.speed=0;state.airTime=0;state.flipAngle=0;return 'finish';}
        if(wasAir&&state.airTime===0&&state.flipping){state.flipping=false;return 'flip';}return null;
    }
    function reset(){Object.assign(state,{mode:'ground',position:null,rented:false,airTime:0,speed:0,flipAngle:0});}
    return {state,spaceport,baseEntry,summitEntry,contains,walkable,segment,path,gondola,gondolaAt,cablePath,startSki,flip,steerTo,update,reset,courseLength:tahoeCourseLength,courseAt:tahoeCourseAt};
}

export function drawTahoeTerrain(m){
    const b=TAHOE_BOUNDS,s=b.step;
    m.quad([b.west-16,1,b.north-16],[b.west-16,1,b.south+16],[b.east+16,1,b.south+16],[b.east+16,1,b.north-16],'#9fa78d');
    const width=Math.round((b.east-b.west)/s)+1,rows=Math.round((b.south-b.north)/s)+1,vertices=[];
    for(let j=0;j<rows;j++)for(let i=0;i<width;i++){
        const x=b.west+i*s,z=b.north+j*s;let distance=Infinity;
        for(let k=1;k<tahoeSmoothRoute.length;k++)distance=Math.min(distance,tahoeDistanceSegment(x,z,tahoeSmoothRoute[k-1],tahoeSmoothRoute[k]));
        // A broad, connected finish apron meets the gondola platform. Leave
        // enough full snow at the edges for steering and terrain interpolation.
        distance=Math.min(distance,Math.max(0,Math.hypot(x-TAHOE.base.x,z-TAHOE.base.z)-2));
        vertices.push({p:[x,rawTahoeHeight(x,z),z],n:tahoeNormal(x,z),groom:1-tahoeSmooth(tahoeClamp((distance-3)/1.5,0,1))});
    }
    const emit=(poly,paved)=>{for(let j=1;j<poly.length-1;j++){
        const vertices=[poly[0],poly[j],poly[j+1]],start=m.data.length;m.tri(...vertices.map(v=>v.p),paved?'#b3b8aa':'#ffffff',paved?'cobble':{snow:true});
        for(const [i,v] of vertices.entries()){for(let k=0;k<3;k++)m.data[start+i*11+3+k]=v.n[k];if(!paved)m.data[start+i*11+10]=v.groom;}
    }};
    const triangle=(a,c,d)=>{
        const tri=[a,c,d],minX=Math.min(...tri.map(v=>v.p[0])),maxX=Math.max(...tri.map(v=>v.p[0])),minZ=Math.min(...tri.map(v=>v.p[2])),maxZ=Math.max(...tri.map(v=>v.p[2]));
        const cuts=TAHOE_VILLAGE_PAVING.filter(r=>maxX>r.west&&minX<r.east&&maxZ>r.north&&minZ<r.south);if(!cuts.length){emit(tri,false);return;}
        // Partition the original terrain faces. Paving replaces snow/grass;
        // it never sits in a second coplanar layer above it.
        let remaining=[tri];for(const r of cuts){const outside=[];
            for(const poly of remaining){let inside=poly;for(const [axis,value,positive] of [[0,r.west,true],[0,r.east,false],[2,r.north,true],[2,r.south,false]]){
                if(inside.length<3)break;const part=clipTahoePaving(inside,axis,value,!positive);if(part.length>=3)outside.push(part);inside=clipTahoePaving(inside,axis,value,positive);
            }if(inside.length>=3)emit(inside,true);}remaining=outside;
        }for(const poly of remaining)emit(poly,false);
    };
    for(let j=0;j<rows-1;j++)for(let i=0;i<width-1;i++){const a=vertices[j*width+i],c=vertices[(j+1)*width+i+1];triangle(a,c,vertices[j*width+i+1]);triangle(a,vertices[(j+1)*width+i],c);}
    const shore=[];for(let i=0;i<96;i++){const a=i*Math.PI/48;shore.push([TAHOE.x+Math.cos(a)*35,TAHOE.lakeLevel+.025,TAHOE.z+Math.sin(a)*70]);}
    for(let i=0;i<shore.length;i++)m.tri([TAHOE.x,TAHOE.lakeLevel+.025,TAHOE.z],shore[(i+1)%shore.length],shore[i],'#ffffff',{water:2});
    // Evergreen clusters below the snow line, away from the actual ski course.
    for(let i=0;i<110;i++){const a=i*2.399963,x=TAHOE.base.x+Math.cos(a)*(9+i*.5),z=TAHOE.base.z+Math.sin(a)*(9+i*.4),h=tahoeHeight(x,z);if(h>75||tahoeLakeValue(x,z)<1.06||tahoeSmoothRoute.slice(1).some((p,j)=>tahoeDistanceSegment(x,z,tahoeSmoothRoute[j],p)<4))continue;
        m.cylinder(x,h,z,.075,2.7,'#82705b',8);for(let j=0;j<3;j++)m.cylinder(x,h+.7+j*.7,z,.65-j*.14,1.3,'#4c7565',12,0);
    }
}

export function drawTahoeStructures(m,tahoe,signs){
    const sights=[],add=(id,label,kind,entry,draw)=>{const start=m.data.length;draw();const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];for(let i=start;i<m.data.length;i+=11)for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],m.data[i+k]);hi[k]=Math.max(hi[k],m.data[i+k]);}sights.push({id,label,kind,entry,start,count:m.data.length-start,lo,hi});};
    add('tahoe-spaceport','Tahoe SpaceX spaceport','spaceport',tahoe.spaceport.entry,()=>drawRocketPad(m,tahoe.spaceport,signs));
    for(const [site,up] of [[TAHOE.base,true],[TAHOE.peak,false]]){
        const h=tahoeHeight(site.x,site.z);
        add(up?'gondola-base':'gondola-summit',up?'Mountain gondola':'Summit gondola','gondola',up?tahoe.baseEntry:tahoe.summitEntry,()=>{
            m.box(site.x-1.8,h,site.z-1.5,3.6,.12,3,'#b3b6a6','stone');
            for(const dx of [-1.5,1.5]){m.box(site.x+dx-.08,h+.12,site.z-.9,.16,3.4,.16,'#a15b54',{metal:.3});m.box(site.x+dx-.08,h+.12,site.z+.9,.16,3.4,.16,'#a15b54',{metal:.3});}
            for(const dz of [-1.2,1])m.box(site.x-1.85,h+3.5,site.z+dz,3.7,.15,.2,'#6e7775','roof');drawPlaque(m,signs,'GONDOLA',site.x,h+2.9,site.z-1.22,2.8,.35,false);
            for(const side of [-1,1]){
                const roof=[[site.x-2,h+3.65,site.z+side*1.55],[site.x+2,h+3.65,site.z+side*1.55],[site.x+2,h+4.15,site.z],[site.x-2,h+4.15,site.z]];if(side<0)roof.reverse();m.quad(...roof,'#e6ece6',{snow:true,groom:1});
                m.rod([site.x-2,h+3.6,site.z+side*1.55],[site.x+2,h+3.6,site.z+side*1.55],.04,'#8a7966',10,'wood');
                m.sphere(site.x+side*.78,h+2.82,site.z,.3,.3,.045,'#596b70',24,12,{metal:.4});
                for(let i=0;i<8;i++){const a=i*Math.PI/4;m.rod([site.x+side*.78,h+2.82,site.z-.05],[site.x+side*.78+Math.cos(a)*.27,h+2.82+Math.sin(a)*.27,site.z-.05],.014,'#c4cdc5',6);}
            }
            for(const dx of [-1.65,1.65])for(let i=0;i<5;i++)m.box(site.x+dx-.035,h+.15,site.z-1.25+i*.53,.07,.075,.34,'#e5e9df',{snow:true});
        });
    }
    for(let i=0;i<tahoe.cablePath.length;i++){
        const p=tahoe.cablePath[i],cable=[p.x,p.y+2.4,p.z];
        if(i){const q=tahoe.cablePath[i-1];m.rod([q.x,q.y+2.4,q.z],cable,.023,'#687571',8);}
        if(i%32===0){const ground=tahoeHeight(p.x,p.z);for(const dx of [-.55,.55])m.rod([p.x+dx,ground,p.z],[p.x+dx,p.y+2.7,p.z],.08,'#6b827b',10);m.rod([p.x-.8,p.y+2.5,p.z],[p.x+.8,p.y+2.5,p.z],.065,'#aab5aa',10);}
    }
    const hut=TAHOE_SKI_HUT,h=tahoeHeight(hut.x,hut.z);
    add('ski-rental','Summit ski rental','ski-rental',{...hut.entry},()=>{
        pose(m,hut.x,h,hut.z,hut.rotation,()=>{
            const w=hut.d,d=hut.w;
            m.box(-w/2,0,-d/2,w,1.8,d,'#977958','wood');
            for(const side of [-1,1]){
                const roof=[[-w/2-.15,1.81,side*(d/2+.15)],[w/2+.15,1.81,side*(d/2+.15)],[w/2+.15,2.4,0],[-w/2-.15,2.4,0]];if(side<0)roof.reverse();m.quad(...roof,'#e5ece8',{snow:true,groom:1});
                m.rod([-w/2-.16,1.77,side*(d/2+.16)],[w/2+.16,1.77,side*(d/2+.16)],.045,'#5b6e71',10);
                m.tri([side*w/2,1.8,-d/2],[side*w/2,1.8,d/2],[side*w/2,2.4,0],'#ad9172','wood');
            }
            for(const x of [-1.18,.67])drawFacadeWindow(m,{plane:d/2+.015,along:x,y:.45,w:.49,h:.59,trim:'#e2d2b5',seed:x});
            m.box(-.28,.03,d/2+.02,.56,1.12,.035,'#526b72','wood');m.sphere(.18,.62,d/2+.07,.025,.025,.025,'#bca56e',10,6,{metal:.3});
            m.box(-1.1,1.8,-.75,.25,.85,.3,'#9b8877','stone');m.box(-1.13,2.64,-.78,.31,.08,.36,'#dde5de');
            for(const x of [-w/2+.04,w/2-.1])m.box(x,.05,-d/2,.065,1.72,d,'#b49a74','wood');
            drawPlaque(m,signs,'SKIS · 1 COIN',0,1.25,d/2+.025,2.4,.33);
            for(let i=0;i<5;i++)m.rod([-1+i*.4,.1,d/2+.15],[-1.15+i*.4,1.1,d/2+.2],.035,i%2?'#d0a05d':'#668e9c',6);
        });
    });
    // Groomed piste markers and four raised ramps follow the same route as the skier.
    for(let d=0;d<tahoeCourseLength;d+=7){const p=tahoeCourseAt(d);for(const side of [-1,1]){const x=p.x-Math.sin(p.angle)*side*2.5,z=p.z+Math.cos(p.angle)*side*2.5,h=tahoeHeight(x,z);m.cylinder(x,h,z,.018,.65,'#a7715b',6);m.tri([x,h+.6,z],[x+.22,h+.52,z],[x,h+.4,z],side<0?'#be7058':'#6d8ca3');}}
    for(const f of [.22,.43,.64,.82]){
        const p=tahoeCourseAt(tahoeCourseLength*f),c=Math.cos(p.angle),s=Math.sin(p.angle),at=(u,v,extra)=>{const x=p.x+c*u-s*v,z=p.z+s*u+c*v;return [x,tahoeHeight(x,z)+extra,z];};
        m.quad(at(-1.8,-1.4,.03),at(-1.8,1.4,.03),at(.3,1.4,1.1),at(.3,-1.4,1.1),'#d5dfda','wood');
        m.quad(at(.3,-1.4,.03),at(.3,-1.4,1.1),at(.3,1.4,1.1),at(.3,1.4,.03),'#728c91');
    }
    return sights;
}

export function drawGondolaCabin(m,p,angle){
    pose(m,p.x,p.y,p.z,angle,()=>{
        m.box(-.85,-.1,-.62,1.7,.12,1.24,'#ad8065','wood');
        for(const side of [-1,1]){m.box(-.8,.02,side*.6,1.6,.55,.035,'#526f7a',{metal:.25});m.box(-.8,.6,side*.6,1.6,.75,.025,'#90b3bc','glass');}
        for(const x of [-.8,.8])for(const z of [-.6,.6])m.rod([x,0,z],[x,1.8,z],.025,'#c2c9be',8);
        m.box(-.82,1.7,.42,1.64,.08,.2,'#697b7b');m.rod([0,1.75,0],[0,2.35,0],.035,'#879b94',8);
    });
}

export function drawSkiRider(m,state,time,reduced=false,appearance={}){
    const p=state.position,start=m.data.length;
    drawCharacter(m,0,0,.13,0,0,false,appearance.skin||'#bd9369',appearance.shirt||'#6c8a97',{pants:'#53646b',...appearance,mode:'surf',backpack:false,time:reduced?0:time*.001});
    for(const side of [-1,1]){
        m.box(-1.05,.02,side*.14-.055,2.1,.045,.11,'#c08058',{metal:.1});m.rod([1.02,.065,side*.14],[1.2,.16,side*.14],.048,'#d4b282',8);
        m.rod([.32,.9,side*.45],[-.25,.04,side*.6],.012,'#acbcb9',8);m.sphere(-.25,.04,side*.6,.06,.014,.06,'#637b79',10,4);
    }
    const ca=Math.cos(state.angle),sa=Math.sin(state.angle),f=state.flipAngle||0,cf=Math.cos(f),sf=Math.sin(f);
    for(let i=start;i<m.data.length;i+=11){let x=m.data[i],y=m.data[i+1]-.8,z=m.data[i+2],nx=m.data[i+3],ny=m.data[i+4],nz=m.data[i+5];const xx=x*cf-y*sf,yy=x*sf+y*cf,nnx=nx*cf-ny*sf,nny=nx*sf+ny*cf;m.data[i]=p.x+xx*ca-z*sa;m.data[i+1]=p.y+yy+.8;m.data[i+2]=p.z+xx*sa+z*ca;m.data[i+3]=nnx*ca-nz*sa;m.data[i+4]=nny;m.data[i+5]=nnx*sa+nz*ca;}
}

/** Coarse California ground is generated only around the camera. Tahoe uses
 * its own detailed mesh; the intervening countryside never expands the city grid. */
export function drawRegionalBackdrop(m,x,z,viewerHeight=0){
    const altitude=Math.max(viewerHeight,regionalGroundHeight(x,z)),step=altitude>80?32:16,r=Math.max(192,Math.min(800,altitude*3+180)),minX=Math.floor((x-r)/step)*step,minZ=Math.floor((z-r)/step)*step,b=TAHOE_BOUNDS;
    const rect=(x0,z0,x1,z1)=>{if(x1-x0<1e-8||z1-z0<1e-8)return;const points=[[x0,z0],[x0,z1],[x1,z1],[x1,z0]].map(([u,v])=>[u,regionalGroundHeight(u,v),v]);m.quad(...points,'#a7ac87','grass');};
    for(let zz=minZ;zz<z+r;zz+=step)for(let xx=minX;xx<x+r;xx+=step){
        if(xx+step<=EAST_BAY_COAST_X)continue;const x0=Math.max(EAST_BAY_COAST_X,xx),x1=xx+step,z1=zz+step;
        if(x0===EAST_BAY_COAST_X)m.quad([x0,-.65,zz],[x0,-.65,z1],[x0,regionalGroundHeight(x0,z1),z1],[x0,regionalGroundHeight(x0,zz),zz],'#929c7d','dirt');
        if(x0>=b.east||x1<=b.west||zz>=b.south||z1<=b.north){rect(x0,zz,x1,z1);continue;}
        rect(x0,zz,x1,Math.min(z1,b.north));rect(x0,Math.max(zz,b.south),x1,z1);
        const top=Math.max(zz,b.north),bottom=Math.min(z1,b.south);rect(x0,top,Math.min(x1,b.west),bottom);rect(Math.max(x0,b.east),top,x1,bottom);
    }
}

export function drawTahoeMinimap(ctx,projection,viewer){
    ctx.fillStyle='#b2c1b1';ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);
    const polygon=(points,color)=>{ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle=color;ctx.fill();};
    const step=4,startX=Math.floor((viewer[0]-48)/step)*step,startZ=Math.floor((viewer[1]-48)/step)*step;
    for(let z=startZ;z<viewer[1]+48;z+=step)for(let x=startX;x<viewer[0]+48;x+=step){const h=tahoeHeight(x+2,z+2),wet=tahoeLakeValue(x+2,z+2)<1;polygon([[x,z],[x+step,z],[x+step,z+step],[x,z+step]].map(p=>projection.point(...p)),wet?'#548fa9':h>150?'#f1f1e5':h>60?'#d4dfd4':'#9bb395');}
    for(const r of TAHOE_VILLAGE_PAVING)polygon([[r.west,r.north],[r.east,r.north],[r.east,r.south],[r.west,r.south]].map(p=>projection.point(...p)),'#b3b8aa');
    const line=(points,color)=>{ctx.beginPath();points.map(p=>projection.point(p.x,p.z)).forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.stroke();};
    line(tahoeSmoothRoute,'#7c99aa');line([TAHOE.base,TAHOE.peak],'#8b7b67');
}

export function raycastTahoe(ray,maxDistance=850){
    const b=TAHOE_BOUNDS,s=b.step,o=ray.origin,d=ray.dir;let near=0,far=maxDistance;
    for(const [axis,min,max] of [[0,b.west,b.east],[2,b.north,b.south]]){if(Math.abs(d[axis])<1e-9){if(o[axis]<min||o[axis]>max)return null;}else{let a=(min-o[axis])/d[axis],c=(max-o[axis])/d[axis];if(a>c)[a,c]=[c,a];near=Math.max(near,a);far=Math.min(far,c);}}
    if(near>far)return null;
    const countX=Math.round((b.east-b.west)/s),countZ=Math.round((b.south-b.north)/s),sx=d[0]>=0?1:-1,sz=d[2]>=0?1:-1;
    let ix=tahoeClamp(Math.floor((o[0]+d[0]*(near+1e-6)-b.west)/s),0,countX-1),iz=tahoeClamp(Math.floor((o[2]+d[2]*(near+1e-6)-b.north)/s),0,countZ-1),t=near;
    let tx=Math.abs(d[0])<1e-9?Infinity:(b.west+(ix+(sx>0?1:0))*s-o[0])/d[0],tz=Math.abs(d[2])<1e-9?Infinity:(b.north+(iz+(sz>0?1:0))*s-o[2])/d[2];
    const dx=Math.abs(s/d[0]),dz=Math.abs(s/d[2]);
    while(t<=far&&ix>=0&&iz>=0&&ix<countX&&iz<countZ){
        const x=b.west+ix*s,z=b.north+iz*s,a=[x,rawTahoeHeight(x,z),z],c=[x+s,rawTahoeHeight(x+s,z+s),z+s],p=[x+s,rawTahoeHeight(x+s,z),z],q=[x,rawTahoeHeight(x,z+s),z+s];
        for(const tri of [[a,c,p],[a,q,c]]){const hit=rayTriangle(ray,...tri);if(hit!==null&&hit>=near-1e-6&&hit<=far)return {point:o.map((v,i)=>v+d[i]*hit),distance:hit};}
        if(tx<tz){t=tx;tx+=dx;ix+=sx;}else{t=tz;tz+=dz;iz+=sz;}
    }return null;
}
