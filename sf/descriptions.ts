import type { Site, ActorMetadata } from './types/world.ts';
import { buildingNPCService } from './building-interactions.ts';
import { applyEntityEdits } from './world-edits.ts';
/** Observation text stays separate from dialogue and its trading side effects. */
const merchantDescriptions = Object.freeze({
  'airship-agent':
    'A punctual attendant with a brass watch and a very long retrieval cable. Their flight schedule has exactly one departure: whenever you are ready.',
  'twitter-worker':
    'A backend engineer with impeccable bottle discipline. Every cork is a deployment.',
  'twitter-poster':
    'A poster staring into a phone. Someone, somewhere, has made a statement that cannot be allowed to stand.',
  'software-vendor':
    'A redheaded salesman selling the software that sells the software. His business card has a business card.',
  'software-buyer':
    'A conference delegate considering a sales funnel within a sales funnel. The lanyard is doing most of the work.',
  'tim-apple':
    'Tim Apple, surrounded by very round architecture. His pockets contain one thousand songs and several hundred unread notifications.',
  'robotaxi-sales':
    'An autonomous-income salesperson. The car has no driver, but the invoice has excellent handwriting.',
  haberdasher:
    'A meticulous milliner who can estimate your net worth to the nearest brim. Considers a crown sensible everyday wear.',
  'salt-activist':
    'A salt conservationist with muddy boots, a stack of envelopes, and several strongly worded opinions about the phrase vacant land.',
  'gpu-buyer':
    'A clean-room procurement specialist. Has found a way to expense a trip to the beach.',
  chef: 'An immaculate chef with a very tall hat and very exacting standards. Will accept a fish story, but only pays for the fish.',
  capital:
    'A venture capitalist who interprets “strong fundamentals” as a personal bench-press record. Their term sheet doubles as a workout plan.',
  crew: 'An attendant with a flight manifest and immaculate coveralls. The clipboard says “Reusable” with a reassuring number of check marks.',
  founder:
    'A founder with a pitch deck in one pocket and several possible futures in the other. The vest is pre-revenue.',
  secondary:
    'Their eyes light up at the words “liquid secondary.” Their shoes have already priced in the upside.',
  grain:
    'A patient keeper of tiny sacks. Every duck in the park considers this person a major philanthropist.',
  tax: 'A gilded suit, a towering hat, and an unwavering belief that your pockets contain public infrastructure.',
  passenger:
    'A traveler who has mistaken a dangling rope for a perfectly ordinary form of public transport.',
});
const citizenDescriptions = Object.freeze([
  'Walking with purpose, although the purpose may simply be a very specific sandwich.',
  'Carries a reusable bag with the quiet confidence of someone who remembered to bring it.',
  'Appears to be mentally composing a strongly worded review of the weather.',
  'Knows a shortcut. Will probably describe it using a café that closed in 2018.',
  'Their jacket is prepared for three microclimates. Their ankles are prepared for none.',
  'Has the air of someone who has just explained a very niche hobby to a captive audience.',
  'A local adventurer. Currently undertaking the difficult quest called “one more errand.”',
  'Seems suspiciously well rested for someone living in a city with this much coffee.',
] satisfies [string, string, string, string, string, string, string, string]);
export function describeCharacter(person: ActorMetadata) {
  applyEntityEdits(person, person.editorKey || 'actor:' + person.id);
  if (person.editorDescription) return person.description;
  if (person.wilderness && person.description) return person.description;
  if (person.kind === 'stockbroker')
    return 'A broker with a pocket watch, a tidy ledger, and an impressive ability to describe a falling number as price discovery.';
  if (person.kind === 'duel-referee')
    return 'An impartial referee carrying one well-balanced coin and absolutely no spreadsheet for predicting which side it will land on.';
  if (person.kind === 'market-farmer')
    return 'A farmer in a black coat and tiny dark sunglasses. Can see through the simulation, but still insists on exact change for kale.';
  if (person.kind === 'banker')
    return 'A warm smile, a beautifully organized ledger, and a talent for remembering exactly how you take your coffee. Banking has rarely felt so hospitable.';
  if (person.kind === 'illuminati-elder')
    return 'An Old Man with silver hair, a very discreet lapel pin, and a philanthropic interest in exactly 250,000 of your coins.';
  if (person.kind === 'guild-master')
    return 'Ray wears a red suit, a brass lapel compass and the serene expression of a man with a very orderly filing cabinet.';
  if (person.neighborhoodService)
    return (
      person.description || 'A local shopkeeper, keeping this corner of the neighborhood busy.'
    );
  if (person.neighborhood)
    return (
      person.description ||
      'A neighbor with a favorite garden bench and a well-practiced talent for making a short walk last all afternoon.'
    );
  if (person.estateResident) return person.description;
  if (person.baby)
    return 'A tiny Noe Valley resident, being chauffeured between naps. The stroller has excellent suspension and no concept of rent.';
  if (person.stroller)
    return 'A Noe Valley parent steering a very small passenger through a very large afternoon. The coffee is mostly structural.';
  if (person.parrot) return person.description;
  if (person.rehabilitation)
    return 'A spotless white coat, an immaculate bedside manner, and an enormous apparatus that has never once appeared in a medical textbook.';
  if (person.kind === 'fuel-attendant')
    return 'A pump attendant with a tiny nozzle embroidered on their cap. Their smile depends entirely on how many coins you are carrying.';
  if (person.kind === 'motorcycle-clerk')
    return 'A motorcycle rental clerk with a well-oiled keyring and a remarkably patient smile.';
  if (person.kind === 'recruiter')
    return 'A lab recruiter clutching a clipboard labeled “general intelligence.” The entire interview fits in a calculator, which is strictly forbidden.';
  if (person.kind === 'deli')
    return 'A sandwich artisan whose delivery fleet fits inside the walk-in fridge. The flag is for morale.';
  if (person.kind === 'lift')
    return 'An experienced lift attendant in a warm parka. Has witnessed every conceivable interpretation of the phrase last run.';
  if (person.kind === 'bartender')
    return 'A neighborhood bartender who can measure a pint, a coin, and the precise moment that the floor starts moving.';
  if (person.dogWalker)
    return 'A local whose afternoon itinerary has been approved, amended, and occasionally vetoed by the dog.';
  if (person.child)
    return 'A small citizen with a large backpack and a very important appointment with the playground.';
  if (person.dog === true)
    return person.description || 'An enthusiastic pedestrian with twice the usual number of feet.';
  if (person.keeper)
    return 'A watchful zookeeper with an extremely literal interpretation of ‘monkey business.’';
  if (person.questRole && person.description) return person.description;
  if (person.kind === 'rail-worker') return person.description;
  if (person.researcher) return person.description;
  if (person.club)
    return 'A regular at Nightlife. Excellent rhythm, excellent outfit, and apparently already in a relationship.';
  if (person.named === 'Nia' || person.id === 'nia')
    return 'Nia has claimed the warmest seat in Mazarine. Her coffee is cooling at a rate that suggests an excellent conversation.';
  if (merchantDescriptions[person.kind as keyof typeof merchantDescriptions])
    return merchantDescriptions[person.kind as keyof typeof merchantDescriptions];
  if (typeof person.id === 'string' && person.id.includes('-diner-'))
    return person.id.startsWith('cotogna')
      ? 'A scholar of pasta, conducting an extremely thorough field study.'
      : 'Contemplating a small plate with the seriousness usually reserved for a lunar landing.';
  if (person.police || person.label === 'Police')
    return 'An officer of the law. Their stamina appears to be funded in perpetuity.';
  if (person.rider)
    return 'A cyclist with excellent balance and strongly held opinions about protected bike lanes.';
  const id = String(person.id || person.seed || person.label),
    hash = [...id].reduce((v, c) => (v * 31 + c.charCodeAt(0)) >>> 0, 0);
  return citizenDescriptions[hash % citizenDescriptions.length];
}

