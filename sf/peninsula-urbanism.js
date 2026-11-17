import {AIRPORT_FIELD_ADS} from './airport-billboards.js';
import {TWITTER_HQ,SALES_CONFERENCE} from './social-layout.js';
import {APPLE_CAMPUS,ROBOTAXI_DEALER} from './tech-layout.js';
import {HABERDASHER} from './haberdasher-layout.js';
import {SALT_FLATS} from './salt-layout.js';
import {WORLD_SIZE,STREET_LAYOUT_SIZE} from './geography.js';
import {SQUARE_DIGSITE} from './square-construction-layout.js';
import {JURASSIC,COW_PEN} from './jurassic-layout.js';
import {GPU_FACTORY} from './gpu-layout.js';
import {ARMORY} from './armory-layout.js';
const peninsulaSecond=64.5*WORLD_SIZE/STREET_LAYOUT_SIZE,peninsulaThird=70.5*WORLD_SIZE/STREET_LAYOUT_SIZE;
export const PENINSULA_TRUNK_STREETS=Object.freeze([
    {name:'Third Street south',points:[[peninsulaThird,77.5*WORLD_SIZE/STREET_LAYOUT_SIZE],[peninsulaThird,132.5]]},
    {name:'Second Street south',points:[[peninsulaSecond,77.5*WORLD_SIZE/STREET_LAYOUT_SIZE],[peninsulaSecond,132.5]]},
    {name:'Terminal cross street',points:[[peninsulaSecond,112.1],[peninsulaThird,112.1]]},
    {name:'Terminal driveway',points:[[peninsulaThird,109.5],[84.5,109.5]]},
    {name:'Headquarters cross street',points:[[peninsulaSecond-11,129.8],[peninsulaThird,129.8]]}
]);
// Each connection is authored around the zoo, gym, woods, and civic facilities.
export const PENINSULA_INFILL_STREETS=Object.freeze([
    {name:'Ocean Esplanade',points:[[14.5,99.5],[14.5,111.7],[14.5,127.5],[14.5,143.5],[14.5,159.5],[14.5,167.5]]},
    {name:'Ocean Cliff Street',points:[[14.5,105.5],[21.5,105.5],[28.5,105.5]]},
    {name:'Ocean Gateway',points:[[14.5,99.5],[28.5,99.5]]},
    {name:'Cabrillo Terrace',points:[[14.5,111.7],[21.5,111.7],[28.5,111.7],[35.5,111.7],[42.5,111.7],[49.5,111.7],[56.5,111.7]]},
    {name:'Pacifica coastal connection',points:[[14.5,119.5],[21.5,119.5]]},
    {name:'Seaview extension',points:[[14.5,127.5],[21.5,127.5]]},
    {name:'Parkside coastal connection',points:[[14.5,135.5],[21.5,135.5]]},
    {name:'Ocean View coastal connection',points:[[14.5,143.5],[21.5,143.5]]},
    {name:'Juniper south',points:[[42.5,105.5],[42.5,111.7],[42.5,119.5],[42.5,127.5]]},
    {name:'Linden south',points:[[49.5,105.5],[49.5,111.7],[49.5,119.5],[49.5,127.5]]},
    {name:'Woodland Avenue',points:[[35.5,127.5],[42.5,127.5],[49.5,127.5],[56.5,127.5],[62.5,127.5]]},
    {name:'Southwood Avenue',points:[[35.5,145.5],[42.5,145.5],[56.5,145.5],[68.5,145.5],[81.5,145.5]]},
    {name:'Beachwood south',points:[[21.5,143.5],[21.5,151.5],[21.5,159.5],[21.5,167.5]]},
    {name:'Coast Road south',points:[[28.5,143.5],[28.5,151.5],[28.5,159.5],[28.5,167.5]]},
    {name:'Palmetto south',points:[[35.5,143.5],[35.5,151.5],[35.5,159.5],[35.5,167.5]]},
    {name:'Laurel Street',points:[[42.5,145.5],[42.5,151.5],[42.5,159.5],[42.5,167.5]]},
    {name:'Magnolia Street',points:[[49.5,145.5],[49.5,151.5],[49.5,159.5],[49.5,164.5]]},
    {name:'Cottage Row',points:[[14.5,151.5],[28.5,151.5],[42.5,151.5],[56.5,151.5]]},
    {name:'San Mateo Avenue',points:[[14.5,159.5],[28.5,159.5],[42.5,159.5],[56.5,159.5]]},
    {name:'Coastal Gardens Road',points:[[14.5,167.5],[28.5,167.5],[42.5,167.5]]},
    {name:'Airport West Boulevard',points:[[68.5,129.8],[68.5,137.5],[72.5,137.5],[72.5,145.5],[72.5,154.5],[72.5,164.5]]},
    {name:'Civic Lane',points:[[68.5,137.5],[75.5,137.5],[81.5,137.5],[81.5,145.5],[81.5,154.5],[81.5,164.5]]},
    {name:'Bayshore Gardens',points:[[70,154.5],[75.5,154.5],[81.5,154.5]]},
    {name:'Research neighborhood connector',points:[[56.5,164.5],[68.5,164.5],[81.5,164.5]]}
]);
export const SAND_HILL_WOODS=Object.freeze({id:'sand-hill-woods',label:'Sand Hill Woodland Park',west:37.5,east:52,north:129,south:144.4,entry:{x:48,y:137}});
export const SAND_HILL_PATHS=Object.freeze([
    {name:'Sand Hill woodland loop',halfWidth:.34,points:[[48.5,137.5],[50.5,139],[49,142.5],[43,143],[39,140.5],[39,133],[42,130.5],[48,130.5],[50.5,133],[50.5,139]]},
    {name:'Woodland north entrance',halfWidth:.34,points:[[42.5,127.5],[42,130.5]]},
    {name:'Woodland south entrance',halfWidth:.34,points:[[43,143],[42.5,145.5]]}
]);
export const PENINSULA_GREENS=Object.freeze([
    {id:'ocean-pocket-garden',label:'Ocean Terrace Garden',x:17.8,z:123.4,w:3.4,d:4.3,entry:{x:17.3,y:126}},
    {id:'bayshore-pocket-garden',label:'Bayshore Courtyard',x:77.2,z:148.9,w:4.4,d:4.5,entry:{x:76.7,y:145.8}}
]);
// Protected public land and existing facilities. A plot must clear both this
// registry and every actual road/path, rather than assuming empty space is a lot.
export const PENINSULA_RESERVATIONS=Object.freeze([
    [ARMORY.x-ARMORY.w/2-.3,ARMORY.z-ARMORY.d/2-.3,ARMORY.x+ARMORY.w/2+.3,ARMORY.z+ARMORY.d/2+.6],
    ...AIRPORT_FIELD_ADS.map(p=>[p.x-1.2,p.z-.6,p.x+1.2,p.z+.6]),
    ...[TWITTER_HQ,SALES_CONFERENCE].map(s=>[s.x-s.w/2-.25,s.z-s.d/2-.3,s.x+s.w/2+.25,s.z+s.d/2+1.2]),
    [APPLE_CAMPUS.x-3.9,APPLE_CAMPUS.z-4.3,APPLE_CAMPUS.x+3.9,APPLE_CAMPUS.z+3.9],
    [ROBOTAXI_DEALER.x-1.8,ROBOTAXI_DEALER.z-2.2,ROBOTAXI_DEALER.x+1.8,ROBOTAXI_DEALER.z+2],
    [HABERDASHER.x-HABERDASHER.w/2-.15,HABERDASHER.z-HABERDASHER.d/2-.15,HABERDASHER.x+HABERDASHER.w/2+.15,HABERDASHER.z+HABERDASHER.d/2+.15],
    [SALT_FLATS.west,SALT_FLATS.north,SALT_FLATS.east,SALT_FLATS.south],
    [GPU_FACTORY.x-GPU_FACTORY.w/2-.5,GPU_FACTORY.z-GPU_FACTORY.d/2-.4,GPU_FACTORY.x+GPU_FACTORY.w/2+.5,175.8],
    [JURASSIC.x-JURASSIC.w/2-.4,JURASSIC.z-JURASSIC.d/2-.4,JURASSIC.x+JURASSIC.w/2+.4,JURASSIC.entry.y+1],
    [COW_PEN.x-COW_PEN.w/2-.4,COW_PEN.z-COW_PEN.d/2-.4,COW_PEN.x+COW_PEN.w/2+.4,COW_PEN.z+COW_PEN.d/2+.8],
    [SQUARE_DIGSITE.west-.2,SQUARE_DIGSITE.north-.2,SQUARE_DIGSITE.east+.2,SQUARE_DIGSITE.south+.2],
    [22,128,28,135],
    [SAND_HILL_WOODS.west,SAND_HILL_WOODS.north,SAND_HILL_WOODS.east,SAND_HILL_WOODS.south],
    [55,147,71,163],[50,166.5,61,176],[63.4,166.5,74.6,176],
    [75,102.5,84,136.5],[peninsulaSecond-13.2,128.6,peninsulaSecond-6.8,144.5],
    [peninsulaSecond-3.5,132.7,peninsulaSecond+3.5,137],[58,99.7,61.4,104.2],
    [16.5,96,21,99],...PENINSULA_GREENS.map(p=>[p.x-p.w/2-.2,p.z-p.d/2-.2,p.x+p.w/2+.2,p.z+p.d/2+.2])
]);
const urbanDistance=(x,z,a,b)=>{const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));return Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz);};
const urbanBox=p=>{const horizontal=Math.abs(Math.sin(p.rotation))<.5;return [p.x-(horizontal?p.w:p.d)/2,p.z-(horizontal?p.d:p.w)/2,p.x+(horizontal?p.w:p.d)/2,p.z+(horizontal?p.d:p.w)/2];};
const urbanOverlap=(a,b,pad=.12)=>a[0]<b[2]+pad&&a[2]>b[0]-pad&&a[1]<b[3]+pad&&a[3]>b[1]-pad;

