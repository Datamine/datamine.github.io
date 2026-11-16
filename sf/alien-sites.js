import {pose,rayTriangle} from './geometry.js';
import {drawPlaque} from './southern-district.js';
import {drawFacadeWindow} from './windows.js';
import {createNavigationGrid} from './navigation.js';
import {instituteWalkable,detachInstituteMesh} from './institute-interiors.js';
import {BERKELEY_CAMPUS,BERKELEY_INSTITUTE_ROOM,drawBerkeleyCampus} from './berkeley-campus.js';

export const ALIEN_SITE_SIGNS=Object.freeze(['AMERICAN INDUSTRIAL CENTER','BERKELEY INSTITUTE\nFOR ESOTERIC STUDIES']);
export const INDUSTRIAL_CENTER=Object.freeze({x:84.8,z:77.3,w:3.8,d:3.3,angle:Math.PI/2});
function alienSiteBounds(m,start,site){
    const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
    for(let i=start;i<m.data.length;i+=11)for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],m.data[i+k]);hi[k]=Math.max(hi[k],m.data[i+k]);}
    return {...site,start,count:m.data.length-start,lo,hi};
}
export function drawIndustrialCenter(m,signs,{base}){
    const c=INDUSTRIAL_CENTER,start=m.data.length;
    pose(m,c.x,base,c.z,c.angle,()=>{
        m.box(-c.w/2,-.04,-c.d/2,c.w,2.1,c.d,'#a27e67','brick');
        for(let i=0;i<3;i++){
            const z=-c.d/2+i*c.d/3;
            m.quad([-c.w/2,2.1,z],[-c.w/2,2.6,z+.78],[c.w/2,2.6,z+.78],[c.w/2,2.1,z],'#718783','roof');
            m.quad([-c.w/2,2.6,z+.78],[-c.w/2,2.1,z+c.d/3],[c.w/2,2.1,z+c.d/3],[c.w/2,2.6,z+.78],'#739397','glass');
            for(const side of [-1,1]){const points=[[side*c.w/2,2.1,z],[side*c.w/2,2.6,z+.78],[side*c.w/2,2.1,z+c.d/3]];if(side<0)points.reverse();m.tri(...points,'#a27e67','brick');}
        }
        m.box(-.65,.02,c.d/2+.01,1.3,1.4,.035,'#6a7770',{metal:.18});
        for(let j=0;j<12;j++)m.box(-.62,.08+j*.105,c.d/2+.05,1.24,.018,.018,'#a1aaa0');
        for(const x of [-1.45,1.08])drawFacadeWindow(m,{plane:c.d/2+.012,along:x,y:.65,w:.5,h:.65,style:'office',trim:'#c6c4ab',seed:x});
        m.box(-1.84,1.55,c.d/2+.025,3.68,.4,.04,'#3e5654');drawPlaque(m,signs,ALIEN_SITE_SIGNS[0],0,1.61,c.d/2+.07,3.45,.26);
        for(const x of [-1.6,1.6]){m.box(x-.1,.03,c.d/2+.13,.2,.53,.2,'#b8ad76');m.box(x-.1,.29,c.d/2+.14,.2,.09,.2,'#4d5851');}
    });
    return alienSiteBounds(m,start,{id:'american-industrial-center',kind:'industrial-center',label:'American Industrial Center',base,entry:{x:82,y:76.8},description:'A brick-and-sawtooth workshop northeast of UCSF Hospital. An armorer keeps precision tools, including a bayonet for properly permitted alien-removal work.'});
}

/** The campus uses a small precomputed adjacency graph on the same ground
 * parcels as its models, picking surface, and minimap. */
