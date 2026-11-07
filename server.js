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
  // NLH ~ 10 / 20, Halloween 2026 theme, waiting for players
  const room1 = new PokerGameRoom({
    id: 'pglzUG33VPJwPc1fl6t6qNeE0',
    ownerID: null,
    themeKey: 'halloween-2026',
    smallBlind: 10,
    bigBlind: 20,
    mode: '4fun',
    allowWaitlist: false,
    noOwner: false
  });
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

  // 4) PokerStars Spin & Go 30K Table: pglPokerStarsSpinGo
  // NLH ~ 10 / 20 (3-Max Spin & Go layout with CrankyKelly, romeu751, and Seat 1 open or bot)
  const room4 = new PokerGameRoom({
    id: 'pglPokerStarsSpinGo',
    ownerID: null,
    noOwner: true,
    themeKey: 'pokerstars',
    smallBlind: 10,
    bigBlind: 20,
    mode: '4fun',
    minMaxBuyIn: [200, 1000],
    allowWaitlist: false,
    gN: 15
  });
  attachBroadcastHandler(room4);

  const room4Bots = [
    { seat: 5, id: 'bot_ps_1', name: 'CrankyKelly', stack: 480, winCount: 2, quitCount: 0 },
    { seat: 8, id: 'bot_ps_2', name: 'romeu751', stack: 420, winCount: 1, quitCount: 0 }
  ];
  for (const b of room4Bots) {
    room4.addBot(b);
  }
  room4.dealerSeat = 8;
  room4.startGame();
  rooms.set(room4.id, room4);
}

seedDemoRooms();

