# No Excuses — the gate, one line per section

**An index, not a history.** Which section a check lives in, the feedback lines that section stands for, and the name `--only`
takes. The paragraphs builds 14–46 appended here are in `../docs/GATE-HISTORY.md`, untouched and frozen. The rules for adding a
check are in `../CLAUDE.md` → The gate.

- **The gate:** `npm test` with no flags, once, before the push. It prints each failure, one line per section and the verdict.
- **The fix loop:** `npm test -- --only <section> --bail`. `--from 44` runs build 44 and everything after it, `--verbose` prints
  every pass line, `--labels <file>` writes every check by section. A partial run says PARTIAL RUN and never stands in for the gate.
- **A new section** adds one row here. A check added to an existing section changes that row only if the section now stands for a
  feedback line it did not before.

| `--only` | Section, as printed | Stands for |
|---|---|---|
| `static` | static checks | A6 one build number (v18 S.2 `v0.N`), A2 `config/` is data, A3 engine imports, A4 no screen imports a screen; v16 §1 / 1.6 / §5 (music data, the unlock sound, one-line intro) with v17 B.30; L5's Reaction budgets (v14 C.1–C.4, v18 B.1c / B.3, v19 C.5 / C.6, v24 F.1) |
| `cold start` | cold start (empty storage) | L1 the title sequence plays on a new profile; v14 1.2 NO EXCUSES is one node that never moves |
| `locked decisions` | locked decisions (fresh profile) | L1, L2, L3, L7, L9 on a fresh profile — runs `cold start` with it |
| `pick sheets` | pick sheets (all unlocked) | every game's pick sheet and every side screen opens (v23 L.4a `s-custom`) |
| `sheet copy` | sheet copy comes from SET_COPY (L5) | L5 / v14 §5 every Set and Streak line on every sheet comes from `SET_COPY` |
| `one set run` | one Set run and one Streak run per game (first mode) | a Set and a Streak of every game driven to its result; v14 6.3 / 6.18, v15 3.9, v16 A.3, v18 B.3d |
| `pass & play` | pass & play Quick Tap | L3 pass & play: two whole runs with the hand-over screen between |
| `two-player` | two-player (v15 section 4) | v15 §4.1–4.6 turn-taking inside one run, Sequence and Find versus; A.3 / L10 nothing stored |
| `storage` | storage fixtures | A5 the one key `ne` and its ladder to v6 (v18 B.2 / B.4, v19 C.5, v21 F.4, v23 L.10 / L.7c), corrupt records, the 600-run cap |
| `challenge` | challenge links | S1 a hostile score lands as text; S2 a bad link is no challenge and a link's run is never on a board |
| `side screens` | side screens (v14 section 8) | v14 8.1–8.10 (Customise as v23 L.4a / L.11a left it) |
| `key` | the key (v14 section 9) | v14 §9 and C.5–C.7 — contributors and count from the config, a bar per combination, a bar clears once and solo only; the meter line (A.6 / v23 L.8a) |
| `chain` | the chain and its screens (v15 sections 1 and 2) | v15 §1.0–1.5 and §2.1–2.5 with L6 — thresholds either side of the line, one requirement builder, a mid-run earn survives a quit |
| `runs` | the runs (v15 section 3) | v15 §3.1–3.12 with L4 / L5 |
| `keys` | the keys, the surface and #375 (v15 sections 5 and 6) | v15 §5.1–5.4 and §6.1–6.5; #375a–c two-player defects |
| `button actions` | button actions (every data-act at least once) | every `data-act` control driven at least once |
| `build 27` | build 27 — v16 | v16 (batch 12) — the music engine, the Timing unlock, Find versus, the intro, A.3 |
| `build 28` | build 28 - v17 sections B.1 to B.18 | v17 §B.1–B.18 — the chain and the scoring |
| `build 29` | build 29 - v17 sections B.19 to B.26 | v17 §B.19–B.26 — the front of the app |
| `build 30` | build 30 - v17 sections B.27 to B.33 | v17 §B.27–B.33 — music and sound |
| `build 31` | build 31 - v18 sections B.1 to B.14 | v18 §B.1–B.14 — the runs |
| `build 32` | build 32 - v19 section C and v18 sections B.15 to B.27 | v19 §C.1–C.6; v18 §B.15–B.27 — Go / No-go's deal and score, the three tiers, the chests |
| `build 33` | build 33 - v18 sections B.28 to B.32 | v18 §B.28–B.32 — the Music row, `cut()`, locked lines, self-hosted fonts |
| `build 35` | build 35 - batch 15, bugs and the runs | v21 §F.1–F.5, §G.7; v20 §D.1–D.3, §D.8–D.10; #415; the Verdict Desk |
| `build 36` | build 36 - the frozen clock and the verdict export | v22 §J.1; the Verdict Desk export (version 658) |
| `build 37` | build 37 - keys and chests | v21 §G.1–G.4, §G.8; v20 §D.4, §D.7; v22 §K; Aiden's 2026-09-14 data fixes (#414) |
| `build 38` | build 38 - the tile keeps its amber, Author waits for the Pro chest | Aiden's two answers to build 37 — v22 §K's tile, Author waits for the Pro chest. `--only "build 38"` runs both parts |
| `build 38` | build 38 - #426 Pro and Author placeholders | #426 (A.2 amended) placeholders, NEVER OVERWRITE, retro credit on arrival; v24 §E |
| `build 39` | build 39 - batch 16, the surface | v23 §L.2–L.5 — Customise out of Progress, the partition, the labels, the stamp |
| `build 40` | build 40 - batch 16, four chests and the meter | v23 §L.8 a–c f, §L.10 a–c e, §L.11 a c, §L.12, §M.2; v21 G.8 extended |
| `build 41` | build 41 - batch 16, the moments | v23 §L.6, §L.8 d–e, §L.9 a–d, §L.10 d, §L.11 b d e |
| `build 42` | build 42 - batch 16, the key themes | v23 §L.7 a–e |
| `build 43` | build 43 - batch 17, chests and keys | v24 §A, §B.1–B.3, §B.5, §C |
| `build 44` | build 44 - batch 17, the key roster, Aiden's bars, the goal and six game tweaks | v24 §D, §E, §F.1, §F.3–F.7 |
| `build 45` | build 45 - batch 18, fixes, state and the catalogue | v25 items 3, 4, 5, 8, 9, 10, 12, 14, 16–21 |
| `build 46` | build 46 - batch 18, the unlock experience, sound and About | v25 items 6, 7, 11, 13, 15, 22, 1, 2, 23 |
