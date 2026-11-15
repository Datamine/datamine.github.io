/** Small SVG portraits match the in-world skin, hair, and shirt palette. */
function chatHead(person){
    const skin=person.skin||'#bd9369',hair=person.hair||'#574335',shirt=person.shirt||'#687f65';
    return `<svg viewBox="0 0 80 90" aria-hidden="true"><path fill="${shirt}" d="M7 90V74L24 64H56L73 74V90Z"/><path fill="${skin}" d="M30 55H50V70L40 76 30 70Z"/><path fill="#251e19" opacity=".22" d="M30 55H50V63L30 59Z"/><path fill="${skin}" d="M20 29L25 18H55L60 29V48L50 62H31L20 48Z"/><path fill="${hair}" d="M18 35V23L26 11 48 8 61 20 63 37 55 29 50 22 29 25 24 37Z"/><path fill="#272724" d="M28 35H34V39H28ZM47 35H53V39H47Z"/><path fill="#986447" d="M39 37L36 47H43Z"/><path fill="#714d39" d="M32 52H48L44 55H36Z"/><path fill="#fff4dc" opacity=".4" d="M25 28L29 25H47L50 28Z"/></svg>`;
}

export function createDialogue({element,journal,log,economy,announce,onClose=()=>{}}){
    let current=null,root=null,stage='intro',committed=false,after=null;
    const close=()=>{const action=after;after=null;element.hidden=true;journal.classList.remove('sf-conversing');log.hidden=false;current=null;onClose();action?.();};
    function button(label,fn){const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',fn);return b;}
    function render(message){
        element.replaceChildren();const player=stage==='choices',person=player?{name:'You'}:current;
        const portrait=document.createElement('div');portrait.className='sf-chat-head';portrait.innerHTML=chatHead(person);
        const copy=document.createElement('div');copy.className='sf-chat-copy';
        const name=document.createElement('strong');name.textContent=person.name;
        const text=document.createElement('p');text.textContent=message||(stage==='intro'?current.intro:current.question);copy.append(name,text);
        const controls=document.createElement('div');controls.className='sf-chat-options';
        if(stage==='choices'){
            const choices=current.choices||[{label:current.choice,accept:current.accept,trade:current.trade,receipt:current.receipt}];
            for(const choice of choices)controls.append(button(choice.label,()=>{
                if(choice.next){current={...current,...choice.next};stage=choice.next.skipIntro?'choices':'intro';committed=false;render();return;}
                if(committed)return;committed=true;
                const result=choice.accept?choice.accept():choice.trade?economy.trade(choice.trade):{ok:true};
                if(result.ok&&result.after)after=result.after;
                stage='receipt';const receipt=result.ok?result.message||choice.receipt||current.receipt:result.message;
                announce(receipt,current.name);render(receipt);
            }));
            controls.append(button(current.decline||"Don't Purchase",()=>{announce('Maybe another time.','You');close();}));
        }else controls.append(button('OK',()=>{if(stage==='intro'){stage='choices';render();}else if(current.repeat){current=root;stage='choices';committed=false;render();}else close();}));
        controls.append(button('Close',close));copy.append(controls);
        element.dataset.speaker=player?'player':'npc';element.append(portrait,copy);element.querySelector('button').focus({preventScroll:true});
    }
    function open(person){root=current=person;stage='intro';committed=false;after=null;log.hidden=true;element.hidden=false;journal.classList.add('sf-conversing');render();}
    function handleKey(event){
        if(!current)return false;
        const key=event.key.toLowerCase(),buttons=[...element.querySelectorAll('button')],index=buttons.indexOf(document.activeElement);
        if(['arrowup','arrowdown','arrowleft','arrowright'].includes(key)){
            event.preventDefault();const step=key==='arrowup'||key==='arrowleft'?-1:1;buttons[index<0?0:(index+step+buttons.length)%buttons.length]?.focus({preventScroll:true});return true;
        }
        if(key==='enter'){event.preventDefault();if(!event.repeat)(buttons[index]||buttons[0])?.click();return true;}
        if(key==='tab'){
            if(event.shiftKey&&index<=0||!event.shiftKey&&index===buttons.length-1){event.preventDefault();buttons[event.shiftKey?buttons.length-1:0]?.focus({preventScroll:true});}return true;
        }
        return false;
    }
    return {open,close,handleKey,get active(){return !!current;}};
}
