import {TILE_TYPES} from './tiles.js';

// Implicit sparse adjacency: eight possible edges per quarter-tile cell.
// Diagonals require both orthogonal neighbors, matching collision traversal.
export const NAVIGATION_DIRECTIONS=Object.freeze([
    {dx:0,dz:-1,opposite:2},{dx:1,dz:0,opposite:3},{dx:0,dz:1,opposite:0},{dx:-1,dz:0,opposite:1},
    {dx:1,dz:-1,opposite:6},{dx:1,dz:1,opposite:7},{dx:-1,dz:1,opposite:4},{dx:-1,dz:-1,opposite:5}
]);
const navInside=(x,z,polygon)=>{
    let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
        const a=polygon[i],b=polygon[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])inside=!inside;
    }return inside;
};
const navDistance=(x,z,a,b)=>{const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1)));return Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz);};
const navRectangle=(cx,cz,w,d,angle=0)=>[[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]].map(([x,z])=>[cx+x*Math.cos(angle)-z*Math.sin(angle),cz+x*Math.sin(angle)+z*Math.cos(angle)]);

/** Four-way flood filling has exactly the same components as eight-way
 * movement with blocked-corner clearance. Shared by routing and the minimap. */
export function navigationRegions(mask,width){
    const regions=new Int32Array(mask.length);regions.fill(-1);const queue=new Int32Array(mask.length);let region=0;
    for(let start=0;start<mask.length;start++){
        if(!mask[start]||regions[start]!==-1)continue;let read=0,write=1;queue[0]=start;regions[start]=region;
        while(read<write){const id=queue[read++],x=id%width;for(const n of [x?id-1:-1,x+1<width?id+1:-1,id-width,id+width]){
            if(n<0||n>=mask.length||!mask[n]||regions[n]!==-1)continue;regions[n]=region;queue[write++]=n;
        }}region++;
    }return regions;
}

/** Logical actor coordinates add offset to obtain world coordinates. Keeping
 * that conversion here avoids mixing tile centers and tile corners in callers. */
