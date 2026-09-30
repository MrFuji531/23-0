# Full Side
Independent all-era AFL 22-player drafting game. Research and methodology: `public/research.html`.

## Run
- `npm run dev` → http://127.0.0.1:4173
- `npm test` → engine and data validation, including 100 completed drafts
- `npm run build` → static output in `dist/`

No npm dependencies. Serve the built files from a static host (not file://).

## Refresh data
Install DuckDB in a Python virtual environment. Download `https://github.com/jimmyday12/fitzroy_data/releases/download/data/afltables_player_stats.parquet` once, then run:

`python scripts/build-data.py /path/to/afltables_player_stats.parquet`

The current snapshot includes matches through 2026-09-26. The script retains provenance and the original file hash. Match data is AFL Tables via fitzRoy; this project does not contain 23-0's source or catalogue. Source licences/permissions should be settled before public/commercial redistribution; the code licence of a collection library is not a licence to every dataset it collects.

## Architecture
- `public/engine.js`: seeded draws, validation, positions, scoring.
- `public/app.js`: browser UI, local saves, URL sharing and optional WebMCP tools.
- `public/players.json`: independent processed dataset, 1990–2026.
- `scripts/build-data.py`: repeatable DuckDB transformation and rating calculation.
- `public/research.html`: evidence, unknowns, source evaluation and limitations.

Ratings are original heuristics, not official AFL ratings or the hidden 23-0 formula. Positional labels are estimates. Shared challenges are casual and client-side, not tamper-proof multiplayer.
