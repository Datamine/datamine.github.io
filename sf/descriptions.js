import {buildingNPCService} from './building-interactions.js';
/** Observation text stays separate from dialogue and its trading side effects. */
const merchantDescriptions=Object.freeze({
    chef:'An immaculate chef with a very tall hat and very exacting standards. Will accept a fish story, but only pays for the fish.',
    capital:'A venture capitalist who interprets “strong fundamentals” as a personal bench-press record. Their term sheet doubles as a workout plan.',
    crew:'An attendant with a flight manifest and immaculate coveralls. The clipboard says “Reusable” with a reassuring number of check marks.',
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
    if(person.baby)return 'A tiny Noe Valley resident, being chauffeured between naps. The stroller has excellent suspension and no concept of rent.';
    if(person.stroller)return 'A Noe Valley parent steering a very small passenger through a very large afternoon. The coffee is mostly structural.';
    if(person.parrot)return person.description;
    if(person.rehabilitation)return person.medical?'A spotless white coat, an immaculate bedside manner, and an enormous apparatus that has never once appeared in a medical textbook.':'A judge whose definition of rehabilitation is unusually literal and regrettably difficult to appeal.';
    if(person.kind==='fuel-attendant')return 'A pump attendant with a tiny nozzle embroidered on their cap. Their smile depends entirely on how many coins you are carrying.';
    if(person.kind==='motorcycle-clerk')return 'A motorcycle rental clerk who has heard every possible explanation for why a monkey needs a getaway vehicle.';
    if(person.kind==='recruiter')return 'A lab recruiter clutching a clipboard labeled “general intelligence.” The entire interview fits in a calculator, which is strictly forbidden.';
    if(person.kind==='deli')return 'A sandwich artisan whose delivery fleet fits inside the walk-in fridge. The flag is for morale.';
    if(person.kind==='lift')return 'An experienced lift attendant in a warm parka. Has witnessed every conceivable interpretation of the phrase last run.';
    if(person.kind==='bartender')return 'A neighborhood bartender who can measure a pint, a coin, and the precise moment that the floor starts moving.';
    if(person.dogWalker)return 'A local whose afternoon itinerary has been approved, amended, and occasionally vetoed by the dog.';
    if(person.child)return 'A small citizen with a large backpack and a very important appointment with the playground.';
    if(person.dog===true)return person.description||'An enthusiastic pedestrian with twice the usual number of feet.';
    if(person.keeper)return "A zookeeper with the running speed of a tiger and an extremely literal interpretation of ‘monkey business.’";
    if(person.questRole&&person.description)return person.description;
    if(person.kind==='rail-worker')return person.description;
    if(person.researcher)return person.description;
    if(person.club)return 'A regular at Nightlife. Excellent rhythm, excellent outfit, and apparently already in a relationship.';
    if(person.named==='Nia'||person.id==='nia')return 'Nia has claimed the warmest seat in Mazarine. Her coffee is cooling at a rate that suggests an excellent conversation.';
    if(merchantDescriptions[person.kind])return merchantDescriptions[person.kind];
    if(person.id?.includes('-diner-'))return person.id.startsWith('cotogna')?'A scholar of pasta, conducting an extremely thorough field study.':'Contemplating a small plate with the seriousness usually reserved for a lunar landing.';
    if(person.police||person.label==='Police')return 'An officer of the law. Their stamina appears to be funded in perpetuity.';
    if(person.rider)return 'A cyclist with excellent balance and strongly held opinions about protected bike lanes.';
    const id=String(person.id||person.seed||person.label),hash=[...id].reduce((v,c)=>(v*31+c.charCodeAt(0))>>>0,0);return citizenDescriptions[hash%citizenDescriptions.length];
}

/** Scenery has observations; actionable sites retain their actual activities. */
export function sightPrimaryVerb(sight){
    if(sight.enterableInstitute)return 'Enter';
    if(buildingNPCService(sight))return 'Examine';
    if(sight.kind==='surfing')return 'Paddle out';
    if(sight.kind==='fishing')return 'Fish at';
    if(sight.kind==='motorcycle')return sight.rented?'Ride':'Examine';
    if(sight.kind==='sunglasses')return 'Pick up';
    if(sight.id==='zoo-monkeys')return 'Steal monkey from';
    if(sight.kind==='bunny')return 'Pet';
    if(sight.kind==='zoo')return sight.tigerLoose?'Examine':'Release tiger at';
    return ({nightlife:'Enter',gondola:'Ride gondola',airship:'Rent airship',bike:'Ride bicycle',windsurf:'Go windsurfing',whale:'Jump over',guest:'Talk to',ducks:'Feed ducks'})[sight.kind]||(sight.id==='sutro'?'Climb':'Examine');
}
