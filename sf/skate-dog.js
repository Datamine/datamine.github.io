import {pose} from './geometry.js';

/** A short, prevalidated park-side route. Greetings rearm only after the
 * visitor leaves the area, so the patrol cannot repeatedly bark at a bystander. */
export function createSkateDog(points,{onWoof=()=>{}}={}){
    if(points.length<2||points.every(p=>Math.hypot(p.x-points[0].x,p.z-points[0].z)<1e-6))throw new Error('The skateboarding dog needs a nonzero route');
    const center={x:points.reduce((v,p)=>v+p.x,0)/points.length,z:points.reduce((v,p)=>v+p.z,0)/points.length};
    const state={x:points[0].x,z:points[0].z,angle:Math.atan2(points[1].z-points[0].z,points[1].x-points[0].x),travel:0,elapsed:0,speechUntil:0,nextWoof:0,greeted:false,woofs:0,look:0};
    let target=1,direction=1;
    const sight={id:'dolores-skate-dog',kind:'skate-dog',label:'Skateboarding dog',hiddenFromDirectory:true,entry:{x:state.x-.5,y:state.z-.5},description:'Four paws, four wheels, and absolutely no municipal skateboarding permit. A very good dog.'};
    function update(dt,time,visitor,{paused=false,canGreet=true}={}){
        if(paused||dt<=0)return;
        state.elapsed+=dt;let budget=dt*.95;
        while(budget>1e-8){
            const p=points[target],dx=p.x-state.x,dz=p.z-state.z,d=Math.hypot(dx,dz),step=Math.min(d,budget);
            if(d>1e-8){state.x+=dx/d*step;state.z+=dz/d*step;state.travel+=step;budget-=step;}
            if(d<=step+1e-8){if(target===points.length-1)direction=-1;else if(target===0)direction=1;target+=direction;}else break;
        }
        const p=points[target],angle=Math.atan2(p.z-state.z,p.x-state.x),turn=Math.atan2(Math.sin(angle-state.angle),Math.cos(angle-state.angle));
        state.angle+=Math.max(-dt*5,Math.min(dt*5,turn));
        sight.entry={x:state.x-.5,y:state.z-.5};
        if(Math.hypot(visitor.x-center.x,visitor.z-center.z)>6)state.greeted=false;
        if(canGreet&&!state.greeted&&time>=state.nextWoof&&Math.hypot(visitor.x-state.x,visitor.z-state.z)<3.5){
            state.greeted=true;state.woofs++;state.speechUntil=time+2200;state.nextWoof=time+6000;onWoof();
        }
        const look=Math.atan2(visitor.z-state.z,visitor.x-state.x)-state.angle;
        state.look=time<state.speechUntil?Math.max(-.8,Math.min(.8,Math.atan2(Math.sin(look),Math.cos(look)))):0;
    }
    function draw(m,time,ground,{reduced=false}={}){
        const {x,z,angle}=state,base=ground(x,z)+.008,co=Math.cos(angle),si=Math.sin(angle),t=reduced?0:state.elapsed;
        const slope=Math.atan2(ground(x+co*.43,z+si*.43)-ground(x-co*.43,z-si*.43),.86),woof=time<state.speechUntil;
        const push=reduced?0:Math.sin(Math.PI*Math.min(1,(t%2.8)/.55)),wag=Math.sin(t*(woof?13:6))*(woof?.3:.16);
        pose(m,x,base,z,angle,()=>{
            const start=m.data.length,coat='#b98a5a',cream='#e8decb',dark='#43443b';
            // Concave deck, rounded ends, trucks, and four rolling wheels.
            m.box(-.48,.20,-.21,.96,.055,.42,'#aa5e4d','wood');for(const end of [-1,1])m.sphere(end*.48,.235,0,.14,.032,.21,'#b77458',16,8);
            m.box(-.45,.258,-.185,.9,.008,.37,'#515954');
            for(const axle of [-.36,.36]){
                m.rod([axle,.105,-.27],[axle,.105,.27],.025,'#b6beb3',10);m.box(axle-.06,.14,-.09,.12,.05,.18,'#86938e',{metal:.2});
                for(const side of [-1,1]){
                    m.rod([axle,.09,side*.22],[axle,.09,side*.30],.078,'#d9c79e',16);
                    const a=state.travel/.078;m.rod([axle,.09,side*.305],[axle+Math.cos(a)*.05,.09+Math.sin(a)*.05,side*.305],.012,'#8e8b75',6);
                }
            }
            m.sphere(-.03,.72,0,.36,.20,.18,coat,20,12);m.sphere(.12,.66,0,.22,.16,.16,cream,16,10);
            for(const front of [-1,1])for(const side of [-1,1]){
                const kick=front<0&&side>0?push:0,hip=[front*.23,.67,side*.125],knee=[front*.23-kick*.10,.48,side*(.13+kick*.12)],paw=[front*.23-kick*.26,.33-kick*.27,side*(.13+kick*.24)];
                m.rod(hip,knee,.065,coat,10);m.rod(knee,paw,.05,cream,10);m.sphere(paw[0]+.02,paw[1],paw[2],.085,.055,.065,cream,12,8);
            }
            // Terrier head, white muzzle, floppy ears and a blue bandana.
            pose(m,.32,.94,0,state.look,()=>{
                m.sphere(0,0,0,.19,.18,.17,coat,20,12);m.sphere(.09,-.015,0,.135,.13,.14,cream,16,10);
                m.sphere(.20,-.045,0,.105,.07,.105,cream,16,9);m.sphere(.285,-.035,0,.033,.03,.05,dark,12,8);
                if(woof)m.sphere(.21,-.095,0,.07,.025,.055,dark,12,7);
                for(const side of [-1,1]){
                    m.sphere(.09,.055,side*.13,.028,.032,.02,dark,12,8);m.sphere(.104,.066,side*.14,.007,.008,.007,cream,8,5);
                    const flop=Math.sin(t*4+side)*.015;m.sphere(-.075,-.03+flop,side*.17,.09,.15,.045,'#956d4c',14,9);
                }
            });
            m.rod([.16,.79,-.15],[.16,.79,.15],.035,'#648d9a',12);m.tri([.18,.78,.14],[.05,.75,.15],[.1,.56,.12],'#608a98');
            let prev=[-.32,.82,0];for(let i=1;i<=5;i++){const f=i/5,p=[-.32-f*.34,.82+f*.22,Math.sin(f*1.3)*wag];m.rod(prev,p,.045-f*.005,i>3?cream:coat,10);prev=p;}
            // Pitch the whole board and its rider onto the sampled pavement.
            const c=Math.cos(slope),s=Math.sin(slope);
            for(let i=start;i<m.data.length;i+=11){const px=m.data[i],py=m.data[i+1],nx=m.data[i+3],ny=m.data[i+4];m.data[i]=px*c-py*s;m.data[i+1]=px*s+py*c;m.data[i+3]=nx*c-ny*s;m.data[i+4]=nx*s+ny*c;}
        });
    }
    return {state,sight,update,draw};
}
