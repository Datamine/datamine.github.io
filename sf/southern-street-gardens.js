import {inAirportFieldBillboards} from './airport-billboards.js';
import {SOUTHERN_ROADS,airportSurfaceTypeAt} from './airship.js';
import {inSouthernHousePlot,southernTrailDistance,inTimesSquare} from './southern-layout.js';
import {inSouthernCraft,craftFootprint} from './southern-craft-layout.js';
import {inCivicGrounds} from './southern-district.js';
import {inSocialGrounds} from './social-layout.js';
import {researchCampusAt} from './research-layout.js';
import {inTechGrounds} from './tech-layout.js';
import {inGPUFactoryGrounds} from './gpu-layout.js';
import {inJurassicGrounds,inCowPen} from './jurassic-layout.js';
import {inSquareConstruction} from './square-construction-layout.js';
import {westernCoastX} from './coastline.js';

/** A planted verge at most once per street segment. Real surfacing and parcel
 * tests leave the curb, sight lines, public paths and entrances unobstructed. */
export function drawSouthernStreetGardens(m,{terrain,entrances,lamps,register}){
    const beds=[];
    for(const [ri,road] of SOUTHERN_ROADS.entries())for(let i=1;i<road.points.length;i++){
        const a=road.points[i-1],b=road.points[i],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);if(len<4)continue;
        const ux=dx/len,uz=dz/len,side=(ri+i)%2?1:-1;
        for(const f of [.33,.67]){
            const x=a[0]+dx*f-uz*side*1.1,z=a[1]+dz*f+ux*side*1.1;
            if(inAirportFieldBillboards(x,z,.6)||inTimesSquare(x,z)||z<97||z>175||x<westernCoastX(z)+1.8||x>82||airportSurfaceTypeAt(x,z)!=='grass'||inSouthernHousePlot(x,z,.4)||southernTrailDistance(x,z)<.7||inSouthernCraft(x,z,.6)||inCivicGrounds(x,z,1.4)||inSocialGrounds(x,z,1)||researchCampusAt(x,z)||inTechGrounds(x,z,1)||inGPUFactoryGrounds(x,z,1)||inJurassicGrounds(x,z,1)||inCowPen(x,z,1)||inSquareConstruction(x,z,1)||entrances.some(p=>Math.hypot(p.x-x,p.z-z)<1.6)||lamps.some(p=>Math.hypot(p.x-x,p.z-z)<.8)||beds.some(p=>Math.hypot(p.x-x,p.z-z)<5))continue;
            const start=m.data.length,y=terrain.height(x,z),rotation=Math.atan2(uz,ux),p={x,z,w:.65,d:.26,rotation};
            const point=(u,v)=>[x+u*ux-v*uz,z+u*uz+v*ux];
            for(let j=0;j<6;j++){const u=-.27+j*.105,at=point(u,0),h=terrain.height(...at);m.sphere(at[0],h+.13,at[1],.085,.13,.08,['#799763','#8aa56b','#6c8c67'][j%3],8,4);if(j%2)m.sphere(at[0],h+.25,at[1],.035,.04,.035,['#ce9b88','#d9bb72','#b19bc1'][(ri+i)%3],6,3);}
            for(const side of [-1,1])for(let j=0;j<4;j++){const at=point(-.24+j*.16,side*.16),h=terrain.height(...at);m.box(at[0]-.06,h-.02,at[1]-.04,.12,.1,.08,'#b9ad91','stone');}
            const footprint=craftFootprint(p);register({mesh:m,start:start/11,count:(m.data.length-start)/11,x:x-.4,y:z-.3,w:.8,d:.6,base:y,arch:'street-garden',preserveGround:true,solid:true,footprint,lo:[x-.5,y-.1,z-.5],hi:[x+.5,y+.5,z+.5]});beds.push(p);break;
        }
    }return beds;
}
