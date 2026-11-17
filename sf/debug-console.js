/** Commands accept numbers, never JavaScript. Map coordinates are the center
 * of the character in the same east/south plane used by the rendered world. */
export function parseWorldCommand(value){
    const text=String(value).trim();if(/^:debug$/i.test(text))return {type:'debug'};
    const number='([+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:e[+-]?\\d+)?)',match=text.match(new RegExp('^:tp\\s+'+number+'\\s*,\\s*'+number+'$','i'));
    if(!match)return {error:'Use :debug or :tp x,y. Press Enter to run the command.'};
    const x=Number(match[1]),y=Number(match[2]);if(!Number.isFinite(x)||!Number.isFinite(y)||Math.abs(x)>1e6||Math.abs(y)>1e6)return {error:'Enter finite map coordinates between −1,000,000 and 1,000,000.'};
    return {type:'teleport',x,y};
}
export function debugMapPosition(player){return {x:player.x+.5,y:player.y+.5};}
export function debugTilePosition(x,y){return {x:x-.5,y:y-.5};}
export function createFrameMeter(){
    let start=null,previous=null,count=0,fps=0;
    return {sample(time){if(!Number.isFinite(time))return fps;if(previous===null||time<=previous||time-previous>1500){start=time;count=0;fps=0;}else count++;previous=time;const elapsed=time-start;if(elapsed>=500){fps=count*1000/elapsed;start=time;count=0;}return fps;},reset(){start=null;previous=null;count=0;fps=0;},get fps(){return fps;}};
}

export function createDebugConsole({panel,form,input,status,xOutput,yOutput,fpsOutput=null,getFPS=()=>0,getPosition,teleport,beforeOpen,onMessage,focusWorld}){
    const history=[];let historyIndex=0,draft='';
    const editing=target=>target?.isContentEditable||['INPUT','SELECT','TEXTAREA'].includes(target?.tagName);
    function update(){if(panel.hidden)return;const p=getPosition();for(const [out,value] of [[xOutput,p.x],[yOutput,p.y]]){const text=value.toFixed(3);if(out.textContent!==text)out.textContent=text;}if(fpsOutput){const value=getFPS(),text=value>0?value.toFixed(1):'—';if(fpsOutput.textContent!==text)fpsOutput.textContent=text;}}
    function closeCommand(focus=true){form.hidden=true;if(focus)focusWorld();}
    function openCommand(value=':'){
        beforeOpen();form.hidden=false;input.value=value;status.textContent='Enter runs the command. Escape cancels.';status.dataset.error='false';historyIndex=history.length;draft=value;input.focus({preventScroll:true});input.setSelectionRange(value.length,value.length);
    }
    function execute(){
        const value=input.value,command=parseWorldCommand(value);
        if(command.error){status.textContent=command.error;status.dataset.error='true';input.focus();return false;}
        const result=command.type==='debug'?{ok:true,message:'Debug coordinates enabled.'}:teleport(command.x,command.y);
        if(!result.ok){status.textContent=result.message;status.dataset.error='true';input.focus();return false;}
        if(history.at(-1)!==value)history.push(value);if(history.length>30)history.shift();
        if(command.type==='debug')panel.hidden=false;update();onMessage(result.message);closeCommand();return true;
    }
    function handleKey(event){
        if(event.ctrlKey||event.metaKey||event.altKey||event.isComposing)return false;
        if(!form.hidden&&event.target===input){
            if(event.key==='Escape'){event.preventDefault();closeCommand();}
            else if(event.key==='ArrowUp'||event.key==='ArrowDown'){
                event.preventDefault();if(historyIndex===history.length)draft=input.value;historyIndex=Math.max(0,Math.min(history.length,historyIndex+(event.key==='ArrowUp'?-1:1)));input.value=history[historyIndex]??draft;input.setSelectionRange(input.value.length,input.value.length);
            }
            return true;
        }
        if(event.key===':'&&!event.repeat&&!editing(event.target)){event.preventDefault();openCommand();return true;}
        return false;
    }
    form.addEventListener('submit',event=>{event.preventDefault();execute();});
    form.querySelector('[data-command-close]').addEventListener('click',()=>closeCommand());
    panel.querySelector('[data-debug-close]').addEventListener('click',()=>{panel.hidden=true;focusWorld();});
    panel.querySelector('[data-debug-teleport]').addEventListener('click',()=>{const p=getPosition();openCommand(':tp '+Number(p.x.toFixed(4))+','+Number(p.y.toFixed(4)));});
    document.addEventListener('pointerdown',event=>{if(!form.hidden&&!form.contains(event.target))closeCommand(false);});
    return {handleKey,openCommand,update,close(){panel.hidden=true;closeCommand(false);}};
}
