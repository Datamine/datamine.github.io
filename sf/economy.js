export const TRADE_PRICES=Object.freeze({equity:10,secondary:20,grain:1,passenger:5});
export function createEconomy(saved={},onChange=()=>{}){
    const integer=(v,fallback)=>Number.isSafeInteger(v)&&v>=0?v:fallback;
    const state={coins:integer(saved.coins,25),equity:integer(saved.equity,0),grain:integer(saved.grain,0)};
    function trade(kind){
        const changes={equity:{coins:-10,equity:1},secondary:{coins:20,equity:-1},grain:{coins:-1,grain:1},feed:{grain:-1},passenger:{coins:5},rocket:{coins:-1},skis:{coins:-1},tax:{coins:-state.coins}}[kind];
        if(!changes)return {ok:false,message:'That trade is unavailable.'};
        if(Object.entries(changes).some(([key,delta])=>!Number.isSafeInteger(state[key]+delta)||state[key]+delta<0))return {ok:false,message:kind==='secondary'?'You do not have any startup equity to sell.':kind==='feed'?'You need grain. Visit the grain merchant beside Golden Gate Park.':'You do not have enough coins.'};
        for(const [key,delta] of Object.entries(changes))state[key]+=delta;
        onChange({...state});return {ok:true};
    }
    return {state,trade};
}

export const MERCHANTS=Object.freeze({
    tax:{name:'Tax authority',skin:'#b99b75',hair:'#342f27',shirt:'#d4b85d',intro:'The Tax Authority awaits your contribution.'},
    founder:{name:'Startup founder',skin:'#b88b68',hair:'#423c31',shirt:'#c0824e',intro:'Welcome to our startup HQ! We are building the future. Would you like to purchase startup equity for 10 coins?',question:'Purchase one share of startup equity?',choice:'Purchase · 10 coins',trade:'equity',receipt:'Welcome aboard! One share of startup equity is yours.'},
    secondary:{name:'Secondary purchaser',skin:'#9c7256',hair:'#302f2c',shirt:'#527c77',intro:'Startup equity?! Fantastic! I am VERY excited to buy yours. I will pay you 20 coins for a share!',question:'Sell one share of startup equity for 20 coins?',choice:'Sell · 20 coins',decline:"Don't Sell",trade:'secondary',receipt:'A pleasure doing business! Twenty coins, just as promised!'},
    grain:{name:'Grain merchant',skin:'#c3a17c',hair:'#77776b',shirt:'#828b57',intro:'Good day! The ducks love a little grain. One bag costs one coin. Would you like some?',question:'Buy one bag of duck grain?',choice:'Purchase · 1 coin',trade:'grain',receipt:'One bag of grain. Take it to the pond and choose Feed ducks.'},
    passenger:{name:'Traveler',skin:'#bb9776',hair:'#594839',shirt:'#7e7792',intro:'An airship ride! May I climb your rope? I will pay you 5 coins once I am aboard.',question:'Let the traveler climb aboard for 5 coins?',choice:'Accept fare · 5 coins',receipt:'Thank you! Here are your five coins. What a view!'}
});
