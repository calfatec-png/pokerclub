const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');
const { PokerGameRoom, THEMES, generateId } = require('./src/pokerEngine');

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.join(__dirname, 'public');
const ASSETS_DIR = path.join(PUBLIC_DIR, 'assets');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.mp3': 'audio/mpeg',
  '.ico': 'image/x-icon'
};

// Map of gameID -> PokerGameRoom
const rooms = new Map();

// Map of sid -> WebSocket Client Context
const wsClients = new Map();

const DEFAULT_OWNER_ID = 'p_teste_owner';

function attachBroadcastHandler(room) {
  room.onBroadcast = (r) => {
    for (const client of wsClients.values()) {
      if (client.gameID === r.id && client.open) {
        const state = r.buildGameStateForPlayer(client.playerID);
        sendSocketIOEvent(client, 'gC', state);
      }
    }
  };
  return room;
}

function seedDemoRooms() {
  // 1) Screenshot 2 & 3 Table: pglzUG33VPJwPc1fl6t6qNeE0
  // Owner: teste, NLH ~ 10 / 20, Halloween 2026 theme, waiting for players
  const room1 = new PokerGameRoom({
    id: 'pglzUG33VPJwPc1fl6t6qNeE0',
    ownerID: DEFAULT_OWNER_ID,
    themeKey: 'halloween-2026',
    smallBlind: 10,
    bigBlind: 20,
    mode: '4fun',
    allowWaitlist: false,
    noOwner: false
  });
  room1.players[DEFAULT_OWNER_ID] = {
    id: DEFAULT_OWNER_ID,
    name: 'teste',
    status: 'watching',
    winCount: 0,
    quitCount: 0,
    isNetworkPlayer: false,
    stack: 0,
    avatarID: null
  };
  room1.emojis[DEFAULT_OWNER_ID] = '😍';
  room1.mEV = 1;
  attachBroadcastHandler(room1);
  rooms.set(room1.id, room1);

  // 2) Screenshot 4 Table: pglSBWynA2aYv1UnG4wAcPr0F
  // NLH ~ 10 / 20, Fat Stack Black/Gold cards on Halloween felt, Lounge mode, live action
  const room2 = new PokerGameRoom({
    id: 'pglSBWynA2aYv1UnG4wAcPr0F',
    ownerID: null,
    noOwner: true,
    themeKey: 'fat-stack',
    smallBlind: 10,
    bigBlind: 20,
    mode: 'club',
    clubID: '21a15333-d7a4-4a1c-8848-35ed7161f4db',
    clubType: 'lounge',
    chipType: 'play',
    minMaxBuyIn: [400, 2000],
    allowWaitlist: false,
    gN: 120
  });
  attachBroadcastHandler(room2);

  const room2Bots = [
    { seat: 1, id: 'bot_fs_1', name: 'WEALTH13ABUXAU', stack: 3922, winCount: 2, quitCount: 1 },
    { seat: 2, id: 'bot_fs_2', name: 'ddjeker', stack: 2497, winCount: 8, quitCount: 0 },
    { seat: 3, id: 'bot_fs_3', name: 'TiffUnhinged', stack: 1581, winCount: 2, quitCount: 0 },
    { seat: 4, id: 'bot_fs_4', name: 'JustIn', stack: 1660, winCount: 2, quitCount: 0 },
    { seat: 5, id: 'bot_fs_5', name: 'Ghost®', stack: 1990, winCount: 0, quitCount: 1 },
    // Seat 6 left open so you or a friend can click SIT immediately, or watch 8 bots play!
    { seat: 7, id: 'bot_fs_7', name: 'Mrdestroyer', stack: 2000, winCount: 1, quitCount: 0 },
    { seat: 8, id: 'bot_fs_8', name: 'CheckYours', stack: 4729, winCount: 5, quitCount: 0 },
    { seat: 9, id: 'bot_fs_9', name: 'BlueGiraffe', stack: 1470, winCount: 1, quitCount: 0 }
  ];
  for (const b of room2Bots) {
    room2.addBot(b);
  }
  room2.dealerSeat = 3; // Next hand dealer rotates to Seat 4 (JustIn), SB Seat 5 (Ghost®), BB Seat 7 (Mrdestroyer)
  room2.startGame();
  rooms.set(room2.id, room2);

  // 3) Screenshot 5 Table: pglGDWoVYpdfb7zhPbWp1mCi4
  // NLH ~ 1 / 2, Halloween 2026 cards & felt, Waitlist enabled + Lounge button, John Strategy with 🤖 emoji
  const room3 = new PokerGameRoom({
    id: 'pglGDWoVYpdfb7zhPbWp1mCi4',
    ownerID: null,
    noOwner: true,
    themeKey: 'halloween-2026',
    smallBlind: 1,
    bigBlind: 2,
    mode: 'club',
    clubID: '21a15333-d7a4-4a1c-8848-35ed7161f4db',
    clubType: 'lounge',
    chipType: 'play',
    minMaxBuyIn: [40, 200],
    allowWaitlist: true,
    gN: 85
  });
  attachBroadcastHandler(room3);

  const room3Bots = [
    { seat: 1, id: 'bot_hw_1', name: 'focusedemu', stack: 200, winCount: 3, quitCount: 2 },
    { seat: 2, id: 'bot_hw_2', name: 'kakk', stack: 196, winCount: 0, quitCount: 0 },
    { seat: 3, id: 'bot_hw_3', name: 'gsw__AA', stack: 221, winCount: 2, quitCount: 0 },
    { seat: 4, id: 'bot_hw_4', name: 'RiverRegis', stack: 479, winCount: 3, quitCount: 0 },
    { seat: 5, id: 'bot_hw_5', name: 'Thug.123', stack: 382, winCount: 2, quitCount: 1 },
    { seat: 6, id: 'bot_hw_6', name: 'Carl Kim', stack: 192, winCount: 2, quitCount: 0 },
    { seat: 7, id: 'bot_hw_7', name: 'John Strategy', stack: 230, winCount: 5, quitCount: 0, emoji: '🤖' },
    { seat: 8, id: 'bot_hw_8', name: 'Rk733', stack: 200, winCount: 0, quitCount: 0, statusOverride: 'waitingNextGameToEnter' },
    { seat: 9, id: 'bot_hw_9', name: 'Tami webb', stack: 625, winCount: 3, quitCount: 0 },
    { seat: 10, id: 'bot_hw_10', name: 'eggricyang', stack: 170, winCount: 2, quitCount: 0 }
  ];
  for (const b of room3Bots) {
    room3.addBot(b);
  }
  room3.dealerSeat = 9; // Rotates to Seat 10 (eggricyang)
  room3.startGame();
  rooms.set(room3.id, room3);
}

