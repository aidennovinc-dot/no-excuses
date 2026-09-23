/* No Excuses — the gate's sections, in order (build 61). Pure data: the parallel runner reads it without starting a browser.
   `file` is the module under sections/, `names` what --only / --from match and the summary line prints (GATE.md indexes them),
   and `clock` the fastest test clock that section is allowed (lib/clock.mjs) when it cannot take the default — each one says why.
   The ORDER is the gate's order: a full run prints its sections in it, and --from counts along it. A new section is one row. */
export const SECTIONS = [
  { file: "01-static-checks.mjs", names: ["static checks"] },
  { file: "02-cold-start-empty-storage.mjs", names: ["cold start (empty storage)"] },
  { file: "03-locked-decisions-fresh-profile.mjs", names: ["locked decisions (fresh profile)"] },
  { file: "04-pick-sheets-all-unlocked.mjs", names: ["pick sheets (all unlocked)"] },
  { file: "05-pick-sheets-all-unlocked.mjs", names: ["pick sheets (all unlocked)"] },
  { file: "06-sheet-copy-comes-from-set-copy-l5.mjs", names: ["sheet copy comes from SET_COPY (L5)"] },
  { file: "07-one-set-run-and-one-streak-run-per-game-first-mo.mjs", names: ["one Set run and one Streak run per game (first mode)"] },
  { file: "08-pass-play-quick-tap.mjs", names: ["pass & play Quick Tap"] },
  { file: "09-two-player-v15-section-4.mjs", names: ["two-player (v15 section 4)"] },
  { file: "10-storage-fixtures.mjs", names: ["storage fixtures"] },
  { file: "11-challenge-links.mjs", names: ["challenge links"] },
  { file: "12-side-screens-v14-section-8.mjs", names: ["side screens (v14 section 8)"] },
  { file: "13-key-v14-section-9.mjs", names: ["the key (v14 section 9)"] },
  { file: "14-chain-and-its-screens-v15-sections-1-and-2.mjs", names: ["the chain and its screens (v15 sections 1 and 2)"] },
  // the runs are SIX parts (build 61): at ×1 they were 400s, the longest section in the gate by a third
  { file: "15a-runs-v15-section-3.mjs", names: ["the runs (v15 section 3)"] },
  { file: "15b-runs-v15-section-3.mjs", names: ["the runs (v15 section 3)"] },
  { file: "15c-runs-v15-section-3.mjs", names: ["the runs (v15 section 3)"] },
  { file: "15d-runs-v15-section-3.mjs", names: ["the runs (v15 section 3)"] },
  { file: "15e-runs-v15-section-3.mjs", names: ["the runs (v15 section 3)"] },
  { file: "15f-runs-v15-section-3.mjs", names: ["the runs (v15 section 3)"] },
  // ×2: v26 items 10 / 11 (the key reveals) and 57.11 (the backgrounds) answer a ceremony tap by tap and time it from the tap; the
  // driver's round trips and the page's frames are multiplied by the clock, and under machine load ×4 still flaked. ×2 held.
  { file: "16-keys-the-surface-and-375-v15-sections-5-and-6.mjs", names: ["the keys, the surface and #375 (v15 sections 5 and 6)"], clock: 2 },
  { file: "17-button-actions-every-data-act-at-least-once.mjs", names: ["button actions (every data-act at least once)"] },
  { file: "18-chests.mjs", names: ["chests"] },
  // ×1, WEB AUDIO: §B1 (End of run lands before the verdict) and v27 item 1 / 57.1 (each title beat lands on its animation) measure
  // the AudioContext's clock against the page's, and an AudioContext's currentTime cannot be scaled.
  { file: "19-music.mjs", names: ["music"], clock: 1 },
  { file: "20-gauntlets.mjs", names: ["gauntlets"] },
  { file: "21-build-27-v16.mjs", names: ["build 27 — v16"] },
  { file: "22-build-28-v17-sections-b-1-to-b-18.mjs", names: ["build 28 - v17 sections B.1 to B.18"] },
  { file: "23-build-29-v17-sections-b-19-to-b-26.mjs", names: ["build 29 - v17 sections B.19 to B.26"] },
  { file: "24-build-30-v17-sections-b-27-to-b-33.mjs", names: ["build 30 - v17 sections B.27 to B.33"] },
  { file: "25-build-31-v18-sections-b-1-to-b-14.mjs", names: ["build 31 - v18 sections B.1 to B.14"] },
  { file: "26-build-32-v19-section-c-and-v18-sections-b-15-to.mjs", names: ["build 32 - v19 section C and v18 sections B.15 to B.27"] },
  { file: "27-build-33-v18-sections-b-28-to-b-32.mjs", names: ["build 33 - v18 sections B.28 to B.32"] },
  // ×1, WEB AUDIO: F.2 / J.1 drive audio.js's frozen-clock detector (`currentTime` must move over LIVE_MS of performance.now). On a
  // scaled page the audio clock lags by construction, the detector rebuilds the context, and the section suspends a closed one.
  { file: "28-build-35-batch-15-bugs-and-the-runs.mjs", names: ["build 35 - batch 15, bugs and the runs"], clock: 1 },
  { file: "29-build-36-the-frozen-clock-and-the-verdict-export.mjs", names: ["build 36 - the frozen clock and the verdict export"], clock: 1 },
  { file: "30-build-37-keys-and-chests.mjs", names: ["build 37 - keys and chests"] },
  { file: "31-build-38-the-tile-keeps-its-amber-author-waits-f.mjs", names: ["build 38 - the tile keeps its amber, Author waits for the Pro chest","build 38 - #426 Pro and Author placeholders"] },
  { file: "32-build-39-batch-16-the-surface.mjs", names: ["build 39 - batch 16, the surface"] },
  { file: "33-build-40-batch-16-four-chests-and-the-meter.mjs", names: ["build 40 - batch 16, four chests and the meter"] },
  { file: "34-build-41-batch-16-the-moments.mjs", names: ["build 41 - batch 16, the moments"] },
  { file: "35-build-42-batch-16-the-key-themes.mjs", names: ["build 42 - batch 16, the key themes"] },
  { file: "36-build-43-batch-17-chests-and-keys.mjs", names: ["build 43 - batch 17, chests and keys"] },
  { file: "37-build-44-batch-17-the-key-roster-aiden-s-bars-th.mjs", names: ["build 44 - batch 17, the key roster, Aiden's bars, the goal and six game tweaks"] },
  { file: "38-build-45-batch-18-fixes-state-and-the-catalogue.mjs", names: ["build 45 - batch 18, fixes, state and the catalogue"] },
  // build 46 is SIX parts (build 61), so the two that have to run at ×1 are a third of it
  { file: "39a-build-46-batch-18-the-unlock-experience-sound-an.mjs", names: ["build 46 - batch 18, the unlock experience, sound and About"] },
  // ×1: item 11 / v27 item 14 times the earn animation with the DRIVER's wall clock (`Date.now()` in node, from 320ms after the
  // screen shows), and its lower bound — KEY_EARN.ms − 400 — is only met with a real driver's latency on top. Fails at ×2, ×3, ×5.
  { file: "39b-build-46-batch-18-the-unlock-experience-sound-an.mjs", names: ["build 46 - batch 18, the unlock experience, sound and About"], clock: 1 },
  { file: "39c-build-46-batch-18-the-unlock-experience-sound-an.mjs", names: ["build 46 - batch 18, the unlock experience, sound and About"] },
  { file: "39d-build-46-batch-18-the-unlock-experience-sound-an.mjs", names: ["build 46 - batch 18, the unlock experience, sound and About"] },
  // ×1: items 1 / 2 fire a sound off an animation's own startTime + delay (document.timeline) and measure when it fired on
  // performance.now; the two clocks start a few real ms apart, and the test clock multiplies that gap into hundreds of page ms
  { file: "39e-build-46-batch-18-the-unlock-experience-sound-an.mjs", names: ["build 46 - batch 18, the unlock experience, sound and About"], clock: 1 },
  { file: "39f-build-46-batch-18-the-unlock-experience-sound-an.mjs", names: ["build 46 - batch 18, the unlock experience, sound and About"] },
];
