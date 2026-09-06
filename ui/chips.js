/* No Excuses — one helper the board, achievements and customise screens share: mark the chip whose value is selected. */
import { $$ } from "../core.js";
export function chips(scope,key,val){ $$(`[data-chip="${scope}-${key}"]`).forEach(c=>c.classList.toggle('sel',String(c.dataset.v)===String(val))); }
