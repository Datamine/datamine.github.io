/** Local, street-facing estate parcels. +Z faces the curb. Geometry, collision,
 * pools and resident placement all consume this same plan. No random sprawl. */
export const ESTATE_STYLES=Object.freeze(['california','eichler','fallingwater','hearst']);
export function planEstate({w,d,seed=.4,style}){
    style=style||ESTATE_STYLES[Math.min(3,Math.floor(seed*4))];
    const pool=w>=5.5&&d>=2.7?{x:-w/2+.38,z:-d/2+.35,w:1.55,d:d-1.15,water:.115}:null;
    const left=pool?-w/2+2.22:-w/2+.15,right=w/2-.15;
    const house={x:left,z:-d/2+.16,w:right-left,d:d-.59};
    return {style,w,d,seed,house,pool,entry:{x:house.x+house.w*.5,z:d/2},storeys:style==='eichler'?1:2};
}
export function estatePoint(plot,x,z){const a=plot.rotation||0,c=Math.cos(a),s=Math.sin(a);return [plot.x+x*c-z*s,plot.z+x*s+z*c];}
export function estateRectangle(plot,r){return [[r.x,r.z],[r.x+r.w,r.z],[r.x+r.w,r.z+r.d],[r.x,r.z+r.d]].map(([x,z])=>estatePoint(plot,x,z));}
export function estateStyleFor(plot){
    if(plot.w>=5.5)return plot.x<65?'hearst':plot.x<75?'fallingwater':'california';
    return ESTATE_STYLES[Math.abs(Math.floor(plot.x*7+plot.z*11))%4];
}
