# 23-0 — Full Side and Classic
Local five-player Classic and 23-player Full Side, using the same spin → select → eligible placement loop. Both modes run here; neither redirects to the original site.

## Run
- `npm run dev` → http://127.0.0.1:4173
- `npm test` → thirteen checks including 100 Classic and 100 Full Side drafts
- `npm run build` → static `dist/` output

## Hosting
GitHub Pages publishes this game from `.github/workflows/pages.yml`. Each push to `main` runs the engine tests, builds `dist/`, and deploys the resulting static files. The GitHub remote is named `github`; publish source changes with `git push github main`. The earlier Sites remote and configuration are retained for reference.

## Gameplay and data
The active `public/game-players.json` adapts the public 23-0 catalogue snapshot from 1 October 2026, retaining candidate stats, ordering inputs and position eligibility. To regenerate, download https://23-0.com/data/players/players.json and run `python3 scripts/build-reference-data.py /path/to/players.json`.

Each pick needs its own spin. Each game has one club respin and one era respin. Used people cannot recur. Players can move into eligible empty slots. Final placement opens results automatically. Classic avoids repeating clubs; Full Side reuses them once playable unused clubs run out. Both prefer unused eras first.

Scoring compares each player with eligible role-and-era peers. Interchange uses only eligible roles. Ratings are `5 + 90 × weighted percentile + experience bonus (0–3) + Brownlow bonus (0–2)`. Starting players have weight 1 and five interchange players weight 0.65. The team average faces 23 fixed thresholds from 24 to 94. The 1.4-second result count-up follows the reference presentation and respects reduced motion. This is an independent game model, not the original private server formula. Research, sources and limitations are in `public/research.html`. The earlier independent AFL Tables/fitzRoy dataset and `scripts/build-data.py` remain available as a research alternative.

## Persistence
Version 3 saves are separate for Classic and Full Side using the existing mode-specific storage keys. In-progress version 2 saves gain a fifth bench slot. Completed 22-player version 2 saves stay readable with a legacy-roster label; starting another draft uses 23 players. Earlier `full-side-v1` storage is retained untouched; those unrestricted-position saves are not imported into the new rule set. Seed links include the mode. Completed lineup links include validated game state. Client-side links are casual challenges, not a competitive anti-cheat system.

## Verification
Original Classic manually played through five picks and both respins to automatic results. Browser verification covers local mode entry, repeated spins, role filtering, desktop placement, mobile drawers, respins, reload recovery and automatic results. The engine suite checks 200 completed drafts plus invalid state and move handling.

## Balance audit
Run `node scripts/audit-scoring.mjs` for 250 drafts per strategy in both modes. Output is `public/scoring-audit.json`. Latest full-side mean wins: random 9.61, first legal list entry 18.52, greedy highest rating 21.61. These are synthetic gameplay checks, not validation against actual AFL results.
