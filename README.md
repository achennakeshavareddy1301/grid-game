# Shared Grid

A realtime shared grid where anyone can claim tiles and see updates instantly.

## Tech choices
- Backend: Node.js + Express + ws for lightweight WebSocket broadcasts.
- State: In-memory grid with optional JSON persistence to disk.
- Frontend: JS with a stylized, responsive grid UI.

## Run locally
1. Install dependencies: `npm install`
2. Start the server: `npm run dev`
3. Open `http://localhost:3000`

## Deploy
### Backend (Render)
1. Create a new Web Service from this repo.
2. Set Build Command to `npm install`.
3. Set Start Command to `npm start`.
4. Set environment variables if needed: `GRID_SIZE`, `GRID_WIDTH`, `GRID_HEIGHT`.
5. Render will assign a public URL like `https://your-service.onrender.com`.

### Frontend (Vercel)
Deploy the same repo to Vercel as a static site. The frontend needs the WebSocket URL for the Render backend.

Options to set the WebSocket URL:
- Add a query param once: `https://your-vercel-app.vercel.app/?ws=wss://your-service.onrender.com`
- Or in the browser console run: `localStorage.setItem("shared-grid-ws", "wss://your-service.onrender.com")`

The app will remember the URL in localStorage for future visits.

## Configuration
- `GRID_SIZE=30` for square grids (default).
- `GRID_WIDTH` and `GRID_HEIGHT` for custom sizes.
- `PORT=3000` to change the server port.

## Data persistence
Grid state is saved to `data/grid.json` on each claim (debounced).
