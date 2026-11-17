import {createBankAccount,projectedBankBalance,bankWholeCoins} from './banking.js';

export function createBankService({client=null,economy,storage=null,onPurse=()=>{},onDrink=()=>{},now=Date.now}){
    let saved={};try{saved=JSON.parse(storage?.getItem('sf-green-bank-v1')||'{}')||{};}catch{}
    let coffee=saved.coffee===1?1:0;
    const persist=()=>{try{storage?.setItem('sf-green-bank-v1',JSON.stringify({...account.state,coffee}));}catch{}};
    const account=createBankAccount(saved,now,()=>persist());
    function snapshot(){
        const bank=client?client.state.bank||{balance:0,updatedAt:now()}:account.snapshot(),time=now()+(client?.state.serverOffset||0),balance=projectedBankBalance(bank,time);
        return {...bank,balance,withdrawable:bankWholeCoins(balance),coffee:client?client.state.inventory?.coffee||0:coffee};
    }
    async function act(action,amount){
        if(client){const names={status:'bankStatus',deposit:'bankDeposit',withdraw:'bankWithdraw',coffee:'bankCoffee',drink:'bankCoffeeDrink'},r=await client.command(names[action],{amount});if(r.ok&&action==='drink')onDrink();return r;}
        if(action==='status'){account.settle();return {ok:true,bank:account.snapshot()};}
        if(action==='coffee'){if(coffee)return {ok:false,message:'You already have a fresh coffee. Enjoy that one first!'};coffee=1;persist();return {ok:true,message:'One lovely coffee, on the house. Thank you for banking with us!'};}
        if(action==='drink'){if(!coffee)return {ok:false,message:'Ask the Green Bank banker for a complimentary coffee.'};coffee=0;persist();onDrink();return {ok:true,message:'You sip your complimentary coffee. Warm, excellent, and somehow served exactly how you like it.'};}
        const count=amount==='all'?(action==='deposit'?economy.state.coins:snapshot().withdrawable):amount,r=account.transfer(action,count,economy.state);if(r.ok)onPurse(economy.state);return r;
    }
    return {snapshot,act};
}

export function createBankMenu({element,service,economy,beforeOpen,afterClose,announce}){
    const form=element.querySelector('form'),amount=form.querySelector('input'),status=element.querySelector('[data-bank-status]');let busy=false;
    function close(){element.hidden=true;afterClose();}
    async function operation(action,count){if(busy)return;busy=true;for(const b of form.querySelectorAll('button'))b.disabled=true;status.textContent='One moment, please…';
        try{const result=await service.act(action,count);status.textContent=result.message||'Your account is up to date.';status.dataset.error=String(!result.ok);if(result.message)announce(result.message,'Green Bank');}
        finally{busy=false;for(const b of form.querySelectorAll('button'))b.disabled=false;update();}
    }
    form.addEventListener('submit',event=>{event.preventDefault();const value=event.submitter?.value||'deposit',action=value.startsWith('withdraw')?'withdraw':'deposit';operation(action,value.endsWith('-all')?'all':Number(amount.value));});
    element.querySelector('[data-bank-close]').addEventListener('click',close);
    element.querySelector('[data-bank-coffee]').addEventListener('click',()=>operation('coffee'));
    function update(){if(element.hidden)return;const state=service.snapshot();element.querySelector('[data-bank-balance]').textContent=state.balance.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});element.querySelector('[data-bank-purse]').textContent=economy.state.coins.toLocaleString('en-US');}
    return {open(){beforeOpen();element.hidden=false;status.textContent='Welcome! How may I help? Your banked coins are separate from your purse.';status.dataset.error='false';service.act('status').then(update);update();amount.focus({preventScroll:true});},close,update,get active(){return !element.hidden;}};
}
