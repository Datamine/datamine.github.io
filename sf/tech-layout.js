/** South Bay business plots, kept clear of homes, cow pens and research courts. */
export const APPLE_CAMPUS=Object.freeze({x:43,z:173.8,outer:3.4,inner:2.2,base:1.6,height:2.55,segments:64,entry:Object.freeze({x:42.5,y:171.8})});
export const ROBOTAXI_DEALER=Object.freeze({x:48.5,z:171.1,w:3.2,d:3.6,base:1.6,entry:Object.freeze({x:48,y:168.5})});
export const TECH_PATHS=Object.freeze([
    {name:'Tim Apple campus walk',halfWidth:.36,points:[[42.5,167.5],[43,169],[43,172.3]]},
    {name:'Robotaxi dealership access',halfWidth:.36,points:[[43,169],[48.5,169]]}
]);
export function appleRingSections(){const c=APPLE_CAMPUS,parts=[];for(let i=0;i<c.segments;i++){
    const a=i*Math.PI*2/c.segments,b=(i+1)*Math.PI*2/c.segments;
    if(Math.abs((a+b)/2-Math.PI)<.30)continue; // Open northern gateway.
    const at=(r,t)=>[c.x+Math.sin(t)*r,c.z+Math.cos(t)*r];parts.push({a,b,polygon:[at(c.outer,a),at(c.outer,b),at(c.inner,b),at(c.inner,a)]});
}return parts;}
export function inTechGrounds(x,z,margin=0){const a=APPLE_CAMPUS,r=ROBOTAXI_DEALER;return Math.hypot(x-a.x,z-a.z)<a.outer+.5+margin||Math.abs(x-r.x)<r.w/2+.2+margin&&Math.abs(z-r.z)<r.d/2+.3+margin;}
