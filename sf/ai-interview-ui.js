import {createArithmeticInterview,AI_INTERVIEW_PASS_SCORE} from './ai-lab.js';

/** This screen owns its timer and input; the world owns location and wages. */
export function createAIInterviewUI({element,job,onOpen=()=>{},onClose=()=>{},onResult=()=>{},clock,random}){
    const game=createArithmeticInterview({clock,random});let timer=0,reported=false;
    const $=id=>element.querySelector('#'+id),input=$('sf-interview-answer'),start=$('sf-interview-start');
    function finish(){
        if(reported)return;reported=true;clearInterval(timer);timer=0;
        if(game.state.phase==='finished'){
            const result=job.recordInterview(game.result());$('sf-interview-result').textContent=result.message;onResult(result);
        }else $('sf-interview-result').textContent='Interview ended early. No result was submitted. You can try again.';
        $('sf-interview-result').hidden=false;input.disabled=true;start.hidden=false;start.textContent='Try again';start.focus();
    }
    function render(){
        game.update();const s=game.state;
        $('sf-interview-time').textContent=Math.ceil(s.remaining)+'s';$('sf-interview-score').textContent=s.score;
        $('sf-interview-problem').textContent=s.problem?.text||'Ready?';
        if(s.phase==='finished'||s.phase==='cancelled')finish();
    }
    function begin(){
        if(!game.start())return;reported=false;input.value='';input.disabled=false;input.removeAttribute('aria-invalid');
        $('sf-interview-result').hidden=true;start.hidden=true;render();input.focus();clearInterval(timer);timer=setInterval(render,100);
    }
    function close(){game.cancel();clearInterval(timer);timer=0;element.hidden=true;onClose();}
    function submit(){
        const correct=game.submit(input.value);if(correct){input.value='';input.removeAttribute('aria-invalid');}
        else if(input.value)input.setAttribute('aria-invalid','true');render();
    }
    start.addEventListener('click',begin);input.addEventListener('input',submit);$('sf-interview-close').addEventListener('click',close);
    function handleKey(e){
        if(element.hidden)return false;
        if(e.key==='Escape'){e.preventDefault();close();return true;}
        if(e.key==='Enter'&&e.target===input){e.preventDefault();submit();return true;}
        if(e.key==='Tab'){
            const buttons=[...element.querySelectorAll('button,input')].filter(b=>!b.hidden&&!b.disabled),first=buttons[0],last=buttons.at(-1);
            if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
        }
        return true;
    }
    return {game,open(){
        if(!element.hidden)return;onOpen();element.hidden=false;reported=false;input.value='';input.disabled=true;
        game.state.phase='ready';game.state.score=0;game.state.remaining=120;game.state.problem=null;
        $('sf-interview-result').hidden=true;start.hidden=false;start.textContent='Start · 2 minutes';$('sf-interview-target').textContent=AI_INTERVIEW_PASS_SCORE+'+';render();start.focus();
    },close,handleKey,get visible(){return !element.hidden;}};
}