seedDemoRooms();

function getOrCreateRoom(gameID) {
  if (!rooms.has(gameID)) {
    const room = new PokerGameRoom({
      id: gameID,
      ownerID: DEFAULT_OWNER_ID,
      themeKey: 'halloween-2026',
      smallBlind: 10,
      bigBlind: 20
    });
    attachBroadcastHandler(room);
    rooms.set(gameID, room);
  }
  return rooms.get(gameID);
}

function parseCookies(req) {
  const list = {};
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    const key = parts.shift().trim();
    if (key) {
      const val = decodeURIComponent(parts.join('=').trim());
      list[key] = val;
    }
  });
  return list;
}

function resolvePlayerIdentity(req, parsedUrl) {
  const cookies = parseCookies(req);
  // Check if query or referer specifies ?as=<alias> for multi-tab local testing
  let alias = parsedUrl.searchParams.get('as');
  if (!alias && req.headers.referer) {
    try {
      const refUrl = new URL(req.headers.referer);
      alias = refUrl.searchParams.get('as');
    } catch (_) {}
  }

  let playerID = cookies.npt;
  let setCookieHeader = null;

  if (alias) {
    const cleanAlias = String(alias).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 16);
    if (cleanAlias) {
      playerID = `p_${cleanAlias}`;
    }
  }

  if (!playerID) {
    // First visitor becomes DEFAULT_OWNER_ID ('p_teste_owner') if not yet claimed, so Screenshot 2 works out-of-the-box
    if (!resolvePlayerIdentity.ownerClaimed) {
      resolvePlayerIdentity.ownerClaimed = true;
      playerID = DEFAULT_OWNER_ID;
    } else {
      playerID = 'p_' + generateId(10);
    }
    setCookieHeader = `npt=${encodeURIComponent(playerID)}; Path=/; Max-Age=31536000; SameSite=Lax`;
  }

  const playerName = cookies.pn_nick || (playerID === DEFAULT_OWNER_ID ? 'teste' : 'teste');
  return { playerID, playerName, setCookieHeader };
}
resolvePlayerIdentity.ownerClaimed = false;

function readJsonBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString('utf8');
      if (body.length > 1e6) req.destroy();
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (_) {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

function sendJson(res, statusCode, data, extraHeaders = {}) {
  const payload = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...extraHeaders
  });
  res.end(payload);
}

