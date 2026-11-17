export const BANK_HOUR_MS=3600000,BANK_HOURLY_RATE=.05;
const bankLimit=Number.MAX_SAFE_INTEGER;
export function bankWholeCoins(balance){return Math.floor(balance+Math.min(1e-8,Math.abs(balance)*Number.EPSILON*4));}
export function projectedBankBalance(snapshot,time=Date.now()){
    const value=Number(snapshot?.balance),balance=Number.isFinite(value)?Math.max(0,Math.min(bankLimit,value)):0,stamp=Number(snapshot?.updatedAt),elapsed=Math.max(0,time-(Number.isFinite(stamp)?stamp:time));
    if(!balance)return 0;
    const exponent=Math.min(elapsed/BANK_HOUR_MS*Math.log1p(BANK_HOURLY_RATE),Math.log(bankLimit/balance));
    return Math.min(bankLimit,balance*Math.exp(exponent));
}
/** Interest is settled lazily on the authoritative clock, before every
 * transfer. New deposits never inherit the age of an existing deposit. */
export function createBankAccount(saved={},now=Date.now,onSave=()=>{}){
    const state={balance:Number.isFinite(saved.balance)&&saved.balance>=0?Math.min(bankLimit,saved.balance):0,updatedAt:Number.isSafeInteger(saved.updatedAt)&&saved.updatedAt>=0?saved.updatedAt:now()};
    function settle(){state.balance=projectedBankBalance(state,now());state.updatedAt=Math.max(state.updatedAt,now());onSave({...state});}
    function snapshot(){return {...state,withdrawable:bankWholeCoins(state.balance),hourlyRate:BANK_HOURLY_RATE};}
    function transfer(kind,amount,purse){
        if(!['deposit','withdraw'].includes(kind)||!Number.isSafeInteger(amount)||amount<=0)return {ok:false,message:'Enter a whole number of coins greater than zero.'};
        settle();
        if(kind==='deposit'){
            if(amount>purse.coins)return {ok:false,message:'You do not have that many coins in your purse.',bank:snapshot()};
            if(state.balance>bankLimit-amount)return {ok:false,message:'Your bank account is full.',bank:snapshot()};
            purse.coins-=amount;state.balance+=amount;
        }else{
            if(amount>bankWholeCoins(state.balance))return {ok:false,message:'You do not have that many whole coins deposited.',bank:snapshot()};
            if(!Number.isSafeInteger(purse.coins+amount))return {ok:false,message:'Your coin purse is full.',bank:snapshot()};
            state.balance=Math.max(0,state.balance-amount);purse.coins+=amount;
        }
        onSave({...state});return {ok:true,bank:snapshot(),message:(kind==='deposit'?'Deposited ':'Withdrew ')+amount.toLocaleString('en-US')+' coins. '+(kind==='deposit'?'Your deposit earns 5% per hour, including while you are away.':'Your coins are now in your purse.')};
    }
    return {state,settle,snapshot,transfer};
}
export function bankerDialogue(npc,{open,coffee}){
    return {...npc,intro:'Welcome to Green Bank! I’m delighted to see you. Your deposits earn 5% interest per hour, compounded, even while you’re away. And please, have a coffee on us.',question:'How can I make your day a little better?',decline:'Leave',choices:[
        {label:'Deposits and withdrawals',accept:()=>({ok:true,message:'Of course. Your account is ready; take all the time you need.',after:open})},
        {label:'A free coffee, please',accept:coffee}
    ]};
}