export function createNavigationGrid({width,height=width,resolution=1,offset=0,mask}){
    if(!Number.isInteger(width)||width<=0||!Number.isInteger(height)||height<=0||mask.length!==width*height||!(resolution>0))throw new Error('Invalid navigation grid dimensions');
    mask=Uint8Array.from(mask,v=>v?1:0);
    const count=mask.length,links=new Uint8Array(count),regions=navigationRegions(mask,width);
    const freeCell=(x,z)=>x>=0&&z>=0&&x<width&&z<height&&!!mask[z*width+x];
    for(let id=0;id<count;id++)if(mask[id]){
        const x=id%width,z=Math.floor(id/width);
        for(const [i,d] of NAVIGATION_DIRECTIONS.entries())if(freeCell(x+d.dx,z+d.dz)&&(!d.dx||!d.dz||freeCell(x+d.dx,z)&&freeCell(x,z+d.dz)))links[id]|=1<<i;
    }
    const cellAt=(x,y)=>{if(!Number.isFinite(x)||!Number.isFinite(y))return -1;const ix=Math.floor((x+offset)*resolution),iz=Math.floor((y+offset)*resolution);return ix>=0&&iz>=0&&ix<width&&iz<height?iz*width+ix:-1;};
    const pointAt=id=>({x:(id%width+.5)/resolution-offset,y:(Math.floor(id/width)+.5)/resolution-offset});
    const free=(x,y)=>{const id=cellAt(x,y);return id>=0&&!!mask[id];};
    const regionAt=(x,y)=>{const id=cellAt(x,y);return id<0?-1:regions[id];};
    const connected=(a,b)=>{const r=regionAt(a.x,a.y);return r>=0&&r===regionAt(b.x,b.y);};
    function segment(a,b){
        if(!connected(a,b))return false;
        const ox=(a.x+offset)*resolution,oz=(a.y+offset)*resolution,dx=(b.x-a.x)*resolution,dz=(b.y-a.y)*resolution;
        let x=Math.floor(ox),z=Math.floor(oz);const endX=Math.floor((b.x+offset)*resolution),endZ=Math.floor((b.y+offset)*resolution),sx=dx>=0?1:-1,sz=dz>=0?1:-1;
        const stepX=Math.abs(1/dx),stepZ=Math.abs(1/dz);let tx=dx?((sx>0?x+1:x)-ox)/dx:Infinity,tz=dz?((sz>0?z+1:z)-oz)/dz:Infinity;
        for(let n=0;n<width+height+2;n++){
            if(x===endX&&z===endZ)return true;
            let edge;
            if(Math.abs(tx-tz)<1e-10){edge=sx>0?(sz<0?4:5):(sz<0?7:6);tx+=stepX;tz+=stepZ;}
            else if(tx<tz){edge=sx>0?1:3;tx+=stepX;}else{edge=sz>0?2:0;tz+=stepZ;}
            if(!(links[z*width+x]&(1<<edge)))return false;const d=NAVIGATION_DIRECTIONS[edge];x+=d.dx;z+=d.dz;
        }return false;
    }
    function nearest(x,y,radius=3,predicate=()=>true){
        if(!Number.isFinite(x)||!Number.isFinite(y)||!(radius>=0))return null;let best=Infinity,result=null;
        const minX=Math.max(0,Math.floor((x+offset-radius)*resolution)),maxX=Math.min(width-1,Math.ceil((x+offset+radius)*resolution));
        const minZ=Math.max(0,Math.floor((y+offset-radius)*resolution)),maxZ=Math.min(height-1,Math.ceil((y+offset+radius)*resolution));
        for(let z=minZ;z<=maxZ;z++)for(let xx=minX;xx<=maxX;xx++){const id=z*width+xx;if(!mask[id])continue;const p=pointAt(id),d=(p.x-x)**2+(p.y-y)**2;
            if(d<=radius*radius+1e-10&&d<best&&predicate(p.x,p.y)){best=d;result=p;}
        }return result;
    }
    // Generation stamps reuse these buffers across every NPC/player search.
    const cost=new Float64Array(count),parent=new Int32Array(count),seen=new Uint32Array(count),closed=new Uint32Array(count),heap=[];
    const stats={searches:0,expanded:0,disconnected:0,direct:0};let generation=0;
    const push=(id,score)=>{let i=heap.length;heap.push({id,score});while(i){const p=(i-1)>>1;if(heap[p].score<=score)break;heap[i]=heap[p];i=p;}heap[i]={id,score};};
    const pop=()=>{const first=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let c=i*2+1;if(c+1<heap.length&&heap[c+1].score<heap[c].score)c++;if(last.score<=heap[c].score)break;heap[i]=heap[c];i=c;}heap[i]=last;}return first.id;};
    function path(from,to){
        stats.searches++;stats.expanded=0;
        if(!connected(from,to)){stats.disconnected++;return null;}
        if(Math.hypot(from.x-to.x,from.y-to.y)<1e-8)return [];
        if(segment(from,to)){stats.direct++;return [{...to}];}
        if(++generation>=0xffffffff){seen.fill(0);closed.fill(0);generation=1;}
        const start=cellAt(from.x,from.y),goal=cellAt(to.x,to.y),gx=goal%width,gz=Math.floor(goal/width);heap.length=0;
        const heuristic=(x,z)=>{const dx=Math.abs(x-gx),dz=Math.abs(z-gz);return Math.max(dx,dz)+(Math.SQRT2-1)*Math.min(dx,dz);};
        cost[start]=0;parent[start]=-1;seen[start]=generation;push(start,heuristic(start%width,Math.floor(start/width)));let found=false;
        while(heap.length){
            const id=pop();if(closed[id]===generation)continue;if(id===goal){found=true;break;}closed[id]=generation;stats.expanded++;
            const x=id%width,z=Math.floor(id/width);
            for(let i=0;i<8;i++)if(links[id]&(1<<i)){
                const d=NAVIGATION_DIRECTIONS[i],next=id+d.dz*width+d.dx;if(closed[next]===generation)continue;
                const g=cost[id]+(i<4?1:Math.SQRT2);
                if(seen[next]!==generation||g<cost[next]){seen[next]=generation;cost[next]=g;parent[next]=id;push(next,g+heuristic(x+d.dx,z+d.dz));}
            }
        }
        if(!found)return null;const nodes=[{...to}];for(let id=parent[goal];id>=0&&id!==start;id=parent[id])nodes.push(pointAt(id));nodes.reverse();
        const route=[];let anchor=from,i=0;while(i<nodes.length){let far=i;for(let j=nodes.length-1;j>=i;j--)if(segment(anchor,nodes[j])){far=j;break;}route.push(nodes[far]);anchor=nodes[far];i=far+1;}return route;
    }
    return {width,height,resolution,offset,mask,links,regions,stats,cellAt,pointAt,free,regionAt,connected,segment,nearest,path};
}

/** The same placed footprints used by rendering supply collision. Shop walls
 * keep their door gap; a building tile does not make its interior impassable. */