function renderHtmlPage({ gameID, playerID, playerName }) {
  const isGamePage = Boolean(gameID);
  const safeGameID = isGamePage ? JSON.stringify(gameID) : 'undefined';
  const safeNick = JSON.stringify(playerName || 'teste');

  return `<!DOCTYPE html>
<html translate="no" lang="en">
<head>
  <meta charset="utf-8">
  <base href="/">
  <meta content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" name="viewport">
  <meta content="notranslate" name="google">
  <title>${isGamePage ? 'Poker Now - Multi-Table Private Game' : 'Start a New Poker Game - Poker Now'}</title>
  <link rel="shortcut icon" href="/assets/favicon.png">
  <link href="https://fonts.googleapis.com/css?family=Montserrat:400,600,700,800&display=swap" rel="stylesheet">
  <link rel="stylesheet" media="all" href="/assets/vendor-41df9d3cd270fc2ef13b.css?v=3" />
  <link rel="stylesheet" media="all" href="/assets/game-09d8e489f29e5f022a84.css?v=3" />
  <style>
    /* Card font fix: "Abril Fatface" was never loaded, so iOS/Safari fell back to
       the generic "cursive" font (Snell Roundhand) where a "Q" looks like a "2".
       Force a clear, bold sans-serif font on every device. */
    .card, .portrait .card, .card .value, .card .sub-suit {
      font-family: 'Montserrat', 'Helvetica Neue', Arial, sans-serif !important;
      font-style: normal !important;
    }
    /* Floating PokerClub Control Dock */
    #pc-helper-dock {
      position: fixed;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 99999;
      font-family: 'Montserrat', sans-serif;
      user-select: none;
    }
    #pc-helper-toggle {
      background: rgba(18, 21, 28, 0.92);
      color: #2ecc71;
      border: 1px solid rgba(46, 204, 113, 0.5);
      border-radius: 20px;
      padding: 5px 14px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.4px;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.45);
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
    }
    #pc-helper-toggle:hover {
      background: rgba(26, 31, 42, 0.98);
      border-color: #2ecc71;
    }
    #pc-helper-panel {
      display: none;
      margin-top: 6px;
      background: rgba(18, 21, 28, 0.96);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 10px;
      padding: 12px 14px;
      color: #fff;
      min-width: 340px;
      box-shadow: 0 10px 28px rgba(0, 0, 0, 0.65);
      backdrop-filter: blur(8px);
    }
    #pc-helper-dock.open #pc-helper-panel {
      display: block;
    }
    .pc-dock-section {
      margin-bottom: 10px;
    }
    .pc-dock-section:last-child {
      margin-bottom: 0;
    }
    .pc-dock-title {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      color: #9aa4b2;
      margin-bottom: 5px;
      letter-spacing: 0.5px;
    }
    .pc-dock-row {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
    }
    .pc-btn {
      background: #262b38;
      color: #e2e8f0;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 5px;
      padding: 5px 9px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      transition: all 0.12s ease;
    }
    .pc-btn:hover {
      background: #32394a;
      color: #fff;
      border-color: rgba(255, 255, 255, 0.28);
    }
    .pc-btn.green {
      background: #1e824c;
      border-color: #2ecc71;
      color: #fff;
    }
    .pc-btn.green:hover {
      background: #27ae60;
    }
    .pc-btn.purple {
      background: #5b2c6f;
      border-color: #9b59b6;
      color: #fff;
    }
    .pc-btn.gold {
      background: #7d6608;
      border-color: #f1c40f;
      color: #fff;
    }
    .pc-btn.danger {
      background: #78281f;
      border-color: #e74c3c;
      color: #fff;
    }
  </style>
  <script>
    window.announcements = [];
    window.serverNow = Date.now();
    window.gameID = ${safeGameID};
    window.locked = null;
    window.userLoggedIn = false;
    window.showSitAsAway = true;
    window.TOS_LINK = "https://network.pokernow.com/service_terms";
    window.HTTP_202_RELOAD = true;
    window.ALLOW_GAME_TYPE_CYCLING = true;
    window.ALLOW_NIT_GAME = true;
    window.CLUB_REQUEST_PARTICIPATION_MODAL = true;
    window.LOUNGE_CLUB_ID = "21a15333-d7a4-4a1c-8848-35ed7161f4db";
    window.TURNSTILE_SITE_KEY = undefined;
    window.disableHandReplayerUI = false;
    window.enableReplayChatNotice = true;
    window.dataLayer = window.dataLayer || [];
    window.intendedTableName = ${safeNick};
    try {
      if (!localStorage.getItem('acceptedTOS')) {
        localStorage.setItem('acceptedTOS', JSON.stringify(new Date().toJSON()));
      }
      if (!localStorage.getItem('user')) {
        localStorage.setItem('user', JSON.stringify({ name: ${safeNick} }));
      }
      // Preserve ?as= parameter in XHR/fetch requests if user opened a multi-player test tab
      var urlParams = new URLSearchParams(window.location.search);
      var asParam = urlParams.get('as');
      if (asParam) {
        window.__AS_PLAYER = asParam;
      }
    } catch (e) {}

    window.addEventListener('error', function(ev) {
      console.error('CLIENT ERROR:', ev.error || ev.message);
      try {
        fetch('/api/client-error', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: ev.message, stack: ev.error ? ev.error.stack : null })
        });
      } catch(_) {}
    });
  </script>
</head>
<body id="body">
  <div id="main-container"></div>

  <div id="pc-helper-dock">
    <button id="pc-helper-toggle" type="button" onclick="document.getElementById('pc-helper-dock').classList.toggle('open')">
      <span>♠️ PAINEL POKER NOW</span>
      <span style="opacity:0.75;font-size:10px;">(Mesas / Bots / Temas / Amigos) ▾</span>
    </button>
    <div id="pc-helper-panel">
      <div class="pc-dock-section">
        <div class="pc-dock-title">Telas das Imagens (1 Clique)</div>
        <div class="pc-dock-row">
          <a class="pc-btn" href="/start-game">1. Criar Jogo (/start-game)</a>
          <a class="pc-btn purple" href="/games/pglzUG33VPJwPc1fl6t6qNeE0">2 e 3. Mesa "teste" (Waiting)</a>
          <a class="pc-btn gold" href="/games/pglSBWynA2aYv1UnG4wAcPr0F">4. Mesa Fat Stack (10/20)</a>
          <a class="pc-btn purple" href="/games/pglGDWoVYpdfb7zhPbWp1mCi4">5. Mesa Halloween (1/2)</a>
        </div>
      </div>
      <div class="pc-dock-section">
        <div class="pc-dock-title">Controle da Mesa & Fichas</div>
        <div class="pc-dock-row">
          <button class="pc-btn green" type="button" onclick="pcAction('add-bot')">🤖 +1 Bot</button>
          <button class="pc-btn green" type="button" onclick="pcAction('fill-bots', { count: 8 })">🤖 Preencher 8 Bots</button>
          <button class="pc-btn gold" type="button" onclick="pcAction('add-chips')">💰 +$1,000 Fichas</button>
          <button class="pc-btn" type="button" onclick="pcAction('free-seat')">🪑 Liberar 1 Lugar</button>
          <button class="pc-btn danger" type="button" onclick="pcAction('remove-bots')">🗑️ Remover Bots</button>
          <button class="pc-btn green" type="button" onclick="pcAction('start-hand')">▶️ Iniciar / Próxima Mão</button>
        </div>
      </div>
      <div class="pc-dock-section">
        <div class="pc-dock-title">Tema Visual da Mesa & Cartas</div>
        <div class="pc-dock-row">
          <button class="pc-btn purple" type="button" onclick="pcAction('theme', { theme: 'halloween-2026' })">🎃 Halloween + Cartas PokerNow</button>
          <button class="pc-btn gold" type="button" onclick="pcAction('theme', { theme: 'fat-stack' })">🪙 Halloween + Cartas Fat Stack</button>
          <button class="pc-btn green" type="button" onclick="pcAction('theme', { theme: 'classic-green' })">🟢 Mesa Verde Clássica</button>
          <button class="pc-btn danger" type="button" onclick="pcAction('theme', { theme: 'classic-red' })">🔴 Mesa Vermelha</button>
        </div>
      </div>
      <div class="pc-dock-section">
        <div class="pc-dock-title">Jogar Online com Amigos</div>
        <div class="pc-dock-row">
          <button class="pc-btn green" type="button" onclick="pcCopyInvite()">🔗 Copiar Link da Mesa</button>
          <button class="pc-btn" type="button" onclick="pcOpenFriendTab()">👥 Abrir Aba como Amigo (Teste Local)</button>
        </div>
      </div>
    </div>
  </div>

  <script>
    function getActiveGameID() {
      var m = window.location.pathname.match(/^\\/games\\/([a-zA-Z0-9_-]+)/);
      return (m && m[1]) || window.gameID || 'pglzUG33VPJwPc1fl6t6qNeE0';
    }
    function pcAction(action, payload) {
      var gid = getActiveGameID();
      fetch('/api/custom/' + action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.assign({ gameID: gid }, payload || {}))
      });
    }
    function pcCopyInvite() {
      var gid = getActiveGameID();
      var cleanUrl = window.location.origin + '/games/' + gid;
      navigator.clipboard.writeText(cleanUrl);
      alert('Link copiado: ' + cleanUrl + '\\nEnvie para seus amigos entrarem na mesma mesa!');
    }
    function pcOpenFriendTab() {
      var gid = getActiveGameID();
      var rnd = Math.floor(100 + Math.random() * 900);
      window.open(window.location.origin + '/games/' + gid + '?as=amigo' + rnd, '_blank');
    }
    // Safety net: if React ever unmounts the table (black screen), reload it automatically.
    (function () {
      var mc = document.getElementById('main-container');
      var hadContent = false;
      setInterval(function () {
        if (!mc) return;
        if (mc.childElementCount > 0) { hadContent = true; return; }
        if (hadContent) {
          var last = Number(sessionStorage.getItem('pcAutoReload') || 0);
          if (Date.now() - last > 10000) {
            sessionStorage.setItem('pcAutoReload', String(Date.now()));
            window.location.reload();
          }
        }
      }, 1500);
    })();
  </script>

  <script src="/assets/runtime.bundle-1b97845bfca1361c7868.js?v=3"></script>
  <script src="/assets/vendor.bundle-a9dfaa9ff533fa41d7e8.js?v=3"></script>
  <script src="/assets/compatibility.bundle-6cb2fb92b575bb29bd5d.js?v=3"></script>
  <script src="/assets/game.bundle-3de25236641b161daa4a.js?v=3"></script>
</body>
</html>`;
}

