/** The gym sits on the open block east of the zoo, below Lake Merced. */
export const SF_FITNESS=Object.freeze({x:31.6,z:92.2,w:4,d:2.6,base:1.4,entry:Object.freeze({x:31.1,y:93.5}),bench:Object.freeze({x:31.6,z:92.3})});
export function gymAccess(x,z){const g=SF_FITNESS;return Math.abs(x-g.x)<=g.w/2+.15&&z>=g.z-g.d/2-.1&&z<=g.z+g.d/2+.8;}
export function gymWalkable(x,z){const g=SF_FITNESS;return x>=g.x-g.w/2+.3&&x<=g.x+g.w/2-.3&&z>=g.z-.6&&z<=g.z+g.d/2+.6;}
export function fitnessObstacles(){
    const g=SF_FITNESS,rect=(x,z,w,d)=>[[x,z],[x+w,z],[x+w,z+d],[x,z+d]];
    return [rect(g.x-g.w/2,g.z-g.d/2,g.w,.12),rect(g.x-g.w/2,g.z-g.d/2,.12,g.d),rect(g.x+g.w/2-.12,g.z-g.d/2,.12,g.d)];
}
