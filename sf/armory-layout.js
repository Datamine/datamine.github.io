export const ARMORY=Object.freeze({x:68,z:111.5,w:3.8,d:2.8,entry:{x:70.4,y:111}});
export function inArmoryGrounds(x,z,margin=0){return Math.abs(x-ARMORY.x)<ARMORY.w/2+margin&&Math.abs(z-ARMORY.z)<ARMORY.d/2+margin;}