// ============================================================================
// HTTP Request Handler
// ============================================================================
const server = http.createServer(async (req, res) => {
  try {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;
    const method = req.method.toUpperCase();

    // CORS headers for convenience
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // 1. Static files under /assets/* or /favicon.png or /images/*
    if (pathname === '/favicon.ico' || pathname === '/favicon.png') {
      const favPath = path.join(ASSETS_DIR, 'favicon.png');
      if (fs.existsSync(favPath)) {
        res.writeHead(200, { 'Content-Type': 'image/png' });
        fs.createReadStream(favPath).pipe(res);
        return;
      }
    }

    if (pathname.startsWith('/assets/') || pathname.startsWith('/images/')) {
      const baseName = path.basename(pathname);
      const filePath = path.join(ASSETS_DIR, baseName);
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        res.writeHead(200, {
          'Content-Type': contentType,
          // JS/CSS are patched over time: always revalidate so phones get fixes immediately
          'Cache-Control': (ext === '.js' || ext === '.css') ? 'no-cache' : 'public, max-age=86400'
        });
        fs.createReadStream(filePath).pipe(res);
        return;
      }
    }

    const { playerID, playerName, setCookieHeader } = resolvePlayerIdentity(req, parsedUrl);
    const extraHeaders = setCookieHeader ? { 'Set-Cookie': setCookieHeader } : {};

    // 2. HTML Entry routes
    if (method === 'GET' && (pathname === '/' || pathname === '/start-game')) {
      const html = renderHtmlPage({ gameID: null, playerID, playerName });
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', ...extraHeaders });
      res.end(html);
      return;
    }

    if (method === 'GET' && pathname === '/clubs/lounge/lobby') {
      // Redirect Lounge Lobby button to the Fat Stack or Halloween live table
      res.writeHead(302, { Location: '/games/pglSBWynA2aYv1UnG4wAcPr0F' });
      res.end();
      return;
    }

    const gamePageMatch = pathname.match(/^\/games\/([a-zA-Z0-9_-]+)$/);
    if (method === 'GET' && gamePageMatch) {
      const gameID = gamePageMatch[1];
      const room = getOrCreateRoom(gameID);
      room.ensurePlayerRecord(playerID, playerName);
      const html = renderHtmlPage({
        gameID,
        playerID,
        playerName: room.players[playerID]?.name || playerName
      });
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', ...extraHeaders });
      res.end(html);
      return;
    }

    // 3. Poker Now Frontend REST APIs
    // POST /new-game (Screenshot 1 "CREATE GAME" button)
    if (method === 'POST' && pathname === '/new-game') {
      const body = await readJsonBody(req);
      const nick = String(body.playerName || playerName || 'teste').trim().slice(0, 14) || 'teste';
      const sb = Number(body.smallBlind) || 10;
      const bb = Number(body.bigBlind) || 20;

      // If the user creates a game with nickname "teste" and 10/20 blinds and pglzUG33VPJwPc1fl6t6qNeE0 is empty,
      // route them to pglzUG33VPJwPc1fl6t6qNeE0 or create a fresh room owned by them!
      const newGameID = 'pgl' + generateId(22);
      const room = new PokerGameRoom({
        id: newGameID,
        ownerID: playerID,
        themeKey: 'halloween-2026',
        smallBlind: sb,
        bigBlind: bb,
        mode: '4fun'
      });
      room.players[playerID] = {
        id: playerID,
        name: nick,
        status: 'watching',
        winCount: 0,
        quitCount: 0,
        isNetworkPlayer: false,
        stack: 0,
        avatarID: null
      };
      room.emojis[playerID] = '😍';
      room.mEV = 1;
      attachBroadcastHandler(room);
      rooms.set(newGameID, room);

      const cookiesOut = [
        `pn_nick=${encodeURIComponent(nick)}; Path=/; Max-Age=31536000; SameSite=Lax`
      ];
      if (setCookieHeader) cookiesOut.push(setCookieHeader);

      sendJson(
        res,
        200,
        {
          gameID: newGameID,
          playerID,
          isNetworkPlayer: false,
          playerUsername: nick
        },
        { 'Set-Cookie': cookiesOut }
      );
      return;
    }

    // POST /games/:id/request_ingress (Screenshot 2 "TAKE THE SEAT" button)
    const ingressMatch = pathname.match(/^\/games\/([a-zA-Z0-9_-]+)\/request_ingress$/);
    if (method === 'POST' && ingressMatch) {
      const gameID = ingressMatch[1];
      const room = getOrCreateRoom(gameID);
      const body = await readJsonBody(req);
      const nick = String(body.playerName || room.players[playerID]?.name || playerName || 'teste').trim().slice(0, 14);
      const seat = Number(body.seat);
      const stack = Number(body.stack);
      const sitAsAway = Boolean(body.sitAsAway);

      const result = room.seatPlayer({
        playerID,
        playerName: nick,
        seat,
        stack,
        sitAsAway,
        isBot: false,
        emoji: room.emojis[playerID] || (nick.toLowerCase() === 'teste' ? '😍' : null)
      });

      if (!result.ok) {
        sendJson(res, 422, result.error, extraHeaders);
        return;
      }

      // Broadcast emoji map too so 😍 appears immediately like Screenshot 3
      broadcastRoomEmojis(room);

      const cookiesOut = [
        `pn_nick=${encodeURIComponent(nick)}; Path=/; Max-Age=31536000; SameSite=Lax`
      ];
      if (setCookieHeader) cookiesOut.push(setCookieHeader);

      sendJson(res, 200, {}, { 'Set-Cookie': cookiesOut });
      return;
    }

    // POST /games/:id/start-game
    const startMatch = pathname.match(/^\/games\/([a-zA-Z0-9_-]+)\/start-game$/);
    if (method === 'POST' && startMatch) {
      const room = getOrCreateRoom(startMatch[1]);
      // If only 1 human is seated and clicks START GAME, auto-add a bot so the hand can start immediately if needed, or check seats
      const activeCount = room.seats.length;
      if (activeCount < 2) {
        room.addBot({ stack: room.players[playerID]?.stack || room.bigBlind * 100 });
      }
      const resStart = room.startGame();
      if (!resStart.ok) {
        sendJson(res, 422, { message: resStart.message }, extraHeaders);
        return;
      }
      sendJson(res, 200, {}, extraHeaders);
      return;
    }

    // GET /games/:id/current_or_next_configs
    const configsMatch = pathname.match(/^\/games\/([a-zA-Z0-9_-]+)\/current_or_next_configs$/);
    if (method === 'GET' && configsMatch) {
      const room = getOrCreateRoom(configsMatch[1]);
      sendJson(res, 200, room.configs, extraHeaders);
      return;
    }

    // POST /games/:id/update_game
    const updateGameMatch = pathname.match(/^\/games\/([a-zA-Z0-9_-]+)\/update_game$/);
    if (method === 'POST' && updateGameMatch) {
      const room = getOrCreateRoom(updateGameMatch[1]);
      const body = await readJsonBody(req);
      Object.assign(room.configs, body);
      if (Array.isArray(body.bS) && body.bS[0]) {
        room.smallBlind = Number(body.bS[0][0]) || room.smallBlind;
        room.bigBlind = Number(body.bS[0][1]) || room.bigBlind;
      }
      room.broadcast();
      sendJson(res, 200, {}, extraHeaders);
      return;
    }

    // GET /games/:id/players_sessions (LEDGER tab)
    const sessionsMatch = pathname.match(/^\/games\/([a-zA-Z0-9_-]+)\/players_sessions$/);
    if (method === 'GET' && sessionsMatch) {
      const room = getOrCreateRoom(sessionsMatch[1]);
      room.syncAllLedgers();
      let buyInTotal = 0;
      let buyOutTotal = 0;
      let inGameTotal = 0;
      for (const item of Object.values(room.ledger)) {
        buyInTotal += item.buyInSum || 0;
        buyOutTotal += item.buyOutSum || 0;
        inGameTotal += item.inGame || 0;
      }
      sendJson(
        res,
        200,
        {
          playersInfos: room.ledger,
          buyInTotal,
          buyOutTotal,
          inGameTotal,
          nitEscrowTotal: 0,
          gameHasRake: false
        },
        extraHeaders
      );
      return;
    }

    // POST /games/:id/alter-players (Host stack adjustments / approve seat)
    const alterPlayersMatch = pathname.match(/^\/games\/([a-zA-Z0-9_-]+)\/alter-players$/);
    if (method === 'POST' && alterPlayersMatch) {
      const room = getOrCreateRoom(alterPlayersMatch[1]);
      const body = await readJsonBody(req);
      const playersUpdate = body.players || {};
      for (const [pid, change] of Object.entries(playersUpdate)) {
        const p = room.players[pid];
        if (!p) continue;
        if (change.stack !== undefined) {
          const newStack = Number(change.stack);
          const diff = newStack - (p.stack || 0);
          p.stack = newStack;
          if (diff > 0) room.updateLedger(pid, p.name, diff, 0);
        }
        if (change.status === 'standingUp') {
          p.status = 'standingUp';
        } else if (change.status === 'quiting') {
          room.removePlayerFromSeat(pid);
        }
      }
      room.broadcast();
      sendJson(res, 200, {}, extraHeaders);
      return;
    }

    // POST /games/:id/set-stack
    const setStackMatch = pathname.match(/^\/games\/([a-zA-Z0-9_-]+)\/set-stack$/);
    if (method === 'POST' && setStackMatch) {
      const room = getOrCreateRoom(setStackMatch[1]);
      const body = await readJsonBody(req);
      const p = room.players[playerID];
      if (p && body.stack) {
        const added = Number(body.stack);
        p.stack = (p.stack || 0) + added;
        room.updateLedger(playerID, p.name, added, 0);
        room.broadcast();
      }
      sendJson(res, 200, {}, extraHeaders);
      return;
    }

    // GET /api/games/:id/log_v3 (LOG modal)
    const logV3Match = pathname.match(/^\/api\/games\/([a-zA-Z0-9_-]+)\/log_v3$/);
    if (method === 'GET' && logV3Match) {
      const room = getOrCreateRoom(logV3Match[1]);
      const handNum = Number(parsedUrl.searchParams.get('hand_number')) || room.gN || 1;
      const logs = room.handLogs[handNum] || [];
      sendJson(res, 200, logs, extraHeaders);
      return;
    }

    // GET /api/games/:id/audit_events
    const auditMatch = pathname.match(/^\/api\/games\/([a-zA-Z0-9_-]+)\/audit_events$/);
    if (method === 'GET' && auditMatch) {
      sendJson(res, 200, { events: [] }, extraHeaders);
      return;
    }

    // GET /api/games/:id/game-elements
    const elementsMatch = pathname.match(/^\/api\/games\/([a-zA-Z0-9_-]+)\/game-elements$/);
    if (method === 'GET' && elementsMatch) {
      sendJson(res, 200, {}, extraHeaders);
      return;
    }

    // GET /api/game/:id/club-buy-in-info
    const clubBuyInMatch = pathname.match(/^\/api\/game\/([a-zA-Z0-9_-]+)\/club-buy-in-info$/);
    if (method === 'GET' && clubBuyInMatch) {
      const room = getOrCreateRoom(clubBuyInMatch[1]);
      sendJson(
        res,
        200,
        {
          minMaxBuyIn: room.minMaxBuyIn || [room.bigBlind * 20, room.bigBlind * 100],
          currentCreditLimit: 0,
          currentClubBalance: 50000,
          currentAvailable: 50000,
          clubUseCents: false,
          suggestLastBuyOut: false,
          forceLastBuyOut: false
        },
        extraHeaders
      );
      return;
    }

    // POST /api/game/:id/request-waitlist-ingress & quit-waitlist (Screenshot 5 Waitlist)
    const waitlistJoinMatch = pathname.match(/^\/api\/game\/([a-zA-Z0-9_-]+)\/request-waitlist-ingress$/);
    if (method === 'POST' && waitlistJoinMatch) {
      const room = getOrCreateRoom(waitlistJoinMatch[1]);
      if (!room.waitlistIds.some(w => w.playerId === playerID)) {
        room.waitlistIds.push({ playerId: playerID });
        room.broadcast();
      }
      sendJson(res, 200, {}, extraHeaders);
      return;
    }

    const waitlistQuitMatch = pathname.match(/^\/api\/game\/([a-zA-Z0-9_-]+)\/quit-waitlist$/);
    if (method === 'POST' && waitlistQuitMatch) {
      const room = getOrCreateRoom(waitlistQuitMatch[1]);
      room.waitlistIds = room.waitlistIds.filter(w => w.playerId !== playerID);
      room.broadcast();
      sendJson(res, 200, {}, extraHeaders);
      return;
    }

    // GET /design-theme & POST /api/games/:id/define-design-theme
    if (method === 'GET' && pathname === '/design-theme') {
      sendJson(
        res,
        200,
        {
          designThemes: [
            {
              id: 'halloween-2026',
              title: 'Halloween 2026 (Poker Now Cards)',
              tablePreviewUrl: '/assets/hw26-felt-l.png',
              cardsPreviewUrl: '/assets/hw26-cards.png'
            },
            {
              id: 'fat-stack',
              title: 'Halloween 2026 + Fat Stack Cards',
              tablePreviewUrl: '/assets/hw26-felt-l.png',
              cardsPreviewUrl: '/assets/-c71ohAPeS.png'
            },
            {
              id: 'classic-green',
              title: 'Classic Green Table',
              tablePreviewUrl: '/assets/table-a8d3c0639b9cfbf2583c-20547581d602.png',
              cardsPreviewUrl: '/assets/card-back-551b604a5c302e648fbd-20547581d602.svg'
            },
            {
              id: 'classic-red',
              title: 'Royal Red Table',
              tablePreviewUrl: '/assets/table-red-cd06bc41808b2a1d7ad1-20547581d602.png',
              cardsPreviewUrl: '/assets/card-back-551b604a5c302e648fbd-20547581d602.svg'
            }
          ]
        },
        extraHeaders
      );
      return;
    }

    const defineThemeMatch = pathname.match(/^\/api\/games\/([a-zA-Z0-9_-]+)\/define-design-theme$/);
    if (method === 'POST' && defineThemeMatch) {
      const room = getOrCreateRoom(defineThemeMatch[1]);
      const body = await readJsonBody(req);
      if (body.designThemeId && THEMES[body.designThemeId]) {
        room.themeKey = body.designThemeId;
      }
      broadcastGameDataUpdate(room);
      sendJson(res, 200, {}, extraHeaders);
      return;
    }

    // 4. Custom Helper Dock Endpoints (/api/custom/*)
    if (method === 'POST' && pathname.startsWith('/api/custom/')) {
      const body = await readJsonBody(req);
      const room = getOrCreateRoom(body.gameID || 'pglzUG33VPJwPc1fl6t6qNeE0');
      const subAction = pathname.replace('/api/custom/', '');

      if (subAction === 'add-bot') {
        const bot = room.addBot();
        if (bot && room.status === 'waiting' && room.seats.length >= 2) {
          room.startGame();
        } else {
          room.broadcast();
        }
        sendJson(res, 200, { ok: true, bot });
        return;
      }

      if (subAction === 'fill-bots') {
        const targetCount = Math.min(10, Number(body.count) || 8);
        while (room.seats.length < targetCount) {
          const added = room.addBot();
          if (!added) break;
        }
        if (room.status === 'waiting' && room.seats.length >= 2) {
          room.startGame();
        } else {
          room.broadcast();
        }
        sendJson(res, 200, { ok: true });
        return;
      }

      if (subAction === 'free-seat') {
        const botSeats = room.seats.filter(([, pid]) => room.players[pid]?.isBot);
        if (botSeats.length > 0) {
          const [, victimID] = botSeats[botSeats.length - 1];
          room.removePlayerFromSeat(victimID);
        }
        sendJson(res, 200, { ok: true });
        return;
      }

      if (subAction === 'add-chips') {
        const p = room.players[playerID];
        if (p) {
          const added = 1000;
          p.stack = (p.stack || 0) + added;
          if (p.status === 'standingUp') p.status = 'inGame';
          room.updateLedger(playerID, p.name, added, 0);
          room.broadcast();
        }
        sendJson(res, 200, { ok: true });
        return;
      }

      if (subAction === 'remove-bots') {
        room.removeBots();
        sendJson(res, 200, { ok: true });
        return;
      }

      if (subAction === 'start-hand') {
        if (room.seats.length < 2) {
          room.addBot();
        }
        room.startGame();
        sendJson(res, 200, { ok: true });
        return;
      }

      if (subAction === 'theme') {
        if (body.theme && THEMES[body.theme]) {
          room.themeKey = body.theme;
          broadcastGameDataUpdate(room);
          room.broadcast();
        }
        sendJson(res, 200, { ok: true });
        return;
      }
    }

    if (method === 'POST' && pathname === '/api/client-error') {
      const body = await readJsonBody(req);
      console.error('⚠️ [CLIENT JS ERROR REPORTED]:', JSON.stringify(body));
      sendJson(res, 200, { ok: true }, extraHeaders);
      return;
    }

    // Gestures list must be an array: the "suggested gesture" popover (shown after a
    // big bet / all-in) calls .map() on it and crashed the whole table when it got {}.
    if (method === 'GET' && pathname === '/api/gestures') {
      sendJson(res, 200, [], extraHeaders);
      return;
    }

    // Auto chat message requests (bundle calls "undefined/auto-chat-message")
    if (pathname.endsWith('/auto-chat-message')) {
      sendJson(res, 200, {}, extraHeaders);
      return;
    }

    // Fallback for any other /api/* or /games/* POST/GET
    if (pathname.startsWith('/api/') || pathname.startsWith('/games/') || pathname.startsWith('/sng/')) {
      sendJson(res, 200, {}, extraHeaders);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
  } catch (err) {
    console.error('HTTP Error:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal Server Error' }));
  }
});

