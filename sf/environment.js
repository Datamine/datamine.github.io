import {marinElevation} from './geography.js';
import {WATER_LEVEL} from './water-tiles.js';

/** One sea surface, with shared-vertex depths rather than overlapping ribbons.
 * Only vertices near a coast need distance calculations. Deep-water cells merge
 * into row spans; the static mesh stays small and adds no rendering pass. */
export function createSeaSurface(m,shores,step=.6){
    const all=shores.flatMap(s=>s.polygon),margin=Math.max(...shores.map(s=>s.width))+step*2;
    const minX=Math.floor((Math.min(...all.map(p=>p[0]))-margin)/step)*step,minZ=Math.floor((Math.min(...all.map(p=>p[1]))-margin)/step)*step;
    const nx=Math.ceil((Math.max(...all.map(p=>p[0]))+margin-minX)/step),nz=Math.ceil((Math.max(...all.map(p=>p[1]))+margin-minZ)/step),stride=nx+1;
    const depths=new Float32Array(stride*(nz+1));depths.fill(1);
    for(const {polygon,width} of shores)for(let i=0;i<polygon.length;i++){
        const a=polygon[i],b=polygon[(i+1)%polygon.length],dx=b[0]-a[0],dz=b[1]-a[1],len=dx*dx+dz*dz;
        const x0=Math.max(0,Math.floor((Math.min(a[0],b[0])-width-minX)/step)),x1=Math.min(nx,Math.ceil((Math.max(a[0],b[0])+width-minX)/step));
        const z0=Math.max(0,Math.floor((Math.min(a[1],b[1])-width-minZ)/step)),z1=Math.min(nz,Math.ceil((Math.max(a[1],b[1])+width-minZ)/step));
        for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++){
            const wx=minX+x*step,wz=minZ+z*step,t=Math.max(0,Math.min(1,((wx-a[0])*dx+(wz-a[1])*dz)/(len||1))),depth=Math.hypot(wx-a[0]-dx*t,wz-a[1]-dz*t)/width;
            depths[z*stride+x]=Math.min(depths[z*stride+x],depth);
        }
    }
    const rows=[];let quads=0;
    for(let z=0;z<nz;z++){
        const row=[];for(let x=0;x<nx;){
            const deep=xx=>[depths[z*stride+xx],depths[z*stride+xx+1],depths[(z+1)*stride+xx],depths[(z+1)*stride+xx+1]].every(d=>d===1);
            let end=x+1;if(deep(x))while(end<nx&&deep(end))end++;
            row.push([x,end]);quads++;x=end;
        }rows.push(row);
    }
    for(let z=0;z<nz;z++)for(const [x,end] of rows[z]){
        const x0=minX+x*step,x1=minX+end*step,z0=minZ+z*step,z1=minZ+(z+1)*step;
        if(end-x>1){
            // Keep every neighboring row's edge vertex. A long triangle edge
            // over fine cells otherwise leaves visible subpixel cracks (T joins).
            const cuts=row=>[...new Set([x,end,...(row||[]).flat().filter(v=>v>x&&v<end)])].sort((a,b)=>a-b);
            const polygon=[...cuts(rows[z+1]).map(v=>[minX+v*step,WATER_LEVEL,z1]),...cuts(rows[z-1]).reverse().map(v=>[minX+v*step,WATER_LEVEL,z0])];
            const center=[(x0+x1)/2,WATER_LEVEL,(z0+z1)/2];
            for(let i=0;i<polygon.length;i++)m.tri(center,polygon[i],polygon[(i+1)%polygon.length],'#ffffff',{water:1});
        }else{
            const start=m.data.length;
            m.quad([x0,WATER_LEVEL,z0],[x0,WATER_LEVEL,z1],[x1,WATER_LEVEL,z1],[x1,WATER_LEVEL,z0],'#ffffff',{water:1});
            const a=depths[z*stride+x],b=depths[(z+1)*stride+x],c=depths[(z+1)*stride+end],d=depths[z*stride+end];
            for(const [vertex,depth] of [a,b,c,a,c,d].entries())m.data[start+vertex*11+10]=depth;
        }
    }
    return {minX,minZ,maxX:minX+nx*step,maxZ:minZ+nz*step,quads};
}

/** Fill the view beyond the static sea without a coplanar overlap or an outer
 * sailing limit. All four possible pieces meet its deep-water boundary exactly. */
