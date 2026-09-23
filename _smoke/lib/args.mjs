/* No Excuses — the gate's flags and which sections they pick (build 61). Pure: no server, no browser, no page, so the parallel
   runner (lib/parallel.mjs) and a worker (lib/gate.mjs) read one set of rules and cannot disagree about what `--only` means. */
export const ARGV = process.argv.slice(2);
export const optOf = f => { const i = ARGV.indexOf(f); return i < 0 ? null : ARGV[i + 1]; };
// every flag that takes a value, so the bare argument (a base URL) is never mistaken for one
export const VALUED = ['--only', '--from', '--labels', '--workers', '--pick', '--json', '--clock'];
export const baseArg = ARGV.find((a, i) => !a.startsWith('--') && !VALUED.includes(ARGV[i - 1]));
export const termsOf = s => (s || '').split(',').map(t => t.trim().toLowerCase()).filter(Boolean).map(t => /^\d+$/.test(t) ? 'build ' + t : t);
export const ONLY = termsOf(optOf('--only')), FROM = termsOf(optOf('--from')), PARTIAL = ONLY.length + FROM.length > 0;
export const named = (name, t) => [name.toLowerCase(), name.toLowerCase().replace(/^the /, '')].some(n => n.startsWith(t) && !/[a-z0-9]/.test(n.charAt(t.length)));
// a section that leaves the page, or a name, that a later one reads: asking for the later one runs both, and in one process
export const LEADS = { 'cold start (empty storage)': ['locked decisions (fresh profile)'] };
/* the indices of the sections a run takes, in order — the same answer the build-47 `section()` gave one section at a time:
   --from switches on at the first hit and stays on, --only takes a hit, and a section's LEADS count as its own names */
export function pickSections(list) {
  let fromOn = false; const out = [];
  list.forEach((s, i) => { const all = [...s.names, ...(LEADS[s.names[0]] || [])], hit = ts => ts.some(t => all.some(n => named(n, t)));
    if (hit(FROM)) fromOn = true;
    if (!PARTIAL || fromOn || hit(ONLY)) out.push(i); });
  return out; }
// the terms that matched no section name at all, which the verdict fails on
export const unknownTerms = list => [...ONLY, ...FROM].filter(t => !list.some(s => s.names.some(n => named(n, t))));
