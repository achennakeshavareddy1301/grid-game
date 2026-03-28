const statusEl = document.getElementById("status");
const gridEl = document.getElementById("grid");
const claimedEl = document.getElementById("claimedCount");
const totalEl = document.getElementById("totalCount");
const leaderboardEl = document.getElementById("leaderboard");
const zoomEl = document.getElementById("zoom");
const nameModal = document.getElementById("nameModal");
const nameForm = document.getElementById("nameForm");
const nameInput = document.getElementById("nameInput");
const userNameEl = document.getElementById("userName");
const userIdEl = document.getElementById("userId");
const userColorEl = document.getElementById("userColor");

let activeSocket = null;
let nameListenerAttached = false;

const state = {
  width: 0,
  height: 0,
  cells: [],
  player: null
};

function resolveWebSocketUrl() {
  const params = new URLSearchParams(location.search);
  const queryUrl = params.get("ws");
  if (queryUrl) {
    localStorage.setItem("shared-grid-ws", queryUrl);
  }

  const storedUrl = localStorage.getItem("shared-grid-ws");
  const windowUrl = window.SHARED_GRID_WS_URL;
  const rawUrl = windowUrl || storedUrl;

  if (!rawUrl) {
    const protocol = location.protocol === "https:" ? "wss" : "ws";
    return `${protocol}://${location.host}`;
  }

  if (rawUrl.startsWith("ws://") || rawUrl.startsWith("wss://")) {
    return rawUrl;
  }

  if (rawUrl.startsWith("https://")) {
    return `wss://${rawUrl.slice("https://".length)}`;
  }

  if (rawUrl.startsWith("http://")) {
    return `ws://${rawUrl.slice("http://".length)}`;
  }

  return rawUrl;
}

function connect() {
  const socket = new WebSocket(resolveWebSocketUrl());
  activeSocket = socket;

  socket.addEventListener("open", () => {
    statusEl.textContent = "Connected";
    statusEl.style.background = "#eef8f3";
    statusEl.style.color = "#1c6b57";
  });

  socket.addEventListener("close", () => {
    statusEl.textContent = "Disconnected";
    statusEl.style.background = "#fff3ed";
    statusEl.style.color = "#c3491d";
    setTimeout(connect, 1000);
  });

  socket.addEventListener("message", (event) => {
    const payload = JSON.parse(event.data);

    if (payload.type === "welcome") {
      state.player = payload.player;
      updatePlayerCard();
      requestName();
      return;
    }

    if (payload.type === "player") {
      state.player = payload.player;
      updatePlayerCard();
      return;
    }

    if (payload.type === "init") {
      state.width = payload.width;
      state.height = payload.height;
      state.cells = payload.cells;
      renderGrid();
      updateStats();
      return;
    }

    if (payload.type === "update") {
      state.cells[payload.index] = payload.owner;
      updateCell(payload.index);
      updateStats();
    }
  });

  return socket;
}

function requestName() {
  const saved = localStorage.getItem("shared-grid-name");
  if (saved && activeSocket?.readyState === 1) {
    activeSocket.send(JSON.stringify({ type: "hello", name: saved }));
    return;
  }
  nameModal.classList.add("show");
  nameModal.setAttribute("aria-hidden", "false");
  nameInput.focus();

  if (!nameListenerAttached) {
    nameForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const name = nameInput.value.trim();
      if (!name || !activeSocket) return;
      localStorage.setItem("shared-grid-name", name);
      activeSocket.send(JSON.stringify({ type: "hello", name }));
      nameModal.classList.remove("show");
      nameModal.setAttribute("aria-hidden", "true");
    });
    nameListenerAttached = true;
  }
}

function renderGrid() {
  gridEl.style.setProperty("--grid-width", state.width);
  gridEl.innerHTML = "";

  state.cells.forEach((cell, index) => {
    const button = document.createElement("button");
    button.className = "cell";
    button.dataset.index = index;
    button.style.setProperty("--i", index);
    button.style.animationDelay = `${index * 8}ms`;
    if (cell) {
      applyOwner(button, cell);
    }
    gridEl.appendChild(button);
  });

  totalEl.textContent = state.cells.length;
}

function updateCell(index) {
  const cell = gridEl.querySelector(`[data-index="${index}"]`);
  if (!cell) return;
  applyOwner(cell, state.cells[index]);
}

function applyOwner(cellEl, owner) {
  if (!owner) return;
  cellEl.classList.add("owned");
  cellEl.style.setProperty("--owner", owner.color);
  cellEl.title = `${owner.name} claimed this`;
}

function updatePlayerCard() {
  if (!state.player) return;
  userNameEl.textContent = state.player.name;
  userIdEl.textContent = state.player.id.slice(0, 8);
  userColorEl.style.background = state.player.color;
}

function updateStats() {
  const counts = new Map();
  let claimed = 0;

  state.cells.forEach((cell) => {
    if (cell) {
      claimed += 1;
      counts.set(cell.name, (counts.get(cell.name) || 0) + 1);
    }
  });

  claimedEl.textContent = claimed;
  totalEl.textContent = state.cells.length;

  const leaders = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  leaderboardEl.innerHTML = "";
  leaders.forEach(([name, count]) => {
    const row = document.createElement("div");
    row.className = "row";
    row.innerHTML = `<span>${name}</span><strong>${count}</strong>`;
    leaderboardEl.appendChild(row);
  });

  if (leaders.length === 0) {
    leaderboardEl.innerHTML = "<div class=\"row\">No claims yet</div>";
  }
}

zoomEl.addEventListener("input", (event) => {
  const value = Number.parseInt(event.target.value, 10);
  document.documentElement.style.setProperty("--cell-size", `${value}px`);
});

gridEl.addEventListener("click", (event) => {
  const cell = event.target.closest("button[data-index]");
  if (!cell || !activeSocket || activeSocket.readyState !== 1) return;
  const index = Number.parseInt(cell.dataset.index, 10);
  activeSocket.send(JSON.stringify({ type: "claim", index }));
});

connect();
