import {instituteWalkable} from './institute-interiors.js';
export const RESEARCH_CAMPUSES=Object.freeze([
    {id:'centeredness-institute',label:'California Institute for Consciousness Research',x:55.5,z:170,w:7,d:4.2,base:1.6,west:50.8,east:60.2,north:167.2,south:175.1,entry:{x:55,y:175}},
    {id:'center-research-institute',label:'California Institute for Consciousness Research · Field Station',x:69,z:170,w:7.8,d:4.2,base:1.6,west:64,east:74,north:167.2,south:175.1,entry:{x:68.5,y:175}}
].map(Object.freeze));
export function researchCampusAt(x,z){return RESEARCH_CAMPUSES.find(c=>x>=c.west&&x<=c.east&&z>=c.north&&z<=c.south)||null;}
export function researchCampusWalkable(x,z){
    const c=researchCampusAt(x,z);if(!c)return false;
    if([-1,1].some(side=>Math.hypot(x-c.x-side*1.55,z-c.z-c.d/2-.48)<.2))return false;
    if(Math.abs(x-c.x)<=c.w/2+.25&&Math.abs(z-c.z)<=c.d/2+.25)return instituteWalkable(c,x,z);
    if(Math.abs(x-c.x)<.85&&Math.abs(z-173.3)<.75)return false;
    if(Math.abs(x-c.x)<.53&&Math.abs(z-174.5)<.48)return false;
    return true;
}
export const RESEARCH_ROADS=Object.freeze([
    {name:'Centerline Boulevard',points:[[56.5,154.5],[56.5,164.5],[62,164.5],[62,175.5]]},
    {name:'Consciousness Drive',points:[[50.5,175.5],[75.5,175.5]]}
]);
export const RESEARCH_PADS=Object.freeze(RESEARCH_CAMPUSES.map(c=>({name:c.label,x:c.west-.3,z:c.north-.4,w:c.east-c.west+.6,d:c.south-c.north+.8,height:c.base,blend:6})));
export const RESEARCH_ROUTE_NODES=Object.freeze(RESEARCH_CAMPUSES.flatMap(c=>[[c.x-2.5,173.8],[c.x+2.5,173.8],[c.x,175.15],[c.west+.6,174.5],[c.east-.6,174.5],[c.west+.6,c.north+.2],[c.east-.6,c.north+.2]].map(([x,z])=>({x:x-.5,y:z-.5}))));
