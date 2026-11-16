import {drawCharacter,sampleCharacterPose} from './characters.js';
import {SF_FITNESS} from './southern-layout.js';
import {drawBenchPress} from './adventure-sites.js';

export const GYM_EXERCISES=Object.freeze([
    {id:'bench',label:'Bench press',action:'bench'},
    {id:'curls',label:'Dumbbell curls',action:'curl'},
    {id:'squats',label:'Barbell squats',action:'squat'},
    {id:'press',label:'Overhead press',action:'press'}
].map(Object.freeze));
export function gymExercise(id){return GYM_EXERCISES.find(e=>e.id===id)||GYM_EXERCISES[0];}
export function gymExercisePosition(id){const g=SF_FITNESS;return id==='bench'?{...g.bench}:{x:g.x,z:g.z+1};}

/** Weights follow the same animated hand joints as the character mesh. Every
 * exercise uses the existing strength XP clock, so the twenty-minute curve
 * does not change when the player changes equipment. */
export function drawGymExercise(m,id,time,appearance,{reduced=false}={}){
    const exercise=gymExercise(id);
    if(exercise.id==='bench'){drawBenchPress(m,time,appearance,{reduced});return;}
    const p=gymExercisePosition(exercise.id),base=SF_FITNESS.base+.07,beat=reduced?0:time*.0026;
    drawCharacter(m,p.x,p.z,base,Math.PI/2,0,false,appearance.skin,appearance.shirt,{...appearance,mode:'idle',action:exercise.action,time:beat,backpack:false});
    const pose=sampleCharacterPose('idle',0,{action:exercise.action,time:beat}),hand=id=>({x:p.x+pose.joints[id*3],y:base+pose.joints[id*3+1],z:p.z+pose.joints[id*3+2]});
    const left=hand(6),right=hand(9);
    if(exercise.id==='squats'){
        const x=(left.x+right.x)/2,y=(left.y+right.y)/2,z=(left.z+right.z)/2;
        m.rod([x-.76,y,z],[x+.76,y,z],.022,'#bac4c9',10);
        for(const side of [-1,1])m.sphere(x+side*.62,y,z,.045,.16,.16,'#35434e',18,10);
    }else for(const h of [left,right]){
        m.rod([h.x-.16,h.y,h.z],[h.x+.16,h.y,h.z],.022,'#bcc7cc',10);
        for(const side of [-1,1])m.sphere(h.x+side*.12,h.y,h.z,.035,.095,.095,'#35434e',16,8);
    }
}
