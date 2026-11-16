export const TRADE_PRICES=Object.freeze({equity:10,secondary:20,grain:1,passenger:5,fish:5});
export function createEconomy(saved={},onChange=()=>{}){
    const integer=(v,fallback)=>Number.isSafeInteger(v)&&v>=0?v:fallback;
    const state={coins:integer(saved.coins,25),equity:integer(saved.equity,0),grain:integer(saved.grain,0),fuelCans:integer(saved.fuelCans,0),fish:Math.min(1,integer(saved.fish,0))};
    function trade(kind){
        if(kind==='catch-fish'&&state.fish>=1)return {ok:false,message:'You can only carry one live fish. Sell yours to the chef at Cotogna before catching another.'};
        if(kind==='fish-sale'&&!state.fish)return {ok:false,message:'You do not have a live fish. Try the fishing spot at Fisherman’s Wharf, then bring your catch to Cotogna.'};
        const changes={'catch-fish':{fish:1},'fish-sale':{coins:TRADE_PRICES.fish,fish:-1},'ai-lab-wage':{coins:1},'sandwich-pickup':{coins:-3},'sandwich-delivery':{coins:-4},beer:{coins:-1},'motorcycle-rental':{coins:-5},coffee:{coins:-1},'busker-tip':{coins:-1},equity:{coins:-10,equity:1},secondary:{coins:20,equity:-1},grain:{coins:-1,grain:1},feed:{grain:-1},passenger:{coins:5},rocket:{coins:-1},skis:{coins:-1},tax:{coins:-state.coins},extortion:{coins:-state.coins},capital:{coins:1000},'monkey-quest':{coins:25},'fuel-can':{coins:-state.coins,fuelCans:1},'free-fuel-can':{fuelCans:1},'use-fuel-can':{fuelCans:-1}}[kind];
        if(!changes)return {ok:false,message:'That trade is unavailable.'};
        if(Object.entries(changes).some(([key,delta])=>!Number.isSafeInteger(state[key]+delta)||state[key]+delta<0))return {ok:false,message:kind==='secondary'?'You do not have any startup equity to sell.':kind==='feed'?'You need grain. Visit the grain merchant beside Golden Gate Park.':kind==='use-fuel-can'?'You need a fuel can. Pick one up at a gas station.':'You do not have enough coins.'};
        for(const [key,delta] of Object.entries(changes))state[key]+=delta;
        onChange({...state});return {ok:true};
    }
    return {state,trade};
}

export const MERCHANTS=Object.freeze({
    'fuel-attendant':{name:'Fuel attendant',skin:'#ba9674',hair:'#43433a',shirt:'#709d8b',intro:'Fuel, portable cans, and an unusually literal interpretation of market pricing.'},
    'motorcycle-clerk':{name:'Motorcycle rental clerk',skin:'#ac815e',hair:'#3f3832',shirt:'#507e82',intro:'A conveniently parked motorcycle, with all the necessary paperwork.'},
    recruiter:{name:'AI Lab recruiter',skin:'#b99276',hair:'#393e42',shirt:'#71939c',intro:'Our technical interview is unusually arithmetic.'},
    chef:{name:'Cotogna chef',skin:'#b38c6d',hair:'#40352f',shirt:'#e3e2d5',intro:'Fresh fish! Bring me a live one from the fishing spot at Fisherman’s Wharf and I will pay you 5 coins. One fish at a time, please; this is a kitchen, not an aquarium.',question:'Sell your live fish for 5 coins?',choice:'Sell live fish · 5 coins',decline:'Keep fishing',trade:'fish-sale',receipt:'The chef takes your live fish and hands you 5 coins. “Beautiful catch. Bring me another whenever you like!”',repeat:true},
    lift:{name:'Ski lift attendant',skin:'#c69a7a',hair:'#514239',shirt:'#b64c58',intro:'Welcome to the summit. Keep your skis on the snow and your existential crises inside the gondola. The rental chalet is beside the station.',question:'Ask about the mountain?',choice:'Any advice?',decline:'Leave',receipt:'The groomed trail has four ramps. Click to steer, press Space to flip while airborne, and enjoy the view. The gondola runs both ways.'},
    capital:{name:'Sand Hill Road Capital Partners',skin:'#c29a76',hair:'#51453c',shirt:'#6f859d',intro:'We invest in strong founders. Literally. Reach strength level 10 and we will fund you with 1,000 coins.'},
    crew:{name:'SpaceX attendant',skin:'#ba9678',hair:'#3c4145',shirt:'#e4e8ec',intro:'Welcome aboard. Our reusable rocket flies between San Francisco and Tahoe for one coin. I have checked the landing legs twice.'},
    tax:{name:'Tax authority',skin:'#b99b75',hair:'#342f27',shirt:'#d4b85d',intro:'The Tax Authority awaits your contribution.'},
    founder:{name:'Startup founder',skin:'#b88b68',hair:'#423c31',shirt:'#c0824e',intro:'Welcome to our startup HQ! We are building the future. Would you like to purchase startup equity for 10 coins?',question:'Purchase one share of startup equity?',choice:'Purchase · 10 coins',trade:'equity',receipt:'Welcome aboard! One share of startup equity is yours.'},
    secondary:{name:'Secondary purchaser',skin:'#9c7256',hair:'#302f2c',shirt:'#527c77',intro:'Startup equity?! Fantastic! I am VERY excited to buy yours. I will pay you 20 coins for a share!',question:'Sell one share of startup equity for 20 coins?',choice:'Sell · 20 coins',decline:"Don't Sell",trade:'secondary',receipt:'A pleasure doing business! Twenty coins, just as promised!'},
    grain:{name:'Grain merchant',skin:'#c3a17c',hair:'#77776b',shirt:'#828b57',intro:'Good day! The ducks love a little grain. One bag costs one coin. Would you like some?',question:'Buy one bag of duck grain?',choice:'Purchase · 1 coin',trade:'grain',receipt:'One bag of grain. Take it to the pond and choose Feed ducks.'},
    passenger:{name:'Traveler',skin:'#bb9776',hair:'#594839',shirt:'#7e7792',intro:'An airship ride! May I climb your rope? I will pay you 5 coins once I am aboard.',question:'Let the traveler climb aboard for 5 coins?',choice:'Accept fare · 5 coins',receipt:'Thank you! Here are your five coins. What a view!'}
});
