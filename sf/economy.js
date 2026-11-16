import {hatById} from './hat-catalog.js';
export const TRADE_PRICES=Object.freeze({equity:10,secondary:20,grain:1,passenger:5,fish:5,sand:20,saltLetter:50,iphone:100,robotaxi:100,salesSoftware:10,salesSoftwareResale:20});
export function createEconomy(saved={},onChange=()=>{}){
    const integer=(v,fallback)=>Number.isSafeInteger(v)&&v>=0?v:fallback;
    const state={coins:integer(saved.coins,25),equity:integer(saved.equity,0),grain:integer(saved.grain,0),fuelCans:integer(saved.fuelCans,0),fish:Math.min(1,integer(saved.fish,0)),sand:integer(saved.sand,0),saltLetters:Math.min(1,integer(saved.saltLetters,0)),saltLettersDelivered:integer(saved.saltLettersDelivered,0),ownedHats:Array.isArray(saved.ownedHats)?[...new Set(saved.ownedHats.filter(id=>hatById(id)))]:[],iphoneOwned:saved.iphoneOwned===true,iphoneEquipped:saved.iphoneOwned===true&&saved.iphoneEquipped===true,robotaxiOwned:saved.robotaxiOwned===true,softwareCopies:integer(saved.softwareCopies,0),incomeQuarters:Number.isInteger(saved.incomeQuarters)&&saved.incomeQuarters>=0&&saved.incomeQuarters<4?saved.incomeQuarters:0};
    function income(amount){
        if(!state.iphoneEquipped)return {earned:amount,bonus:0,remainder:state.incomeQuarters};
        const quarters=amount%4+state.incomeQuarters,bonus=Math.floor(amount/4)+Math.floor(quarters/4);
        return {earned:amount+bonus,bonus,remainder:quarters%4};
    }
    function trade(kind){
        if(kind==='sales-software-sale'&&!state.softwareCopies)return {ok:false,message:'You have no sales software to sell. Buy a copy from the redheaded vendor for 10 coins.'};
        if(kind==='salt-letter-collect'&&state.saltLetters)return {ok:false,message:'You already carry a sealed conservation letter. Deliver it to the City Hall clerk before taking another.'};
        if(kind==='salt-letter-deliver'&&!state.saltLetters)return {ok:false,message:'You have no conservation letter to deliver. Speak to the salt conservationist southeast of the consciousness research institutes.'};
        if(kind==='sand-sale'&&!state.sand)return {ok:false,message:'You do not have any sand to sell. Collect a sack at the Ocean Beach sand pile and bring it to the GPU Factory.'};
        if(kind==='catch-fish'&&state.fish>=1)return {ok:false,message:'You can only carry one live fish. Sell yours to the chef at Cotogna before catching another.'};
        if(kind==='fish-sale'&&!state.fish)return {ok:false,message:'You do not have a live fish. Try the fishing spot at Fisherman’s Wharf, then bring your catch to Cotogna.'};
        const changes={'sales-software-buy':{coins:-10,softwareCopies:1},'sales-software-sale':{coins:20,softwareCopies:-1},'salt-letter-collect':{saltLetters:1},'salt-letter-deliver':{saltLetters:-1,saltLettersDelivered:1,coins:TRADE_PRICES.saltLetter},'collect-sand':{sand:1},'sand-sale':{coins:TRADE_PRICES.sand,sand:-1},'catch-fish':{fish:1},'fish-sale':{coins:TRADE_PRICES.fish,fish:-1},'ai-lab-wage':{coins:1},'sandwich-pickup':{coins:-3},'sandwich-delivery':{coins:-4},beer:{coins:-1},'motorcycle-rental':{coins:-5},coffee:{coins:-1},'busker-tip':{coins:-1},equity:{coins:-10,equity:1},secondary:{coins:20,equity:-1},grain:{coins:-1,grain:1},feed:{grain:-1},passenger:{coins:5},rocket:{coins:-1},skis:{coins:-1},tax:{coins:-state.coins},extortion:{coins:-state.coins},capital:{coins:1000},'monkey-quest':{coins:25},'fuel-can':{coins:-state.coins,fuelCans:1},'free-fuel-can':{fuelCans:1},'use-fuel-can':{fuelCans:-1}}[kind];
        if(!changes)return {ok:false,message:'That trade is unavailable.'};
        const award=changes.coins>0?income(changes.coins):null;if(award)changes.coins=award.earned;
        if(Object.entries(changes).some(([key,delta])=>!Number.isSafeInteger(state[key]+delta)||state[key]+delta<0))return {ok:false,message:kind==='secondary'?'You do not have any startup equity to sell.':kind==='feed'?'You need grain. Visit the grain merchant beside Golden Gate Park.':kind==='use-fuel-can'?'You need a fuel can. Pick one up at a gas station.':'You do not have enough coins.'};
        for(const [key,delta] of Object.entries(changes))state[key]+=delta;
        if(award)state.incomeQuarters=award.remainder;
        onChange({...state});return award?{ok:true,earned:award.earned,bonus:award.bonus}:{ok:true};
    }
    function buyHat(id){
        const h=hatById(id);
        if(!h)return {ok:false,message:'That hat is not in the catalog.'};
        if(state.ownedHats.includes(id))return {ok:false,message:'You already own this hat. Wear it from the Character menu.'};
        if(state.coins<h.price)return {ok:false,message:'You need '+h.price.toLocaleString('en-US')+' coins for the '+h.name+'. Your coins have not been spent.'};
        state.coins-=h.price;state.ownedHats=[...state.ownedHats,id];onChange({...state,ownedHats:[...state.ownedHats]});return {ok:true};
    }
    function credit(amount){
        if(!Number.isSafeInteger(amount)||amount<0)return {ok:false};const award=income(amount);
        if(!Number.isSafeInteger(award.earned)||!Number.isSafeInteger(state.coins+award.earned))return {ok:false};
        state.coins+=award.earned;state.incomeQuarters=award.remainder;onChange({...state});return {ok:true,earned:award.earned,bonus:award.bonus};
    }
    function buyPhone(){
        if(state.iphoneOwned)return {ok:false,message:'You already own an iPhone. Equip it in Character settings.'};
        if(state.coins<100)return {ok:false,message:'You need 100 coins to buy an iPhone.'};
        state.coins-=100;state.iphoneOwned=true;state.iphoneEquipped=true;onChange({...state});return {ok:true};
    }
    function equipPhone(on){if(on&&!state.iphoneOwned)return {ok:false,message:'Buy an iPhone from Tim Apple first.'};state.iphoneEquipped=!!on&&state.iphoneOwned;onChange({...state});return {ok:true};}
    function losePhone(){if(!state.iphoneOwned)return {ok:false};state.iphoneOwned=false;state.iphoneEquipped=false;onChange({...state});return {ok:true};}
    function buyRobotaxi(){
        if(state.robotaxiOwned)return {ok:false,message:'You already own a robotaxi. It is out earning fares.'};
        if(state.coins<100)return {ok:false,message:'You need 100 coins to buy a robotaxi.'};
        state.coins-=100;state.robotaxiOwned=true;onChange({...state});return {ok:true};
    }
    return {state,trade,credit,buyHat,buyPhone,equipPhone,losePhone,buyRobotaxi};
}