export function navigationObstacles(objects){
    const result=[];
    for(const [index,o] of objects.entries()){
        const id=o.place?.id||o.sight?.id||o.arch||'object-'+index;
        if(o.place){
            const p=o.place,x=p.x,z=p.y,w=p.w,d=p.d,door=p.localDoor,cx=x+w/2,cz=z+d/2,a=p.rotation||0;
            const rotate=([xx,zz])=>[cx+(xx-cx)*Math.cos(a)-(zz-cz)*Math.sin(a),cz+(xx-cx)*Math.sin(a)+(zz-cz)*Math.cos(a)];
            for(const [side,[xx,zz,ww,dd]] of [[x,z,w,.1],[x,z,.1,d],[x+w-.1,z,.1,d],[x,z+d-.1,door-x,.1],[door+1,z+d-.1,x+w-door-1,.1]].entries())if(ww>0&&dd>0)result.push({id:id+':wall-'+side,polygon:navRectangle(xx+ww/2,zz+dd/2,ww,dd).map(rotate)});
        }else if(o.arch||o.solid)result.push({id,polygon:o.footprint||navRectangle(o.x+o.w/2,o.y+o.d/2,o.w,o.d)});
    }return result;
}

/** Tile materials are the authority for terrain passability. Partial shoreline
 * tiles are sampled against their actual rendered polygons, not lake ellipses. */
export function buildTileNavigation(map,{obstacles=[],clearance=.3,types=TILE_TYPES}={}){
    const width=map.size,mask=new Uint8Array(width*width),blockedBy=new Uint16Array(mask.length),typeNames=Object.keys(types),surface=new Uint8Array(mask.length);
    for(let z=0;z<width;z++)for(let x=0;x<width;x++){
        const id=z*width+x,t=map.tiles[id],type=t.patches?.find(p=>navInside(.5,.5,p.polygon))?.type||t.type;
        if(!types[type]||types[type].walkable===undefined)throw new Error('Missing navigation rule for tile type '+type);
        surface[id]=typeNames.indexOf(type);mask[id]=types[type].walkable?1:0;if(!mask[id])blockedBy[id]=1;
    }
    for(const [index,{polygon}] of obstacles.entries()){
        const xs=polygon.map(p=>p[0]),zs=polygon.map(p=>p[1]);
        for(let z=Math.max(0,Math.floor((Math.min(...zs)-clearance)/map.step));z<Math.min(width,Math.ceil((Math.max(...zs)+clearance)/map.step));z++)for(let x=Math.max(0,Math.floor((Math.min(...xs)-clearance)/map.step));x<Math.min(width,Math.ceil((Math.max(...xs)+clearance)/map.step));x++){
            const wx=(x+.5)*map.step,wz=(z+.5)*map.step,id=z*width+x;
            if(navInside(wx,wz,polygon)||polygon.some((p,i)=>navDistance(wx,wz,p,polygon[(i+1)%polygon.length])<clearance)){mask[id]=0;blockedBy[id]=index+2;}
        }
    }
    const graph=createNavigationGrid({width,resolution:1/map.step,offset:.5,mask});
    graph.describe=(x,y)=>{const id=graph.cellAt(x,y);return id<0?{walkable:false,reason:'outside map'}:{cell:[id%width,Math.floor(id/width)],type:typeNames[surface[id]],walkable:!!graph.mask[id],region:graph.regions[id],blockedBy:blockedBy[id]>1?obstacles[blockedBy[id]-2].id:blockedBy[id]===1?'terrain':null};};
    return graph;
}

export function auditNavigationGrid(graph){
    const errors=[],sizes=new Map();let nodes=0,edges=0;
    for(let id=0;id<graph.mask.length;id++){
        if(!graph.mask[id]){if(graph.links[id])errors.push('Blocked cell has edges: '+id);continue;}
        nodes++;sizes.set(graph.regions[id],(sizes.get(graph.regions[id])||0)+1);
        for(let i=0;i<8;i++)if(graph.links[id]&(1<<i)){
            const d=NAVIGATION_DIRECTIONS[i],next=id+d.dz*graph.width+d.dx;edges++;
            if(!graph.mask[next]||!(graph.links[next]&(1<<d.opposite)))errors.push('Nonreciprocal edge: '+id+' -> '+next);
            if(graph.regions[id]!==graph.regions[next])errors.push('Edge crosses components: '+id+' -> '+next);
            if(i>=4&&(!graph.mask[id+d.dx]||!graph.mask[id+d.dz*graph.width]))errors.push('Diagonal clips a corner: '+id);
        }
    }
    return {ok:!errors.length,errors:errors.slice(0,32),nodes,edges:edges/2,components:sizes.size,componentSizes:[...sizes.values()].sort((a,b)=>b-a),bytes:graph.mask.byteLength+graph.links.byteLength+graph.regions.byteLength};
}
