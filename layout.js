import{GAME_CONFIG}from './config.js';
/* A: original v3.1 target cells; B: reference-proportioned constant-width board.
   Reference white-frame straight edges: 1050px / 1080px = 35/36 ≈97.22%.
   The screen itself is max 440px; neither mode depends on progress or grid data. */
export const TARGET_CELL_PX=52,BOARD_SIDE_MARGIN=4,MAX_SCREEN_WIDTH=440,CONSTANT_BOARD_RATIO=35/36;
export const sizingMode=(mode=GAME_CONFIG.boardSizingMode)=>mode==='A'?'A':'B';
export function boardMaxWidth(n,mode=GAME_CONFIG.boardSizingMode){return sizingMode(mode)==='A'?n*TARGET_CELL_PX+(n-1)*3+2*3+2*8:MAX_SCREEN_WIDTH*CONSTANT_BOARD_RATIO}
export function boardWidthCSS(mode=GAME_CONFIG.boardSizingMode){return sizingMode(mode)==='A'?'calc(100% - 8px)':`${CONSTANT_BOARD_RATIO*100}%`}
export function boardViewportWidthCSS(mode=GAME_CONFIG.boardSizingMode){return sizingMode(mode)==='A'?'calc(100vw - 8px)':`${CONSTANT_BOARD_RATIO*100}vw`}
export function boardMetrics(n,viewportWidth,mode=GAME_CONFIG.boardSizingMode){const screen=Math.min(viewportWidth,MAX_SCREEN_WIDTH),available=sizingMode(mode)==='A'?screen-8:screen*CONSTANT_BOARD_RATIO,board=Math.min(available,boardMaxWidth(n,mode));return{mode:sizingMode(mode),board_px:board,cell_px:(board-16-6-(n-1)*3)/n}}
export const FLIGHT_MS=1500,FLIGHT_STAGGER_MS=100;
export const landingAt=i=>FLIGHT_MS+i*FLIGHT_STAGGER_MS;
export const soakAt=n=>landingAt(n-1)+350;
export const reactionAt=n=>Math.max(2800,soakAt(n)+300);