// ============================================================================
// RFC-6455 WebSocket + Engine.IO v3 / Socket.IO v2 Server
// ============================================================================
function encodeWsFrame(text, opcode = 0x01) {
  const payload = Buffer.isBuffer(text) ? text : Buffer.from(String(text), 'utf8');
  const len = payload.length;
  let header;

  if (len < 126) {
    header = Buffer.alloc(2);
    header[0] = 0x80 | opcode;
    header[1] = len;
  } else if (len < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x80 | opcode;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x80 | opcode;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }

  return Buffer.concat([header, payload]);
}

function sendWsText(client, text) {
  if (!client.open || client.socket.destroyed) return;
  try {
    client.socket.write(encodeWsFrame(text, 0x01));
  } catch (_) {}
}

function sendSocketIOEvent(client, eventName, payload) {
  sendWsText(client, '42' + JSON.stringify([eventName, payload]));
}

function broadcastRoomEmojis(room) {
  const payload = { n: room.mEV, ...room.emojis };
  for (const client of wsClients.values()) {
    if (client.gameID === room.id && client.open) {
      sendSocketIOEvent(client, 'rEM', payload);
    }
  }
}

function broadcastGameDataUpdate(room) {
  const gd = room.getGameData();
  for (const client of wsClients.values()) {
    if (client.gameID === room.id && client.open) {
      sendSocketIOEvent(client, 'UGD', gd);
    }
  }
}

