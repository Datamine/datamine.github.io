import {timesSquarePropAt} from './times-square-layout.js';
import {PENINSULA_TRUNK_STREETS,SAND_HILL_PATHS,planPeninsulaInfill} from './peninsula-urbanism.js';
import {WORLD_SIZE,STREET_LAYOUT_SIZE} from './geography.js';
import {SF_FITNESS,gymAccess,gymWalkable} from './fitness-layout.js';
export {SF_FITNESS,gymAccess,gymWalkable};
import {RESEARCH_ROADS,RESEARCH_PADS} from './research-layout.js';
import {PENINSULA_STREETS,PENINSULA_HOUSING,PACIFICA_PARK_PATHS} from './southern-expansion.js';

export const SOUTHERN_BOUNDS=Object.freeze({west:8,east:84,north:WORLD_SIZE,south:180,step:.5});
export const SAND_HILL_CAPITAL=Object.freeze({x:43.5,z:134.4,w:5.4,d:3.6,base:4,entry:Object.freeze({x:43,y:137})});
const southernSecondX=64.5*WORLD_SIZE/STREET_LAYOUT_SIZE;
// A deliberately compressed Hillsborough: southwest of the airport.
export const TIMES_SQUARE=Object.freeze({x:63,z:154.5,west:57,east:70,north:148,south:162,base:3.2,entry:Object.freeze({x:62.5,y:154})});
export const TIMES_SQUARE_BUILDINGS=Object.freeze([
    {x:63,z:149.4,w:2.7,d:2.6,h:8.8},
    {x:58.5,z:150.2,w:2.2,d:3.2,h:5.8},
    {x:67.5,z:150.8,w:2.5,d:4,h:10.5},
    {x:58.5,z:159.4,w:2.8,d:3.4,h:4.8},
    {x:67.4,z:159.4,w:3,d:3.4,h:6.6}
].map(Object.freeze));
export function inTimesSquare(x,z){const p=TIMES_SQUARE;return x>=p.west&&x<=p.east&&z>=p.north&&z<=p.south;}
export function timesSquareWalkable(x,z){return inTimesSquare(x,z)&&!TIMES_SQUARE_BUILDINGS.some(b=>Math.abs(x-b.x)<b.w/2+.22&&Math.abs(z-b.z)<b.d/2+.22)&&!timesSquarePropAt(x,z);}
export const TIMES_SQUARE_ROUTE_NODES=Object.freeze([[60.5,152],[65,152],[60.8,158],[65.2,158],[60.8,161.85],[65.2,161.85]].map(([x,z])=>Object.freeze({x:x-.5,y:z-.5})));
export const SOUTHERN_STREETS=Object.freeze([
    {name:'Bayview Avenue',points:[[62.5,99.5],[southernSecondX,99.5]]},
    {name:'San Bruno Avenue',points:[[62.5,99.5],[62.5,105.5],[62.5,117.5],[62.5,126.5]]},
    {name:'Hillside Avenue',points:[[56.5,105.5],[62.5,105.5],[southernSecondX,105.5]]},
    {name:'Peninsula Way',points:[[56.5,117.5],[62.5,117.5],[southernSecondX,117.5]]},
    {name:'Airport neighborhood cross street',points:[[62.5,126.5],[southernSecondX,126.5]]},
    {name:'Hillside Lane',points:[[56.5,105.5],[56.5,111.5],[56.5,117.5],[56.5,154.5]]},
    {name:'Times Square',points:[[56.5,154.5],[69.5,154.5]]},
    {name:'Sand Hill Road',points:[[56.5,137.5],[43.5,137.5]]},
    ...RESEARCH_ROADS,...PENINSULA_STREETS
].map(r=>Object.freeze({...r,points:Object.freeze(r.points.map(Object.freeze))})));