export function planPeninsulaInfill({roads,trails,existing}){
    const occupied=[...existing.map(urbanBox),...PENINSULA_RESERVATIONS],segments=roads.flatMap(r=>r.points.slice(1).map((b,i)=>({a:r.points[i],b,width:.85}))).concat(trails.flatMap(r=>r.points.slice(1).map((b,i)=>({a:r.points[i],b,width:r.halfWidth+.15}))));
    const plots=[];
    // Sweep the complete coastline-to-airport grid in street order. Varied lot
    // widths and district palettes create a continuous frontage, not copied rows.
    for(const [ri,r] of roads.entries())for(let i=1;i<r.points.length;i++){
        const a=r.points[i-1],b=r.points[i],len=Math.hypot(b[0]-a[0],b[1]-a[1]);if(len<2)continue;
        const ux=(b[0]-a[0])/len,uz=(b[1]-a[1])/len;
        for(const side of [-1,1])for(let t=1;t<len-1;){
            const seed=((ri*37+i*13+Math.floor(t*7)+side*19)%101+101)%101/101,w=2.5+seed*1.7,d=2.05+(1-seed)*.8,nx=-uz*side,nz=ux*side;
            const p={x:a[0]+ux*(t+w/2)+nx*(.94+d/2),z:a[1]+uz*(t+w/2)+nz*(.94+d/2),w,d,rotation:Math.atan2(nx,-nz),seed,infill:true,street:r.name};t+=w+.18;
            if(t>len-.3||p.x<15.5||p.x>79.3||p.z<97||p.z>165.8)continue;
            const box=urbanBox(p);if(box[1]<96.6)continue;if(occupied.some(q=>urbanOverlap(box,q)))continue;
            let clear=true;for(let z=box[1];z<=box[3]+1e-7&&clear;z+=.2)for(let x=box[0];x<=box[2]+1e-7;x+=.2)if(segments.some(s=>urbanDistance(x,z,s.a,s.b)<s.width)){clear=false;break;}
            if(!clear)continue;
            p.district=p.x<27?(seed>.55?'west':'telegraph'):p.x>65?(seed>.55?'soma':'bayview'):seed>.72?'mission':seed>.3?'victorian':'bayview';
            occupied.push(box);plots.push(Object.freeze(p));
        }
    }
    return plots;
}
