import {pose} from './geometry.js';

export function createPaintedBunny(x,z){
    const state={x,z,angle:-Math.PI/2,pets:0,petAt:0,petUntil:0};
    const sight={id:'painted-bunny',kind:'bunny',label:'Bunny',hiddenFromDirectory:true,entry:{x:x-.5,y:z-.5},description:'A very soft Alamo Square resident. Its entire calendar is reserved for snacks and head pats.'};
    function pet(time,angle=state.angle){state.pets++;state.petAt=time;state.petUntil=time+3000;state.angle=angle;}
    function draw(m,time,ground,{reduced=false,cameraAngle=0}={}){
        const petted=time<state.petUntil,t=reduced?0:time*.001,settle=petted?.035*Math.sin(t*5):0,base=ground(x,z)+.015;
        pose(m,x,base,z,state.angle,()=>{
            const fur='#dbd0b9',cream='#f0e8d7',pink='#cfa5a2';
            m.sphere(-.04,.25,0,.29,.23,.20,fur,20,12);m.sphere(.20,.37-settle,0,.19,.17,.16,cream,20,12);
            m.sphere(-.31,.27,0,.105,.105,.105,cream,16,9);
            for(const side of [-1,1]){
                m.sphere(-.18,.065,side*.15,.14,.065,.105,cream,14,8);m.sphere(.20,.055,side*.11,.095,.05,.065,cream,12,8);
                const earX=.17+Math.sin(t*1.7+side)*.018+(petted?.035:0),earY=.66-settle;
                m.sphere(earX,earY,side*.085,.055,.25,.048,fur,14,10);m.sphere(earX+.042,earY+.005,side*.085,.018,.18,.028,pink,12,8);
                m.sphere(.32,.425-settle,side*.127,.032,.037,.023,'#383c36',12,8);m.sphere(.337,.438-settle,side*.139,.008,.009,.008,cream,8,5);
                m.sphere(.355,.32-settle,side*.065,.075,.055,.065,cream,12,8);
                for(let i=0;i<3;i++)m.rod([.37,.32-settle,side*.065],[.4+i*.014,.32-settle+(i-1)*.035,side*.22],.0035,'#b1ac9d',4);
            }
            m.sphere(.405+.003*Math.sin(t*9),.354-settle,0,.024,.019,.032,pink,12,8);
        });
        if(petted&&!reduced)for(let i=0;i<3;i++){
            const f=(time-state.petAt)/1500-i*.28;if(f<=0||f>=1)continue;
            const size=.10*Math.sin(Math.PI*f);
            pose(m,x+(i-1)*.16,base+.85+f*.55,z,cameraAngle-Math.PI/2,()=>{
                m.sphere(-size*.34,0,0,size*.5,size*.48,size*.16,'#d88f91',10,6);m.sphere(size*.34,0,0,size*.5,size*.48,size*.16,'#d88f91',10,6);
                m.tri([-size*.77,0,size*.08],[0,-size*.9,size*.08],[size*.77,0,size*.08],'#d88f91');m.tri([size*.77,0,-size*.08],[0,-size*.9,-size*.08],[-size*.77,0,-size*.08],'#d88f91');
            });
        }
    }
    return {state,sight,pet,draw};
}
