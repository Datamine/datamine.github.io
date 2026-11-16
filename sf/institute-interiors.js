import {Mesh,pose,cutawayWallMask,rayTriangle} from './geometry.js';

export const INSTITUTE_DOOR_WIDTH=1.5;
export const INSTITUTE_FLOOR_HEIGHT=.015;
export function instituteLocalPoint(room,x,z){
    const a=room.rotation||0,c=Math.cos(a),s=Math.sin(a),dx=x-room.x,dz=z-room.z;
    return {u:dx*c+dz*s,v:-dx*s+dz*c};
}
export function insideInstitute(room,x,z){const p=instituteLocalPoint(room,x,z);return Math.abs(p.u)<room.w/2-.12&&Math.abs(p.v)<room.d/2-.12;}
export function raycastInstituteFloor(room,ray){
    const angle=room.rotation||0,c=Math.cos(angle),s=Math.sin(angle);
    const corners=[[-room.w/2,-room.d/2],[room.w/2,-room.d/2],[room.w/2,room.d/2],[-room.w/2,room.d/2]].map(([u,v])=>[room.x+u*c-v*s,room.base+INSTITUTE_FLOOR_HEIGHT,room.z+u*s+v*c]);
    const hits=[[0,2,1],[0,3,2]].map(tri=>rayTriangle(ray,...tri.map(i=>corners[i]))).filter(t=>t!==null);
    if(!hits.length)return null;const distance=Math.min(...hits);return {distance,point:ray.origin.map((v,i)=>v+ray.dir[i]*distance)};
}
export function instituteFixtures(room){
    const w=room.w,d=room.d,front=room.front||1;
    const rect=(kind,x,z,width,depth)=>({kind,x,z:front>0?z:-z-depth,w:width,d:depth});
    return [rect('books',-w/2+.28,-d/2+.2,2.1,.38),rect('cabinet',w/2-1.65,-d/2+.2,1.35,.42),
        rect('desk',-w/2+.35,-.18,1.45,1.22),rect('instrument',w/2-1.65,-.16,1.15,1.12)];
}
export function instituteWallRects(room,side){
    const w=room.w,d=room.d,t=.12,door=INSTITUTE_DOOR_WIDTH,frontSide=room.front===-1?0:1;
    if(side>=2)return [{x:side===2?-w/2:w/2-t,z:-d/2,w:t,d}];
    const z=side===0?-d/2:d/2-t;
    return side===frontSide?[{x:-w/2,z,w:(w-door)/2,d:t},{x:door/2,z,w:(w-door)/2,d:t}]:[{x:-w/2,z,w,d:t}];
}
/** These exact walls and furniture also generate the rendered room. */
const instituteObstacleCache=new WeakMap();
export function instituteWalkable(room,x,z,clearance=.16){
    const p=instituteLocalPoint(room,x,z);
    if(Math.abs(p.u)>room.w/2+.25||Math.abs(p.v)>room.d/2+.25)return false;
    let obstacles=instituteObstacleCache.get(room);if(!obstacles){obstacles=[...[0,1,2,3].flatMap(side=>instituteWallRects(room,side)),...instituteFixtures(room)];instituteObstacleCache.set(room,obstacles);}
    return !obstacles.some(o=>p.u>o.x-clearance&&p.u<o.x+o.w+clearance&&p.v>o.z-clearance&&p.v<o.z+o.d+clearance);
}
export function recordInstitutePart(m,parts,kind,side,draw){const start=m.data.length;draw();parts.push({kind,side,start,count:m.data.length-start});}
export function drawInstituteWall(m,room,side,height,color,trim){
    pose(m,room.x,room.base,room.z,0,()=>{
        for(const r of instituteWallRects(room,side))m.box(r.x,.2,r.z,r.w,height-.2,r.d,color,'stone');
        if(side===(room.front===-1?0:1))m.box(-INSTITUTE_DOOR_WIDTH/2,2.15,side===0?-room.d/2:room.d/2-.12,INSTITUTE_DOOR_WIDTH,height-2.15,.12,color,'stone');
        // Perimeter cornices, never full slabs across the room.
        for(const y of [1.94,height-.02]){
            if(side<2){if(side===(room.front===-1?0:1)&&y<2.15){for(const r of instituteWallRects(room,side))m.box(r.x,y,side===0?-room.d/2-.07:room.d/2-.03,r.w,.1,.1,trim,'stone');}else m.box(-room.w/2-.06,y,side===0?-room.d/2-.07:room.d/2-.03,room.w+.12,.1,.1,trim,'stone');}
            else m.box(side===2?-room.w/2-.07:room.w/2-.03,y,-room.d/2,.1,.1,room.d,trim,'stone');
        }
    });
}
export function drawInstituteFloor(m,room,variant=0){
    pose(m,room.x,room.base,room.z,0,()=>{
        const floor=INSTITUTE_FLOOR_HEIGHT,wood=variant===1?'#8b809b':'#a68a63',brass='#bca16b';
        m.box(-room.w/2,-.025,-room.d/2,room.w,.04,room.d,variant===1?'#85949a':'#b6b6a0','stone');
        for(const side of [0,1,2,3])for(const r of instituteWallRects(room,side))m.box(r.x,0,r.z,r.w,.2,r.d,'#babca9','stone');
        // The central aisle is a flat celestial inlay, with no collision slab.
        for(let i=0;i<48;i++){
            const a=i*Math.PI/24,b=(i+1)*Math.PI/24,at=(t,r)=>[Math.cos(t)*r,floor+.002,Math.sin(t)*r];
            m.quad(at(a,.93),at(b,.93),at(b,.95),at(a,.95),brass);
        }
        for(const o of instituteFixtures(room)){
            if(o.kind==='books'||o.kind==='cabinet'){
                m.box(o.x,floor,o.z,o.w,1.28,o.d,wood,'wood');
                const front=room.front===-1?o.z-.012:o.z+o.d+.012;
                for(let row=0;row<3;row++)for(let book=0;book<Math.floor(o.w/.16)-1;book++){
                    m.box(o.x+.08+book*.16,floor+.13+row*.37,front,.115,.22+(book%3)*.025,.035,['#6d8883','#ad976d','#807691','#b7826b'][(book+row+variant)%4]);
                }
            }else if(o.kind==='desk'){
                for(const dx of [.08,o.w-.12])for(const dz of [.08,.58])m.box(o.x+dx,floor,o.z+dz,.045,.7,.045,brass,{metal:.2});
                m.box(o.x,floor+.7,o.z,o.w,.07,.72,wood,'wood');
                for(let i=0;i<3;i++)m.box(o.x+.16+i*.29,floor+.772,o.z+.12,.23,.006,.34,'#e4dcc0');
                m.cylinder(o.x+o.w-.24,floor+.77,o.z+.48,.06,.15,'#c2c7b1',16);m.cylinder(o.x+o.w-.24,floor+.92,o.z+.48,.045,.003,'#735d45',12);
                m.box(o.x+.42,floor+.43,o.z+.83,.43,.055,.32,wood,'wood');m.box(o.x+.42,floor+.47,o.z+1.12,.43,.39,.05,wood,'wood');
                for(const dx of [.46,.79])for(const dz of [.86,1.09])m.box(o.x+dx,floor,o.z+dz,.035,.43,.035,brass);
            }else{
                const x=o.x+o.w/2,z=o.z+o.d/2;
                m.cylinder(x,floor,z,.46,.22,'#8e9a91',24,.38,'stone');m.cylinder(x,floor+.22,z,.075,.52,brass,12);
                for(let ring=0;ring<2;ring++)for(let i=0;i<32;i++){
                    const at=a=>ring?[x+Math.cos(a)*.36,floor+.92+Math.sin(a)*.36,z]:[x+Math.cos(a)*.38,floor+.92,z+Math.sin(a)*.38];
                    m.rod(at(i*Math.PI/16),at((i+1)*Math.PI/16),.012,brass,6,{metal:.35});
                }
                m.sphere(x,floor+.92,z,.13,.13,.13,variant===1?'#a3b2d2':'#a6c5b4',16,8,{emissive:.18});
            }
        }
    });
}
export function detachInstituteMesh(m,definition){
    const mesh=new Mesh();mesh.data=m.data.splice(definition.start,definition.end-definition.start);
    const sections=definition.parts.map(p=>({...p,start:(p.start-definition.start)/11,count:p.count/11}));
    const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
    for(let i=0;i<mesh.data.length;i+=11)for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],mesh.data[i+k]);hi[k]=Math.max(hi[k],mesh.data[i+k]);}
    return {mesh,sections,spec:definition.spec,lo,hi};
}
export function instituteHiddenSections(room,sections,eye,inside){
    if(!inside)return [];
    const mask=cutawayWallMask({x:room.x-room.w/2,y:room.z-room.d/2,w:room.w,d:room.d,rotation:room.rotation||0},eye);
    return sections.filter(p=>p.kind==='roof'||p.kind==='wall'&&(mask&(1<<p.side)));
}
