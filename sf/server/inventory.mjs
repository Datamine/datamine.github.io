import {createEconomy} from '../economy.js';
import {hatById} from '../hat-catalog.js';
import {ITEM_STATS,EQUIPMENT_IDS} from '../item-stats.js';
import {tabletCounts} from '../teleport-tablets.js';

const inventoryParse=value=>{try{return JSON.parse(value||'{}');}catch{return {};}};
export const INVENTORY_KEYS=new Set(['sf-purse-v1','sf-deli-v1']);

/** Owner-private finances, with server revisions and a death epoch. Client
 * checkpoints never overwrite this ledger or resurrect a pre-death balance. */
export function createInventoryAccount(profile){
    profile.privateState??={};
    const economy=createEconomy(inventoryParse(profile.privateState['sf-purse-v1'])),savedFood=inventoryParse(profile.privateState['sf-deli-v1']);
    const meta=profile.inventory??={epoch:0,revision:0,sandwiches:Number.isSafeInteger(savedFood.sandwiches)?Math.max(0,savedFood.sandwiches):0,deliveryPending:savedFood.pending===true};
    if(!Number.isSafeInteger(meta.peptides)||meta.peptides<0)meta.peptides=0;
    meta.coffee=meta.coffee===1?1:0;
    meta.tablets=tabletCounts(meta.tablets);
    function save(change=true){if(change)meta.revision++;profile.privateState['sf-purse-v1']=JSON.stringify(economy.state);profile.privateState['sf-deli-v1']=JSON.stringify({sandwiches:meta.sandwiches,pending:meta.deliveryPending});}
    function snapshot(){return {epoch:meta.epoch,revision:meta.revision,purse:structuredClone(economy.state),sandwiches:meta.sandwiches,deliveryPending:meta.deliveryPending,peptides:meta.peptides,coffee:meta.coffee,tablets:{...meta.tablets}};}
    function operation(op,args={},player=null){
        let result;
        if(op==='eat'){
            if(!meta.sandwiches)return {ok:false,message:'You do not have a sandwich.'};
            if(player?.respawnAllowed)return {ok:false,message:'Wait until you respawn.'};
            if(player&&Number.isInteger(args.hpBefore)&&args.hpBefore>=0&&args.hpBefore<=30)player.hp=Math.min(player.hp,args.hpBefore);
            if(player?.hp>=30)return {ok:false,message:'You already have full hitpoints.'};
            meta.sandwiches--;if(player)player.hp=Math.min(30,player.hp+ITEM_STATS.sandwich.healing);result={ok:true,hp:player?.hp};
        }else if(op==='delivered'){
            if(!meta.deliveryPending)return {ok:false,message:'No delivery is pending.'};meta.deliveryPending=false;meta.sandwiches++;result={ok:true};
        }else if(op==='pickup'||op==='order'){
            if(op==='order'&&meta.deliveryPending)return {ok:false,message:'A delivery is already on its way.'};
            result=economy.trade(op==='pickup'?(args.store==='in-n-out'?'sandwich-in-n-out':'sandwich-pickup'):'sandwich-delivery');if(result.ok){if(op==='pickup')meta.sandwiches++;else meta.deliveryPending=true;}
        }else if(op==='trade')result=economy.trade(args.kind);
        else if(op==='credit')result=Number.isSafeInteger(args.amount)&&args.amount>=0&&args.amount<=100000?economy.credit(args.amount):{ok:false,message:'Invalid reward.'};
        else if(op==='buyHat')result=economy.buyHat(args.id);
        else if(op==='buyPhone')result=economy.buyPhone();
        else if(op==='equipPhone')result=economy.equipPhone(args.on===true);
        else if(op==='losePhone')result=economy.losePhone();
        else if(op==='buyRobotaxi')result=economy.buyRobotaxi();
        else return {ok:false,message:'Unknown inventory action.'};
        if(result.ok)save();return {...result,inventory:snapshot()};
    }
    function canReceive(item){
        if(item.lootKind==='equipment'&&(!EQUIPMENT_IDS.includes(item.itemId)||economy.state.ownedEquipment.includes(item.itemId)))return {ok:false,message:'You already own this equipment, or it is unavailable.'};
        if(item.lootKind==='hat'&&(!hatById(item.hatId)||economy.state.ownedHats.includes(item.hatId)))return {ok:false,message:'You already own that hat.'};
        if(item.lootKind==='iphone'&&economy.state.iphoneOwned)return {ok:false,message:'You already own an iPhone.'};
        if(item.lootKind==='peptides'&&!Number.isSafeInteger(meta.peptides+item.amount))return {ok:false,message:'Your peptide case is full.'};
        if(item.lootKind==='coins'&&!Number.isSafeInteger(economy.state.coins+item.amount))return {ok:false,message:'Your coin purse is full.'};return {ok:true};
    }
    function receive(item){
        const result=canReceive(item);if(!result.ok)return result;
        if(item.lootKind==='coins'){if(item.transfer)economy.state.coins+=item.amount;else economy.credit(item.amount);}
        else if(item.lootKind==='sandwich')meta.sandwiches+=item.amount;
        else if(item.lootKind==='iphone'){economy.state.iphoneOwned=true;economy.state.iphoneEquipped=false;}
        else if(item.lootKind==='hat')economy.state.ownedHats.push(item.hatId);
        else if(item.lootKind==='peptides')meta.peptides+=item.amount;
        else if(item.lootKind==='equipment')economy.state.ownedEquipment.push(item.itemId);
        else return {ok:true};
        save();return {ok:true,inventory:snapshot()};
    }
    function deathDrops(){
        const purse=economy.state,items=[];
        if(purse.coins)items.push({lootKind:'coins',amount:purse.coins,label:purse.coins+' coins'});
        if(meta.sandwiches)items.push({lootKind:'sandwich',amount:meta.sandwiches,label:meta.sandwiches+' sandwich'+(meta.sandwiches===1?'':'es')});
        if(purse.iphoneOwned)items.push({lootKind:'iphone',amount:1,label:'iPhone'});
        for(const id of purse.ownedHats)items.push({lootKind:'hat',hatId:id,amount:1,label:hatById(id).name});
        purse.coins=0;purse.iphoneOwned=false;purse.iphoneEquipped=false;purse.ownedHats=[];purse.incomeQuarters=0;meta.sandwiches=0;meta.epoch++;
        const look=inventoryParse(profile.privateState['sf-character-v1']);look.hat='none';profile.privateState['sf-character-v1']=JSON.stringify(look);save();return items;
    }
    save(false);return {economy,meta,snapshot,operation,canReceive,receive,deathDrops,save};
}
