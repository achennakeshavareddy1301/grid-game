# Shared Grid

A realtime shared grid where anyone can claim tiles and see updates instantly.

## Tech choices
- Backend: Node.js + Express + ws for lightweight WebSocket broadcasts.
- State: In-memory grid with optional JSON persistence to disk.
- Frontend: Vanilla JS with a stylized, responsive grid UI.

## Run locally
1. Install dependencies: `npm install`
2. Start the server: `npm run dev`
3. Open `http://localhost:3000`

## Configuration
- `GRID_SIZE=30` for square grids (default).
- `GRID_WIDTH` and `GRID_HEIGHT` for custom sizes.
- `PORT=3000` to change the server port.

## Data persistence
Grid state is saved to `data/grid.json` on each claim (debounced).
