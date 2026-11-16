/** Half-tile boundaries coincide with the southern terrain grid. Pond water,
 * levee access, picking and minimap artwork share these authored rectangles. */
export const SALT_FLATS=Object.freeze({west:74.5,east:84,north:176,south:180,base:1.15,entry:Object.freeze({x:75,y:177.5})});
const saltColors=['#a5bd98','#c7a1a2','#afc3b4','#cfb093','#b69ea8','#b1c49e'];
export const SALT_PONDS=Object.freeze([176.5,178.5].flatMap((z,row)=>[[76.5,2],[79.5,1.5],[82,1.5]].map(([x,w],col)=>Object.freeze({x,z,w,d:1,color:saltColors[row*3+col]}))));
export const SALT_FLATS_PATH=Object.freeze({name:'Salt conservation levee',halfWidth:.36,points:[[75.5,175.5],[75.5,178],[83.5,178]]});
export function inSaltFlats(x,z,margin=0){const s=SALT_FLATS;return x>=s.west-margin&&x<=s.east+margin&&z>=s.north-margin&&z<=s.south+margin;}
export function saltPondAt(x,z,margin=0){return SALT_PONDS.find(p=>x>p.x-margin&&x<p.x+p.w+margin&&z>p.z-margin&&z<p.z+p.d+margin)||null;}
export function saltSurfaceAt(x,z){return inSaltFlats(x,z)?saltPondAt(x,z)?'water':'salt':null;}
