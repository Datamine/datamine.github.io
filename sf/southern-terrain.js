import {unit,rayTriangle} from './geometry.js';
import {SOUTHERN_BOUNDS,SOUTHERN_HILLS} from './southern-layout.js';

const southSmooth=v=>{v=Math.max(0,Math.min(1,v));return v*v*(3-2*v);};
const southRectDistance=(x,z,p)=>Math.hypot(Math.max(p.x-x,0,x-p.x-p.w),Math.max(p.z-z,0,z-p.z-p.d));
function southClip(poly,axis,value,less){const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],da=(less?1:-1)*(a[axis]-value),db=(less?1:-1)*(b[axis]-value);if(da<=1e-9)out.push(a);if((da<=0)!==(db<=0)){const t=da/(da-db);out.push(a.map((v,k)=>v+(b[k]-v)*t));}}return out;}

/** One height field owns the southern land mesh, plot excavations, picking,
 * and road grades. Airport and civic pads stay level within the rolling hills. */
export function createSouthernTerrain({roads=[],pads=[],pit=null,edgeHeight=()=>1.15,base=1.15}={}){
    const b=SOUTHERN_BOUNDS,s=b.step,columns=Math.round((b.east-b.west)/s)+1,rows=Math.round((b.south-b.north)/s)+1;
    let field=null,natural=null;
    function contains(x,z){return x>=b.west&&x<=b.east&&z>=b.north&&z<=b.south;}
    function naturalRelief(x,z){
        const coast=(1-southSmooth((x-66)/16))*southSmooth((x-b.west)/6)*southSmooth((b.south-z)/6);
        const hills=SOUTHERN_HILLS.reduce((sum,h)=>sum+h.h*Math.exp(-(((x-h.x)/h.rx)**2+((z-h.z)/h.rz)**2)),0);
        return base+coast*(hills+.08*Math.sin(x*.45+z*.21)*Math.sin(z*.38));
    }
    function rawHeight(x,z){
        let height=naturalRelief(x,z),nearest=null,distance=Infinity;
        for(const road of roads)for(let i=1;i<road.points.length;i++){
            const a=road.points[i-1],q=road.points[i],dx=q[0]-a[0],dz=q[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz))),cx=a[0]+dx*t,cz=a[1]+dz*t,d=Math.hypot(x-cx,z-cz);
            if(d<distance){distance=d;nearest=[cx,cz];}
        }
        if(nearest&&distance<1.4){const blend=1-southSmooth((distance-.8)/.6);height+=(naturalRelief(...nearest)-height)*blend;}
        for(const pad of pads){const d=southRectDistance(x,z,pad),blend=1-southSmooth(d/(pad.blend||1.8));height+=((pad.height??base)-height)*blend;}
        const join=southSmooth((z-b.north)/10);return edgeHeight(x)*(1-join)+height*join;
    }
    function ensure(){if(field)return;natural=Array.from({length:rows},(_,j)=>Float64Array.from({length:columns},(_,i)=>rawHeight(b.west+i*s,b.north+j*s)));field=natural.map(row=>row.slice());}
    function sample(x,z,source){
        const ix=Math.max(0,Math.min(columns-2,Math.floor((x-b.west)/s))),iz=Math.max(0,Math.min(rows-2,Math.floor((z-b.north)/s))),u=Math.max(0,Math.min(1,(x-b.west)/s-ix)),v=Math.max(0,Math.min(1,(z-b.north)/s-iz)),a=source[iz][ix],q=source[iz][ix+1],c=source[iz+1][ix+1],d=source[iz+1][ix];
        return u>=v?a+(q-a)*u+(c-q)*v:a+(c-d)*u+(d-a)*v;
    }
    function inPit(x,z){return pit&&x>pit.west&&x<pit.east&&z>pit.north&&z<pit.south;}
    function height(x,z){ensure();return inPit(x,z)?pit.floor:sample(x,z,field);}
    function naturalHeight(x,z){ensure();return sample(x,z,natural);}
    function normal(x,z){const d=.25;return unit([height(x-d,z)-height(x+d,z),2*d,height(x,z-d)-height(x,z+d)]);}
    function cutPlot({cx,cz,w,d,angle=0,height:floor,onlyLower=false}){
        ensure();const reach=Math.hypot(w,d)/2,c=Math.cos(angle),sn=Math.sin(angle);
        for(let j=Math.max(0,Math.floor((cz-reach-b.north)/s));j<=Math.min(rows-1,Math.ceil((cz+reach-b.north)/s));j++)for(let i=Math.max(0,Math.floor((cx-reach-b.west)/s));i<=Math.min(columns-1,Math.ceil((cx+reach-b.west)/s));i++){
            const dx=b.west+i*s-cx,dz=b.north+j*s-cz;if(Math.abs(dx*c+dz*sn)<=w/2&&Math.abs(-dx*sn+dz*c)<=d/2)field[j][i]=onlyLower?Math.min(field[j][i],floor):floor;
        }
    }
    function drawLand(m){
        ensure();const domains=pit?[[b.west,b.north,b.east,pit.north],[b.west,pit.south,b.east,b.south],[b.west,pit.north,pit.west,pit.south],[pit.east,pit.north,b.east,pit.south]]:null;
        const draw=tri=>{
            const cx=tri.reduce((n,p)=>n+p[0]/3,0),cz=tri.reduce((n,p)=>n+p[2]/3,0),h=height(cx,cz),n=normal(cx,cz),scrub=n[1]<.84&&h>5.5,color=scrub?'#a7a47b':h>7?'#91a16a':'#88a264',material=scrub?'dirt':'grass';
            const emit=poly=>{for(let j=1;j<poly.length-1;j++){const vertices=[poly[0],poly[j],poly[j+1]],start=m.data.length;m.tri(...vertices,color,material);for(const [v,p] of vertices.entries()){const nn=normal(p[0],p[2]);for(let k=0;k<3;k++)m.data[start+v*11+3+k]=nn[k];}}};
            if(!pit||tri.every(p=>p[0]<=pit.west)||tri.every(p=>p[0]>=pit.east)||tri.every(p=>p[2]<=pit.north)||tri.every(p=>p[2]>=pit.south)){emit(tri);return;}
            for(const [west,north,east,south] of domains){let p=southClip(tri,0,west,false);p=southClip(p,0,east,true);p=southClip(p,2,north,false);p=southClip(p,2,south,true);if(p.length>=3)emit(p);}
        };
        for(let j=0;j<rows-1;j++)for(let i=0;i<columns-1;i++){
            const x=b.west+i*s,z=b.north+j*s,a=[x,field[j][i],z],q=[x+s,field[j][i+1],z],c=[x+s,field[j+1][i+1],z+s],d=[x,field[j+1][i],z+s];draw([a,c,q]);draw([a,d,c]);
        }
        // Soil skirts meet the sea without exposing open polygon edges.
        for(const [a,q] of [[[b.west,b.north],[b.west,b.south]],[[b.west,b.south],[b.east,b.south]],[[b.east,b.south],[b.east,b.north]]]){
            const count=Math.ceil(Math.hypot(q[0]-a[0],q[1]-a[1])/s);
            for(let i=0;i<count;i++){const p=[a[0]+(q[0]-a[0])*i/count,a[1]+(q[1]-a[1])*i/count],r=[a[0]+(q[0]-a[0])*(i+1)/count,a[1]+(q[1]-a[1])*(i+1)/count];m.quad([p[0],-.7,p[1]],[r[0],-.7,r[1]],[r[0],height(...r),r[1]],[p[0],height(...p),p[1]],'#a59c7f','dirt');}
        }
    }
    function raycast(ray,maxDistance=220){
        ensure();const o=ray.origin,v=ray.dir;let near=0,far=maxDistance;
        for(const [axis,min,max] of [[0,b.west,b.east],[2,b.north,b.south]]){if(Math.abs(v[axis])<1e-10){if(o[axis]<min||o[axis]>max)return null;}else{let a=(min-o[axis])/v[axis],q=(max-o[axis])/v[axis];if(a>q)[a,q]=[q,a];near=Math.max(near,a);far=Math.min(far,q);}}
        if(near>far)return null;let best=far,hit=null;
        if(pit&&v[1]){const t=(pit.floor-o[1])/v[1],x=o[0]+v[0]*t,z=o[2]+v[2]*t;if(t>0&&t<best&&inPit(x,z)){best=t;hit={point:[x,pit.floor,z],distance:t};}}
        let ix=Math.max(0,Math.min(columns-2,Math.floor((o[0]+v[0]*(near+1e-7)-b.west)/s))),iz=Math.max(0,Math.min(rows-2,Math.floor((o[2]+v[2]*(near+1e-7)-b.north)/s))),t=near;
        const sx=v[0]>=0?1:-1,sz=v[2]>=0?1:-1,dx=Math.abs(s/v[0]),dz=Math.abs(s/v[2]);let tx=v[0]?((b.west+(ix+(sx>0?1:0))*s)-o[0])/v[0]:Infinity,tz=v[2]?((b.north+(iz+(sz>0?1:0))*s)-o[2])/v[2]:Infinity;
        while(ix>=0&&ix<columns-1&&iz>=0&&iz<rows-1&&t<=best&&t<=far){
            const x=b.west+ix*s,z=b.north+iz*s,a=[x,field[iz][ix],z],q=[x+s,field[iz][ix+1],z],c=[x+s,field[iz+1][ix+1],z+s],d=[x,field[iz+1][ix],z+s];
            for(const tri of [[a,c,q],[a,d,c]]){const distance=rayTriangle(ray,...tri);if(distance!==null&&distance<best){const point=o.map((n,k)=>n+v[k]*distance);if(!inPit(point[0],point[2])){best=distance;hit={point,distance};}}}
            if(tx<tz){t=tx;tx+=dx;ix+=sx;}else{t=tz;tz+=dz;iz+=sz;}
        }
        return hit;
    }
    function drawMinimap(ctx,project){
        const polygon=(points,color)=>{ctx.beginPath();points.map(p=>project(...p)).forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle=color;ctx.fill();};
        for(let z=b.north;z<b.south;z+=2)for(let x=b.west;x<b.east;x+=2){const h=height(x+1,z+1);polygon([[x,z],[x+2,z],[x+2,z+2],[x,z+2]],h>8?'#a8af76':h>5?'#92a35f':h>2?'#86a05b':'#92a96d');}
        ctx.strokeStyle='#667b5140';ctx.lineWidth=.7;
        for(const level of [3,5,7,9])for(let z=b.north;z<b.south;z+=2)for(let x=b.west;x<b.east;x+=2){const corners=[[x,z],[x+2,z],[x+2,z+2],[x,z+2]],points=[];for(let i=0;i<4;i++){const a=corners[i],q=corners[(i+1)%4],ha=height(...a),hq=height(...q);if((ha<level)!==(hq<level)){const t=(level-ha)/(hq-ha);points.push(project(a[0]+(q[0]-a[0])*t,a[1]+(q[1]-a[1])*t));}}if(points.length===2){ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);ctx.lineTo(points[1].x,points[1].y);ctx.stroke();}}
    }
    return {bounds:b,contains,height,naturalHeight,normal,cutPlot,drawLand,raycast,drawMinimap};
}
