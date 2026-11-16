// Mesh coordinates; navigation adapters subtract half a tile.
export const JURASSIC=Object.freeze({x:45.8,z:97.1,w:5,d:3.8,base:1.45,entry:{x:45.3,y:99.6},lab:{x:44.3,z:97.05,w:1.8,d:3.5},cage:{x:47.1,z:97.05,w:2.1,d:3.5},exit:{x:47.1,z:99.25}});
export const COW_PEN=Object.freeze({x:35,z:175.6,w:6,d:4.6,entry:{x:34.5,y:178.3}});
export const PEQUOD=Object.freeze({z:110,offshore:4.2,travel:23,deck:.86});
export const KRAKEN_CAPE_TEXT='I killed the kraken with a railgun and all i got was this lousy cape';
export const KRAKEN_CAPE_LINES=Object.freeze(['I KILLED THE KRAKEN','WITH A RAILGUN','AND ALL I GOT WAS','THIS LOUSY CAPE']);
export function inJurassicGrounds(x,z,pad=0){return Math.abs(x-JURASSIC.x)<=JURASSIC.w/2+pad&&z>=JURASSIC.z-JURASSIC.d/2-pad&&z<=JURASSIC.entry.y+1+pad;}
export function inCowPen(x,z,pad=0){return Math.abs(x-COW_PEN.x)<=COW_PEN.w/2+pad&&Math.abs(z-COW_PEN.z)<=COW_PEN.d/2+pad;}
