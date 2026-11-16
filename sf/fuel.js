/** Station purchases never require the car. A can contains one full tank and
 * follows that station's normal pricing, including an empty purse at extortionate pumps. */
export function createFuelDialogue(site,car,economy,onChange=()=>{}){
    const near=()=>Math.abs(car.state.distance-site.distance)<=6;
    const price=site.paid?'ALL '+economy.state.coins+' coins':'Free';
    const choices=[];
    if(near())choices.push({label:'Refuel · '+price,accept:()=>{
        if(!near())return {ok:false,message:'The Ferrari is too far from this pump. Pick up a fuel can and carry it back instead.'};
        const result=site.paid?economy.trade('extortion'):{ok:true};
        if(result.ok)car.refuel();onChange();return {...result,message:result.ok?'Your tank is full. Safe travels!':result.message};
    }});
    choices.push({label:'Fuel can · '+price,accept:()=>{
        const result=economy.trade(site.paid?'fuel-can':'free-fuel-can');onChange();
        return {...result,message:result.ok?'One full fuel can. Return to your Ferrari and choose Use fuel can to fill its tank.':result.message};
    }});
    return {name:site.label,shirt:site.paid?'#a06865':'#709d8b',intro:site.paid?'Fuel costs every coin you have. Car stranded? You can carry a full fuel can back to it. Naturally, the can has the same extortionate price.':'Complimentary fuel, including portable cans. Take one along if your Ferrari is stranded!',question:'Fill the Ferrari here, or take a fuel can with you?',choices,decline:'Leave'};
}

export function refuelFerrariFromCan(car,economy){
    if(!car.state.owned)return {ok:false,message:'Borrow the Ferrari before using a fuel can.'};
    if(car.state.fuel>=1-1e-9)return {ok:false,message:'The Ferrari already has a full tank. You keep your fuel can.'};
    const result=economy.trade('use-fuel-can');if(!result.ok)return result;
    car.refuel();return {ok:true,message:'You pour the fuel can into the Ferrari. A full tank, ready to go!'};
}