function broadcastChatMessage(room, msgObj) {
  room.chatMessages.push(msgObj);
  if (room.chatMessages.length > 100) room.chatMessages.shift();
  for (const client of wsClients.values()) {
    if (client.gameID === room.id && client.open) {
      sendSocketIOEvent(client, 'newChatMessage', msgObj);
    }
  }
}

server.on('upgrade', (req, socket, head) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (!parsedUrl.pathname.startsWith('/socket.io')) {
    socket.destroy();
    return;
  }

  const key = req.headers['sec-websocket-key'];
  if (!key) {
    socket.destroy();
    return;
  }

  const acceptKey = crypto
    .createHash('sha1')
    .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
    .digest('base64');

  const { playerID, playerName, setCookieHeader } = resolvePlayerIdentity(req, parsedUrl);
  const gameID = parsedUrl.searchParams.get('gameID') || 'pglzUG33VPJwPc1fl6t6qNeE0';
  const sid = generateId(20);

  const responseHeaders = [
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Accept: ${acceptKey}`
  ];
  if (setCookieHeader) {
    responseHeaders.push(`Set-Cookie: ${setCookieHeader}`);
  }
  socket.write(responseHeaders.join('\r\n') + '\r\n\r\n');

  const client = {
    sid,
    socket,
    gameID,
    playerID,
    playerName,
    open: true,
    buffer: head && head.length ? Buffer.from(head) : Buffer.alloc(0)
  };
  wsClients.set(sid, client);

  const room = getOrCreateRoom(gameID);
  const playerRec = room.ensurePlayerRecord(playerID, playerName);

  // If the seated player reconnected, ensure they aren't marked offline
  if (playerRec.status === 'standingUpOffline') {
    playerRec.status = 'standingUp';
  }

  // 1. Engine.IO v3 OPEN packet (type 0)
  sendWsText(
    client,
    '0' +
      JSON.stringify({
        sid,
        upgrades: [],
        pingInterval: 20000,
        pingTimeout: 10000
      })
  );

  setTimeout(() => {
    if (!client.open) return;
    // 2. Socket.IO CONNECT packet (type 40)
    sendWsText(client, '40');

    // 3. Socket.IO ["registered", payload]
    sendSocketIOEvent(client, 'registered', {
      currentPlayer: {
        id: playerID,
        DefaultNick: playerRec.name || playerName || 'teste',
        networkUsername: null,
        isNetworkPlayer: false,
        hasEmail: false,
        allowReportChat: false,
        isPremium: false,
        validatedEmail: false,
        sngBanned: false
      },
      gameState: room.buildGameStateForPlayer(playerID),
      gamePlayer: {
        id: playerID,
        name: playerRec.name || playerName || 'teste',
        mutedChatPlayersIds: [],
        straddling: false,
        status: playerRec.status || 'watching',
        stack: playerRec.stack || 0,
        winCount: playerRec.winCount || 0,
        quitCount: playerRec.quitCount || 0
      },
      gameData: room.getGameData()
    });

    // 4. Chat history ["cH", messages]
    sendSocketIOEvent(client, 'cH', room.chatMessages);

    // 5. Emojis ["rEM", emojis]
    sendSocketIOEvent(client, 'rEM', { n: room.mEV, ...room.emojis });
  }, 15);

  socket.on('data', (chunk) => {
    client.buffer = Buffer.concat([client.buffer, chunk]);
    processWsBuffer(client);
  });

  socket.on('close', () => {
    client.open = false;
    wsClients.delete(sid);
  });

  socket.on('error', () => {
    client.open = false;
    wsClients.delete(sid);
  });
});

function processWsBuffer(client) {
  while (client.buffer.length >= 2) {
    const firstByte = client.buffer[0];
    const secondByte = client.buffer[1];
    const opcode = firstByte & 0x0f;
    const isMasked = (secondByte & 0x80) !== 0;
    let payloadLen = secondByte & 0x7f;
    let offset = 2;

    if (payloadLen === 126) {
      if (client.buffer.length < 4) return;
      payloadLen = client.buffer.readUInt16BE(2);
      offset = 4;
    } else if (payloadLen === 127) {
      if (client.buffer.length < 10) return;
      payloadLen = Number(client.buffer.readBigUInt64BE(2));
      offset = 10;
    }

    const maskLen = isMasked ? 4 : 0;
    const totalFrameLen = offset + maskLen + payloadLen;
    if (client.buffer.length < totalFrameLen) return;

    let payload = client.buffer.slice(offset + maskLen, totalFrameLen);
    if (isMasked) {
      const mask = client.buffer.slice(offset, offset + 4);
      payload = Buffer.from(payload);
      for (let i = 0; i < payload.length; i++) {
        payload[i] ^= mask[i % 4];
      }
    }

    client.buffer = client.buffer.slice(totalFrameLen);

    if (opcode === 0x08) {
      // Close frame
      client.open = false;
      client.socket.end();
      wsClients.delete(client.sid);
      return;
    } else if (opcode === 0x09) {
      // Ping -> Pong
      if (client.open && !client.socket.destroyed) {
        client.socket.write(encodeWsFrame(payload, 0x0a));
      }
    } else if (opcode === 0x01) {
      const text = payload.toString('utf8');
      handleEngineIoPacket(client, text);
    }
  }
}

function handleEngineIoPacket(client, packet) {
  if (!packet) return;

  // Engine.IO ping ('2') -> pong ('3')
  if (packet === '2') {
    sendWsText(client, '3');
    return;
  }

  // Socket.IO EVENT ('42[...]')
  if (packet.startsWith('42')) {
    let parsed;
    try {
      parsed = JSON.parse(packet.slice(2));
    } catch (_) {
      return;
    }
    if (!Array.isArray(parsed) || parsed.length === 0) return;
    const [eventName, data] = parsed;
    handleSocketIoEvent(client, eventName, data);
  }
}

function handleSocketIoEvent(client, eventName, data) {
  const room = getOrCreateRoom(client.gameID);
  const playerID = client.playerID;
  const player = room.players[playerID];

  if (eventName === 'action' && data && typeof data === 'object') {
    const type = data.type;

    switch (type) {
      case 'PLAYER_FOLD':
        room.handleFold(playerID);
        break;

      case 'PLAYER_CHECK':
        room.handleCheck(playerID);
        break;

      case 'PLAYER_CALL':
        room.handleCall(playerID);
        break;

      case 'PLAYER_RAISE':
        room.handleRaise(playerID, data.value);
        break;

      case 'SUNH': // Away / Stand Up Next Hand
        if (player) {
          if (room.status === 'waiting' || !room.iHPI.includes(playerID) || room.pGS[playerID] === 'fold') {
            player.status = 'standingUp';
            player.sUNH = false;
          } else {
            player.sUNH = !player.sUNH;
          }
          room.broadcast();
        }
        break;

      case 'PLAYER_SIT_BACK':
        if (player) {
          player.sUNH = false;
          player.status = room.status === 'inProgress' ? 'waitingNextGameToEnter' : 'inGame';
          room.broadcast();
        }
        break;

      case 'QNH': // Leave seat next hand (or immediately if waiting)
        if (player) {
          if (room.status === 'waiting' || !room.iHPI.includes(playerID) || room.pGS[playerID] === 'fold') {
            room.removePlayerFromSeat(playerID);
          } else {
            player.qNH = true;
            room.broadcast();
          }
        }
        break;

      case 'CQNH': // Cancel leave seat
        if (player) {
          player.qNH = false;
          room.broadcast();
        }
        break;

      case 'SHOW_HAND':
        if (room.pC[playerID] && room.holeCardsSecret[playerID]) {
          room.pC[playerID].cards = room.holeCardsSecret[playerID].map(val => ({
            value: val,
            showing: true
          }));
          room.broadcast();
        }
        break;

      case 'NH': // Next Hand
        room.startNewHand();
        break;

      case 'RS': // Shuffle Seats
        if (room.seats.length > 1) {
          const pids = room.seats.map(s => s[1]);
          for (let i = pids.length - 1; i > 0; i--) {
            const j = crypto.randomInt(0, i + 1);
            [pids[i], pids[j]] = [pids[j], pids[i]];
          }
          room.seats = room.seats.map((s, idx) => [s[0], pids[idx]]);
          room.broadcast();
        }
        break;

      case 'UP': // Pause game
        room.uP = Date.now();
        room.clearTimers();
        room.broadcast();
        break;

      case 'UR': // Resume game
        room.uP = false;
        if (room.status === 'inProgress' && room.pITT) {
          room.setTurnPlayer(room.pITT);
        }
        room.broadcast();
        break;

      case 'RUP': // Request full state resync
        sendSocketIOEvent(client, 'rup', room.buildGameStateForPlayer(playerID));
        break;

      case 'RUE': // Request emoji resync
        sendSocketIOEvent(client, 'rEM', { n: room.mEV, ...room.emojis });
        break;

      default:
        break;
    }
    return;
  }

  if (eventName === 'me') {
    const emoji = typeof data === 'string' ? data : null;
    if (emoji) {
      room.emojis[playerID] = emoji;
    } else {
      delete room.emojis[playerID];
    }
    room.mEV++;
    broadcastRoomEmojis(room);
    return;
  }

  if (eventName === 'new-message') {
    const text = String(typeof data === 'string' ? data : (data?.message || '')).trim();
    if (!text) return;
    const senderName = player?.name || client.playerName || 'Player';

    broadcastChatMessage(room, {
      at: Date.now(),
      playerID,
      playerName: senderName,
      message: text
    });

    // Built-in chat slash commands for quick control
    if (text === '/bot') {
      room.addBot();
      if (room.status === 'waiting' && room.seats.length >= 2) room.startGame();
    } else if (text.startsWith('/bots')) {
      const n = Math.min(10, Number(text.split(' ')[1]) || 8);
      while (room.seats.length < n) {
        if (!room.addBot()) break;
      }
      if (room.status === 'waiting' && room.seats.length >= 2) room.startGame();
    } else if (text === '/clearbots') {
      room.removeBots();
    }
  }
}

server.listen(PORT, '0.0.0.0', () => {
  console.log('============================================================');
  console.log(`♠️  Poker Now Clone Server running on http://localhost:${PORT}`);
  console.log('============================================================');
  console.log(`1. Tela Criar Jogo (Img 1):    http://localhost:${PORT}/start-game`);
  console.log(`2. Mesa "teste" (Img 2 e 3):   http://localhost:${PORT}/games/pglzUG33VPJwPc1fl6t6qNeE0`);
  console.log(`3. Mesa Fat Stack (Img 4):     http://localhost:${PORT}/games/pglSBWynA2aYv1UnG4wAcPr0F`);
  console.log(`4. Mesa Halloween (Img 5):     http://localhost:${PORT}/games/pglGDWoVYpdfb7zhPbWp1mCi4`);
  console.log('============================================================');
});
