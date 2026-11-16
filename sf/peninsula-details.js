import {PACIFICA_PARK,PACIFICA_PARK_OBSTACLES} from './southern-expansion.js';
import {drawPlaque} from './southern-district.js';
import {TILE_TYPES} from './tiles.js';

export const PENINSULA_SIGNS=Object.freeze(['PACIFICA COMMONS','BUS']);
export function drawPeninsulaDetails(m,terrain,signs,tree){
    const p=PACIFICA_PARK,start=m.data.length;
    for(const o of PACIFICA_PARK_OBSTACLES){
        const h=terrain.height(o.x,o.z);
        if(o.kind==='tree'){tree(o.x-.5,o.z-.5,o.z<131?3:true,true);continue;}
        if(o.kind==='bench'){
            for(const x of [-.3,.3])m.box(o.x+x,h-.1,o.z-.12,.045,.56,.26,'#60736e',{metal:.2});
            for(let i=0;i<4;i++)m.box(o.x-.43,h+.44,o.z-.22+i*.105,.86,.05,.08,'#b59a72','wood');
            m.box(o.x-.43,h+.49,o.z-.24,.86,.42,.045,'#b59a72','wood');
        }else if(o.kind==='fountain'){
            m.cylinder(o.x,h-.18,o.z,.59,.38,'#a5b1a6',32,.59,'stone');
            m.cylinder(o.x,h+.2,o.z,.5,.025,'#83b6ba',32,.5,{water:.5});
            m.cylinder(o.x,h+.22,o.z,.07,.46,'#c9c6ac',16);m.sphere(o.x,h+.7,o.z,.16,.08,.16,'#d1d2b6',16,8);
        }
    }
    const signHeight=terrain.height(25,128.55);
    for(const x of [24.25,25.75])m.cylinder(x,signHeight,128.55,.035,.95,'#607d72',10);
    m.box(24.08,signHeight+.56,128.5,1.84,.4,.08,'#547263');drawPlaque(m,signs,'PACIFICA COMMONS',25,signHeight+.6,128.59,1.72,.28);
    for(const [x,z] of [[23.1,128.7],[26.8,134.25]])for(let i=0;i<7;i++){
        const xx=x+i*.065,h=terrain.height(xx,z);m.rod([xx,h,z],[xx,h+.16,z],.008,'#72925c',5);m.sphere(xx,h+.18,z,.045,.04,.045,i%2?'#cfb56d':'#b28ba6',8,5);
    }
    // No separate slab: the park inherits the same rolling terrain and textures.
    const site={id:p.id,label:p.label,kind:'park',entry:{...p.entry},description:'Pacifica Commons: a neighborhood green with a fountain, shaded benches, and paths for a very unhurried lap. The ocean air is complimentary.',start,count:m.data.length-start,lo:[p.west,Math.min(...PACIFICA_PARK_OBSTACLES.map(o=>terrain.height(o.x,o.z)))-.2,p.north],hi:[p.east,Math.max(...PACIFICA_PARK_OBSTACLES.map(o=>terrain.height(o.x,o.z)))+3.5,p.south]};
    for(const [x,z] of [[53,98.25],[36.8,130]]){
        const h=terrain.height(x,z);
        for(const xx of [-.75,.75])m.rod([x+xx,h,z],[x+xx,h+2,z],.035,'#788e91',10);
        m.box(x-.9,h+2,z-.33,1.8,.09,.66,'#87a5a1',{metal:.2});
        m.box(x-.8,h+.45,z+.08,1.6,.06,.22,'#a4b6ae');
        for(let i=0;i<4;i++)m.box(x-.8+i*.4,h+.7,z+.31,.025,1.2,.03,'#a5b9b9');
        m.rod([x+1.1,h,z],[x+1.1,h+2.3,z],.024,'#91a29d',10);drawPlaque(m,signs,'BUS',x+1.1,h+1.8,z+.03,.45,.3);
    }
    for(const [x,z] of [[49.5,99.5],[35.5,119.5],[28.5,127.5],[28.5,135.5]])for(let bar=0;bar<4;bar++){
        const a=x-.42+bar*.23,b=z+.95,w=.13,d=.72;
        for(let zz=b;zz<b+d-1e-9;zz+=.125){const end=Math.min(b+d,zz+.125),at=(xx,yy)=>[xx,terrain.height(xx,yy)+TILE_TYPES.road.height+.006,yy];m.quad(at(a,zz),at(a,end),at(a+w,end),at(a+w,zz),'#d5d6bc');}
    }
    return site;
}
