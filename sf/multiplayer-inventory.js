/** Local prediction keeps dialogue synchronous; ordered server operations
 * own the balances. A death epoch invalidates every old in-flight operation. */
export function createMultiplayerInventory({client,economy,deli,health,apply,announce}){
    let suppressed=0;
    const originalEconomy=Object.fromEntries(['trade','credit','buyHat','buyPhone','equipPhone','losePhone','buyRobotaxi'].map(key=>[key,economy[key]]));
    const originalDeli=Object.fromEntries(['pickup','order','eat','update','storeSandwich'].map(key=>[key,deli[key]]));
    const offline=()=>({ok:false,message:'Reconnect to the common world before changing your inventory.'});
    function send(op,args={}){client.command('inventory',{op,...args}).then(result=>{if(!result.ok&&result.message)announce(result.message,'Inventory');});}
    const argsFor={trade:args=>({kind:args[0]}),credit:args=>({amount:args[0]}),buyHat:args=>({id:args[0]}),equipPhone:args=>({on:args[0]})};
    for(const [key,original] of Object.entries(originalEconomy))economy[key]=(...args)=>{
        if(suppressed)return original(...args);if(!client.state.connected)return offline();
        const result=original(...args);if(result.ok)send(key,argsFor[key]?.(args)||{});return result;
    };
    function predict(fn){suppressed++;try{return fn();}finally{suppressed--;}}
    for(const [key,op] of [['pickup','pickup'],['order','order'],['eat','eat']])deli[key]=(...args)=>{
        if(!client.state.connected)return offline();const hpBefore=health.state.hp,result=predict(()=>originalDeli[key](...args));if(result.ok)send(op,key==='eat'?{hpBefore}:{});return result;
    };
    deli.update=(...args)=>{const pending=deli.state.pending;originalDeli.update(...args);if(pending&&!deli.state.pending&&deli.state.arrived)send('delivered');};
    // Shared rewards are already credited by the server's collection commit.
    // Personal food scripts may still call the original through suppress().
    deli.storeSandwich=amount=>suppressed?originalDeli.storeSandwich(amount):false;
    client.subscribe(message=>{if(message.type==='inventory')apply(message.inventory);});
    if(client.state.inventory)apply(client.state.inventory);
    return {suppress:fn=>predict(fn)};
}
