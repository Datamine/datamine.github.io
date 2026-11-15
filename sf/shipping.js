import {Mesh,pose} from './geometry.js';

export function drawTanker(m,variant=0){
    const hull=variant?'#405967':'#565f60',deck=variant?'#9c7157':'#a35e4b';
    const stations=[[-3.05,.06],[-2.65,.52],[-1.9,.64],[1.8,.64],[2.55,.43],[3.12,.025]];
    for(let i=1;i<stations.length;i++){
        const [a,wa]=stations[i-1],[b,wb]=stations[i];
        for(const side of [-1,1])m.quad([a,.035,side*wa*.76],[b,.035,side*wb*.76],[b,.5,side*wb],[a,.5,side*wa],hull,{metal:.12});
        m.quad([a,.505,-wa],[a,.505,wa],[b,.505,wb],[b,.505,-wb],deck,{metal:.12});
        for(const side of [-1,1])m.rod([a,.53,side*wa],[b,.53,side*wb],.025,'#c4beb0',6);
    }
    for(let x=-1.3;x<2.2;x+=.4){
        m.cylinder(x,.53,0,.18,.075,'#bac0ae',16);
        for(const side of [-1,1]){m.rod([x,.55,side*.42],[x,.72,side*.42],.012,'#cbc7b5',6);m.rod([x,.72,side*.42],[x+.3,.72,side*.42],.012,'#cbc7b5',6);}
    }
    for(const side of [-1,1])m.rod([-1.5,.63,side*.27],[2.32,.63,side*.27],.036,'#c4b9a0',8,{metal:.18});
    m.box(-2.38,.51,-.47,.82,.5,.94,'#d4d2bf','stucco');m.box(-2.28,1.01,-.43,.67,.4,.86,'#e3ddc8','stucco');
    m.box(-2.37,1.3,-.49,.86,.18,.98,'#3e5d68','glass');m.box(-2.4,1.48,-.51,.92,.065,1.02,'#e3deca');
    for(const side of [-1,1])for(let i=0;i<4;i++)m.box(-2.33+i*.2,.72,side*.478,.11,.13,.016,'#5e7d83','glass');
    m.box(-2.07,1.55,-.15,.28,.52,.3,variant?'#be8e58':'#995a43',{metal:.12});m.box(-2.09,2.07,-.17,.32,.07,.34,'#3d4949');
    m.rod([-1.55,1.48,0],[-1.55,2.13,0],.018,'#c8cbbd',8);m.rod([-1.81,1.93,0],[-1.3,1.93,0],.013,'#c8cbbd',6);
    for(const side of [-1,1]){
        m.sphere(-2.17,.64,side*.59,.32,.12,.1,'#bb794e',12,6);
        for(let x=-2.65;x<2.65;x+=.35)m.rod([x,.51,side*.57],[x,.72,side*.57],.008,'#bdc4b9',4);
        m.rod([-2.65,.72,side*.57],[2.65,.72,side*.57],.009,'#bdc4b9',4);
    }
}

/** A continuous channel loop, sampled once by distance for steady ship speeds. */
export function createBayShipping(scale=1.5){
    const control=[[59,17],[67,16],[71,9],[65,2],[55,3],[53,8]],points=[];
    for(let i=0;i<control.length;i++)for(let j=0;j<32;j++){
        const t=j/32,a=control[(i+control.length-1)%control.length],b=control[i],c=control[(i+1)%control.length],d=control[(i+2)%control.length];
        points.push([0,1].map(k=>.5*((2*b[k])+(-a[k]+c[k])*t+(2*a[k]-5*b[k]+4*c[k]-d[k])*t*t+(-a[k]+3*b[k]-3*c[k]+d[k])*t*t*t)*scale));
    }
    const lengths=[0];for(let i=1;i<=points.length;i++){const a=points[i-1],b=points[i%points.length];lengths.push(lengths[i-1]+Math.hypot(b[0]-a[0],b[1]-a[1]));}
    const length=lengths.at(-1),models=[0,1].map(variant=>{const mesh=new Mesh();drawTanker(mesh,variant);return mesh;});
    function sample(seconds,ship=0){
        const distance=((seconds*.43+ship*length*.5)%length+length)%length;let i=0;while(lengths[i+1]<distance)i++;
        const a=points[i],b=points[(i+1)%points.length],t=(distance-lengths[i])/(lengths[i+1]-lengths[i]);
        return {x:a[0]+(b[0]-a[0])*t,z:a[1]+(b[1]-a[1])*t,angle:Math.atan2(b[1]-a[1],b[0]-a[0])};
    }
    function draw(m,time,viewer,reduced=false){
        for(let ship=0;ship<2;ship++){
            const p=sample(reduced?12:time*.001,ship);if(Math.hypot(p.x-viewer[0],p.z-viewer[1])>100)continue;
            pose(m,p.x,.06,p.z,p.angle,()=>{const data=models[ship].data;for(let i=0;i<data.length;i++)m.data.push(data[i]);});
            for(const side of [-1,1])for(let j=0;j<3;j++){
                const c=Math.cos(p.angle),s=Math.sin(p.angle),at=(u,v)=>[p.x+u*c-v*s,.035,p.z+u*s+v*c];
                m.rod(at(-3-j*.7,side*(.3+j*.22)),at(-3.55-j*.7,side*(.4+j*.22)),.018,'#91b6b1',4);
            }
        }
    }
    return {sample,draw,count:2,length};
}
