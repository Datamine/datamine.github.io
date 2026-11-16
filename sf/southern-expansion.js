// Authored blocks in world coordinates. Roads, plots, the park, and pedestrian
// routes share this data so rendered neighborhoods match their navigation.
import {CITY_EDGE_STREETS} from './city-edge.js';
import {PENINSULA_INFILL_STREETS} from './peninsula-urbanism.js';
import {WORLD_SIZE,STREET_LAYOUT_SIZE} from './geography.js';
const peninsulaCityScale=WORLD_SIZE/STREET_LAYOUT_SIZE;
export const PENINSULA_STREETS=Object.freeze([
    ...CITY_EDGE_STREETS,
    {name:'Grand Avenue',points:[[42.5,99.5],[49.5,99.5],[56.5,99.5],[62.5,99.5]]},
    {name:'Garden Avenue',points:[[28.5,99.5],[35.5,99.5],[42.5,99.5]]},
    {name:'Hillside Avenue west',points:[[28.5,105.5],[35.5,105.5],[42.5,105.5],[49.5,105.5],[56.5,105.5]]},
    {name:'Juniper Avenue',points:[[42.5,99.5],[42.5,105.5]]},
    {name:'Linden Avenue',points:[[49.5,99.5],[49.5,105.5]]},
    {name:'Cypress Avenue',points:[[56.5,99.5],[56.5,105.5]]},
    {name:'Coast Road',points:[[28.5,99.5],[28.5,105.5],[28.5,111.7],[28.5,119.5],[28.5,127.5],[28.5,135.5],[28.5,143.5]]},
    {name:'Palmetto Avenue',points:[[35.5,99.5],[35.5,105.5],[35.5,111.7],[35.5,119.5],[35.5,127.5],[35.5,135.5],[35.5,143.5]]},
    {name:'Pacifica Avenue',points:[[21.5,119.5],[28.5,119.5],[35.5,119.5],[42.5,119.5],[49.5,119.5],[56.5,119.5]]},
    {name:'Seaview Street',points:[[21.5,127.5],[28.5,127.5],[35.5,127.5]]},
    {name:'Parkside Drive',points:[[21.5,135.5],[28.5,135.5],[35.5,135.5]]},
    {name:'Ocean View Drive',points:[[21.5,143.5],[28.5,143.5],[35.5,143.5]]},
    {name:'Beachwood Avenue',points:[[21.5,119.5],[21.5,127.5],[21.5,135.5],[21.5,143.5]]},
    ...PENINSULA_INFILL_STREETS
].map(r=>Object.freeze({...r,points:Object.freeze(r.points.map(Object.freeze))})));

const peninsulaRows=[];
for(const x of [32,39,46,53])for(const [z,rotation] of [[101.45,Math.PI],[103.55,0]])peninsulaRows.push({x,z,w:4.8,d:2,rotation});
for(const x of [25,32])for(const [z,rotation] of [[121.8,Math.PI],[125.2,0],[137.8,Math.PI],[141.2,0]])peninsulaRows.push({x,z,w:4.8,d:2.7,rotation});
for(const [z,rotation] of [[129.8,Math.PI],[133.2,0]])peninsulaRows.push({x:32,z,w:4.8,d:2.7,rotation});
for(const x of [39,46,53])peninsulaRows.push({x,z:122,w:4.5,d:2.8,rotation:Math.PI});
export const PENINSULA_HOUSING=Object.freeze(peninsulaRows.map(Object.freeze));

export const PACIFICA_PARK=Object.freeze({id:'pacifica-park',label:'Pacifica Commons',west:22.4,east:27.6,north:128.4,south:134.6,entry:Object.freeze({x:24.5,y:134.9})});
export const PACIFICA_PARK_OBSTACLES=Object.freeze([
    {x:25,z:131.4,w:1.2,d:1.2,kind:'fountain'},
    {x:23.9,z:130.9,w:.9,d:.5,kind:'bench'},
    {x:26,z:132.8,w:.9,d:.5,kind:'bench'},
    {x:25,z:128.55,w:1.84,d:.16,kind:'sign'},
    ...[[22.6,129],[22.6,133.5],[27.4,130],[27.4,133.5]].map(([x,z])=>({x,z,w:.28,d:.28,kind:'tree'}))
].map(Object.freeze));
export function inPacificaPark(x,z){const p=PACIFICA_PARK;return x>=p.west&&x<=p.east&&z>=p.north&&z<=p.south;}
export function pacificaParkWalkable(x,z){return inPacificaPark(x,z)&&!PACIFICA_PARK_OBSTACLES.some(o=>Math.abs(x-o.x)<o.w/2+.17&&Math.abs(z-o.z)<o.d/2+.17);}
export const PACIFICA_PARK_PATHS=Object.freeze([
    {name:'Commons promenade',halfWidth:.22,points:[[23,129],[27,129],[27,134],[25,134],[23,134],[23,129]]},
    {name:'Commons entrance',halfWidth:.24,points:[[25,135.5],[25,134]]}
].map(r=>Object.freeze({...r,points:Object.freeze(r.points.map(Object.freeze))})));
export const PACIFICA_PARK_NODES=Object.freeze([[23,129],[27,129],[27,134],[25,134],[23,134],[24,130.4],[26,130.4],[24,132.4],[26,132.4]].map(([x,z])=>Object.freeze({x:x-.5,y:z-.5})));
export const PACIFICA_PARK_RESIDENTS=Object.freeze([
    {id:'commons-reader',label:'Woman',x:23.9,z:130.9,skin:'#9c7259',shirt:'#ab8baf',hair:'#3e3537',female:true,longHair:true},
    {id:'commons-regular',label:'Man',x:26,z:132.8,skin:'#c4a17d',shirt:'#7e9ca1',hair:'#696158'}
].map(p=>Object.freeze({...p,regional:true,seated:true,angle:Math.PI/2,height:1.85,approach:Object.freeze({x:p.x-.5,y:p.z+.8-.5})})));