export const SOUTHERN_TRAILS=Object.freeze([
    {name:'Southern ridge walk',halfWidth:.38,points:[[56.5,111.5],[53,109],[48,108],[44,110],[43,114],[46,116],[50,115],[53,112],[56.5,111.5]]},
    {name:'Coastal ridge trail',halfWidth:.4,points:[[43,114],[35,112],[27,111.7],[23.5,111.7]]},
    ...PACIFICA_PARK_PATHS,...SAND_HILL_PATHS
].map(r=>Object.freeze({...r,points:Object.freeze(r.points.map(Object.freeze))})));

export const SOUTHERN_HILLS=Object.freeze([
    {name:'Southern ridge',x:38,z:115,h:7.6,rx:15,rz:18},
    {name:'Peninsula foothills',x:55,z:139,h:5.2,rx:13,rz:18},
    {name:'Bayview knoll',x:63,z:103,h:3.4,rx:10,rz:10},
    {name:'Coastal hills',x:27,z:161,h:6.5,rx:18,rz:17}
].map(Object.freeze));

export const SOUTHERN_LEVEL_PADS=Object.freeze([
    {name:'Airport grounds',x:75.4,z:103.2,w:19.4,d:47.3,blend:1.8},
    {name:'Tax headquarters and rail pit',x:southernSecondX-14,z:128.5,w:8,d:19.5,blend:12},
    {name:'Startup headquarters',x:70.5*WORLD_SIZE/STREET_LAYOUT_SIZE-2.7,z:129.5,w:5.4,d:7.6,blend:1.8},
    {name:'Times Square plaza',x:55,z:147,w:16,d:16,height:TIMES_SQUARE.base,blend:8},
    {name:'Sand Hill Road offices',x:40.3,z:132.2,w:6.4,d:6,height:SAND_HILL_CAPITAL.base,blend:6},
    ...RESEARCH_PADS
].map(Object.freeze));

// Row centers, street-facing rotation, frontage and lot depth are authored
// together; no house is scattered independently of a curb or another parcel.
const southernExistingHousing=[
    {x:65.8,z:97.6,w:3.6,d:2,rotation:0},
    {x:70.9,z:97.6,w:3.2,d:2,rotation:0},
    {x:68,z:102.2,w:8,d:3.2,rotation:Math.PI},
    {x:68,z:108.2,w:8,d:3.2,rotation:Math.PI},
    {x:68,z:114.8,w:8,d:3.2,rotation:0},
    {x:59,z:111.5,w:8,d:2.8,rotation:Math.PI/2},
    {x:60,z:122,w:6.5,d:3,rotation:-Math.PI/2},
    {x:71.7,z:121.8,w:6.5,d:2.8,rotation:-Math.PI/2},
    {x:77.6,z:121.8,w:6.5,d:2.8,rotation:Math.PI/2},
    ...PENINSULA_HOUSING
];
export const SOUTHERN_HOUSING=Object.freeze([...southernExistingHousing,...planPeninsulaInfill({roads:[...PENINSULA_TRUNK_STREETS,...SOUTHERN_STREETS],trails:SOUTHERN_TRAILS,existing:southernExistingHousing})].map(Object.freeze));

export function southernSegmentDistance(x,z,a,b){const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));return Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz);}
export function southernTrailDistance(x,z){let nearest=Infinity;for(const trail of SOUTHERN_TRAILS)for(let i=1;i<trail.points.length;i++)nearest=Math.min(nearest,southernSegmentDistance(x,z,trail.points[i-1],trail.points[i])-trail.halfWidth);return nearest;}
const southernHouseBounds=SOUTHERN_HOUSING.map(p=>({...p,c:Math.cos(p.rotation),s:Math.sin(p.rotation)}));
export function inSouthernHousePlot(x,z,padding=0){return southernHouseBounds.some(p=>{const dx=x-p.x,dz=z-p.z;return Math.abs(dx*p.c+dz*p.s)<p.w/2+padding&&Math.abs(-dx*p.s+dz*p.c)<p.d/2+padding;});}
