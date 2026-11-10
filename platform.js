export function isIOS(nav=globalThis.navigator){return /iPad|iPhone|iPod/.test(nav?.userAgent||'')||(nav?.platform==='MacIntel'&&nav?.maxTouchPoints>1)}
export function isStandalone(nav=globalThis.navigator,win=globalThis){return nav?.standalone===true||win.matchMedia?.('(display-mode: standalone)').matches===true}
export function installCopy(nav=globalThis.navigator,win=globalThis){return isStandalone(nav,win)?'Installed':isIOS(nav)?'Share → Add to Home Screen':'Use your browser menu → Install app'}
