import {WORLD_SIZE,STREET_LAYOUT_SIZE} from './geography.js';

export const SOUTHERN_BOUNDS=Object.freeze({west:12,east:84,north:WORLD_SIZE,south:180,step:.5});
const southernSecondX=64.5*WORLD_SIZE/STREET_LAYOUT_SIZE;
export const SOUTHERN_STREETS=Object.freeze([
    {name:'Bayview Avenue',points:[[62.5,99.5],[southernSecondX,99.5]]},
    {name:'San Bruno Avenue',points:[[62.5,99.5],[62.5,105.5],[62.5,117.5],[62.5,126.5]]},
    {name:'Hillside Avenue',points:[[56.5,105.5],[62.5,105.5],[southernSecondX,105.5]]},
    {name:'Peninsula Way',points:[[56.5,117.5],[62.5,117.5],[southernSecondX,117.5]]},
    {name:'Airport neighborhood cross street',points:[[62.5,126.5],[southernSecondX,126.5]]},
    {name:'Hillside Lane',points:[[56.5,105.5],[56.5,111.5],[56.5,117.5]]}
].map(r=>Object.freeze({...r,points:Object.freeze(r.points.map(Object.freeze))})));

export const SOUTHERN_TRAILS=Object.freeze([
    {name:'Southern ridge walk',halfWidth:.38,points:[[56.5,111.5],[53,109],[48,108],[44,110],[43,114],[46,116],[50,115],[53,112],[56.5,111.5]]}
].map(r=>Object.freeze({...r,points:Object.freeze(r.points.map(Object.freeze))})));

export const SOUTHERN_HILLS=Object.freeze([
    {name:'Southern ridge',x:38,z:115,h:7.6,rx:15,rz:18},
    {name:'Peninsula foothills',x:55,z:139,h:5.2,rx:13,rz:18},
    {name:'Bayview knoll',x:63,z:103,h:3.4,rx:10,rz:10},
    {name:'Coastal hills',x:27,z:161,h:6.5,rx:18,rz:17}
].map(Object.freeze));

export const SOUTHERN_LEVEL_PADS=Object.freeze([
    {name:'Airport grounds',x:75.4,z:103.2,w:19.4,d:47.3,blend:1.8},
    {name:'Tax headquarters and rail pit',x:southernSecondX-4,z:128.5,w:8,d:19.5,blend:2},
    {name:'Startup headquarters',x:70.5*WORLD_SIZE/STREET_LAYOUT_SIZE-2.7,z:129.5,w:5.4,d:7.6,blend:1.8}
].map(Object.freeze));

// Row centers, street-facing rotation, frontage and lot depth are authored
// together; no house is scattered independently of a curb or another parcel.
export const SOUTHERN_HOUSING=Object.freeze([
    {x:68,z:97.6,w:8,d:2,rotation:0},
    {x:68,z:102.2,w:8,d:3.2,rotation:Math.PI},
    {x:68,z:108.2,w:8,d:3.2,rotation:Math.PI},
    {x:68,z:114.8,w:8,d:3.2,rotation:0},
    {x:59,z:111.5,w:8,d:2.8,rotation:Math.PI/2},
    {x:60,z:122,w:6.5,d:3,rotation:-Math.PI/2},
    {x:71.7,z:121.8,w:6.5,d:2.8,rotation:-Math.PI/2},
    {x:77.6,z:121.8,w:6.5,d:2.8,rotation:Math.PI/2}
].map(Object.freeze));

export function southernSegmentDistance(x,z,a,b){const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));return Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz);}
export function southernTrailDistance(x,z){let nearest=Infinity;for(const trail of SOUTHERN_TRAILS)for(let i=1;i<trail.points.length;i++)nearest=Math.min(nearest,southernSegmentDistance(x,z,trail.points[i-1],trail.points[i])-trail.halfWidth);return nearest;}
export function inSouthernHousePlot(x,z,padding=0){return SOUTHERN_HOUSING.some(p=>{const c=Math.cos(p.rotation),s=Math.sin(p.rotation),dx=x-p.x,dz=z-p.z;return Math.abs(dx*c+dz*s)<p.w/2+padding&&Math.abs(-dx*s+dz*c)<p.d/2+padding;});}