export function createEsotericCampus(car){
    const p=car.sample(car.dealer+24),c=Math.cos(p.angle),s=Math.sin(p.angle),base=p.y,gate={x:p.x-.5,y:p.z-.5},layout=BERKELEY_CAMPUS;
    const local=(x,z)=>{const dx=x-p.x,dz=z-p.z;return {u:dx*c+dz*s,v:-dx*s+dz*c};};
    const point=(u,v)=>({x:p.x+u*c-v*s,z:p.z+u*s+v*c});
    const inRect=(u,v,[a,b,d,e],pad=0)=>u>=a-pad-1e-8&&u<=d+pad+1e-8&&v>=b-pad-1e-8&&v<=e+pad+1e-8;
    const clearLocal=(u,v)=>{
        if(!inRect(u,v,layout.bounds)&&!inRect(u,v,layout.paths[0]))return false;
        for(const b of layout.buildings)if(inRect(u,v,b.rect,.16)){if(b.id!=='institute'||!instituteWalkable(BERKELEY_INSTITUTE_ROOM,u,v))return false;}
        if(layout.obstacles.some(o=>Math.hypot(u-o.u,v-o.v)<o.r+.16))return false;
        return !layout.trees.some(([x,z])=>Math.hypot(u-x,v-z)<.3);
    };
    const contains=(x,z)=>{const q=local(x,z);return clearLocal(q.u,q.v);};
    const ground=()=>base+.015;
    const resolution=4,west=-9,north=-.25,width=72,height=75;
    const graphPoint=q=>({x:q.u-west,y:q.v-north}),worldPoint=q=>{const at=point(q.x+west,q.y+north);return {x:at.x-.5,y:at.z-.5};};
    const clearGraphLine=(a,b)=>{
        const n=Math.max(1,Math.ceil(Math.hypot(a.x-b.x,a.y-b.y)/.06));
        for(let i=0;i<=n;i++)if(!clearLocal(west+a.x+(b.x-a.x)*i/n,north+a.y+(b.y-a.y)*i/n))return false;return true;
    };
    const mask=Uint8Array.from({length:width*height},(_,id)=>clearLocal(west+(id%width+.5)/resolution,north+(Math.floor(id/width)+.5)/resolution)?1:0);
    const graph=createNavigationGrid({width,height,resolution,mask,canTraverse:clearGraphLine,canLink:clearGraphLine});
    function segment(a,b){return graph.segment(graphPoint(local(a.x+.5,a.y+.5)),graphPoint(local(b.x+.5,b.y+.5)));}
    function internal(a,b){return graph.path(graphPoint(local(a.x+.5,a.y+.5)),graphPoint(local(b.x+.5,b.y+.5)))?.map(worldPoint)||null;}
    function path(from,to,basePath){
        const a=contains(from.x+.5,from.y+.5),b=contains(to.x+.5,to.y+.5);
        if(!a&&!b)return basePath(from,to);if(a&&b)return internal(from,to);
        const entry=a?internal(from,gate):basePath(from,gate),exit=b?internal(gate,to):basePath(gate,to);
        return entry&&exit?[...entry,...exit]:null;
    }
    const quad=rect=>{const [a,b,c,d]=rect;return [[a,b],[a,d],[c,d],[c,b]].map(([u,v])=>{const q=point(u,v);return [q.x,ground(),q.z];});};
    const quads=[quad(layout.bounds),quad(layout.paths[0])];
    const mapFeatures=[{polygon:quad(layout.bounds),color:'#879c78'},...layout.paths.map(rect=>({polygon:quad(rect),color:'#c8c6b1'})),...layout.buildings.map(b=>({polygon:quad(b.rect),color:b.color}))];
    function raycast(ray){let best=Infinity;for(const q of quads)for(const tri of [[q[0],q[1],q[2]],[q[0],q[2],q[3]]]){const d=rayTriangle(ray,...tri);if(d!==null)best=Math.min(best,d);}return Number.isFinite(best)?{distance:best,point:ray.origin.map((v,i)=>v+ray.dir[i]*best)}:null;}
    function draw(m,signs,{separateInterior=false}={}){
        const start=m.data.length;let definition;pose(m,p.x,base,p.z,p.angle,()=>{definition=drawBerkeleyCampus(m,signs,ALIEN_SITE_SIGNS[1]);});
        const entry=point(.8,2.65);
        const inside=point(0,7.25),site=alienSiteBounds(m,start,{enterableInstitute:true,inside:{x:inside.x-.5,y:inside.z-.5},id:'berkeley-esoteric',kind:'esoteric-institute',label:'Berkeley Institute for Esoteric Studies',entry:{x:entry.x-.5,y:entry.z-.5},base,description:'Copper observatories, watchful stained glass, and an armillary instrument of uncertain purpose. A tiny Berkeley campus surrounds the institute: redwoods, a campanile, a colonnaded library, and scholars with impeccable credentials in impossible coincidences. Professor Vale can certify alien evidence.'});
        if(separateInterior){site.interior=detachInstituteMesh(m,definition);const center=point(BERKELEY_INSTITUTE_ROOM.x,BERKELEY_INSTITUTE_ROOM.z);site.interior.spec={...BERKELEY_INSTITUTE_ROOM,x:center.x,z:center.z,base,rotation:p.angle};site.count=m.data.length-start;}
        return site;
    }
    const n=point(.6,7.6),a=point(-.3,7.4);
    const npc={id:'esoteric-professor',name:'Professor Iris Vale',label:'Esoteric researcher',questRole:'esoteric',x:n.x,z:n.z,base:ground(),skin:'#b58c6d',shirt:'#6e8c83',hair:'#b6b5a3',female:true,longHair:true,angle:p.angle+Math.PI,regional:true,approach:{x:a.x-.5,y:a.z-.5},description:'She has impeccable credentials in a field whose existence is fiercely disputed.'};
    const routes=[[-5,4,-5,14.6],[5,4,5,14.6],[-5,12.4,5,12.4]].map(([u,v,x,z],i)=>({name:'Berkeley campus walk '+i,kind:'path',halfWidth:.4,points:[[u,v],[x,z]].map(([a,b])=>{const q=point(a,b);return [q.x,q.z];})}));
    const surfaceType=(x,z)=>{const q=local(x,z);return !clearLocal(q.u,q.v)?'building':layout.paths.some(r=>inRect(q.u,q.v,r))?'sidewalk':'grass';};
    return {gate,base,point,contains,ground,segment,path,raycast,draw,npc,quads,mapFeatures,routes,surfaceType,layout,graph};
}
