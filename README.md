# Full Side and Classic
Local five-player Classic and 22-player Full Side, using the same spin → select → eligible placement loop. Both modes run here; neither redirects to the original site.

## Run
- `npm run dev` → http://127.0.0.1:4173
- `npm test` → eight checks including 100 Classic and 100 Full Side drafts
- `npm run build` → static `dist/` output

## Gameplay and data
The active `public/game-players.json` adapts the public 23-0 catalogue snapshot from 1 October 2026, retaining candidate stats, ordering inputs and position eligibility. To regenerate, download https://23-0.com/data/players/players.json and run `python3 scripts/build-reference-data.py /path/to/players.json`.

Each pick needs its own spin. Each game has one club respin and one era respin. Used people cannot recur. Players can move into eligible empty slots. Final placement opens results automatically. Classic avoids repeating clubs; Full Side reuses them once playable unused clubs run out. Both prefer unused eras first.

Scoring is an independent percentile model, not the original private server formula. Research, sources and limitations are in `public/research.html`. The earlier independent AFL Tables/fitzRoy dataset and `scripts/build-data.py` remain available as a research alternative.

## Persistence
Version 2 saves are separate for Classic and Full Side. Earlier `full-side-v1` storage is retained untouched; those unrestricted-position saves are not imported into the new rule set. Seed links include the mode. Completed lineup links include validated game state. Client-side links are casual challenges, not a competitive anti-cheat system.

## Verification
Original Classic manually played through five picks and both respins to automatic results. Browser verification covers local mode entry, repeated spins, role filtering, desktop placement, mobile drawers, respins, reload recovery and automatic results. The engine suite checks 200 completed drafts plus invalid state and move handling.