function getOrCreateRoom(gameID) {
  if (!rooms.has(gameID)) {
    const room = new PokerGameRoom({
      id: gameID,
      ownerID: null,
      themeKey: 'halloween-2026',
      smallBlind: 10,
      bigBlind: 20,
      noOwner: false
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
    } catch (_) { }
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

function renderHtmlPage({ gameID, playerID, playerName, themeKey }) {
  const isGamePage = Boolean(gameID);
  const safeGameID = isGamePage ? JSON.stringify(gameID) : 'undefined';
  const safeNick = JSON.stringify(playerName || 'teste');
  const isPokerStarsInitial = themeKey === 'pokerstars';

  return `<!DOCTYPE html>
<html translate="no" lang="en">
<head>
  <meta charset="utf-8">
  <base href="/">
  <meta content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" name="viewport">
  <meta content="notranslate" name="google">
  <title>${isGamePage ? 'pokerSAT - Multi-Table Private Game' : 'Start a New Poker Game - pokerSAT'}</title>
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
    /* Mobile / Touch protection for Action Buttons:
       When it is NOT the player's turn (.game-decisions-ctn.low), disable clicks on the main
       action buttons so tapping "Raise" on a phone before your turn never accidentally triggers
       the adjacent "Check" button and auto-checks on your turn! */
    .game-decisions-ctn.low .action-buttons,
    .portrait .game-decisions-ctn.low .action-buttons {
      opacity: 0.38 !important;
      pointer-events: none !important;
    }
    .portrait .game-decisions-ctn .action-buttons {
      gap: 0.35rem !important;
    }
    .portrait .game-decisions-ctn .action-button {
      touch-action: manipulation;
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
    .pc-btn.ps-crimson {
      background: linear-gradient(180deg, #cf2a2a 0%, #8f1414 100%);
      border-color: #ff6b6b;
      color: #fff;
      box-shadow: 0 2px 8px rgba(207, 42, 42, 0.45);
    }
    .pc-btn.ps-crimson:hover {
      background: linear-gradient(180deg, #e03535 0%, #a51919 100%);
    }

    /* ==========================================================================
       POKERSTARS (SPIN & GO / MODERN CLASSIC) THEME OVERRIDES (body.ps-theme)
       ========================================================================== */
    body.ps-theme,
    body.ps-theme .game-main-container {
      background: url('/assets/ps-bg-vortex.svg') center center / cover no-repeat fixed #062129 !important;
      font-family: 'Montserrat', 'Helvetica Neue', Arial, sans-serif !important;
    }

    /* Hide default top-right clutter when in PokerStars theme or keep subtle */
    body.ps-theme .external-club-infos-ctn,
    body.ps-theme .table-game-type {
      display: none !important;
    }

    body.ps-theme .game-infos {
      top: 2.1rem !important;
      right: 0.9rem !important;
      opacity: 0.72;
    }

    /* Top Spin & Go Bar & 30K Metallic Plaque */
    #ps-spin-hud {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      z-index: 55;
      pointer-events: none;
      font-family: 'Montserrat', sans-serif;
      user-select: none;
    }
    body.ps-theme #ps-spin-hud {
      display: block;
    }
    .ps-topbar {
      height: 28px;
      background: linear-gradient(180deg, #171a20 0%, #090b0e 100%);
      border-bottom: 1px solid rgba(255, 255, 255, 0.12);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 12px;
      color: #cbd5e1;
      font-size: 11px;
      pointer-events: auto;
    }
    .ps-topbar-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .ps-topbar-icon {
      color: #cbd5e1;
      text-decoration: none;
      font-size: 13px;
      opacity: 0.85;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: none;
      border: none;
      padding: 2px 5px;
      font-family: inherit;
    }
    .ps-topbar-icon:hover {
      opacity: 1;
      color: #fff;
    }
    .ps-topbar-right {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .ps-rank-pill {
      background: linear-gradient(180deg, #c9b086 0%, #9c8259 100%);
      color: #1a140b;
      font-weight: 800;
      font-size: 11px;
      padding: 2px 12px;
      border-radius: 2px;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.4);
    }
    .ps-timer-display {
      font-weight: 800;
      font-size: 15px;
      color: #ffffff;
      letter-spacing: 0.5px;
      min-width: 48px;
      text-align: center;
    }
    .ps-prize-top-label {
      color: #d6c3a5;
      font-weight: 700;
      font-size: 11px;
      padding-left: 4px;
    }
    .ps-responsible-left {
      position: fixed;
      top: 36px;
      left: 10px;
      color: rgba(226, 232, 240, 0.78);
      font-size: 10px;
      line-height: 1.35;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .ps-target-icon {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      border: 1.5px solid rgba(255,255,255,0.55);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      background: rgba(0,0,0,0.35);
    }
    /* Center 30K Spin & Go Metallic Plaque */
    .ps-prize-plaque {
      position: fixed;
      top: 31px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(180deg, #f1f5f9 0%, #cbd5e1 45%, #94a3b8 52%, #e2e8f0 100%);
      border: 2px solid #64748b;
      border-radius: 6px;
      padding: 2px 12px;
      display: flex;
      align-items: center;
      gap: 6px;
      box-shadow: 0 6px 18px rgba(0, 0, 0, 0.72), inset 0 1px 0 #ffffff;
    }
    .ps-prize-plaque-digits {
      font-size: 24px;
      font-weight: 900;
      letter-spacing: 1px;
      background: linear-gradient(180deg, #ef4444 0%, #b91c1c 55%, #7f1d1d 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      filter: drop-shadow(0 1px 1px rgba(0,0,0,0.45));
    }
    .ps-prize-plaque-spades {
      font-size: 20px;
      color: #94a3b8;
      text-shadow: 0 1px 0 #fff, 0 -1px 0 #475569;
      letter-spacing: 1px;
    }

    /* Move helper dock toggle slightly right on top bar when in ps-theme so 30K plaque is unobstructed */
    body.ps-theme #pc-helper-dock {
      top: 2px;
      left: 230px;
      transform: none;
    }

    /* PokerStars Oval Table sizing & glow removal */
    body.ps-theme .table:before {
      display: none !important;
    }

    /* PokerStars Pill-Shaped Horizontal Dark Metallic Player Pods */
    body.ps-theme .landscape .table-player {
      width: 10.6rem !important;
      height: 3.35rem !important;
    }
    body.ps-theme .landscape .table-player-infos-ctn {
      border-radius: 999px !important;
      background: linear-gradient(180deg, rgba(46, 51, 60, 0.96) 0%, rgba(18, 21, 26, 0.98) 54%, rgba(8, 10, 13, 0.99) 100%) !important;
      border: 1.5px solid rgba(255, 255, 255, 0.24) !important;
      box-shadow: 0 8px 22px rgba(0, 0, 0, 0.78), inset 0 1px 0 rgba(255, 255, 255, 0.2) !important;
      overflow: visible !important;
    }

    /* Circular Spade Avatar on the side of the pill */
    body.ps-theme .landscape .table-player-infos-ctn::before {
      content: "♠";
      position: absolute;
      left: 0.18rem;
      top: 50%;
      transform: translateY(-50%);
      width: 2.85rem;
      height: 2.85rem;
      border-radius: 50%;
      background: radial-gradient(circle at 32% 30%, #374151 0%, #181c23 65%, #090b0e 100%);
      border: 2px solid rgba(255, 255, 255, 0.26);
      box-shadow: 0 3px 8px rgba(0, 0, 0, 0.65), inset 0 1px 2px rgba(255, 255, 255, 0.22);
      display: flex;
      align-items: center;
      justify-content: center;
      color: rgba(255, 255, 255, 0.28);
      font-size: 1.45rem;
      z-index: 3;
      pointer-events: none;
    }
    body.ps-theme .landscape .table-player-infos-ctn.you-player::before {
      background: radial-gradient(circle at 32% 30%, #991b1b 0%, #450a0a 70%, #1c0404 100%);
      border-color: rgba(248, 113, 113, 0.55);
      color: rgba(255, 255, 255, 0.78);
    }

    /* Subtle horizontal divider line inside player pill */
    body.ps-theme .landscape .table-player-infos-ctn::after {
      content: "";
      position: absolute;
      left: 3.35rem;
      right: 0.75rem;
      top: 50%;
      height: 1px;
      background: linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.22) 50%, rgba(255,255,255,0.04) 100%);
      z-index: 2;
      pointer-events: none;
    }

    /* Player Name & Stack inside pill */
    body.ps-theme .landscape .table-player-name {
      left: 3.3rem !important;
      width: 6.5rem !important;
      top: 0.4rem !important;
      height: 1.1rem !important;
      justify-content: center !important;
      font-size: 0.72rem !important;
      font-weight: 600 !important;
      color: #cbd5e1 !important;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.85);
    }
    body.ps-theme .landscape .table-player-name a {
      color: #cbd5e1 !important;
      text-decoration: none !important;
    }
    body.ps-theme .landscape .table-player-stack {
      left: 3.3rem !important;
      width: 6.5rem !important;
      top: 1.78rem !important;
      text-align: center !important;
      font-size: 0.88rem !important;
      font-weight: 800 !important;
      color: #ffffff !important;
      text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
      letter-spacing: 0.2px;
    }

    /* Active Turn / Winner state in PokerStars: Keep dark metallic pod + glowing green-yellow bar */
    body.ps-theme .table-player.decision-current:before,
    body.ps-theme .table-player.winner:before {
      display: none !important;
    }
    body.ps-theme .table-player.decision-current .table-player-infos-ctn {
      background: linear-gradient(180deg, rgba(54, 60, 72, 0.98) 0%, rgba(20, 24, 30, 0.99) 55%, rgba(9, 11, 15, 1) 100%) !important;
      border-color: rgba(163, 230, 53, 0.85) !important;
      box-shadow: 0 0 18px rgba(132, 204, 22, 0.45), 0 8px 22px rgba(0, 0, 0, 0.8) !important;
    }
    body.ps-theme .table-player.winner .table-player-infos-ctn {
      background: linear-gradient(180deg, rgba(58, 52, 28, 0.98) 0%, rgba(24, 22, 14, 0.99) 55%, rgba(12, 10, 6, 1) 100%) !important;
      border-color: #facc15 !important;
      box-shadow: 0 0 22px rgba(250, 204, 21, 0.55), 0 8px 22px rgba(0, 0, 0, 0.8) !important;
    }
    body.ps-theme .table-player.decision-current .table-player-name,
    body.ps-theme .table-player.decision-current .table-player-name a,
    body.ps-theme .table-player.winner .table-player-name,
    body.ps-theme .table-player.winner .table-player-name a {
      color: #f1f5f9 !important;
    }
    body.ps-theme .table-player.decision-current .table-player-stack,
    body.ps-theme .table-player.winner .table-player-stack {
      color: #ffffff !important;
    }

    /* PokerStars Horizontal Time-Bank Bar underneath active pod */
    body.ps-theme .landscape .time-to-talk {
      bottom: -0.42rem !important;
      left: 12% !important;
      right: auto !important;
      width: 76% !important;
      height: 0.28rem !important;
      border-radius: 999px !important;
      background: rgba(0, 0, 0, 0.65) !important;
      overflow: hidden !important;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.7);
    }
    body.ps-theme .time-to-talk .normal-time {
      background: linear-gradient(90deg, #facc15 0%, #4ade80 100%) !important;
    }

    /* Hole Cards Positioning: Rising above the top of the player pod (PokerStars style) */
    body.ps-theme .landscape .table-player-cards {
      left: 2.35rem !important;
      top: -1.95rem !important;
      z-index: 1 !important;
      transform: scale(0.84);
      transform-origin: bottom center;
    }
    body.ps-theme .landscape .table-player-cards .card-p1 {
      transform: rotate(0deg) !important;
      left: 0.2rem !important;
    }
    body.ps-theme .landscape .table-player-cards .card-p2 {
      transform: rotate(0deg) !important;
      left: 3.35rem !important;
    }
    /* Hero's own hole cards larger & in front above hero's pod */
    body.ps-theme .landscape .table-player-1 .table-player-cards,
    body.ps-theme .landscape .table-player:has(.you-player) .table-player-cards {
      left: 2.15rem !important;
      top: -3.15rem !important;
      z-index: 4 !important;
      transform: scale(0.98);
    }
    body.ps-theme .landscape .table-player-1 .table-player-cards .card-p1,
    body.ps-theme .landscape .table-player:has(.you-player) .table-player-cards .card-p1 {
      left: 0.15rem !important;
    }
    body.ps-theme .landscape .table-player-1 .table-player-cards .card-p2,
    body.ps-theme .landscape .table-player:has(.you-player) .table-player-cards .card-p2 {
      left: 3.3rem !important;
    }
    /* Remove dark dim overlay on hero's own hole cards */
    body.ps-theme .card-container.sneak .card:before {
      opacity: 0 !important;
    }

    /* Center Hero Seat (Seat 1) at bottom-center like PokerStars */
    body.ps-theme .landscape .table-player-1 {
      left: 40.5% !important;
      top: 82.5% !important;
    }

    /* Community Cards & Pot Pill ("Pote: 8 BB") */
    body.ps-theme .landscape .table-pot-size {
      top: 23.5% !important;
      left: 50% !important;
      transform: translateX(-50%) !important;
      width: auto !important;
      height: auto !important;
      z-index: 6;
    }
    body.ps-theme .table-pot-size .main-value {
      background: rgba(8, 14, 18, 0.78) !important;
      border: 1px solid rgba(255, 255, 255, 0.18) !important;
      border-radius: 999px !important;
      padding: 0.12rem 0.9rem !important;
      height: 1.55rem !important;
      line-height: 1.55rem !important;
      font-size: 0.82rem !important;
      font-weight: 700 !important;
      color: #f1f5f9 !important;
      white-space: nowrap !important;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.45) !important;
    }
    body.ps-theme .table-pot-size .main-value::before {
      content: "Pote: ";
      font-weight: 600;
      color: #cbd5e1;
    }

    /* Player Bet Chips on Felt (3D Chip Stack + Dark Pill) */
    body.ps-theme .table-player-bet-value {
      background: rgba(10, 14, 18, 0.88) !important;
      color: #ffffff !important;
      border: 1px solid rgba(255, 255, 255, 0.22) !important;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.65) !important;
      border-radius: 999px !important;
      padding: 0.18rem 0.65rem 0.18rem 1.7rem !important;
      font-size: 0.74rem !important;
      font-weight: 800 !important;
      white-space: nowrap !important;
    }
    body.ps-theme .table-player-bet-value::before {
      content: "";
      position: absolute;
      left: 0.2rem;
      top: 50%;
      transform: translateY(-50%);
      width: 1.18rem;
      height: 1.18rem;
      border-radius: 50%;
      background: radial-gradient(circle at 50% 42%, #ffffff 0%, #ffffff 32%, #dc2626 35%, #dc2626 68%, #ffffff 70%, #dc2626 85%);
      border: 1.5px dashed #ffffff;
      box-shadow: 0 2px 0 #15803d, 0 4px 0 #166534, 0 5px 6px rgba(0,0,0,0.65);
    }

    /* PokerStars Glossy Crimson Red Action Buttons */
    body.ps-theme .game-decisions-ctn .action-buttons .action-button,
    body.ps-theme .raise-controller-form .action-buttons button,
    body.ps-theme .raise-controller-form .action-buttons input[type=submit] {
      background: linear-gradient(180deg, #cf2a2a 0%, #a31818 52%, #7c1010 100%) !important;
      border: 1px solid #ef5350 !important;
      border-bottom: 3px solid #4d0808 !important;
      border-radius: 0.5rem !important;
      color: #ffffff !important;
      font-family: 'Montserrat', sans-serif !important;
      font-weight: 700 !important;
      font-size: 0.92rem !important;
      text-transform: none !important;
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.32) !important;
      min-width: 8.6rem !important;
      height: 3.35rem !important;
      transition: filter 0.12s ease, transform 0.08s ease !important;
    }
    body.ps-theme .game-decisions-ctn .action-buttons .action-button:hover,
    body.ps-theme .raise-controller-form .action-buttons button:hover,
    body.ps-theme .raise-controller-form .action-buttons input[type=submit]:hover {
      filter: brightness(1.12);
    }
    body.ps-theme .game-decisions-ctn .action-buttons .action-button:active {
      transform: translateY(1px);
    }
    /* Hide keyboard shortcut badge tips on main red buttons for clean PokerStars look */
    body.ps-theme .game-decisions-ctn .action-buttons .action-button.with-tip:before {
      display: none !important;
    }

    /* Style native raise controller to match PokerStars dark & crimson theme */
    body.ps-theme .raise-controller,
    body.ps-theme .raise-bet-value {
      background: rgba(15, 19, 25, 0.95) !important;
      border: 1px solid rgba(255, 255, 255, 0.18) !important;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.7) !important;
    }
    body.ps-theme .raise-controller .default-bet-button {
      background: linear-gradient(180deg, #c62828 0%, #8e1515 100%) !important;
      border: 1px solid #e57373 !important;
      color: #fff !important;
      border-radius: 0.3rem !important;
      font-weight: 700 !important;
      text-transform: none !important;
    }

    /* PokerStars Live Quick-Bet Sizing Bar & Hand Strength Overlay (#ps-bottom-right-hud) */
    #ps-bottom-right-hud {
      display: none;
      position: fixed;
      right: 14px;
      bottom: 72px;
      z-index: 45;
      font-family: 'Montserrat', sans-serif;
      user-select: none;
      width: 430px;
      max-width: calc(100vw - 28px);
    }
    body.ps-theme #ps-bottom-right-hud {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 6px;
    }
    #ps-hand-strength {
      color: #e2e8f0;
      font-size: 13px;
      font-weight: 700;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.9);
      padding-right: 4px;
      min-height: 18px;
    }
    .ps-quick-shortcuts {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px;
      width: 100%;
    }
    .ps-qbtn {
      background: linear-gradient(180deg, #c62828 0%, #8e1515 55%, #6d0e0e 100%);
      border: 1px solid rgba(255, 138, 128, 0.45);
      border-bottom: 2px solid #450707;
      border-radius: 5px;
      color: #ffffff;
      font-family: inherit;
      font-size: 11px;
      font-weight: 700;
      height: 26px;
      cursor: pointer;
      box-shadow: 0 3px 8px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.25);
      transition: filter 0.12s ease;
    }
    .ps-qbtn:hover {
      filter: brightness(1.15);
    }
    .ps-slider-row {
      display: grid;
      grid-template-columns: 98px 1fr;
      gap: 8px;
      width: 100%;
      align-items: center;
    }
    .ps-bet-input-wrap {
      background: rgba(14, 18, 24, 0.92);
      border: 1px solid rgba(255, 255, 255, 0.18);
      border-radius: 5px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 6px;
      box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.65);
    }
    #ps-bet-input {
      width: 100%;
      background: transparent;
      border: none;
      color: #ffffff;
      font-family: inherit;
      font-size: 13px;
      font-weight: 700;
      text-align: center;
      outline: none;
    }
    .ps-slider-track-wrap {
      background: rgba(20, 25, 33, 0.92);
      border: 1px solid rgba(255, 255, 255, 0.18);
      border-radius: 5px;
      height: 28px;
      display: flex;
      align-items: center;
      padding: 0 4px;
      gap: 6px;
      box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.65);
    }
    .ps-step-btn {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.14);
      color: #e2e8f0;
      border-radius: 4px;
      width: 22px;
      height: 20px;
      font-weight: 800;
      font-size: 13px;
      line-height: 1;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
    }
    .ps-step-btn:hover {
      background: rgba(255, 255, 255, 0.18);
      color: #fff;
    }
    #ps-bet-slider {
      flex: 1;
      -webkit-appearance: none;
      appearance: none;
      height: 5px;
      border-radius: 999px;
      background: linear-gradient(90deg, #475569 0%, #94a3b8 100%);
      outline: none;
      cursor: pointer;
    }
    #ps-bet-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 16px;
      height: 22px;
      border-radius: 4px;
      background: linear-gradient(180deg, #cbd5e1 0%, #64748b 100%);
      border: 1px solid #f8fafc;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.65);
      cursor: pointer;
    }

    /* Bottom-Left Pre-Action Checkboxes Strip (#ps-bottom-left-hud) */
    #ps-bottom-left-hud {
      display: none;
      position: fixed;
      left: 0;
      bottom: 52px;
      z-index: 45;
      font-family: 'Montserrat', sans-serif;
      user-select: none;
      background: linear-gradient(90deg, rgba(10, 14, 18, 0.85) 0%, rgba(10, 14, 18, 0.45) 80%, transparent 100%);
      padding: 8px 24px 8px 10px;
      color: #cbd5e1;
      font-size: 11px;
    }
    body.ps-theme #ps-bottom-left-hud {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    .ps-preaction-label {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      color: rgba(226, 232, 240, 0.88);
      font-weight: 500;
    }
    .ps-preaction-label input {
      accent-color: #c62828;
      width: 13px;
      height: 13px;
      margin: 0;
      cursor: pointer;
    }
    /* Collapse chat by default in ps-theme unless toggled so bottom-left pre-actions look clean */
    body.ps-theme:not(.ps-chat-open) .chat,
    body.ps-theme:not(.ps-chat-open) .conf-controls,
    body.ps-theme:not(.ps-chat-open) .help-link-game,
    body.ps-theme:not(.ps-chat-open) .version-link-in-game,
    body.ps-theme:not(.ps-chat-open) .spectators-count-ctn {
      display: none !important;
    }
    #ps-chat-drawer-btn {
      display: none;
      position: fixed;
      left: 0;
      bottom: 8px;
      z-index: 46;
      background: rgba(15, 20, 26, 0.88);
      border: 1px solid rgba(255, 255, 255, 0.16);
      border-left: none;
      border-radius: 0 6px 6px 0;
      color: #cbd5e1;
      padding: 6px 10px;
      font-family: 'Montserrat', sans-serif;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
    }
    body.ps-theme #ps-chat-drawer-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }
  </style>
  <script>
    window.announcements = [];
    window.serverNow = Date.now();
    window.gameID = ${safeGameID};
    window.__INITIAL_THEME_KEY = ${JSON.stringify(themeKey || 'halloween-2026')};
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
      // If loading directly into PokerStars theme, default displayValueStyle to 'big-blind' (24 BB, 4 BB, etc.)
      if (window.__INITIAL_THEME_KEY === 'pokerstars') {
        var cpRaw = localStorage.getItem('currentPlayer');
        var cpObj = cpRaw ? JSON.parse(cpRaw) : {};
        cpObj.displayValueStyle = 'big-blind';
        localStorage.setItem('currentPlayer', JSON.stringify(cpObj));
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
<body id="body" class="${isPokerStarsInitial ? 'ps-theme' : ''}">
  <div id="main-container"></div>

  <!-- PokerStars Spin & Go Top Header & 30K Metallic Plaque -->
  <div id="ps-spin-hud">
    <div class="ps-topbar">
      <div class="ps-topbar-left">
        <a class="ps-topbar-icon" href="/start-game" title="Lobby / Criar Jogo">🏠</a>
        <button class="ps-topbar-icon" type="button" onclick="pcToggleBBDisplay()" title="Alternar valores em BB / Fichas">🗔 BB</button>
        <button class="ps-topbar-icon" type="button" onclick="pcAction('start-hand')" title="Próxima Mão">↺</button>
        <button class="ps-topbar-icon" type="button" onclick="pcAction('add-chips')" title="Adicionar Fichas">🎰</button>
      </div>
      <div class="ps-topbar-right">
        <span class="ps-rank-pill" id="ps-rank-badge">1º de 3</span>
        <span class="ps-timer-display" id="ps-elapsed-timer">02:08</span>
        <span class="ps-prize-top-label">1º: 30K</span>
      </div>
    </div>
    <div class="ps-responsible-left">
      <span>Jogo Responsável</span>
      <span class="ps-target-icon">🎯</span>
      <span id="ps-brt-clock">14:19 BRT</span>
    </div>
    <div class="ps-prize-plaque">
      <span class="ps-prize-plaque-digits">30K</span>
      <span class="ps-prize-plaque-spades">♠♠♠</span>
    </div>
  </div>

  <!-- PokerStars Bottom-Left Pre-Action Checkboxes -->
  <div id="ps-bottom-left-hud">
    <label class="ps-preaction-label">
      <input type="checkbox" id="ps-chk-away" onchange="pcAction('ps-away', { away: this.checked })" />
      <span>Ausente na próxima mão</span>
    </label>
    <label class="ps-preaction-label">
      <input type="checkbox" id="ps-chk-autofold" />
      <span>Desistir a qualquer aposta</span>
    </label>
  </div>
  <button id="ps-chat-drawer-btn" type="button" onclick="document.body.classList.toggle('ps-chat-open')">
    <span>❯</span> <span>Chat</span>
  </button>

  <!-- PokerStars Bottom-Right Live Hand Strength & Quick-Bet Sizing Bar -->
  <div id="ps-bottom-right-hud">
    <div id="ps-hand-strength">Carta Alta</div>
    <div class="ps-quick-shortcuts">
      <button class="ps-qbtn" type="button" onclick="psSetQuickBet('min')">Mín</button>
      <button class="ps-qbtn" type="button" onclick="psSetQuickBet('half')">50%</button>
      <button class="ps-qbtn" type="button" onclick="psSetQuickBet('pot')">Pote</button>
      <button class="ps-qbtn" type="button" onclick="psSetQuickBet('max')">Máx</button>
    </div>
    <div class="ps-slider-row">
      <div class="ps-bet-input-wrap">
        <input type="text" id="ps-bet-input" value="2" onchange="psOnBetInputChange(this.value)" />
      </div>
      <div class="ps-slider-track-wrap">
        <button class="ps-step-btn" type="button" onclick="psStepBet(-1)">-</button>
        <input type="range" id="ps-bet-slider" min="20" max="440" step="10" value="40" oninput="psOnSliderInput(this.value)" />
        <button class="ps-step-btn" type="button" onclick="psStepBet(1)">+</button>
      </div>
    </div>
  </div>

  <div id="pc-helper-dock">
    <button id="pc-helper-toggle" type="button" onclick="document.getElementById('pc-helper-dock').classList.toggle('open')">
      <span>♠️ PAINEL POKERCLUB</span>
      <span style="opacity:0.75;font-size:10px;">(Mesas / PokerStars / Bots / Amigos) ▾</span>
    </button>
    <div id="pc-helper-panel">
      <div class="pc-dock-section">
        <div class="pc-dock-title">Mesas Rápidas (1 Clique)</div>
        <div class="pc-dock-row">
          <a class="pc-btn ps-crimson" href="/games/pglPokerStarsSpinGo">♠️ Mesa PokerStars Spin & Go (30K)</a>
          <a class="pc-btn" href="/start-game">1. Criar Jogo (/start-game)</a>
          <a class="pc-btn purple" href="/games/pglzUG33VPJwPc1fl6t6qNeE0">2. Mesa "teste" (Waiting)</a>
          <a class="pc-btn gold" href="/games/pglSBWynA2aYv1UnG4wAcPr0F">3. Mesa Fat Stack (10/20)</a>
          <a class="pc-btn purple" href="/games/pglGDWoVYpdfb7zhPbWp1mCi4">4. Mesa Halloween (1/2)</a>
        </div>
      </div>
      <div class="pc-dock-section">
        <div class="pc-dock-title">Controle da Mesa & Fichas</div>
        <div class="pc-dock-row">
          <button class="pc-btn ps-crimson" type="button" onclick="pcAction('ps-action', { decision: 'sit-spin' })">🪑 Sentar (22 BB)</button>
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
          <button class="pc-btn ps-crimson" type="button" onclick="pcSwitchTheme('pokerstars')">♠️ PokerStars (Spin & Go)</button>
          <button class="pc-btn" type="button" onclick="pcToggleBBDisplay()">🔢 Alternar BB / Fichas (Tecla B)</button>
          <button class="pc-btn purple" type="button" onclick="pcSwitchTheme('halloween-2026')">🎃 Halloween + Cartas pokerSAT</button>
          <button class="pc-btn gold" type="button" onclick="pcSwitchTheme('fat-stack')">🪙 Halloween + Cartas Fat Stack</button>
          <button class="pc-btn green" type="button" onclick="pcSwitchTheme('classic-green')">🟢 Mesa Verde Clássica</button>
          <button class="pc-btn danger" type="button" onclick="pcSwitchTheme('classic-red')">🔴 Mesa Vermelha</button>
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
      return fetch('/api/custom/' + action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.assign({ gameID: gid }, payload || {}))
      });
    }
    function pcSwitchTheme(themeKey) {
      var isPS = themeKey === 'pokerstars';
      document.body.classList.toggle('ps-theme', isPS);
      pcAction('theme', { theme: themeKey });
      if (isPS) {
        // Ensure Big Blind display mode is active when entering PokerStars theme
        try {
          var cp = JSON.parse(localStorage.getItem('currentPlayer') || '{}');
          if (cp.displayValueStyle !== 'big-blind') {
            pcToggleBBDisplay();
          }
        } catch (_) {}
      }
    }
    function pcToggleBBDisplay() {
      // Trigger the native 'b' shortcut listener in game.bundle.js
      var evDown = new KeyboardEvent('keydown', { key: 'b', code: 'KeyB', keyCode: 66, which: 66, bubbles: true });
      var evUp = new KeyboardEvent('keyup', { key: 'b', code: 'KeyB', keyCode: 66, which: 66, bubbles: true });
      document.dispatchEvent(evDown);
      document.dispatchEvent(evUp);
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

    // =========================================================================
    // PokerStars Spin & Go Live HUD Controller (Hand Strength, Bet Sizing, PT-BR)
    // =========================================================================
    window.__psState = {
      bigBlind: 20,
      smallBlind: 10,
      pot: 0,
      cHB: 0,
      mR: 20,
      heroID: null,
      heroStack: 440,
      heroBet: 0,
      selectedBetChips: 40,
      startTime: Date.now() - 128000 // Starts around 02:08 like the screenshot
    };

    var PT_HAND_MAP = {
      'Royal Flush': 'Royal Flush',
      'Straight Flush': 'Straight Flush',
      'Four of a Kind': 'Quadra',
      'Full House': 'Full House',
      'Flush': 'Flush',
      'Straight': 'Sequência',
      'Three of a Kind': 'Trinca',
      'Two Pair': 'Dois Pares',
      'One Pair': 'Um Par',
      'High Card': 'Carta Alta'
    };

    var PT_RANK_PLURAL = {
      '2': 'Dois', '3': 'Três', '4': 'Quatro', '5': 'Cinco',
      '6': 'Seis', '7': 'Sete', '8': 'Oito', '9': 'Nove',
      'T': 'Dez', 'J': 'Valetes', 'Q': 'Damas', 'K': 'Reis', 'A': 'Ases'
    };

    function computePtHandDescription(holeCards, boardCards, fallbackName) {
      var all = [];
      if (Array.isArray(holeCards)) {
        holeCards.forEach(function(c) { if (c && c.value) all.push(c.value); });
      }
      if (Array.isArray(boardCards)) {
        boardCards.forEach(function(c) { if (typeof c === 'string') all.push(c); });
      }
      if (all.length === 0) return '';
      var counts = {};
      all.forEach(function(code) {
        var r = code.charAt(0);
        counts[r] = (counts[r] || 0) + 1;
      });
      if (fallbackName === 'One Pair') {
        for (var r in counts) {
          if (counts[r] === 2) return 'Par de ' + (PT_RANK_PLURAL[r] || r);
        }
      }
      if (fallbackName && PT_HAND_MAP[fallbackName]) {
        return PT_HAND_MAP[fallbackName];
      }
      // Pre-flop 2 hole cards check
      if (all.length === 2) {
        var r1 = all[0].charAt(0), r2 = all[1].charAt(0);
        if (r1 === r2) return 'Par de ' + (PT_RANK_PLURAL[r1] || r1);
      }
      return 'Carta Alta';
    }

    function psFormatBBOrChips(chips) {
      var st = window.__psState;
      var bb = st.bigBlind || 20;
      var isBB = true;
      try {
        var cp = JSON.parse(localStorage.getItem('currentPlayer') || '{}');
        isBB = cp.displayValueStyle === 'big-blind';
      } catch (_) {}
      if (isBB) {
        var val = Math.round((chips / bb) * 10) / 10;
        return val + ' BB';
      }
      return String(Math.round(chips));
    }

    function psUpdateSizingUI() {
      var st = window.__psState;
      var bb = st.bigBlind || 20;
      var minBet = Math.max(bb, (st.cHB || 0) + (st.mR || bb));
      var maxBet = Math.max(minBet, st.heroStack || bb * 22);
      if (st.selectedBetChips < minBet) st.selectedBetChips = minBet;
      if (st.selectedBetChips > maxBet) st.selectedBetChips = maxBet;

      var slider = document.getElementById('ps-bet-slider');
      var input = document.getElementById('ps-bet-input');
      if (slider) {
        slider.min = String(minBet);
        slider.max = String(maxBet);
        slider.step = String(Math.max(1, Math.floor(bb / 2)));
        slider.value = String(st.selectedBetChips);
      }
      if (input && document.activeElement !== input) {
        var isBB = true;
        try {
          var cp = JSON.parse(localStorage.getItem('currentPlayer') || '{}');
          isBB = cp.displayValueStyle === 'big-blind';
        } catch (_) {}
        input.value = isBB
          ? String(Math.round((st.selectedBetChips / bb) * 10) / 10)
          : String(Math.round(st.selectedBetChips));
      }
      psRelabelActionButtons();
    }

    function psSetQuickBet(mode) {
      var st = window.__psState;
      var bb = st.bigBlind || 20;
      var minBet = Math.max(bb, (st.cHB || 0) + (st.mR || bb));
      var maxBet = Math.max(minBet, st.heroStack || bb * 22);
      var pot = st.pot || bb * 2;
      var target = minBet;
      if (mode === 'min') target = minBet;
      else if (mode === 'half') target = Math.max(minBet, Math.min(maxBet, (st.cHB || 0) + Math.round(pot * 0.5)));
      else if (mode === 'pot') target = Math.max(minBet, Math.min(maxBet, (st.cHB || 0) + pot));
      else if (mode === 'max') target = maxBet;
      st.selectedBetChips = target;
      psUpdateSizingUI();
    }

    function psOnSliderInput(val) {
      window.__psState.selectedBetChips = Number(val) || window.__psState.bigBlind;
      psUpdateSizingUI();
    }

    function psOnBetInputChange(val) {
      var num = parseFloat(String(val).replace(',', '.'));
      if (isNaN(num) || num <= 0) return;
      var st = window.__psState;
      var bb = st.bigBlind || 20;
      var isBB = true;
      try {
        var cp = JSON.parse(localStorage.getItem('currentPlayer') || '{}');
        isBB = cp.displayValueStyle === 'big-blind';
      } catch (_) {}
      st.selectedBetChips = isBB ? Math.round(num * bb) : Math.round(num);
      psUpdateSizingUI();
    }

    function psStepBet(dir) {
      var st = window.__psState;
      var bb = st.bigBlind || 20;
      st.selectedBetChips = (st.selectedBetChips || bb * 2) + dir * bb;
      psUpdateSizingUI();
    }

    function psRelabelActionButtons() {
      if (!document.body.classList.contains('ps-theme')) return;
      var st = window.__psState;
      var foldBtn = document.querySelector('.game-decisions-ctn .action-button.fold');
      var checkBtn = document.querySelector('.game-decisions-ctn .action-button.check');
      var callBtn = document.querySelector('.game-decisions-ctn .action-button.call');
      var raiseBtn = document.querySelector('.game-decisions-ctn .action-button.raise');

      if (foldBtn && foldBtn.textContent !== 'Desisto') {
        foldBtn.textContent = 'Desisto';
      }
      if (checkBtn && checkBtn.textContent !== 'Mesa') {
        checkBtn.textContent = 'Mesa';
      }
      if (callBtn) {
        var toCall = Math.max(0, (st.cHB || 0) - (st.heroBet || 0));
        var callLabel = toCall > 0 ? ('Pago ' + psFormatBBOrChips(toCall)) : 'Mesa';
        if (callBtn.textContent !== callLabel) callBtn.textContent = callLabel;
      }
      if (raiseBtn) {
        var raiseLabel = (st.cHB > 0 ? 'Aumento para ' : 'Aposto ') + psFormatBBOrChips(st.selectedBetChips || (st.bigBlind * 2));
        if (raiseBtn.textContent !== raiseLabel) raiseBtn.textContent = raiseLabel;
        if (!raiseBtn.__psBound) {
          raiseBtn.__psBound = true;
          raiseBtn.addEventListener('click', function(ev) {
            if (!document.body.classList.contains('ps-theme')) return;
            ev.preventDefault();
            ev.stopPropagation();
            pcAction('ps-action', { decision: 'raise', value: window.__psState.selectedBetChips });
          }, true);
        }
      }
    }

    // Intercept WebSocket messages to keep PokerStars HUD & Theme synchronized in real-time
    (function() {
      var OrigWS = window.WebSocket;
      if (!OrigWS) return;
      window.WebSocket = function(url, protocols) {
        var ws = protocols ? new OrigWS(url, protocols) : new OrigWS(url);
        ws.addEventListener('message', function(ev) {
          if (typeof ev.data !== 'string' || !ev.data.startsWith('42[')) return;
          try {
            var arr = JSON.parse(ev.data.slice(2));
            var eventName = arr[0];
            var payload = arr[1];
            if (eventName === 'rS' && payload) {
              if (payload.gamePlayer && payload.gamePlayer.id) {
                window.__psState.heroID = payload.gamePlayer.id;
              }
              if (payload.gameData && payload.gameData.designThemeId) {
                document.body.classList.toggle('ps-theme', payload.gameData.designThemeId === 'pokerstars');
              }
              if (payload.gameState) {
                psIngestGameState(payload.gameState);
              }
            } else if (eventName === 'UGD' && payload) {
              if (payload.designThemeId) {
                document.body.classList.toggle('ps-theme', payload.designThemeId === 'pokerstars');
              }
            } else if (eventName === 'gC' && payload) {
              psIngestGameState(payload);
            }
          } catch (_) {}
        });
        return ws;
      };
      window.WebSocket.prototype = OrigWS.prototype;
      window.WebSocket.CONNECTING = OrigWS.CONNECTING;
      window.WebSocket.OPEN = OrigWS.OPEN;
      window.WebSocket.CLOSING = OrigWS.CLOSING;
      window.WebSocket.CLOSED = OrigWS.CLOSED;
    })();

    function psIngestGameState(gs) {
      if (!gs) return;
      var st = window.__psState;
      st.bigBlind = gs.bigBlind || 20;
      st.smallBlind = gs.smallBlind || 10;
      st.pot = gs.pot || 0;
      st.cHB = gs.cHB || 0;
      st.mR = gs.mR || st.bigBlind;

      // Identify hero (either gs.pC entry with visible cards or registered heroID)
      var heroID = st.heroID;
      if (gs.pC) {
        for (var pid in gs.pC) {
          var cInfo = gs.pC[pid];
          if (cInfo && Array.isArray(cInfo.cards) && cInfo.cards.some(function(c) { return c && c.value; })) {
            heroID = pid;
            break;
          }
        }
      }
      if (heroID && gs.players && gs.players[heroID]) {
        st.heroStack = gs.players[heroID].stack || 0;
        st.heroBet = (gs.tB && gs.tB[heroID]) || 0;
      }

      // Update Rank Badge ("2º de 3")
      if (Array.isArray(gs.seats) && gs.players) {
        var seated = gs.seats.map(function(s) { return gs.players[s[1]]; }).filter(Boolean);
        seated.sort(function(a, b) { return (b.stack || 0) - (a.stack || 0); });
        var myIdx = seated.findIndex(function(p) { return p.id === heroID; });
        var pos = myIdx >= 0 ? (myIdx + 1) : 1;
        var total = Math.max(1, seated.length);
        var rankEl = document.getElementById('ps-rank-badge');
        if (rankEl) rankEl.textContent = pos + 'º de ' + total;
      }

      // Update Hand Strength in Portuguese
      var hsEl = document.getElementById('ps-hand-strength');
      if (hsEl) {
        var hole = (heroID && gs.pC && gs.pC[heroID] && gs.pC[heroID].cards) || [];
        var name1 = (heroID && gs.pC && gs.pC[heroID] && gs.pC[heroID].name1) || null;
        var board = (Array.isArray(gs.oTC) && gs.oTC[0]) || [];
        var desc = computePtHandDescription(hole, board, name1);
        hsEl.textContent = desc;
      }

      // Check auto-fold checkbox if it's hero's turn
      var autoFoldChk = document.getElementById('ps-chk-autofold');
      if (autoFoldChk && autoFoldChk.checked && gs.cPI && gs.cPI === heroID && (gs.cHB || 0) > (st.heroBet || 0)) {
        autoFoldChk.checked = false;
        pcAction('ps-action', { decision: 'fold' });
      }

      psUpdateSizingUI();
      setTimeout(psRelabelActionButtons, 60);
    }

    // Live Timer & BRT Clock + Button Relabeling Observer
    setInterval(function() {
      if (!document.body.classList.contains('ps-theme')) return;
      var elapsedSec = Math.floor((Date.now() - window.__psState.startTime) / 1000);
      var mins = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
      var secs = String(elapsedSec % 60).padStart(2, '0');
      var timerEl = document.getElementById('ps-elapsed-timer');
      if (timerEl) timerEl.textContent = mins + ':' + secs;

      var now = new Date();
      var hh = String(now.getHours()).padStart(2, '0');
      var mm = String(now.getMinutes()).padStart(2, '0');
      var clockEl = document.getElementById('ps-brt-clock');
      if (clockEl) clockEl.textContent = hh + ':' + mm + ' BRT';

      psRelabelActionButtons();
    }, 500);

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
        // Always revalidate (ETag) so logo/table image updates show up immediately
        const st = fs.statSync(filePath);
        const etag = `"${st.size}-${Math.floor(st.mtimeMs)}"`;
        if (req.headers['if-none-match'] === etag) {
          res.writeHead(304, { 'ETag': etag, 'Cache-Control': 'no-cache' });
          res.end();
          return;
        }
        res.writeHead(200, {
          'Content-Type': contentType,
          'ETag': etag,
          'Cache-Control': 'no-cache'
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
        playerName: room.players[playerID]?.name || playerName,
        themeKey: room.themeKey
      });
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', ...extraHeaders });
      res.end(html);
      return;
    }

    // 3. pokerSAT Frontend REST APIs
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
        sendJson(res, 422, { value: resStart.message, message: resStart.message }, extraHeaders);
        return;
      }
      sendJson(res, 200, {}, extraHeaders);
      return;
    }

    // GET /games/:id/spectators (Options -> Players tab requires an Array)
    const spectatorsMatch = pathname.match(/^\/games\/([a-zA-Z0-9_-]+)\/spectators$/);
    if (method === 'GET' && spectatorsMatch) {
      const room = getOrCreateRoom(spectatorsMatch[1]);
      const spectators = Object.values(room.players)
        .filter(p => p && p.status === 'watching')
        .map(p => ({ id: p.id, name: p.name || 'Guest', status: 'watching' }));
      sendJson(res, 200, spectators, extraHeaders);
      return;
    }

    // GET /games/:id/players/:playerID (Options -> Players -> Edit screen)
    const getPlayerMatch = pathname.match(/^\/games\/([a-zA-Z0-9_-]+)\/players\/([a-zA-Z0-9_-]+)$/);
    if (method === 'GET' && getPlayerMatch) {
      const room = getOrCreateRoom(getPlayerMatch[1]);
      const targetID = getPlayerMatch[2];
      const p = room.players[targetID] || {
        id: targetID,
        name: 'Guest',
        status: 'watching',
        stack: 0
      };
      sendJson(
        res,
        200,
        {
          gamePlayer: p,
          enqueuedChanged: (room.enqueuedStackChanges && room.enqueuedStackChanges[targetID]) || null
        },
        extraHeaders
      );
      return;
    }

    // POST /games/:id/update_player & /games/:id/approve_player (Owner adding/removing/setting player chips)
    const updatePlayerMatch = pathname.match(/^\/games\/([a-zA-Z0-9_-]+)\/(update_player|approve_player)$/);
    if (method === 'POST' && updatePlayerMatch) {
      const room = getOrCreateRoom(updatePlayerMatch[1]);
      const body = await readJsonBody(req);
      const targetID = body.playerID;
      const p = room.players[targetID];
      if (!p) {
        sendJson(res, 422, { stack: 'Player not found' }, extraHeaders);
        return;
      }
      const mode = body.stackChangeMode || 'add';
      const val = Math.round(Number(body.stackChange) || 0);
      if (val <= 0 && mode !== 'set') {
        sendJson(res, 422, { stack: 'Please enter a valid amount' }, extraHeaders);
        return;
      }

      const inActiveHand =
        room.status === 'inProgress' &&
        room.iHPI.includes(targetID) &&
        p.status === 'inGame' &&
        room.pGS[targetID] !== 'fold';

      if (inActiveHand) {
        if (!room.enqueuedStackChanges) room.enqueuedStackChanges = {};
        room.enqueuedStackChanges[targetID] = { stackChange: val, stackChangeMode: mode };
      } else {
        const oldStack = p.stack || 0;
        let newStack = oldStack;
        if (mode === 'add') newStack = oldStack + val;
        else if (mode === 'remove') newStack = Math.max(0, oldStack - val);
        else if (mode === 'set') newStack = Math.max(0, val);
        const diff = newStack - oldStack;
        p.stack = newStack;
        if (diff > 0) room.updateLedger(targetID, p.name, diff, 0);
        else if (diff < 0) room.updateLedger(targetID, p.name, 0, -diff);
        if (p.stack > 0 && (p.status === 'standingUp' || p.status === 'requestedGameIngress')) {
          p.status = room.status === 'inProgress' ? 'waitingNextGameToEnter' : 'inGame';
        } else if (p.stack <= 0 && room.isPlayerSeated(targetID)) {
          p.stack = 0;
          p.status = 'standingUp';
        }
        room.addLog(`The stack of "${p.name} @ ${targetID}" was updated from ${oldStack} to ${newStack}.`);
      }
      room.ensureValidOwner();
      room.syncAllLedgers();
      room.broadcast();
      sendJson(res, 200, {}, extraHeaders);
      return;
    }

    // POST /games/:id/transfer_ownership
    const transferOwnerMatch = pathname.match(/^\/games\/([a-zA-Z0-9_-]+)\/transfer_ownership$/);
    if (method === 'POST' && transferOwnerMatch) {
      const room = getOrCreateRoom(transferOwnerMatch[1]);
      const body = await readJsonBody(req);
      if (body.playerID && room.players[body.playerID]) {
        room.ownerID = body.playerID;
        room.broadcast();
      }
      sendJson(res, 200, {}, extraHeaders);
      return;
    }

    // POST /games/:id/remove_player
    const removePlayerMatch = pathname.match(/^\/games\/([a-zA-Z0-9_-]+)\/remove_player$/);
    if (method === 'POST' && removePlayerMatch) {
      const room = getOrCreateRoom(removePlayerMatch[1]);
      const body = await readJsonBody(req);
      if (body.playerID && room.players[body.playerID]) {
        if (room.status === 'inProgress' && room.iHPI.includes(body.playerID) && room.pGS[body.playerID] !== 'fold') {
          room.players[body.playerID].qNH = true;
          room.broadcast();
        } else {
          room.removePlayerFromSeat(body.playerID);
        }
      }
      sendJson(res, 200, {}, extraHeaders);
      return;
    }

    // POST /games/:id/put_in_away_mode
    const putAwayMatch = pathname.match(/^\/games\/([a-zA-Z0-9_-]+)\/put_in_away_mode$/);
    if (method === 'POST' && putAwayMatch) {
      const room = getOrCreateRoom(putAwayMatch[1]);
      const body = await readJsonBody(req);
      const target = body.playerID ? room.players[body.playerID] : null;
      if (target) {
        if (room.status === 'waiting' || !room.iHPI.includes(target.id) || room.pGS[target.id] === 'fold') {
          target.status = 'standingUp';
          target.sUNH = false;
        } else {
          target.sUNH = true;
        }
        room.broadcast();
      }
      sendJson(res, 200, {}, extraHeaders);
      return;
    }

    // POST /games/:id/request_rebuy & POST /api/games/:id/request-add-on
    const rebuyOrAddonMatch =
      pathname.match(/^\/games\/([a-zA-Z0-9_-]+)\/request_rebuy$/) ||
      pathname.match(/^\/api\/games\/([a-zA-Z0-9_-]+)\/request-add-on$/);
    if (method === 'POST' && rebuyOrAddonMatch) {
      const room = getOrCreateRoom(rebuyOrAddonMatch[1]);
      const body = await readJsonBody(req);
      const added = Math.round(Number(body.value) || 0);
      const p = room.players[playerID];
      if (!p || added <= 0) {
        sendJson(res, 422, { value: 'Invalid amount', message: 'Invalid amount' }, extraHeaders);
        return;
      }
      const inActiveHand =
        room.status === 'inProgress' &&
        room.iHPI.includes(playerID) &&
        p.status === 'inGame' &&
        room.pGS[playerID] !== 'fold';
      if (inActiveHand) {
        if (!room.enqueuedStackChanges) room.enqueuedStackChanges = {};
        const prev = room.enqueuedStackChanges[playerID]?.stackChange || 0;
        room.enqueuedStackChanges[playerID] = { stackChange: prev + added, stackChangeMode: 'add' };
      } else {
        p.stack = (p.stack || 0) + added;
        room.updateLedger(playerID, p.name, added, 0);
        if (p.status === 'standingUp') {
          p.status = room.status === 'inProgress' ? 'waitingNextGameToEnter' : 'inGame';
        }
      }
      room.ensureValidOwner();
      room.syncAllLedgers();
      room.broadcast();
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
        // If the schedule changes while a game is running, restart the blind clock.
        if (room.status === 'inProgress' && Array.isArray(body.bS) && body.bS.length > 1) {
          room.initBlindClock();
        }
        // With multiple levels running, the blind clock owns the current blinds.
        const clockRunning = room.status === 'inProgress' && room.getBlindLevels().length > 0;
        if (!clockRunning) {
          room.smallBlind = Number(body.bS[0][0]) || room.smallBlind;
          room.bigBlind = Number(body.bS[0][1]) || room.bigBlind;
        }
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
          const newStack = Math.max(0, Number(change.stack) || 0);
          const diff = newStack - (p.stack || 0);
          p.stack = newStack;
          if (diff > 0) room.updateLedger(pid, p.name, diff, 0);
          else if (diff < 0) room.updateLedger(pid, p.name, 0, -diff);
          if (p.stack > 0 && p.status === 'standingUp') {
            p.status = room.status === 'inProgress' ? 'waitingNextGameToEnter' : 'inGame';
          }
        }
        if (change.status === 'standingUp') {
          p.status = 'standingUp';
        } else if (change.status === 'quiting') {
          room.removePlayerFromSeat(pid);
        }
      }
      room.ensureValidOwner();
      room.syncAllLedgers();
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
        if (p.stack > 0 && p.status === 'standingUp') {
          p.status = room.status === 'inProgress' ? 'waitingNextGameToEnter' : 'inGame';
        }
        room.updateLedger(playerID, p.name, added, 0);
        room.ensureValidOwner();
        room.syncAllLedgers();
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
              id: 'pokerstars',
              title: 'PokerStars (Spin & Go / Modern Classic)',
              tablePreviewUrl: '/assets/ps-felt-l.svg',
              cardsPreviewUrl: '/assets/ps-cards-back.svg'
            },
            {
              id: 'halloween-2026',
              title: 'Halloween 2026 (pokerSAT Cards)',
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
        sendJson(res, 200, { ok: true, themeKey: room.themeKey });
        return;
      }

      if (subAction === 'ps-action') {
        const decision = body.decision;
        if (decision === 'fold') {
          room.handleFold(playerID);
        } else if (decision === 'check') {
          room.handleCheck(playerID);
        } else if (decision === 'call') {
          if (!room.cHB || (room.tB[playerID] || 0) >= room.cHB) {
            room.handleCheck(playerID);
          } else {
            room.handleCall(playerID);
          }
        } else if (decision === 'raise') {
          const val = Number(body.value);
          if (val > 0) {
            room.handleRaise(playerID, val);
          }
        } else if (decision === 'sit-spin') {
          // Sit hero at Seat 1 if open, with 22 BB (440 chips)
          const existingSeat = room.seats.find(([, pid]) => pid === playerID);
          if (!existingSeat) {
            let targetSeat = 1;
            const taken = new Set(room.seats.map(([s]) => s));
            if (taken.has(1)) {
              for (let s = 1; s <= 10; s++) {
                if (!taken.has(s)) { targetSeat = s; break; }
              }
            }
            room.ensurePlayerRecord(playerID, playerName || 'Nosferato_btu');
            const p = room.players[playerID];
            p.stack = (room.bigBlind || 20) * 22;
            p.status = room.status === 'inProgress' ? 'waitingNextGameToEnter' : 'inGame';
            room.seats.push([targetSeat, playerID]);
            room.seats.sort((a, b) => a[0] - b[0]);
            room.updateLedger(playerID, p.name, p.stack, 0);
            if (room.status === 'waiting' && room.seats.length >= 2) {
              room.startGame();
            } else {
              room.broadcast();
            }
          }
        }
        sendJson(res, 200, { ok: true });
        return;
      }

      if (subAction === 'ps-away') {
        const target = room.players[playerID];
        if (target) {
          if (body.away) {
            if (room.status === 'waiting' || !room.iHPI.includes(target.id) || room.pGS[target.id] === 'fold') {
              target.status = 'standingUp';
              target.sUNH = false;
            } else {
              target.sUNH = true;
            }
          } else {
            target.sUNH = false;
            if (target.status === 'standingUp' && (target.stack || 0) > 0) {
              target.status = room.status === 'inProgress' ? 'waitingNextGameToEnter' : 'inGame';
            }
          }
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
  } catch (_) { }
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
        if (player && (player.stack || 0) > 0) {
          player.sUNH = false;
          player.status = room.status === 'inProgress' ? 'waitingNextGameToEnter' : 'inGame';
          room.ensureValidOwner();
          room.broadcast();
        }
        break;

      case 'TSG': // Toggle Stop Game on Next Hand
        room.enqueuedStop = Boolean(data.decision);
        room.broadcast();
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
        // Time spent paused does not count against the blind level
        if (room.uP && room.blindLevelEndsAt) {
          room.blindLevelEndsAt += Date.now() - room.uP;
        }
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
  console.log(`♠️  pokerSAT Clone Server running on http://localhost:${PORT}`);
  console.log('============================================================');
  console.log(`1. Tela Criar Jogo (Img 1):    http://localhost:${PORT}/start-game`);
  console.log(`2. Mesa "teste" (Img 2 e 3):   http://localhost:${PORT}/games/pglzUG33VPJwPc1fl6t6qNeE0`);
  console.log(`3. Mesa Fat Stack (Img 4):     http://localhost:${PORT}/games/pglSBWynA2aYv1UnG4wAcPr0F`);
  console.log(`4. Mesa Halloween (Img 5):     http://localhost:${PORT}/games/pglGDWoVYpdfb7zhPbWp1mCi4`);
  console.log('============================================================');
});
