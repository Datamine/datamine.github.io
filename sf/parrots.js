import {pose} from './geometry.js';
export const COIT_GROVE=Object.freeze({west:66,east:74,north:13,south:18.4});
export function inCoitGrove(x,z){const b=COIT_GROVE;return x>b.west&&x<b.east&&z>b.north&&z<b.south;}
export function drawParrot(m,npc,time,reduced=false){
    const bob=reduced?0:Math.sin(time*.002+npc.index)*.018;
    pose(m,npc.x,npc.base,npc.z,npc.angle,()=>{
        m.rod([-.28,.42,0],[.3,.42,0],.035,'#8c7150',10,'wood');m.rod([0,0,0],[0,.43,0],.05,'#80694b',10,'wood');
        m.sphere(0,.65+bob,0,.13,.21,.12,'#568d4b',16,8);m.sphere(.07,.86+bob,0,.115,.12,.11,'#64934f',16,8);
        m.sphere(.135,.89+bob,0,.085,.085,.095,'#b65c4d',12,7);m.sphere(.2,.84+bob,0,.05,.055,.04,'#c6b998',12,6);
        for(const side of [-1,1]){m.sphere(-.035,.68+bob,side*.1,.13,.17,.035,'#3b734b',12,7);m.sphere(.13,.9+bob,side*.087,.016,.017,.008,'#272e2c',8,4);m.rod([side*.045,.48,0],[side*.045,.4,.06],.013,'#727a60',6);}
        m.tri([-.08,.58,-.05],[-.28,.25,0],[-.08,.58,.05],'#3a7c56');
    });
}
export function parrotDialogue(npc){return {...npc,name:'Wild parrot',shirt:'#5b8b4a',skin:'#b45a49',hair:'#608c50',repeat:true,decline:'Leave',intro:['“Squawk! Exceptional views. Unconscionable seed prices.”','“I have reviewed your pitch. Needs more sunflower seeds.”','“Telegraph Hill! Telegraph Hill! We were here before your app!”'][npc.index%3],question:'What would you like to ask the parrot?',choices:[{label:'Any neighborhood advice?',receipt:'“Coit Tower up the hill, Cotogna down the hill. Shanghai Kelly’s if you have a spare coin. SQUAWK.”'},{label:'What do you think of the city?',receipt:'“Plenty of trees. Strange mammals. Excellent acoustics for unsolicited opinions.”'}]};}
