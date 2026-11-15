import {Mesh,rand,tint,unit,pose} from './geometry.js';
import {createRestaurantPatio} from './restaurants.js';
import {createHousing} from './housing.js';
import {drawFacadeWindow} from './windows.js';
import {CITY_HALL,drawCityHall} from './city-hall.js';
import {drawBrickOfficeTower} from './offices.js';
import {drawCharacter} from './characters.js';
import {SUTRO_SITE,drawSutroTower} from './sutro.js';
import {DOWNTOWN,drawFerryBuilding,drawSalesforce,drawCoitTower,drawBayBridge} from './downtown.js';
import {drawSomaPyramid} from './soma-pyramid.js';
import {TRANSAMERICA_PYRAMID,drawTransamericaPyramid} from './transamerica.js';

/** Mesh construction only; the world owns placement, navigation and GPU state. */
export function createModels({
    N,MAP_SCALE,mapTile,mapPosition,layoutPosition,terrainHeight,naturalHeight,cutHousePlot,occupy,upload,objects,signs,
    buildingModels,sightById,canPlaceScenery,isWalkable,pavingInArea,insidePolygon,parcelFits,
    COAST,MARIN,POND,PANHANDLE,lakes,getSceneMesh,rectangle
}){
    function sign(m,x,y,z,w,h,name,side='front'){
        const uv=signs.get(name);if(!uv)return;
        if(side==='front')m.quad([x-w/2,y,z],[x+w/2,y,z],[x+w/2,y+h,z],[x-w/2,y+h,z],'#ffffff',uv);
        else m.quad([x,y,z+w/2],[x,y,z-w/2],[x,y+h,z-w/2],[x,y+h,z+w/2],'#ffffff',uv);
    }
    function registerObject(m,start,info,end=m.data.length){
        const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];for(let i=start;i<end;i+=11)for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],m.data[i+k]);hi[k]=Math.max(hi[k],m.data[i+k]);}
        const o={...info,mesh:m,start:start/11,count:(end-start)/11,lo,hi};objects.push(o);if(o.place)o.place.object=o;if(o.sight)o.sight.object=o;return o;
    }
    function gable(m,x,y,z,w,d,rise,color){m.tri([x,y,z+d],[x+w,y,z+d],[x+w/2,y+rise,z+d],tint(color,10));m.tri([x+w,y,z],[x,y,z],[x+w/2,y+rise,z],color);m.quad([x,y,z],[x,y,z+d],[x+w/2,y+rise,z+d],[x+w/2,y+rise,z],color);m.quad([x+w/2,y+rise,z],[x+w/2,y+rise,z+d],[x+w,y,z+d],[x+w,y,z],tint(color,-18));}

    function furniture(m,b,base){
        const {x,y:z,w,d,id}=b;
        const residents=[];
        m.box(x+.6,base+.025,z+.5,w-1.2,.035,Math.max(.6,d-1),'#88533c');
        if(id==='writing'||id==='books'){
            for(let i=0;i<w-1;i++){m.box(x+.2+i*.85,base,z+.18,.72,1.15,.25,'#60482f');for(let row=0;row<3;row++)for(let j=0;j<5;j++)m.box(x+.24+i*.85+j*.12,base+.12+row*.32,z+.4,.08,.23+(j%2)*.04,.07,['#8e503f','#5d7449','#b69d55','#697b82','#bd8c63'][(j+row)%5]);}
        }else if(id==='home'){m.box(x+.2,base,z+.25,.7,.45,1,'#697748');m.box(x+.22,base+.45,z+.25,.65,.12,.9,'#c1b18c');m.box(x+w-.7,base,z+.2,.45,.7,.65,'#826347');}
        else{m.box(x+.2,base,z+.22,w-.45,.78,.35,'#795537');m.box(x+.15,base+.78,z+.17,w-.35,.08,.45,'#b59c6b');for(let i=0;i<3;i++)m.box(x+.4+i*.65,base+.87,z+.23,.32,.1,.22,['#a59d75','#d2bd8c','#a36f52'][i]);}
        if(id==='links'){
            const nx=x+.65,nz=z+1.92,tx=nx,tz=z+1.25;
            m.cylinder(tx,base,tz,.045,.7,'#50635b',12);m.cylinder(tx,base+.7,tz,.28,.055,'#c4a17b',24);
            m.cylinder(tx+.04,base+.755,tz+.04,.055,.085,'#f0e5cf',16);m.cylinder(tx+.04,base+.842,tz+.04,.042,.005,'#6c4e36',16);
            m.box(nx-.16,base+.43,nz-.15,.32,.065,.34,'#816447','wood');m.box(nx-.16,base+.49,nz+.15,.32,.48,.045,'#816447','wood');
            for(const dx of [-.13,.13])for(const dz of [-.12,.15])m.rod([nx+dx,base+.02,nz+dz],[nx+dx,base+.44,nz+dz],.025,'#4d5d54',8);
            const start=m.data.length;human(m,nx,nz,base+.035,-Math.PI/2,0,true,'#9e6e4b','#b8896d',{female:true,hairstyle:'curly',backpack:false,mode:'sit'});
            residents.push({start,end:m.data.length,x:nx,z:nz,base:base+.035,fixture:{cx:nx,cz:z+1.55,w:.65,d:1.3}});
            m.box(x+.3,base+.87,z+.25,.34,.28,.25,'#afb5ac',{metal:.35});m.box(x+.35,base+1.15,z+.27,.24,.065,.2,'#657d75');
        }else m.box(x+.2,base,z+d-.9,.4,.42,.45,'#785638');
        return residents;
    }
    function facadeBox(m,isX,plane,along,y,w,h,depth,color,far,material=null){
        if(isX)m.box(plane-(far?depth:0),y,along,depth,h,w,color,material);
        else m.box(along,y,plane-(far?depth:0),w,h,depth,color,material);
    }
    function sashWindow(m,isX,plane,along,y,w,h,far,bay=false,trim='#e9ddc4',seed=0){
        drawFacadeWindow(m,{isX,plane,along,y,w,h,far,bay,trim,seed});
    }
    function makeBuilding(b,enterable=false){
        const {x,y:z,w,d,color,style}=b,arch=b.arch||(style==='bank'?'beauxarts':style==='victorian'?'victorian':style==='cafe'?'cafe':style==='library'?'bookshop':style==='kiosk'?'newsstand':style==='civic'?'civic':style==='barracks'?'presidio':'shop');
        const bodyMaterial=arch==='warehouse'?'brick':arch==='office'||arch==='civic'||arch==='beauxarts'?'stone':'clapboard';
        const H=b.worldHeight||(arch==='newsstand'?1.85:1.5+b.h/55),corners=[[x,z],[x+w,z],[x+w,z+d],[x,z+d]].map(([xx,zz])=>terrainHeight(xx,zz)),base=(enterable?terrainHeight(x+w/2,z+d/2):Math.max(...corners))+.025;
        const m=enterable?new Mesh():getSceneMesh(),start=m.data.length,door=b.localDoor??(b.inside?b.inside.x:x+w*.52-Math.min(.26,w*.2)),doorWidth=b.inside?1:Math.min(.48,w*.42),trim=b.trim||'#e4d8bf';
        const foot=Math.min(...corners)-.19;m.box(x-.055,foot,z-.055,w+.11,base-foot+.03,d+.11,'#a8a38e','stone');
        const residents=enterable?furniture(m,b,base+.025):[];
        if(enterable){for(const [wx,wz,ww,dd] of [[x,z,w,.1],[x,z,.1,d],[x+w-.1,z,.1,d],[x,z+d-.1,door-x,.1],[door+1,z+d-.1,x+w-door-1,.1]])if(ww>0)m.box(wx,base,wz,ww,.31,dd,color);}
        const permanent={start:start/11,count:(m.data.length-start)/11},walls=[];
        for(let side=0;side<4;side++){
            const begin=m.data.length,isX=side>=2,far=side%2===0,plane=isX?(far?x:x+w):(far?z:z+d),span=isX?d:w,along=isX?z:x,wx=isX?(far?x:x+w-.1):x,wz=isX?z:(far?z:z+d-.1);
            if(enterable&&side===1){const gap=door-x;if(gap>0)m.box(x,base+.31,wz,gap,H-.31,.1,color,bodyMaterial);if(gap+1<w)m.box(door+1,base+.31,wz,w-gap-1,H-.31,.1,color,bodyMaterial);m.box(door,base+1.72,wz,1,Math.max(.1,H-1.72),.1,color,bodyMaterial);}
            else m.box(wx,base+(enterable?.31:0),wz,isX?.1:w,H-(enterable?.31:0),isX?d:.1,color,bodyMaterial);
            const floors=arch==='office'?Math.max(2,Math.floor(H/.7)):H>2.45?2:1,spacing=arch==='office'?.7:1.05;
            for(let floor=0;floor<floors;floor++){
                const count=Math.max(1,Math.floor((span-.12)/.68)),ww=Math.min(.39,(span-.22)/count*.65),gap=span/count;
                for(let i=0;i<count;i++){const at=along+gap*(i+.5)-ww/2;if(side===1&&at+ww>door&&at<door+doorWidth&&floor===0)continue;
                    const yy=base+.65+floor*spacing,hh=arch==='office'?.43:.57;
                    if(yy+hh>base+H-.2)continue;
                    sashWindow(m,isX,plane+(far?-.006:.006),at,yy,ww,hh,far,(arch==='victorian'||arch==='rowhouse')&&floor>0,trim,i+floor);
                }
                if(arch==='victorian'||arch==='rowhouse'||arch==='beauxarts'||arch==='civic')facadeBox(m,isX,plane,along-.025,base+.48+floor*spacing,span+.05,.045,.045,trim,far);
            }
            facadeBox(m,isX,plane,along-.04,base+H-.12,span+.08,.1,.09,trim,far);
            if(arch==='victorian'||arch==='beauxarts'||arch==='civic')for(let i=.13;i<span-.05;i+=.33)facadeBox(m,isX,plane,along+i,base+H-.26,.055,.14,.075,trim,far);
            if(arch==='beauxarts'||arch==='civic')for(let i=.12;i<span;i+=.72)facadeBox(m,isX,plane,along+i,base+.2,.085,H-.4,.075,tint(trim,-8),far);
            if(side===1){
                for(const xx of [door-.055,door+doorWidth])m.box(xx,base,z+d+.008,.055,1.73,.065,trim);
                m.box(door-.06,base+1.7,z+d+.008,doorWidth+.12,.08,.075,trim);
                if(!enterable){m.box(door,base+.03,z+d+.012,doorWidth,1.62,.035,b.doorColor||'#455e54');m.box(door+.07,base+.85,z+d+.05,Math.max(.12,doorWidth-.14),.55,.012,'#8ba9a1');m.sphere(door+doorWidth-.065,base+.74,z+d+.07,.02,.02,.02,'#cfb776',5,3);}
                for(let step=0;step<3;step++)m.box(door-.07,base-.04,z+d+.03+step*.07,doorWidth+.14,.12-step*.027,.075,'#bdb7a0');
                if(b.name)sign(m,x+w/2,base+H-.53,z+d+.105,Math.min(w-.14,2.7),.32,b.name);
            }
            if(b.name&&side===3)sign(m,x+w+.105,base+H-.53,z+d/2,Math.min(d-.14,2.7),.32,b.name,'side');
            walls.push({side,start:begin/11,count:(m.data.length-begin)/11});
        }
        const roofStart=m.data.length,roof=b.roof||(arch==='office'||arch==='warehouse'||arch==='rowhouse'||arch==='civic'||arch==='beauxarts'?'flat':arch==='victorian'?'gable':'hip'),roofColor=b.roofColor||(arch==='newsstand'?'#9e6247':arch==='presidio'?'#b56e50':arch==='office'?'#82928e':'#82796b'),rise=roof==='gable'?.65:roof==='hip'?.4:.18;
        m.box(x-.065,base+H,z-.065,w+.13,.09,d+.13,trim);
        if(roof==='flat'){
            m.box(x+.03,base+H+.09,z+.03,w-.06,.045,d-.06,roofColor,'roof');
            for(const [xx,zz,ww,dd] of [[x-.04,z-.04,w+.08,.065],[x-.04,z+d-.025,w+.08,.065],[x-.04,z,.065,d],[x+w-.025,z,.065,d]])m.box(xx,base+H+.09,zz,ww,.18,dd,trim);
            m.box(x+w*.3,base+H+.13,z+d*.3,Math.min(.32,w*.35),.11,Math.min(.4,d*.4),'#a9b8ae');m.box(x+w*.35,base+H+.24,z+d*.35,Math.min(.22,w*.25),.035,Math.min(.28,d*.28),'#729491');
        }else if(roof==='gable'){
            gable(m,x-.09,base+H+.09,z-.09,w+.18,d+.18,rise,roofColor);
            for(let i=.23;i<d;i+=.3){m.rod([x-.08,base+H+.1,z+i],[x+w/2,base+H+.09+rise,z+i],.009,tint(roofColor,-15),4);m.rod([x+w/2,base+H+.09+rise,z+i],[x+w+.08,base+H+.1,z+i],.009,tint(roofColor,-15),4);}
            m.rod([x-.09,base+H+.1,z+d+.095],[x+w/2,base+H+.1+rise,z+d+.095],.027,trim,5);m.rod([x+w/2,base+H+.1+rise,z+d+.095],[x+w+.09,base+H+.1,z+d+.095],.027,trim,5);
            if(w>1.2){m.box(x+w*.43,base+H+.22,z+d*.23,w*.2,.27,.3,color);gable(m,x+w*.42,base+H+.49,z+d*.22,w*.22,.32,.18,roofColor);}
        }else{
            const top=[x+w/2,base+H+.09+rise,z+d/2],a=[x-.08,base+H+.09,z-.08],b=[x+w+.08,base+H+.09,z-.08],c=[x+w+.08,base+H+.09,z+d+.08],e=[x-.08,base+H+.09,z+d+.08];m.tri(a,top,b,roofColor);m.tri(b,top,c,tint(roofColor,-12));m.tri(c,top,e,roofColor);m.tri(e,top,a,tint(roofColor,8));
        }
        m.box(x+w*.2,base+H+.06,z+d*.22,.14,.48,.18,'#9f8a70');m.box(x+w*.2-.025,base+H+.52,z+d*.22-.025,.19,.06,.23,'#bba88a');
        const roofRange={start:roofStart/11,count:(m.data.length-roofStart)/11};
        if((arch==='cafe'||arch==='shop'||arch==='bookshop'||arch==='newsstand')&&w>1.3){for(let i=0;i<12;i++){const xx=x+i*w/12;m.quad([xx,base+1.93,z+d+.025],[xx+w/12,base+1.93,z+d+.025],[xx+w/12,base+1.7,z+d+.42],[xx,base+1.7,z+d+.42],i%2?'#f1e3c8':arch==='cafe'?'#486e72':'#658267');m.quad([xx,base+1.7,z+d+.42],[xx+w/12,base+1.7,z+d+.42],[xx+w/12,base+1.6,z+d+.42],[xx,base+1.6,z+d+.42],i%2?'#f1e3c8':'#527868');}}
        if(b.rotation){const c=Math.cos(b.rotation),s=Math.sin(b.rotation),cx=x+w/2,cz=z+d/2;for(let i=start;i<m.data.length;i+=11){const dx=m.data[i]-cx,dz=m.data[i+2]-cz,nx=m.data[i+3],nz=m.data[i+5];m.data[i]=cx+dx*c-dz*s;m.data[i+2]=cz+dx*s+dz*c;m.data[i+3]=nx*c-nz*s;m.data[i+5]=nx*s+nz*c;if(m.data[i+9]<-1.5)m.data[i+10]+=b.rotation;}}
        const o=registerObject(m,start,{x,y:z,w,d,h:H+rise+.65,place:enterable?b:null,sight:b.sight||null,base,arch,rotation:b.rotation||0,footprint:b.footprint||null});
        for(const resident of residents){
            const angle=b.rotation||0,c=Math.cos(angle),s=Math.sin(angle),cx=x+w/2,cz=z+d/2,point=(xx,zz)=>[cx+(xx-cx)*c-(zz-cz)*s,cz+(xx-cx)*s+(zz-cz)*c],at=point(resident.x,resident.z),fixture=resident.fixture,center=point(fixture.cx,fixture.cz);
            const sight=sightById('nia'),entry=point(x+1.5,resident.z);sight.entry={x:entry[0]-.5,y:entry[1]-.5};sight.mapPoint={x:at[0],y:at[1]};
            registerObject(m,resident.start,{x:center[0]-fixture.w/2,y:center[1]-fixture.d/2,w:fixture.w,d:fixture.d,h:1.7,base:resident.base,rotation:angle,solid:true,sight,interior:b,character:{x:at[0],z:at[1],base:resident.base,height:1.7},footprint:rectangle(center[0],center[1],fixture.w,fixture.d,angle)},resident.end);
        }
        if(enterable){o.gpu=upload(m);o.permanent=permanent;o.walls=walls;o.roof=roofRange;o.extras={start:roofRange.start+roofRange.count,count:m.data.length/11-roofRange.start-roofRange.count};buildingModels.push(o);}
        return o;
    }
    function addScenery(id,x,z,w,d,h,draw,solid=false){if(solid)occupy(x,z,w,d);const start=getSceneMesh().data.length;draw(getSceneMesh(),terrainHeight(x+w/2,z+d/2));return registerObject(getSceneMesh(),start,{x,y:z,w,d,h,sight:id?sightById(id):null,base:terrainHeight(x+w/2,z+d/2),solid});}
    const landmarkAnchors=new Map([['palace',[32,12]],['chinatown',[45,22]]]);
    function mapOccupy(x,z,w=1,d=1,anchor=[x,z]){occupy(x+mapTile(anchor[0])-anchor[0],z+mapTile(anchor[1])-anchor[1],w,d);}
    function mapBuilding(b){return makeBuilding({...b,x:mapTile(b.x),y:mapTile(b.y)});}
    function mapTree(x,z,kind=false){return tree(mapTile(x),mapTile(z),kind);}
    function mapCanPlace(x,z,w=1,d=1){return canPlaceScenery(mapTile(x),mapTile(z),w,d);}
    function referenceHeight(x,z){return terrainHeight(mapPosition(x),mapPosition(z));}
    function mapScenery(id,x,z,w,d,h,draw,solid=false){
        const stretched=id==='golden'||id==='baybridge';
        if(id&&!landmarkAnchors.has(id))landmarkAnchors.set(id,[x,z]);
        const anchor=landmarkAnchors.get(id)||[x,z],dx=mapTile(anchor[0])-anchor[0],dz=mapTile(anchor[1])-anchor[1];
        return addScenery(id,stretched?mapPosition(x):x+dx,stretched?mapPosition(z):z+dz,stretched?w*MAP_SCALE:w,stretched?d*MAP_SCALE:d,h,(m,base)=>{
            const start=m.data.length;draw(m,base);
            for(let i=start;i<m.data.length;i+=11){
                m.data[i]=stretched?mapPosition(m.data[i]):m.data[i]+dx;m.data[i+2]=stretched?mapPosition(m.data[i+2]):m.data[i+2]+dz;
                if(stretched){const normal=unit([m.data[i+3]/MAP_SCALE,m.data[i+4],m.data[i+5]/MAP_SCALE]);m.data[i+3]=normal[0];m.data[i+4]=normal[1];m.data[i+5]=normal[2];}
            }
        },solid);
    }
    function palm(m,x,z,h){
        m.rod([x,h,z],[x+.08,h+1.9,z],.065,'#8e7650',7);m.sphere(x+.08,h+1.94,z,.16,.18,.16,'#71844c',7,3);
        for(let i=0;i<8;i++){const a=i*Math.PI/4,mid=[x+.08+Math.cos(a)*.4,h+2.14,z+Math.sin(a)*.4],end=[x+.08+Math.cos(a)*.8,h+1.74,z+Math.sin(a)*.8];m.rod([x+.08,h+1.96,z],mid,.036,'#6f8f4c',4);m.rod(mid,end,.026,'#668746',4);m.tri([x+.08,h+2,z],[mid[0]-Math.sin(a)*.12,mid[1],mid[2]+Math.cos(a)*.12],end,'#789b54');m.tri([x+.08,h+2,z],end,[mid[0]+Math.sin(a)*.12,mid[1],mid[2]-Math.cos(a)*.12],'#648447');}
    }
    function tree(x,z,kind=false,trunkOnly=false){
        if(!trunkOnly)occupy(x,z);const size=trunkOnly ? .18 : 1,inset=(1-size)/2;const object=addScenery(null,x+inset,z+inset,size,size,3.3,(m,h)=>{const px=x+.5,pz=z+.5,seed=rand(x,z,32);
            if(kind===2){palm(m,px,pz,h);return;}
            m.cylinder(px,h,pz,.075,1.45,'#806044',7,.05);
            if(kind===true||kind===1){for(let i=0;i<4;i++)m.cylinder(px,h+.65+i*.48,pz,.58-i*.1,.9,i%2?'#6f8958':'#607c50',8,0);}
            else{for(const [dx,dz,dy] of [[-.35,.12,1.45],[.34,-.12,1.7],[.05,.3,1.9],[-.08,-.24,2.08]]){m.rod([px,h+1,pz],[px+dx,h+dy,pz+dz],.035,'#806044',5);m.sphere(px+dx,h+dy+.2,pz+dz,.5+seed*.12,kind===3?.25:.43,.48,seed>.5?'#739053':'#69894e',8,4);}}
        },true);
        // Trees block movement, but inherit the existing ground rather than
        // painting a building foundation or flattening a square into the hill.
        object.preserveGround=true;return object;
    }
    function bench(x,z){occupy(x,z);const object=addScenery(null,x,z,1,1,.65,(m,h)=>{m.box(x+.1,h+.35,z+.2,.8,.1,.35,'#9c7850');m.box(x+.1,h+.4,z+.18,.8,.32,.08,'#a58558');for(const xx of [x+.2,x+.75])m.box(xx,h,z+.24,.07,.36,.23,'#525c4c');},true);object.preserveGround=true;return object;}
    function human(...args){return drawCharacter(...args);}
    function bicycle(m,x,z,y,angle=0,phase=0){
        const f=[Math.cos(angle),Math.sin(angle)],r=[-f[1],f[0]],at=(u,h,v)=>[x+f[0]*u+r[0]*v,y+h,z+f[1]*u+r[1]*v];
        for(const u of [-.52,.52]){for(let i=0;i<12;i++){const a=i*Math.PI/6,b=(i+1)*Math.PI/6;m.rod(at(u+Math.cos(a)*.31,.34+Math.sin(a)*.31,0),at(u+Math.cos(b)*.31,.34+Math.sin(b)*.31,0),.034,'#343d35',5);if(i%3===0)m.rod(at(u,.34,0),at(u+Math.cos(a+phase)*.29,.34+Math.sin(a+phase)*.29,0),.012,'#b0b7a3',4);}}
        const a=at(-.52,.34,0),b=at(.52,.34,0),crank=at(0,.35,0),seat=at(-.18,.87,0),bar=at(.35,.9,0);for(const [p,q] of [[a,seat],[seat,crank],[a,crank],[crank,bar],[bar,seat],[bar,b]])m.rod(p,q,.035,'#ad5139',5);m.rod(at(-.28,.9,0),at(-.04,.9,0),.05,'#403b2c');m.rod(bar,at(.4,1.02,0),.03,'#bac0a8');m.rod(at(.4,1.02,-.18),at(.4,1.02,.18),.03,'#454d3f');
        m.rod(at(0,.35,-.13),at(0,.35,.13),.026,'#8c9b91',8);
        for(const side of [-1,1]){
            const turn=phase+(side<0?Math.PI:0),u=Math.cos(turn)*.17,h=.35+Math.sin(turn)*.17,v=side*.13;
            m.rod(at(0,.35,v),at(u,h,v),.017,'#a6b1a3',6);
            m.rod(at(u-.065,h,v),at(u+.065,h,v),.023,'#3d4b48',6);
            m.rod(at(u,h,v-.045),at(u,h,v+.045),.017,'#6c7d74',6);
        }
    }
    function addPanhandleDetails(){
        const west=mapPosition(PANHANDLE.west),east=mapPosition(PANHANDLE.east),north=mapPosition(PANHANDLE.north),south=mapPosition(PANHANDLE.south);
        const m=getSceneMesh();
        // Broad crowns on small trunks leave the cycle path open below them.
        for(let x=west+.65;x<east-.35;x+=1.35)for(const z of [north+.12,south-.12]){
            if(!parcelFits(rectangle(x,z,.2,.2),{park:true}))continue;
            tree(x-.5,z-.5,rand(x,z,18)>.45?3:false,true);
        }
        for(const x of [west+1.4,east-1.1]){
            const z=south-.25,h=terrainHeight(x,z);if(!parcelFits(rectangle(x,z,.8,.3),{park:true}))continue;const seat=addScenery(null,x-.4,z-.15,.8,.3,.65,(mesh)=>{
                for(let i=0;i<3;i++)mesh.box(x-.38,h+.37,z-.12+i*.07,.76,.045,.05,'#a98b5c');
                mesh.box(x-.38,h+.43,z+.1,.76,.23,.035,'#a98b5c');
                for(const dx of [-.28,.28])mesh.box(x+dx,h,z-.06,.04,.4,.18,'#526451');
            },true);
            seat.preserveGround=true;
        }
        const x=east-.6,z=north+.18,h=terrainHeight(x,z);
        addScenery('panhandle',x-.2,z-.15,.4,.3,1.45,(mesh)=>{
            mesh.box(x-.2,h,z-.15,.4,.16,.3,'#b0a383','stone');
            mesh.box(x-.1,h+.16,z-.1,.2,.4,.2,'#c0b494','stone');
            human(mesh,x,z,h+.56,.3,0,false,'#776a46','#776a46');
        },true);
        for(let x=west+1.8;x<east-1.6;x+=2.1)for(const z of [north+.03,south-.03]){
            if(!parcelFits(rectangle(x,z,.4,.18),{park:true}))continue;
            const h=terrainHeight(x,z);m.box(x-.2,h,z-.07,.4,.06,.14,'#816c49','dirt');
            for(let i=0;i<5;i++)m.sphere(x-.16+i*.08,h+.09,z,.045,.04,.045,['#c7ab69','#a985a0','#bbc48a'][i%3],5,3);
        }
    }
    function makeSutroLandmark(){
        const site=SUTRO_SITE,cx=mapPosition(site.x),cz=mapPosition(site.y);
        // Use the geographic center directly; scaling spreads out the city,
        // while the tower retains its own model dimensions and slender profile.
        addScenery('sutro',cx-site.width/2,cz-site.width/2,site.width,site.width,site.height,(m,h)=>drawSutroTower(m,cx,h,cz),true);
    }
    function makeDowntownLandmarks(){
        const f=DOWNTOWN.ferry,fx=mapPosition(f.center[0]),fz=mapPosition(f.center[1]),base=terrainHeight(...DOWNTOWN.market[0].map(mapPosition))+.015;
        const ferry=addScenery('ferry',fx-f.width/2,fz-f.depth/2,f.width,f.depth,5.1,(m)=>drawFerryBuilding(m,fx,base,fz,sign),true);
        ferry.base=base;ferry.footprint=rectangle(fx,fz,f.width,f.depth,f.angle);ferry.pinned=true;
        const s=DOWNTOWN.salesforce,cx=mapPosition(s.center[0]),cz=mapPosition(s.center[1]);
        addScenery('salesforce',cx-s.width/2,cz-s.depth/2,s.width,s.depth,10.5,(m,h)=>drawSalesforce(m,cx,h,cz),true);
        const x=mapPosition(47),z=mapPosition(13);addScenery('coit',x-1.05,z-1.05,2.1,2.1,5.3,(m,h)=>drawCoitTower(m,x,h,z),true);
        const b=DOWNTOWN.bridge,a=b.rampStart.map(mapPosition),end=b.end.map(mapPosition);
        addScenery('baybridge',a[0]-1,end[1]-1,end[0]-a[0]+2,a[1]-end[1]+5,6.4,(m)=>drawBayBridge(m,MAP_SCALE,terrainHeight));
    }
    function makeLandmarks(){
        makeSutroLandmark();makeDowntownLandmarks();
        const addScenery=mapScenery,occupy=mapOccupy,makeBuilding=mapBuilding;
        addScenery('pyramid',48,19,TRANSAMERICA_PYRAMID.width,TRANSAMERICA_PYRAMID.depth,TRANSAMERICA_PYRAMID.height,(m,h)=>drawTransamericaPyramid(m,49,h,20),true);
        const bridge=(id,a,b,w,tower,color)=>addScenery(id,Math.min(a[0],b[0]),Math.min(a[1],b[1]),Math.abs(a[0]-b[0])+1,Math.abs(a[1]-b[1])+1,tower+3,(m)=>{
            const dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),nx=-dz/len,nz=dx/len,at=(t,side,h=2)=>[a[0]+dx*t+nx*side,h,a[1]+dz*t+nz*side];m.quad(at(0,-w/2),at(0,w/2),at(1,w/2),at(1,-w/2),'#8e9381');for(const side of [-w*.46,w*.46]){for(const t of [.25,.75]){m.rod(at(t,side,0),at(t,side,tower+2),.09,color,6);for(const h of [tower*.5+2,tower*.8+2])m.rod(at(t,-w*.55,h),at(t,w*.55,h),.06,color,5);}let last=null;for(let i=0;i<=40;i++){const t=i/40,h=2+tower*(t<.25?t*4:t>.75?(1-t)*4:.22+.78*((t-.5)/.25)**2),p=at(t,side,h);if(last)m.rod(last,p,.027,color,5);if(i%2===0)m.rod(at(t,side),p,.015,color,4);last=p;}}});
        bridge('golden',[18.8,.5],[18.8,10],1.35,4.3,'#b75c3f');
        addScenery('chinatown',45,22,4,1,3.4,(m,h)=>{for(const x of [45.15,48.7])m.box(x,h,22.25,.22,1.9,.3,'#a34c35');m.box(45,h+1.8,22.2,4,.28,.45,'#9c5839');for(let i=0;i<3;i++)gable(m,44.75+i*.12,h+2.05+i*.15,22.05+i*.03,4.5-i*.24,.75-i*.06,.15,'#486b4d');sign(m,47,h+1.8,22.72,2.2,.3,'CHINATOWN');});occupy(45,22);occupy(48,22,1,1,[45,22]);
        const barracks=(x,z)=>{occupy(x,z,2,1);makeBuilding({x,y:z,w:1.8,d:.9,h:18,color:'#c5bc9d',style:'barracks',name:''});};for(const x of [22,27])for(const z of [13,15])barracks(x,z);
        addScenery('presidio',25,14,1,1,2.9,(m,h)=>{m.cylinder(25.4,h,14.4,.04,2.8,'#c9ceb8',6);m.quad([25.42,h+2.7,14.4],[26,h+2.63,14.4],[26,h+2.3,14.4],[25.42,h+2.4,14.4],'#bd6b50');},true);
        addScenery('palace',32,12,2,2,3.2,(m,h)=>{m.cylinder(33,h,13,1.05,.18,'#b4a17c',10);for(let i=0;i<8;i++){const a=i*Math.PI/4;m.cylinder(33+Math.cos(a)*.83,h+.18,13+Math.sin(a)*.83,.1,1.55,'#d0b78c',6);m.cylinder(33+Math.cos(a)*.83,h+1.65,13+Math.sin(a)*.83,.14,.14,'#d8c197',6);}m.cylinder(33,h+1.79,13,1.02,.2,'#c7af85',10);m.sphere(33,h+2.03,13,.98,.7,.98,'#9c9c72',10,4);m.cylinder(33,h+2.68,13,.08,.15,'#c1ab7e',6);},true);
        addScenery('deyoung',26,29,2,1,3.7,(m,h)=>{m.box(26,h,29,2,.7,1,'#866544');m.box(26.85,h+.7,29.15,.55,1.9,.55,'#936b45');const bottom=[[26.82,h+2.6,29.12],[27.43,h+2.6,29.12],[27.43,h+2.6,29.73],[26.82,h+2.6,29.73]],top=bottom.map(p=>{const dx=p[0]-27.125,dz=p[2]-29.425;return [27.125+(dx-dz)*1.3,h+3.35,29.425+(dx+dz)*1.3];});for(let i=0;i<4;i++)m.quad(bottom[i],bottom[(i+1)%4],top[(i+1)%4],top[i],'#aa8253');m.quad(...top,'#b08d5c');},true);
        addScenery('academy',27,32,2,1,1.7,(m,h)=>{m.box(27,h,32,2,.8,1,'#a1af93');for(let i=0;i<6;i++)m.box(27.1+i*.31,h+.14,33.01,.23,.53,.025,'#547f7e');for(let i=0;i<3;i++){m.sphere(27.35+i*.6,h+.85,32.5,.48,.35+(i%2)*.12,.45,'#7e984c',8,4);m.sphere(27.4+i*.6,h+1.12,32.52,.08,.04,.08,'#d0dcc0',6,3);}},true);
        addScenery('conservatory',30,29,2,1,1.9,(m,h)=>{m.box(30,h,29,2,.55,.9,'#a3bdb0');gable(m,30,h+.55,29,2,.9,.4,'#c3d5bf');m.cylinder(31,h+.5,29.45,.35,.65,'#aec9b8',8);m.sphere(31,h+1.15,29.45,.35,.32,.35,'#d9e4cd',8,4);for(let i=0;i<9;i++)m.rod([30+i*.25,h,29.915],[30+i*.25,h+.55,29.915],.018,'#f2ecd2',4);m.cylinder(31,h+1.45,29.45,.03,.15,'#f4edd5',5);},true);
        addScenery('windmill',11,29,1,1,3.5,(m,h)=>{m.cylinder(11.5,h,29.5,.35,1.6,'#a18a5a',8,.22);m.cylinder(11.5,h+1.6,29.5,.35,.45,'#6b593d',4,0);for(let i=0;i<4;i++){const a=.4+i*Math.PI/2,p=[11.5+Math.cos(a)*1.25,h+1.8+Math.sin(a)*1.25,29.78];m.rod([11.5,h+1.8,29.78],p,.045,'#d5c49a',5);const q=[11.5+Math.cos(a)*.62,h+1.8+Math.sin(a)*.62,29.8];m.rod(q,p,.1,'#d8c9a5',4);}},true);

        for(const [id,x,z,name] of [['park',30,32,'Golden Gate Park'],['crissy',28,11,'Crissy Field'],['beach',9,42,null],['merced',17,57,null]])addScenery(id,x,z,1,1,1,(m,h)=>{m.box(x+.15,h,z+.3,.08,.85,.08,'#78613d');m.box(x+.8,h,z+.3,.08,.85,.08,'#78613d');if(name)sign(m,x+.5,h+.58,z+.39,1.3,.4,name);},id==='park');
        addScenery('peaks',29,43,1,1,1.5,(m,h)=>{m.sphere(29.5,h+.18,43.5,.55,.35,.45,'#a49c80',7,3);m.cylinder(29.5,h+.3,43.5,.035,1.2,'#a7ad98',6);},true);
        const painted=makeTownhomeRow(layoutPosition(44),layoutPosition(36.5),4.5,2,2,.35);painted.sight=sightById('painted');painted.sight.object=painted;
        for(const [x,z,w] of [[29.8,30.35,2.5],[30.1,28.65,1.7],[10.5,30.1,2]])for(let i=0;i<14;i++){const xx=mapPosition(x+(i+.5)*w/14),zz=mapPosition(z+.1),h=terrainHeight(xx,zz);getSceneMesh().cylinder(xx,h,zz,.02,.14,'#738347',4);getSceneMesh().sphere(xx,h+.16,zz,.075,.055,.075,['#c8936d','#d0ab61','#b88196'][i%3],6,3);}
    }
    const WATERFRONT_PIERS=[[35.5,9.5,.8,2.2,-.2],[38.6,9.2,.65,1.8,.05],[42,9.1,.65,2.2,.15],[44.6,9.8,.7,2.4,.35],[48.2,12.8,.65,2,.65],[50.4,15.3,.65,2.1,.7],[53,18.5,.7,2.4,1],[55,24.5,.55,1.8,1.3],[56,37,.8,2.3,1.4]];
    function enhanceLandmarks(){
        const m=getSceneMesh(),addScenery=mapScenery,tree=mapTree,canPlaceScenery=mapCanPlace;
        addScenery(null,52,27,1,1,7.7,(m,h)=>drawSomaPyramid(m,52.5,h,27.5),true);
        addScenery(null,46,18,1.75,1.75,5.9,(m,h)=>drawBrickOfficeTower(m,46.875,h,18.875),true);
        const hall=addScenery('cityhall',38,30,CITY_HALL.width,CITY_HALL.depth,CITY_HALL.height,(m,h)=>drawCityHall(m,38+CITY_HALL.width/2,h,30+CITY_HALL.depth/2),true);
        hall.sight.entry={x:hall.x+hall.w/2-.5,y:hall.y+hall.d+.15};
        addScenery('oracle',52,34,3,3,3.3,(m,h)=>{
            m.box(52,h,34,3,.15,3,'#a57958');m.box(52.3,h+.16,34.3,2.4,.025,2.4,'#789853');
            m.quad([53.5,h+.2,34.7],[54.3,h+.2,35.5],[53.5,h+.2,36.3],[52.7,h+.2,35.5],'#c7a776');m.quad([53.5,h+.21,35.03],[53.97,h+.21,35.5],[53.5,h+.21,35.97],[53.03,h+.21,35.5],'#76924f');
            for(let tier=0;tier<4;tier++){const hh=.3+tier*.18;m.box(52.02+tier*.06,h+hh,34.05,.16,.12,2.7,'#476c62');m.box(52.05,h+hh,34.02+tier*.06,2.7,.12,.16,'#567c6e');m.box(54.78-tier*.06,h+hh,34.05,.16,.12,2.5,'#476c62');}
            for(const [x,z] of [[52.1,34.1],[54.8,34.1],[54.8,36.6],[52.1,36.7]]){m.cylinder(x,h,z,.025,2.55,'#97a69b',6);m.box(x-.18,h+2.55,z-.06,.36,.2,.12,'#d6d7b8');}
            m.box(52,h,36.75,3,.6,.2,'#b77d5a');m.box(53.02,h+.6,36.75,.95,.42,.2,'#bd916a');
        },true);
        addScenery('dolores',36,44,1,1,.7,(m,h)=>{m.box(36.17,h,44.5,.65,.14,.35,'#b7aa87');});
        for(const [x,z] of [[35.8,43],[36.7,43],[35.8,45.3]])if(canPlaceScenery(Math.floor(x),Math.floor(z)))tree(Math.floor(x),Math.floor(z),2);
        addScenery('palace',31,11,5,4,3.3,(m,h)=>{
            const points=[[31.4,12.3],[31.7,11.65],[32.4,11.2],[33.3,11.2],[34.2,11.4],[35,12]];
            for(let i=0;i<points.length;i++){const [x,z]=points[i],base=referenceHeight(x,z);m.cylinder(x,base,z,.1,1.55,'#d6bd91',8);m.cylinder(x,base+1.5,z,.15,.14,'#dfc89e',8);if(i){const p=points[i-1];m.rod([p[0],referenceHeight(...p)+1.65,p[1]],[x,base+1.65,z],.085,'#cbb68e',6);}}
        });
        addScenery('golden',18,0,2,10,6.8,(m)=>{
            m.box(18.12,1.78,.5,1.36,.19,9.5,'#9a7963');
            for(const z of [2.875,7.625]){
                for(const x of [18.18,19.42]){m.box(x-.12,0,z-.18,.24,6.3,.36,'#b96848');m.box(x-.09,6.3,z-.14,.18,.22,.28,'#c47a54');m.box(x-.18,.08,z-.25,.36,.48,.5,'#969989');}
                for(const h of [3.1,4.25,5.4,6.1])m.box(18.12,h,z-.12,1.36,.14,.24,'#c1714d');
            }
            for(let z=.7;z<9.8;z+=.45){m.rod([18.12,1.78,z],[18.12,1.98,z+.4],.018,'#a85d42',4);m.rod([19.48,1.78,z],[19.48,1.98,z+.4],.018,'#a85d42',4);}
        });
        addScenery('deyoung',26,29,2,1,3.7,(m,h)=>{
            for(let row=0;row<5;row++)for(let i=0;i<18;i++)m.box(26.06+i*.104,h+.08+row*.115,30.013,.025,.035,.012,'#5c513c');
            for(let i=0;i<8;i++)m.rod([26.845,h+.8+i*.22,29.145],[27.41,h+.8+i*.22,29.145],.009,'#b39566',4);
            for(const x of [26.85,27.4])for(let i=0;i<5;i++)m.box(x,h+2.3,29.18+i*.1,.012,.23,.06,'#4d6e6d');
        });
        addScenery('conservatory',30,29,2,1,1.9,(m,h)=>{
            for(let i=0;i<12;i++){const a=i*Math.PI/6;for(let j=0;j<5;j++){const t=j/5*Math.PI/2,u=(j+1)/5*Math.PI/2,p=[31+Math.cos(a)*Math.cos(t)*.355,h+1.15+Math.sin(t)*.33,29.45+Math.sin(a)*Math.cos(t)*.355],q=[31+Math.cos(a)*Math.cos(u)*.355,h+1.15+Math.sin(u)*.33,29.45+Math.sin(a)*Math.cos(u)*.355];m.rod(p,q,.012,'#f2efdc',4);}}
            for(let i=0;i<12;i++){const x=30.08+i*.167;m.rod([x,h+.07,29.925],[x,h+.55,29.925],.012,'#f5f0d9',4);m.rod([x,h+.55,29.925],[x,h+.95*(1-Math.abs(x-31)*.35),29.45],.012,'#e8edd6',4);}
        });
        addScenery('windmill',11,29,1,1,3.5,(m,h)=>{for(let i=0;i<4;i++){const a=.4+i*Math.PI/2,dx=Math.cos(a),dy=Math.sin(a);for(let j=0;j<6;j++){const t=.5+j*.12;m.rod([11.5+dx*t-dy*.1,h+1.8+dy*t+dx*.1,29.81],[11.5+dx*t+dy*.1,h+1.8+dy*t-dx*.1,29.81],.018,'#eadbb6',4);}}});
        // Stow Lake's island and the Japanese Tea Garden give the park a recognizable interior.
        addScenery(null,22,31,3,2,1.5,(m)=>{const h=lakes[0].level;m.sphere(POND.x/MAP_SCALE,h-.06,POND.y/MAP_SCALE,.63,.38,.35,'#7b9656',10,4);m.cylinder(POND.x/MAP_SCALE,h+.24,POND.y/MAP_SCALE,.025,.55,'#806443',6);m.cylinder(POND.x/MAP_SCALE,h+.65,POND.y/MAP_SCALE,.28,.2,'#aa7351',6,0);});
        addScenery(null,25,31,1,1,1.6,(m,h)=>{m.box(25.12,h,31.12,.6,.15,.6,'#ad9f7a');for(const x of [25.2,25.65])for(const z of [31.2,31.65])m.cylinder(x,h+.15,z,.028,.75,'#9d573b',5);for(let i=0;i<2;i++)gable(m,25.02+i*.07,h+.85+i*.25,31.02+i*.07,.8-i*.14,.8-i*.14,.2,'#607d5a');},true);
        // Detailed piers, timber pilings, and small boats animate the bay's edge.
        for(const [x,z,w,d,angle] of WATERFRONT_PIERS){const start=m.data.length;pose(m,mapPosition(x),.18,mapPosition(z),angle,pier=>{pier.box(-w/2,0,-d,w,.12,d,'#b9aa88');for(let t=.2;t<d;t+=.38)for(const side of [-1,1])pier.cylinder(side*w*.43,-.3,-t,.035,.48,'#786c52',6);if(d>2){pier.box(-w*.4,.12,-d*.8,w*.8,.32,d*.55,'#bdbaa0');gable(pier,-w*.45,.44,-d*.82,w*.9,d*.59,.17,'#9c8d72');}});registerObject(m,start,{x:mapPosition(x)-1,y:mapPosition(z)-d,w:2,d:d+1,h:1,base:.18});}
        for(const [x,z,angle] of [[39,6.5,.4],[44,7,-.4],[54,13.5,1],[57,22,.5],[57.5,35,-.3]]){const start=m.data.length;pose(m,mapPosition(x),.15,mapPosition(z),angle,boat=>{boat.box(-.16,0,-.45,.32,.13,.9,'#e3dfc5');boat.tri([-.16,.1,-.45],[.16,.1,-.45],[0,.1,-.72],'#e3dfc5');boat.cylinder(0,.08,0,.014,.95,'#c6bc99',5);boat.tri([0,.95,0],[0,.25,0],[.36,.3,0],'#f1ead4');});registerObject(m,start,{x:mapPosition(x)-.5,y:mapPosition(z)-.8,w:1,d:1.6,h:1.2,base:.15});}
        addScenery(null,40.5,1.6,3,1.7,2,(m)=>{m.sphere(42,.06,2.5,1.6,.28,.85,'#a6ae8a',12,4);m.box(40.9,.23,2.2,2.3,.65,.55,'#c8c6ad');m.box(41.6,.88,2.25,.8,.15,.45,'#abb59d');for(let i=0;i<12;i++)m.box(41+i*.18,.5,2.76,.065,.17,.012,'#657e76');m.cylinder(41.05,.25,2.1,.12,1.1,'#b7b99d',6);});

        // Red lanterns hang above Grant Avenue, rather than blocking the walking surface.
        addScenery('chinatown',44,18,5,5,3.5,(m)=>{for(const z of [19,20.5,23]){const a=[44.4,referenceHeight(44.4,z)+2.45,z],b=[48.5,referenceHeight(48.5,z)+2.45,z];m.rod(a,b,.008,'#71674b',4);for(let i=1;i<6;i++){const x=a[0]+(b[0]-a[0])*i/6,h=a[1]+(b[1]-a[1])*i/6-.12;m.sphere(x,h,z,.08,.11,.08,'#bc6650',8,4);m.cylinder(x,h-.14,z,.015,.04,'#d5b474',5);}}});
    }
    function detailedGround(m){
        for(const [x,z,r] of [[5.8,25,.35],[6.7,22,.28],[8,19,.3],[7.2,24.1,.2]])m.sphere(mapPosition(x),.1,mapPosition(z),r,.17,r*.7,'#879387',16,8);

    }
    const {makeTownhomeRow,makeCurbShop,drawHillsideLifts,housingDetails}=createHousing({
        MAP_SCALE,terrainHeight,naturalHeight,cutHousePlot,getSceneMesh,registerObject,rectangle,sashWindow
    });
    return {makeBuilding,makeRestaurantPatio:site=>createRestaurantPatio(getSceneMesh(),site,registerObject),addScenery,tree,bench,human,bicycle,makeLandmarks,enhanceLandmarks,addPanhandleDetails,detailedGround,mapTree,mapCanPlace,makeTownhomeRow,makeCurbShop,drawHillsideLifts,housingDetails,WATERFRONT_PIERS};
}