/** Scenery has observations; actionable sites retain their actual activities. */
export function sightPrimaryVerb(
  sight: Partial<Pick<Site, 'kind' | 'rented' | 'seats' | 'enterableInstitute' | 'tigerLoose'>> & {
    id?: string | number;
    activityBuilding?: boolean;
  },
) {
  if (sight.kind === 'gym') return 'Perform exercises at';
  if (sight.kind === 'airship-rope') return 'Climb';
  if (sight.kind === 'lore-book') return 'Read';
  if (sight.kind === 'secret-stairs') return 'Descend';
  if (sight.kind === 'cave-exit') return 'Climb';
  if (sight.kind === 'stealth-bomber') return 'Board';
  if (sight.kind === 'bench') return 'Sit on';
  if (sight.kind === 'neighborhood-garden' && sight.seats?.length) return 'Sit in';
  if (sight.kind === 'sand') return 'Collect sand at';
  if (sight.kind === 'loot' || sight.kind === 'sunglasses') return 'Take';
  if (sight.activityBuilding) return 'Enter';
  if (sight.enterableInstitute) return 'Enter';
  if (buildingNPCService(sight)) return 'Examine';
  if (sight.kind === 'surfing') return 'Paddle out';
  if (sight.kind === 'fishing') return 'Fish at';
  if (sight.kind === 'motorcycle') return sight.rented ? 'Ride' : 'Examine';
  if (sight.id === 'zoo-monkeys') return 'Steal monkey from';
  if (sight.kind === 'bunny') return 'Pet';
  if (sight.kind === 'zoo') return sight.tigerLoose ? 'Examine' : 'Release tiger at';
  const verbs: Record<string, string> = {
    nightlife: 'Enter',
    gondola: 'Ride gondola',
    airship: 'Rent airship',
    bike: 'Ride bicycle',
    windsurf: 'Go windsurfing',
    whale: 'Jump over',
    guest: 'Talk to',
    ducks: 'Feed ducks',
  };
  return verbs[sight.kind || ''] || (sight.id === 'sutro' ? 'Climb' : 'Examine');
}
