/** The grid is rebuilt once per broadcast, never once per observer. The
 * bounded nearest-neighbor set also protects clients in crowded spawn areas. */
export class SpatialIndex{
    constructor(size=24){this.size=size;this.buckets=new Map();this.cache=new Map();}
    rebuild(actors){this.buckets.clear();this.cache.clear();for(const actor of actors){const key=Math.floor(actor.x/this.size)+','+Math.floor(actor.z/this.size);let bucket=this.buckets.get(key);if(!bucket)this.buckets.set(key,bucket=[]);bucket.push(actor);}}
    near(x,z,radius,limit=Infinity,exclude=null){
        const qx=Math.floor(x*2),qz=Math.floor(z*2),key=qx+','+qz+','+radius+','+limit;
        let candidates=this.cache.get(key);
        if(!candidates){
            const cx=(qx+.5)/2,cz=(qz+.5)/2,expanded=radius+.36,found=[];
            for(let iz=Math.floor((cz-expanded)/this.size);iz<=Math.floor((cz+expanded)/this.size);iz++)for(let ix=Math.floor((cx-expanded)/this.size);ix<=Math.floor((cx+expanded)/this.size);ix++)for(const actor of this.buckets.get(ix+','+iz)||[]){if(actor.mode==='hidden')continue;const distance=(actor.x-cx)**2+(actor.z-cz)**2;if(distance<=expanded*expanded)found.push({actor,distance});}
            found.sort((a,b)=>a.distance-b.distance||(typeof a.actor.id==='number'?a.actor.id-b.actor.id:0));candidates=found.slice(0,limit+4).map(a=>a.actor);this.cache.set(key,candidates);
        }
        return candidates.filter(a=>a!==exclude&&(a.x-x)**2+(a.z-z)**2<=radius*radius).slice(0,limit);
    }
}
