export const SALT_LETTER_PAY=50;
/** Letter and payment are committed together by the purse, so neither reloads
 * nor repeated dialogue clicks can pay twice for the same envelope. */
export function createSaltMail(economy){
    const carrying=()=>economy.state.saltLetters===1;
    function collect(){const result=economy.trade('salt-letter-collect');return {...result,message:result.ok?'You receive a sealed salt-conservation letter. Deliver it to the City Hall clerk for 50 coins.':result.message};}
    function deliver(){const result=economy.trade('salt-letter-deliver');return {...result,message:result.ok?'The clerk stamps your salt-conservation letter RECEIVED and pays you 50 coins from the activist’s campaign fund. Return to the salt flats for another letter.':result.message};}
    function entries(){
        if(!carrying()&&!economy.state.saltLettersDelivered)return [];
        return [{id:'salt-conservation-mail',title:'Letters for the Salt Flats',stage:carrying()?'carrying':'accepted',status:carrying()?'Letter ready to deliver':'Repeatable work',rewardLabel:'50 coins per letter',description:(carrying()?'Deliver your sealed letter to the City Hall clerk in San Francisco. Payment is 50 coins on delivery.':'Return to the salt conservationist southeast of the consciousness research institutes for another letter.')+' Letters delivered: '+economy.state.saltLettersDelivered+'.'}];
    }
    return {collect,deliver,entries,get carrying(){return carrying();}};
}
export function saltActivistDialogue(npc,mail,economy){
    const p={...npc,decline:'Leave'};
    if(mail.carrying)return {...p,intro:'You still have my sealed letter. City Hall needs to hear that these salt ponds are habitat, not a blank space on a development proposal.',question:'Where do I deliver the letter?',choice:'Remind me of the route',receipt:'Hand the letter to the City Hall clerk in San Francisco. The clerk will pay you 50 coins from our campaign fund. Then come back for another letter.'};
    return {...p,intro:economy.state.saltLettersDelivered?'Another letter? Excellent. Bureaucracy is an endurance sport, and these ponds have excellent stamina.':'These pink and green salt ponds are alive with brine-loving organisms. We want to protect the bay’s wetland habitat. City Hall keeps asking for written comments, so I keep writing them.',question:'Work as a salt-conservation courier? Each letter delivered to the City Hall clerk pays 50 coins.',choice:'Take a letter · 50 coins on delivery',accept:mail.collect};
}
export function saltClerkDialogue(base,mail){
    if(!mail.carrying)return base;
    return {...base,intro:'A letter from the salt conservation campaign? I can register it and pay your courier fee. '+base.intro,question:'Deliver the letter, or discuss other City Hall business?',choices:[{label:'Deliver conservation letter · 50 coins',accept:mail.deliver},...(base.choices||[{label:base.choice,accept:base.accept,trade:base.trade,receipt:base.receipt}])]};
}
