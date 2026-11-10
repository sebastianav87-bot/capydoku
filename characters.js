// Supplied v5 starter cutouts, unchanged; dark outlines are baked in.
export const CAST={jun:'starters/jun.png',bloom:'starters/bloom.png',remy:'starters/remy.png',doze:'starters/doze.png',base:'starters/base.png'};
export const CHARACTERS={Jun:{id:'jun',name:'Jun',color:'#32417B',accessory:'Navy scarf',power:'peek',line:'Peek: reveal one capy'},Bloom:{id:'bloom',name:'Bloom',color:'#E2AD32',accessory:'Sunflower',power:'secondChance',line:'Second chance: undo mistake'},Remy:{id:'remy',name:'Remy',color:'#A65430',accessory:'Rust beanie',power:'nap',line:'Nap: 3 safe moves'}};
export function label(name){return CHARACTERS[name]?.name||'Jun'}
export function sprite(name='Jun',pose='board'){return 'assets/'+CAST[(CHARACTERS[name]||CHARACTERS.Jun).id]}
export function sceneSprite(scene){return 'assets/'+CAST[scene==='sleep'?'doze':'base']}

// Board identity is independent of the starter / companion.
export const BOARD_SPRITE='assets/generic-capy.svg';
