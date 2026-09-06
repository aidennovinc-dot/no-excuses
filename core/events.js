/* No Excuses — events (build 18, refactor stage 4). Screens and the run talk through here, never by importing each
   other (A4). on(name, fn) → an off() function; emit(name, data) calls every listener in the order they were added.
   Names in use: screen:change {id} · run:record {run} · run:pass {run} · run:finish {run, isBest, two} · run:abort ·
   lock:ask {g, d, s} · challenge (the parsed link) · store:reset. */
const L={};
export function on(name,fn){ (L[name]||(L[name]=[])).push(fn); return ()=>off(name,fn); }
export function off(name,fn){ if(L[name]) L[name]=L[name].filter(f=>f!==fn); }
export function emit(name,data){ (L[name]||[]).slice().forEach(f=>f(data)); }
