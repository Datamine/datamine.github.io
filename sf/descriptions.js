/** Observation text stays separate from dialogue and its trading side effects. */
const merchantDescriptions=Object.freeze({
    founder:'A founder with a pitch deck in one pocket and several possible futures in the other. The vest is pre-revenue.',
    secondary:'Their eyes light up at the words “liquid secondary.” Their shoes have already priced in the upside.',
    grain:'A patient keeper of tiny sacks. Every duck in the park considers this person a major philanthropist.',
    tax:'A gilded suit, a towering hat, and an unwavering belief that your pockets contain public infrastructure.',
    passenger:'A traveler who has mistaken a dangling rope for a perfectly ordinary form of public transport.'
});
const citizenDescriptions=Object.freeze([
    'Walking with purpose, although the purpose may simply be a very specific sandwich.',
    'Carries a reusable bag with the quiet confidence of someone who remembered to bring it.',
    'Appears to be mentally composing a strongly worded review of the weather.',
    'Knows a shortcut. Will probably describe it using a café that closed in 2018.',
    'Their jacket is prepared for three microclimates. Their ankles are prepared for none.',
    'Has the air of someone who has just explained a very niche hobby to a captive audience.',
    'A local adventurer. Currently undertaking the difficult quest called “one more errand.”',
    'Seems suspiciously well rested for someone living in a city with this much coffee.'
]);
export function describeCharacter(person){
    if(person.named==='Nia'||person.id==='nia')return 'Nia has claimed the warmest seat in Mazarine. Her coffee is cooling at a rate that suggests an excellent conversation.';
    if(merchantDescriptions[person.kind])return merchantDescriptions[person.kind];
    if(person.id?.includes('-diner-'))return person.id.startsWith('cotogna')?'A scholar of pasta, conducting an extremely thorough field study.':'Contemplating a small plate with the seriousness usually reserved for a lunar landing.';
    if(person.police||person.label==='Police')return 'An officer of the law. Their stamina appears to be funded in perpetuity.';
    if(person.rider)return 'A cyclist with excellent balance and strongly held opinions about protected bike lanes.';
    const id=String(person.id||person.seed||person.label),hash=[...id].reduce((v,c)=>(v*31+c.charCodeAt(0))>>>0,0);return citizenDescriptions[hash%citizenDescriptions.length];
}

/** Scenery has observations; actionable sites retain their actual activities. */
export function sightPrimaryVerb(sight){
    if(sight.kind==='bunny')return 'Pet';
    if(sight.kind==='zoo')return sight.tigerLoose?'Examine':'Release tiger at';
    return ({spaceport:'Launch rocket',gondola:'Ride gondola','ski-rental':'Rent skis','tax-hq':'Talk to tax authority',airship:'Rent airship',bike:'Ride bicycle',windsurf:'Go windsurfing',whale:'Jump over',guest:'Talk to',ducks:'Feed ducks',startup:'Talk to founder'})[sight.kind]||(sight.id==='sutro'?'Climb':sight.id==='baybridge'?'Cross':'Examine');
}
