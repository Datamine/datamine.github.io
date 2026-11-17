import {Mesh,pose,rand} from './geometry.js';
import {CAVE_TILES,ILLUMINATI_CAVE} from './map-instances.js';

export function drawSecretStair(m,x,y,z,angle=0){pose(m,x,y,z,angle,()=>{
    m.box(-.38,.015,-.4,.76,.018,.8,'#192523','stone');for(let i=0;i<5;i++)m.box(-.32,.025-i*.055,-.33+i*.13,.64,.06,.13,['#929a81','#758172'][i%2],'stone');
    for(const xx of [-.4,.4]){m.rod([xx,.08,-.4],[xx,.65,-.4],.022,'#bca772',9);m.rod([xx,.65,-.4],[xx,.65,.4],.022,'#bca772',9);}
});}
export function drawStealthBomber(m,p,heading=0,{parked=false,bank=0,pitch=0,time=0}={}){
    pose(m,p.x,p.y,p.z,heading+Math.PI/2,()=>{
        const start=m.data.length,outline=[[0,-3.45],[-1.15,-1.72],[-6.8,2.12],[-3.8,1.45],[-2.7,2.36],[-1.45,1.72],[0,2.3],[1.45,1.72],[2.7,2.36],[3.8,1.45],[6.8,2.12],[1.15,-1.72]];
        const center=[0,.25,.1];for(let i=0;i<outline.length;i++){const a=outline[i],b=outline[(i+1)%outline.length],top=v=>[v[0],Math.abs(v[0])<1.2?.15:.035,v[1]],bottom=v=>[v[0],-.1,v[1]];
            m.tri(center,top(b),top(a),i%3===0?'#515b61':'#3d474d',{metal:.28});m.tri([0,-.13,0],bottom(a),bottom(b),'#303a40',{metal:.2});m.quad(top(a),top(b),bottom(b),bottom(a),'#222f36');
        }
        m.quad([-.52,.18,-1.62],[.52,.18,-1.62],[.32,.55,-.72],[-.32,.55,-.72],'#87aeb4','glass');
        m.quad([-.32,.55,-.72],[.32,.55,-.72],[.55,.25,-.23],[-.55,.25,-.23],'#405761','glass');m.rod([0,.22,-1.6],[0,.56,-.7],.018,'#18292e',6);
        for(const side of [-1,1]){
            m.box(side*1.05-.2,.21,-.1,.4,.07,.95,'#152830');for(let i=0;i<5;i++)m.box(side*1.05-.18,.29,-.04+i*.16,.36,.025,.035,'#687780');
            m.box(side*.85-.32,.07,1.68,.64,.1,.17,'#14242b');m.box(side*.85-.25,.08,1.85,.5,.045,.008,parked?'#51676c':'#8ab6cd',{emissive:parked?.1:.45});
            for(const [a,b] of [[[side*1.45,.11,-.7],[side*4.9,.065,1.7]],[[side*1.8,.1,.8],[side*4,.06,1.6]]])m.rod(a,b,.008,'#71808a',5);
            m.sphere(side*6.6,.065,2.05,.035,.027,.035,side<0?'#c75c53':'#84b98d',9,5,{emissive:.3});
        }
        if(parked)for(const [x,z] of [[0,-1.6],[-1.7,1],[1.7,1]]){m.rod([x,-.08,z],[x,-.62,z],.045,'#89999d',10);m.sphere(x,-.66,z,.15,.2,.2,'#263230',12,7);}
        if(pitch)for(let i=start;i<m.data.length;i+=11){const c=Math.cos(pitch),s=Math.sin(pitch),y=m.data[i+1],z=m.data[i+2],ny=m.data[i+4],nz=m.data[i+5];m.data[i+1]=y*c+z*s;m.data[i+2]=z*c-y*s;m.data[i+4]=ny*c+nz*s;m.data[i+5]=nz*c-ny*s;}
        if(bank)for(let i=start;i<m.data.length;i+=11){const c=Math.cos(bank),s=Math.sin(bank),x=m.data[i],y=m.data[i+1],nx=m.data[i+3],ny=m.data[i+4];m.data[i]=x*c-y*s;m.data[i+1]=x*s+y*c;m.data[i+3]=nx*c-ny*s;m.data[i+4]=nx*s+ny*c;}
    });
}
export function drawParachute(m,p,heading=0,time=0){pose(m,p.x,p.y,p.z,heading+Math.PI/2,()=>{
    const sway=Math.sin(time*.0018)*.08,canopy=(a,r)=>[Math.cos(a)*2.2*r,3.8+Math.sqrt(Math.max(0,1-r*r))*1.1+sway,Math.sin(a)*1.5*r];
    for(let i=0;i<16;i++)for(let ring=0;ring<3;ring++){
        const a=i*Math.PI/8,b=(i+1)*Math.PI/8,r=ring/3,R=(ring+1)/3;
        const color=i%4<2?'#e7e3c8':'#6c887d';if(ring===0)m.tri(canopy(a,0),canopy(b,R),canopy(a,R),color);else m.quad(canopy(a,r),canopy(b,r),canopy(b,R),canopy(a,R),color);
    }
    for(const sign of [-1,1])for(const end of [-1,1])m.rod([sign*.34,1.7,.1],[sign*1.65,3.85+sway,end*.98],.012,'#c3c4b1',5);
    for(const sign of [-1,1]){m.rod([sign*.18,.85,-.13],[sign*.2,1.45,-.12],.035,'#485b55',7);m.rod([sign*.2,1.45,-.12],[sign*.34,1.7,.1],.018,'#485b55',6);}
});}
/** A discarded bomber is cosmetic: it never creates a second damage blast. */
export function drawBomberCrash(m,crash,time){
    const elapsed=Math.max(0,time-crash.started),t=Math.min(1,elapsed/4000),{from,to,heading}=crash;
    if(elapsed<4000){const p={x:from.x+(to.x-from.x)*t,y:from.y+(to.y+.15-from.y)*t*t,z:from.z+(to.z-from.z)*t};drawStealthBomber(m,p,heading,{pitch:t*.75,bank:Math.sin(t*3)*.18,time});
        for(let i=0;i<3;i++){const lag=(i+1)*.045;m.sphere(p.x-Math.cos(heading)*lag*30,p.y+.15+i*.12,p.z-Math.sin(heading)*lag*30,.16+i*.12,.13+i*.09,.16+i*.12,'#7a827e',9,5);}
    }else if(elapsed<6200){const age=(elapsed-4000)/2200,flash=Math.max(0,1-age*3),r=.2+Math.sin(Math.PI*age)*1.2;
        if(flash)m.sphere(to.x,to.y+.3,to.z,r,.3+flash*.6,r,flash>.5?'#f5d497':'#c9824c',14,8,{emissive:flash*.7});
        m.sphere(to.x,to.y+.4+age*1.6,to.z,.25+age*.9,.3+age*.5,.25+age*.9,'#8a8d82',12,7);
    }
}
export function createIlluminatiCaveMesh(){
    const m=new Mesh(),base=ILLUMINATI_CAVE.floor,walls=[[-1,0],[1,0],[0,-1],[0,1]].map(([dx,dz])=>({dx,dz,mesh:new Mesh()}));
    for(const tile of CAVE_TILES){const {x,z}=tile;if(tile.type==='rock')continue;
        m.box(x,base-.18,z,1,.18,1,tile.type==='hangar'?'#626f67':'#84795c',tile.type==='hangar'?'stone':'dirt');
        for(const [dx,dz] of [[-1,0],[1,0],[0,-1],[0,1]]){const n=CAVE_TILES[(z+dz)*28+x+dx];if(n&&n.type!=='rock')continue;
            const xx=x+.5+dx*.46,zz=z+.5+dz*.46;
            const wall=walls.find(w=>w.dx===dx&&w.dz===dz).mesh;
            wall.box(xx-.4,base,zz-.4,.8,2.5+rand(x,z)*1.3,.8,['#6e7564','#7d8169','#5d695e'][(x+z)%3],'stone');
            for(let i=0;i<2;i++)wall.sphere(xx+(rand(x+i,z)-.5)*.2,base+.6+i*1.25,zz,.54,.65,.55,'#717663',10,7,'stone');
            if((x+z)%5===0){wall.box(xx-.08,base+1.6,zz-.08,.16,.2,.16,'#d6c48a',{emissive:.45});wall.cylinder(xx,base,zz,.025,1.6,'#78918b',8);}
        }
        if(tile.type==='hangar'&&x===13&&z>=6&&z<19)m.box(x+.48,base+.005,z+.18,.04,.005,.5,'#d0bc79');
    }
    // Parallel conduits lead from the stone passage into the carved hangar.
    for(const x of [12.2,15.8])m.rod([x,base+.18,20],[x,base+.18,25.5],.045,'#9c805a',10,{metal:.35});
    for(const side of [-1,1]){
        const x=13.5+side*8.1;m.box(x-.5,base,5.2,1,.65,1,'#697d78','stone');m.box(x-.4,base+.65,5.3,.8,.07,.8,'#b4ba92');
        m.box(x-.35,base+.72,5.5,.7,.3,.34,'#3d5b59');for(let i=0;i<3;i++)m.sphere(x-.23+i*.22,base+.9,5.85,.025,.025,.008,'#9bd5ba',8,4,{emissive:.4});
    }
    const c=13.5,z=3.47;for(const [a,b] of [[[c-1,base+1,z],[c,base+2.7,z]],[[c,base+2.7,z],[c+1,base+1,z]],[[c+1,base+1,z],[c-1,base+1,z]]])m.rod(a,b,.035,'#c9bd7c',10,{emissive:.22});
    m.sphere(c,base+1.65,z+.02,.35,.16,.07,'#a3c8b5',16,9,{emissive:.3});m.sphere(c,base+1.65,z+.09,.08,.12,.02,'#273b35',12,8);
    for(let i=0;i<7;i++)m.box(12.1,base+i*.18,25-i*.22,2.8,.18,.22,'#a7a68a','stone');
    m.walls=walls;return m;
}
export function drawBombEffect(m,bomb,time,ground=0){
    const elapsed=time-bomb.started,t=Math.max(0,Math.min(1,elapsed/1500)),y=bomb.from.y+(ground-bomb.from.y)*t*t;
    if(elapsed<1500){m.sphere(bomb.x,y,bomb.z,.12,.35,.12,'#354446',12,8);for(const side of [-1,1])m.box(bomb.x+side*.13,y+.16,bomb.z-.04,.03,.15,.08,'#71807d');}
    else if(elapsed<2200){const a=(elapsed-1500)/700,r=.3+a*1.8;m.sphere(bomb.x,ground+.18+a*.6,bomb.z,r,.3+a*.7,r,a<.4?'#e8c878':'#8d9684',16,9,{emissive:Math.max(.001,.5-a)});}
}
