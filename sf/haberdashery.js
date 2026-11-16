import {HAT_CATALOG} from './hat-catalog.js';

export function haberdasherDialogue(npc,economy,wear){
    return {...npc,intro:'Welcome. A good hat opens doors. A truly magnificent hat makes people forget to ask why you are opening them. Everything from a one-coin paper hat to a hundred-thousand-coin crown. All purchases are yours to keep.',question:'Choose a hat. Purchases are fitted immediately; change hats later in the Character menu.',decline:'Leave',choices:HAT_CATALOG.map(h=>({label:h.name+' · '+(economy.state.ownedHats.includes(h.id)?'Wear owned hat':h.price.toLocaleString('en-US')+(h.price===1?' coin':' coins')),accept:()=>{
        const owned=economy.state.ownedHats.includes(h.id),result=owned?{ok:true}:economy.buyHat(h.id);
        if(!result.ok)return result;wear(h.id);
        return {ok:true,message:(owned?'You put on your ':'You purchase and put on your ')+h.name+'. Prestige: '+h.prestige+'. You can wear any owned hat from the Character menu.'};
    }}))};
}
