import {createNavigationGrid} from './navigation.js';

/** Quarter-tile navigation over the rendered southern land, with the same
 * adjacency and corner rules as the city. Spatial buckets keep solid-footprint
 * checks cheap; the completed graph is reused for every player/NPC route. */
export function createRegionalNavigation({west=7.875,east=108.625,north=93.375,south=180.625,walkable,clearance=.16}){
    const resolution=4,width=Math.ceil((east-west)*resolution),height=Math.ceil((south-north)*resolution),buckets=new Map();let graph=null;
    const local=p=>({x:p.x+.5-west,y:p.y+.5-north}),world=p=>({x:p.x+west-.5,y:p.y+north-.5});
    function blocked(x,z){
        for(const polygon of buckets.get(Math.floor(x/4)+','+Math.floor(z/4))||[]){
            let inside=false;
            for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
                const a=polygon[j],b=polygon[i],dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1)));
                if(Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t)<clearance)return true;
                if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])inside=!inside;
            }
            if(inside)return true;
        }return false;
    }
    const raw=(x,z)=>walkable(x,z)&&!blocked(x,z);
    function clearSegment(a,b){
        const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/.08));
        for(let i=0;i<=n;i++)if(!raw(a.x+(b.x-a.x)*i/n+west,a.y+(b.y-a.y)*i/n+north))return false;
        return true;
    }
    function ensure(){
        if(graph)return graph;
        const mask=new Uint8Array(width*height);
        for(let z=0;z<height;z++)for(let x=0;x<width;x++)mask[z*width+x]=raw(west+(x+.5)/resolution,north+(z+.5)/resolution)?1:0;
        return graph=createNavigationGrid({width,height,resolution,mask,canTraverse:clearSegment,canLink:(a,b)=>{
            // Endpoints are already in the mask; sample only the edge interior.
            for(const t of [.25,.5,.75])if(!raw(a.x+(b.x-a.x)*t+west,a.y+(b.y-a.y)*t+north))return false;
            return true;
        }});
    }
    function setObstacles(obstacles){
        buckets.clear();graph=null;
        for(const polygon of obstacles){const xs=polygon.map(p=>p[0]),zs=polygon.map(p=>p[1]);
            for(let z=Math.floor((Math.min(...zs)-clearance)/4);z<=Math.floor((Math.max(...zs)+clearance)/4);z++)for(let x=Math.floor((Math.min(...xs)-clearance)/4);x<=Math.floor((Math.max(...xs)+clearance)/4);x++){
                const key=x+','+z;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(polygon);
            }
        }
    }
    return {setObstacles,contains:(x,z)=>raw(x,z)&&ensure().free(x-west,z-north),segment:(a,b)=>ensure().segment(local(a),local(b)),path:(a,b)=>ensure().path(local(a),local(b))?.map(world)||null,get graph(){return ensure();}};
}