export function drawOffshoreSea(m,bounds,x,z,radius){
    const x0=x-radius,x1=x+radius,z0=z-radius,z1=z+radius;
    const rect=(a,b,c,d)=>{if(c-a>1e-8&&d-b>1e-8)m.quad([a,WATER_LEVEL,b],[a,WATER_LEVEL,d],[c,WATER_LEVEL,d],[c,WATER_LEVEL,b],'#ffffff',{water:1});};
    rect(x0,z0,x1,Math.min(z1,bounds.minZ));
    rect(x0,Math.max(z0,bounds.maxZ),x1,z1);
    const top=Math.max(z0,bounds.minZ),bottom=Math.min(z1,bounds.maxZ);
    rect(x0,top,Math.min(x1,bounds.minX),bottom);
    rect(Math.max(x0,bounds.maxX),top,x1,bottom);
}

export function decorateHeadlands(m,outline,scale){
    const height=(x,z)=>marinElevation(x/scale,z/scale);
    for(let edge=0;edge<outline.length;edge++){
        const a=outline[edge],b=outline[(edge+1)%outline.length];if(Math.max(a[1],b[1])<-22*scale)continue;const length=Math.hypot(b[0]-a[0],b[1]-a[1]),steps=Math.ceil(length/.65);
        for(let i=0;i<steps;i++){
            const p=[a[0]+(b[0]-a[0])*i/steps,a[1]+(b[1]-a[1])*i/steps],q=[a[0]+(b[0]-a[0])*(i+1)/steps,a[1]+(b[1]-a[1])*(i+1)/steps],h=height(...p),hh=height(...q);
            for(let layer=0;layer<3;layer++){
                const low=layer/3,high=(layer+1)/3;
                m.quad([p[0],.02+(h-.02)*low,p[1]],[q[0],.02+(hh-.02)*low,q[1]],[q[0],.02+(hh-.02)*high,q[1]],[p[0],.02+(h-.02)*high,p[1]],['#747e72','#8a8c74','#a19e7c'][layer],'stone');
            }
        }
    }
    function ribbon(points,width,color){
        const p=points.map(([x,z])=>[x*scale,z*scale]);
        for(let i=1;i<p.length;i++){
            const a=p[i-1],b=p[i],len=Math.hypot(b[0]-a[0],b[1]-a[1]),nx=-(b[1]-a[1])/len*width,nz=(b[0]-a[0])/len*width,steps=Math.ceil(len/.3);
            for(let j=0;j<steps;j++){
                const at=(t,side)=>{const x=a[0]+(b[0]-a[0])*t+nx*side,z=a[1]+(b[1]-a[1])*t+nz*side;return [x,height(x,z)+.025,z];};
                m.quad(at(j/steps,-1),at((j+1)/steps,-1),at((j+1)/steps,1),at(j/steps,1),color,'dirt');
            }
        }
    }
    ribbon([[19,2],[20,.3],[20.5,-1.2],[19.8,-2.8],[17.8,-4.2],[15.4,-4.5],[13,-3.5],[11.4,-2],[9.1,-.8]],.14,'#b4ac90');
    ribbon([[15.4,-4.5],[14,-5],[13.5,-6.6],[12,-8.5],[9,-9],[7,-7.2]],.065,'#c2b28f');
    ribbon([[19.8,-2.8],[22,-4],[24.5,-6],[25,-8.5]],.06,'#bcb08a');
    const lightX=8.7*scale,lightZ=-.55*scale,base=height(lightX,lightZ);
    m.box(lightX-.35,base-.05,lightZ-.23,.7,.12,.46,'#aaa78f','stone');
    m.box(lightX-.26,base+.07,lightZ-.18,.52,.28,.36,'#e0dfcd','stucco');
    m.box(lightX-.29,base+.35,lightZ-.2,.58,.05,.4,'#8a8272','roof');
    m.cylinder(lightX+.13,base+.38,lightZ,.085,.3,'#e8e2c9',20);
    m.cylinder(lightX+.13,base+.68,lightZ,.105,.12,'#e9d6a3',20,.1,{emissive:.6});
    m.cylinder(lightX+.13,base+.8,lightZ,.13,.11,'#987d63',16,0);
    const batteryX=18*scale,batteryZ=1.75*scale,h=height(batteryX,batteryZ);
    m.box(batteryX-.55,h,batteryZ-.3,1.1,.14,.6,'#9f9e89','concrete');
    for(const x of [-.4,.4])m.box(batteryX+x-.09,h+.14,batteryZ-.16,.18,.18,.32,'#8b9180','concrete');
    const lake=[6.9*scale,-6.5*scale],level=1.04;
    for(let i=0;i<48;i++){const a=i*Math.PI/24,b=(i+1)*Math.PI/24;m.tri([lake[0],level,lake[1]],[lake[0]+Math.cos(a)*1.12*scale,level,lake[1]+Math.sin(a)*.55*scale],[lake[0]+Math.cos(b)*1.12*scale,level,lake[1]+Math.sin(b)*.55*scale],'#7b9d91',{water:2});}
}
