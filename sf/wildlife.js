import {Mesh,pose} from './geometry.js';

function whaleMesh(){
    const m=new Mesh();
    m.sphere(0,-.16,0,2.15,.58,.67,'#475f65',28,14);
    m.sphere(1.52,-.08,0,.85,.42,.57,'#526c71',24,12);
    m.sphere(1.6,-.32,0,.7,.16,.48,'#9ba9a5',20,8);
    m.sphere(-1.9,-.12,0,.9,.27,.32,'#475f65',20,10);
    for(const side of [-1,1]){
        m.tri([.2,-.2,side*.4],[-.7,-.13,side*1.55],[-.45,-.31,side*.45],'#71888a');
        m.tri([-2.1,.08,side*.12],[-3.15,.45,side*1.15],[-2.93,.3,0],'#607a7f');
        m.tri([-2.1,.08,side*.12],[-2.93,.3,0],[-3.15,.45,side*1.15],'#8ba1a0');
        m.sphere(2,.03,side*.44,.045,.045,.018,'#172d32',10,6);
        for(let i=0;i<5;i++)m.sphere(1.8+i*.065,.24-i*.045,side*(.2+i*.05),.027,.027,.027,'#adb6ac',8,4);
    }
    m.tri([-.7,.32,0],[-1.15,.79,0],[-1.4,.3,0],'#3e5960');
    return m;
}
let whaleBody;
export function createWhales(){
    const centers=[[-7,44],[-16,62],[-9,78]];
    function sample(time,index=0){
        const t=time*.000045+index*2.1,[x,z]=centers[index],cycle=(time*.001+index*9)%27;
        return {x:x+Math.cos(t)*3,z:z+Math.sin(t)*4,angle:Math.atan2(Math.cos(t)*4,-Math.sin(t)*3),y:-.02+Math.sin(cycle*Math.PI/13.5)*.12,blowing:cycle<4,cycle};
    }
    function draw(m,time,viewer,reduced=false,addTarget=()=>{}){
        whaleBody??=whaleMesh();
        for(let i=0;i<centers.length;i++){
            const p=sample(reduced?0:time,i);if(Math.hypot(p.x-viewer[0],p.z-viewer[1])>38)continue;
            const start=m.data.length;pose(m,p.x,p.y,p.z,p.angle,()=>{
                for(const value of whaleBody.data)m.data.push(value);
                if(p.blowing)for(let j=0;j<9;j++){
                    const y=.48+j*.14,spread=j*.035;
                    for(const side of [-1,1])m.sphere(1.1+side*spread,y,Math.sin(j*2)*spread,.025+j*.006,.06,.025+j*.006,'#c9ddd9',8,4);
                }
            });addTarget(start,{id:'whale-'+i,index:i,label:'Humpback whale',description:'A humpback surfaces in the Pacific, followed by a silver plume of spray. Windsurf into position and jump over its back.',kind:'whale'});
        }
    }
    return {count:centers.length,sample,draw};
}
