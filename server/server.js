import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import { promises as fs } from "fs";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3000;
const GRID_SIZE = Number.parseInt(process.env.GRID_SIZE || "30", 10);
const GRID_WIDTH = Number.parseInt(process.env.GRID_WIDTH || String(GRID_SIZE), 10);
const GRID_HEIGHT = Number.parseInt(process.env.GRID_HEIGHT || String(GRID_SIZE), 10);

const dataDir = path.join(__dirname, "..", "data");
const dataFile = path.join(dataDir, "grid.json");

const clients = new Map();
let grid = createEmptyGrid(GRID_WIDTH, GRID_HEIGHT);
let saveTimer = null;

app.use(express.static(path.join(__dirname, "..", "public")));

function createEmptyGrid(width, height) {
  return Array.from({ length: width * height }, () => null);
}

function cleanName(raw) {
  if (!raw) return "Player";
  const trimmed = String(raw).trim();
  if (!trimmed) return "Player";
  return trimmed.slice(0, 20);
}

function randomColor() {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue} 70% 55%)`;
}

async function loadGrid() {
  try {
    const file = await fs.readFile(dataFile, "utf8");
    const parsed = JSON.parse(file);
    if (parsed.width !== GRID_WIDTH || parsed.height !== GRID_HEIGHT || !Array.isArray(parsed.cells)) {
      return;
    }
    grid = parsed.cells.map((cell) => (cell ? { ...cell } : null));
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("Failed to load grid:", error);
    }
  }
}

async function saveGrid() {
  try {
    await fs.mkdir(dataDir, { recursive: true });
    const payload = JSON.stringify({
      width: GRID_WIDTH,
      height: GRID_HEIGHT,
      cells: grid,
      updatedAt: new Date().toISOString()
    });
    await fs.writeFile(dataFile, payload, "utf8");
  } catch (error) {
    console.error("Failed to save grid:", error);
  }
}

function scheduleSave() {
  if (saveTimer) {
    clearTimeout(saveTimer);
  }
  saveTimer = setTimeout(() => {
    saveGrid();
    saveTimer = null;
  }, 500);
}

function broadcast(payload) {
  const data = JSON.stringify(payload);
  for (const client of wss.clients) {
    if (client.readyState === 1) {
      client.send(data);
    }
  }
}

function handleClaim(index, player) {
  if (index < 0 || index >= grid.length) return { ok: false, reason: "out-of-range" };
  if (grid[index]) return { ok: false, reason: "already-claimed" };

  grid[index] = {
    id: player.id,
    name: player.name,
    color: player.color,
    claimedAt: Date.now()
  };

  scheduleSave();

  broadcast({
    type: "update",
    index,
    owner: grid[index]
  });

  return { ok: true };
}

wss.on("connection", (ws) => {
  const player = {
    id: crypto.randomUUID(),
    name: "Player",
    color: randomColor()
  };

  clients.set(ws, player);

  ws.send(
    JSON.stringify({
      type: "welcome",
      player
    })
  );

  ws.send(
    JSON.stringify({
      type: "init",
      width: GRID_WIDTH,
      height: GRID_HEIGHT,
      cells: grid
    })
  );

  ws.on("message", (message) => {
    let payload;
    try {
      payload = JSON.parse(message.toString());
    } catch {
      return;
    }

    if (!payload || typeof payload.type !== "string") return;

    if (payload.type === "hello") {
      const updatedName = cleanName(payload.name);
      player.name = updatedName;
      ws.send(JSON.stringify({ type: "player", player }));
      return;
    }

    if (payload.type === "claim") {
      const index = Number.parseInt(payload.index, 10);
      const result = handleClaim(index, player);
      ws.send(JSON.stringify({ type: "claim-result", index, ...result }));
    }
  });

  ws.on("close", () => {
    clients.delete(ws);
  });
});

await loadGrid();

server.listen(PORT, () => {
  console.log(`Shared grid server running on http://localhost:${PORT}`);
});
