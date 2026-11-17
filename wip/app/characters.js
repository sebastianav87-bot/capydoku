// Jun/Remy: approved v5 cutouts. Bloom: approved v6.4 replacement. Dark outlines are baked in.
export const CAST={jun:'starters/jun.png',bloom:'v64/starters/bloom.png',remy:'starters/remy.png',doze:'starters/doze.png'};
export const CHARACTERS={Jun:{id:'jun',name:'Jun',color:'#32417B',accessory:'Navy scarf',power:'peek',line:'Peek: reveal one capy'},Bloom:{id:'bloom',name:'Bloom',color:'#E2AD32',accessory:'Sunflower',power:'secondChance',line:'Second chance: undo mistake'},Remy:{id:'remy',name:'Remy',color:'#A65430',accessory:'Rust beanie',power:'nap',line:'Nap: 3 safe moves'}};
export function label(name){return CHARACTERS[name]?.name||'Jun'}
export function sprite(name='Jun',pose='board'){return 'assets/'+CAST[(CHARACTERS[name]||CHARACTERS.Jun).id]}
export function sceneSprite(scene){return scene==='sleep'?'assets/'+CAST.doze:pieceSprite()}

// Generic board pieces and the v1-style celebration art are independently swappable.
export const BOARD_SPRITE='v6/generic-capy.svg'; // Approved v6.2 embedded 51px@3x illustration, not vector art.
export const PIECES={board:BOARD_SPRITE,peek:BOARD_SPRITE,jump:'v6/capy-jump.png',swim:'v6/capy-sit.png'};
export const pieceSprite=(pose='board')=>'assets/'+(PIECES[pose]||PIECES.board);

// Approved v6.1 power art, with one drop-in map for every surface.
export const POWER_ICONS={Jun:'assets/power-icons/peek.svg',Bloom:'assets/power-icons/second-chance.svg',Remy:'assets/power-icons/nap.svg'};
export function powerIconSrc(subject='Jun'){const name=CHARACTERS[subject]?subject:Object.keys(CHARACTERS).find(n=>CHARACTERS[n].power===subject)||'Jun';return POWER_ICONS[name]}

export const POWER_IDENTITY={"Jun":{"name":"Peek","kind":"peek","phrase":"Reveal one hidden capy","color":"#32417B","light":"#E3E6F0"},"Bloom":{"name":"Second chance","kind":"secondChance","phrase":"Undo mistake, restore one orange","color":"#E2AD32","light":"#F5E8BA"},"Remy":{"name":"Nap","kind":"nap","phrase":"3 moves, no lost oranges","color":"#A65430","light":"#F0DCD0"}};
export const POWER_FACES={Jun:"assets/power-icons/jun-face.png",Bloom:"assets/v64/power-icons/bloom-face.png",Remy:"assets/power-icons/remy-face.png"};
export function powerIdentity(selected="Jun",kind=CHARACTERS[selected]?.power){const companion=CHARACTERS[selected]?selected:"Jun",owner=Object.keys(POWER_IDENTITY).find(n=>POWER_IDENTITY[n].kind===kind)||companion;return{...POWER_IDENTITY[owner],companion,icon:POWER_ICONS[owner],face:POWER_FACES[companion]}}

// All Bloom bodies share the approved v6.4 master; small rendered sizes get the supplied density family.
export const BLOOM_ROOT='assets/v64/starters/';
export function bloomResponsive(cssSize){const size=[32,44,51,64].find(n=>n>=cssSize);return size?{srcset:[1,2,3].map(d=>`${BLOOM_ROOT}bloom-${size}@${d}x.png ${d}x`).join(', '),size}:null}
export function updateResponsiveCharacters(root){for(const img of root.querySelectorAll('img'))if(img.getAttribute('src')===sprite('Bloom')){const width=img.getBoundingClientRect().width;if(width<=0)continue;const set=bloomResponsive(width);if(set){if(img.getAttribute('srcset')!==set.srcset)img.srcset=set.srcset;img.dataset.densityFamily=String(set.size)}else{img.removeAttribute('srcset');delete img.dataset.densityFamily}}}
