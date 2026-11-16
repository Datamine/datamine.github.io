import {pose} from './geometry.js';

/** Local +X is forward, matching the adult character's heading. */
export function drawBabyStroller(m,parent,time,ground){
    const {x,z,angle}=parent,co=Math.cos(angle),si=Math.sin(angle),base=ground(x+.7*co,z+.7*si)+.025;
    const fabric=parent.strollerColor||'#668d91',blanket=parent.blanketColor||'#d8aaa6',skin=parent.babySkin||'#ba9273';
    pose(m,x,base,z,angle,()=>{
        for(const u of [.38,.96])for(const side of [-1,1]){
            const v=side*.26;m.sphere(u,.12,v,.12,.12,.035,'#3e484a',12,6);
            m.sphere(u,.12,v+side*.037,.045,.045,.008,'#b9c7c4',10,5);
            for(let spoke=0;spoke<5;spoke++){const a=spoke*Math.PI*.4-parent.phase*.8;m.rod([u,.12,v+side*.04],[u+Math.cos(a)*.09,.12+Math.sin(a)*.09,v+side*.04],.006,'#aab9b7',4);}
        }
        for(const side of [-1,1]){
            const v=side*.23;
            m.rod([.38,.15,v],[.87,.59,v],.022,'#b4c2bf',8,{metal:.25});m.rod([.96,.15,v],[.46,.61,v],.022,'#b4c2bf',8,{metal:.25});
            m.rod([.62,.47,v],[.34,.99,v],.023,'#b4c2bf',8,{metal:.25});
        }
        m.rod([.34,.99,-.23],[.34,.99,.23],.027,'#384e52',10);
        m.box(.44,.42,-.225,.53,.11,.45,fabric);m.box(.45,.53,-.21,.5,.025,.42,'#e3ddd1');
        for(const side of [-1,1])m.box(.44,.53,side<0?-.23:.20,.53,.1,.03,fabric);
        m.box(.46,.29,-.17,.46,.035,.34,'#667b78');
        // Curved fabric hood, open toward the baby and the street ahead.
        for(let i=0;i<12;i++){
            const at=(a,v)=>[.43+.29*(1-Math.cos(a)),.59+.29*Math.sin(a),v],a=i*Math.PI/24,b=(i+1)*Math.PI/24;
            m.quad(at(a,-.235),at(a,.235),at(b,.235),at(b,-.235),fabric);
            if(i%3===0)m.rod(at(b,-.238),at(b,.238),.009,'#c4d2cd',6);
            for(const side of [-1,1])m.tri([.43,.59,side*.235],at(a,side*.235),at(b,side*.235),fabric);
        }
        m.sphere(.81,.58,0,.15,.055,.15,blanket,14,7);
        m.sphere(.65,.66,0,.105,.1,.095,skin,16,8);
        for(const side of [-1,1]){
            m.sphere(.735,.687,side*.039,.009,.012,.012,'#3b3735',8,4);
            m.sphere(.78,.61+Math.sin(time*.002+side)*.012,side*.15,.045,.03,.03,skin,10,5);
        }
        m.sphere(.751,.65,0,.018,.018,.021,'#d7bd86',10,5);
    });
    return {x:x+.7*co,z:z+.7*si,base};
}

export function drawWalkingDog(m,dog,time,ground,owner=null){
    const base=ground(dog.x,dog.z)+.025,phase=dog.moving?dog.phase:0,fur=dog.color||'#a8865b';
    pose(m,dog.x,base,dog.z,dog.angle,()=>{
        m.sphere(0,.38,0,.34,.17,.14,fur,16,8);m.sphere(.28,.5,0,.15,.16,.14,fur,14,8);
        m.sphere(.42,.45,0,.13,.07,.085,'#d6c2a0',12,6);m.sphere(.52,.47,0,.025,.026,.035,'#303530',8,4);
        for(const s of [-1,1]){
            m.sphere(.22,.51,s*.13,.07,.14,.04,dog.dark||'#6b503b',12,6);
            m.sphere(.34,.55,s*.113,.018,.019,.012,'#292f2c',8,4);
            for(const front of [-1,1]){const swing=Math.sin(phase+(s===front?0:Math.PI))*.085,x=front*.23;
                m.rod([x,.37,s*.1],[x+swing,.09,s*.1],.045,fur,8);m.sphere(x+swing,.07,s*.1,.075,.05,.055,fur,10,5);
            }
        }
        m.rod([-.28,.42,0],[-.48,.58,Math.sin(time*.005)*.09],.035,fur,8);
        m.rod([.21,.36,-.13],[.24,.6,-.09],.02,'#9d515b',8);
    });
    if(owner){const hand=[owner.x-Math.sin(owner.angle)*.3+Math.cos(owner.angle)*.12,owner.base+.86,owner.z+Math.cos(owner.angle)*.3+Math.sin(owner.angle)*.12],collar=[dog.x,base+.47,dog.z],mid=hand.map((v,i)=>(v+collar[i])*.5-(i===1?.18:0));m.rod(hand,mid,.008,'#8f5457',4);m.rod(mid,collar,.008,'#8f5457',4);}
}
