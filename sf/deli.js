import {pose} from './geometry.js';

export const DELI_PRICES=Object.freeze({pickup:3,delivery:4});
export const DELIVERY_SPEED=6;
/** Coordinates here are the navigation model's logical x/y, not mesh centers.
 * A delivery is paid for only after a real route exists. Replanning is bounded
 * to once per second; every movement follows that same adjacency graph. */
export function createDeli({economy,health,origin,routeTo,canTravel,saved={},onSave=()=>{},onMessage=()=>{}}){
    const state={sandwiches:Number.isSafeInteger(saved.sandwiches)?Math.max(0,saved.sandwiches):0,pending:!!saved.pending,position:{...origin},path:[],angle:0,travel:0,arrived:false};
    let replan=1,lastGoal=null;
    const save=()=>onSave({sandwiches:state.sandwiches,pending:state.pending});
    const findRoute=target=>{
        const path=routeTo(target,state.position);if(!path)return false;
        let previous=state.position;for(const p of path){if(!canTravel(previous,p))return false;previous=p;}
        if(Math.hypot(previous.x-target.x,previous.y-target.y)>.01)return false;
        state.path=path.map(p=>({...p}));lastGoal={...target};return true;
    };
    return {state,pickup(){const result=economy.trade('sandwich-pickup');if(!result.ok)return result;state.sandwiches++;save();return {ok:true,message:'A fresh Lucinda’s sandwich, yours for 3 coins. Eat it to restore up to 18 hitpoints.'};},
        order(target){
            if(state.pending)return {ok:false,message:'Your DoorDash cooler is already on its way.'};
            state.position={...origin};if(!findRoute(target))return {ok:false,message:'The cooler needs a route to you. Order from a street, park, or other walkable ground.'};
            const result=economy.trade('sandwich-delivery');if(!result.ok){state.path=[];return result;}
            state.pending=true;state.arrived=false;replan=0;save();return {ok:true,message:'DoorDash ordered · 4 coins. A little cooler on wheels is bringing your Lucinda’s sandwich.'};
        },
        eat(){
            if(!state.sandwiches)return {ok:false,message:'You do not have a sandwich. Visit Lucinda’s Deli or order DoorDash.'};
            if(health.state.hp>=health.state.max)return {ok:false,message:'You already have full hitpoints. Save the sandwich for later.'};
            const healed=health.heal();state.sandwiches--;save();return {ok:true,message:'You eat your Lucinda’s sandwich and restore '+healed+' hitpoints.'};
        },
        update(dt,target,{deliverable=true}={}){
            if(!state.pending||!Number.isFinite(dt)||dt<=0)return;
            replan+=dt;
            if(replan>=1){replan=0;if(deliverable&&(!lastGoal||Math.hypot(target.x-lastGoal.x,target.y-lastGoal.y)>.4||!state.path.length))findRoute(target);}
            let budget=dt*DELIVERY_SPEED;
            while(budget>0&&state.path.length){const next=state.path[0],dx=next.x-state.position.x,dy=next.y-state.position.y,d=Math.hypot(dx,dy);if(d>1e-8)state.angle=Math.atan2(dy,dx);const step=Math.min(budget,d);if(d){state.position.x+=dx/d*step;state.position.y+=dy/d*step;}state.travel+=step;budget-=step;if(d<=step+1e-8)state.path.shift();}
            if(deliverable&&Math.hypot(state.position.x-target.x,state.position.y-target.y)<.8&&canTravel(state.position,target)){
                state.pending=false;state.arrived=true;state.sandwiches++;state.path=[];save();onMessage('Your DoorDash cooler arrives! One Lucinda’s sandwich is in your bag. Eat it whenever you need hitpoints.');
            }
        }
    };
}

export function drawDeliveryCooler(m,state,ground){
    const p=state.position,x=p.x+.5,z=p.y+.5;
    pose(m,x,ground(x,z)+.06,z,state.angle,()=>{
        for(const a of [-.22,.22])for(const side of [-1,1])m.sphere(a,.13,side*.25,.105,.105,.045,'#39454b',12,6);
        m.box(-.34,.19,-.23,.68,.42,.46,'#f3f0e6');m.box(-.36,.58,-.25,.72,.09,.5,'#e35a44');
        for(const side of [-1,1]){m.box(-.19,.28,side*.234,.36,.17,.012,'#da4e3c');m.box(-.1,.34,side*.245,.2,.04,.015,'#fff5de');}
        m.rod([-.23,.65,.14],[-.23,1.35,.14],.012,'#d7dfe0',8);
        m.quad([-.23,1.35,.14],[-.23,1.14,.14],[.07,1.14,.14],[.1,1.35,.14],'#e4533c');
        m.box(.342,.43,-.17,.012,.06,.11,'#bce1e0',{emissive:.3});m.box(.342,.43,.06,.012,.06,.11,'#bce1e0',{emissive:.3});
        m.box(.345,.26,-.09,.02,.045,.18,'#43545b');
    });
}