export const MERCHANTS=Object.freeze({
    'twitter-worker':{name:'Bottle-post engineer',skin:'#aa7d5e',hair:'#4c3d34',shirt:'#69848c',intro:'Please do not tap the backend.'},
    'twitter-poster':{name:'Poster',skin:'#b79577',hair:'#4b4141',shirt:'#8b788b',intro:'Very busy, someone is wrong on the internet.'},
    'software-vendor':{name:'Redheaded software salesman',skin:'#cfaa8d',hair:'#b9673e',shirt:'#557c88',intro:'Sales software, for selling more sales software.'},
    'software-buyer':{name:'Software salesman',skin:'#b78c6c',hair:'#4c4140',shirt:'#778190',intro:'Let me think about the strategic fit.'},
    'tim-apple':{name:'Tim Apple',skin:'#d0ae91',hair:'#b8bab5',shirt:'#3c4348',intro:'An iPhone for your income, and a feed for your attention.'},
    'robotaxi-sales':{name:'Tesla robotaxi dealer',skin:'#b48c6c',hair:'#44494b',shirt:'#657d88',intro:'The car works. You do something else.'},
    haberdasher:{name:'Haberdasher',skin:'#b58b6c',hair:'#493b35',shirt:'#77546b',intro:'A hat for every head, and an invoice for every aspiration.'},
    'salt-activist':{name:'Salt conservationist',skin:'#a77b5b',hair:'#534836',shirt:'#71947e',intro:'Help protect the Bay Area salt flats by delivering letters to City Hall.'},
    'gpu-buyer':{name:'GPU Factory buyer',skin:'#b69270',hair:'#4a4940',shirt:'#cbd9d4',intro:'We turn sand into GPUs. There are a few steps in the middle, but procurement asked me to keep this simple. Bring sand from Ocean Beach and I will pay 20 coins per sack.',question:'Sell a sack of Ocean Beach sand for 20 coins?',choice:'Sell sand · 20 coins',decline:'Keep my sand',trade:'sand-sale',receipt:'The buyer takes one sack of sand and pays you 20 coins. “Excellent. The next training run is practically in the bag.”',repeat:true},
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
