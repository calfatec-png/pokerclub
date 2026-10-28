const crypto = require('crypto');

const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
const SUITS = ['s', 'h', 'd', 'c'];
const RANK_VALUE = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
  '9': 9, 'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

const HAND_NAMES = {
  9: 'Royal Flush',
  8: 'Straight Flush',
  7: 'Four of a Kind',
  6: 'Full House',
  5: 'Flush',
  4: 'Straight',
  3: 'Three of a Kind',
  2: 'Two Pair',
  1: 'One Pair',
  0: 'High Card'
};

const THEMES = {
  'halloween-2026': {
    designThemeId: 'halloween-2026',
    customCardsBackUrl: '/assets/hw26-cards.png',
    adDesignTheme: false,
    defaultDesignTheme: true,
    defaultDesignThemeFeltId: 'halloween-2026',
    defaultDesignThemeTitle: '🎃 Halloween table theme is on',
    tableUrls: {
      d: '/assets/hw26-felt-l.png',
      ds: '/assets/hw26-felt-l.png',
      m: '/assets/hw26-felt-p.png',
      ms: '/assets/hw26-felt-p.png'
    }
  },
  'fat-stack': {
    designThemeId: 'CRjEwYL5qz',
    customCardsBackUrl: '/assets/-c71ohAPeS.png',
    adDesignTheme: false,
    defaultDesignTheme: false,
    defaultDesignThemeFeltId: 'halloween-2026',
    defaultDesignThemeTitle: '🎃 Halloween + Fat Stack Cards',
    tableUrls: {
      d: '/assets/hw26-felt-l.png',
      ds: '/assets/hw26-felt-l.png',
      m: '/assets/hw26-felt-p.png',
      ms: '/assets/hw26-felt-p.png'
    }
  },
  'classic-green': {
    designThemeId: 'classic-green',
    customCardsBackUrl: '/assets/card-back-551b604a5c302e648fbd-20547581d602.svg',
    adDesignTheme: false,
    defaultDesignTheme: false,
    defaultDesignThemeFeltId: null,
    defaultDesignThemeTitle: 'Classic Green Felt',
    tableUrls: {
      d: '/assets/table-a8d3c0639b9cfbf2583c-20547581d602.png',
      ds: '/assets/table-a8d3c0639b9cfbf2583c-20547581d602.png',
      m: '/assets/table-vertical-0737db3e07516d2313b7-20547581d602.png',
      ms: '/assets/table-vertical-0737db3e07516d2313b7-20547581d602.png'
    }
  },
  'classic-red': {
    designThemeId: 'classic-red',
    customCardsBackUrl: '/assets/card-back-551b604a5c302e648fbd-20547581d602.svg',
    adDesignTheme: false,
    defaultDesignTheme: false,
    defaultDesignThemeFeltId: null,
    defaultDesignThemeTitle: 'Royal Red Felt',
    tableUrls: {
      d: '/assets/table-red-cd06bc41808b2a1d7ad1-20547581d602.png',
      ds: '/assets/table-red-cd06bc41808b2a1d7ad1-20547581d602.png',
      m: '/assets/table-vertical-red-a3585666bda7b5c51b8f-20547581d602.png',
      ms: '/assets/table-vertical-red-a3585666bda7b5c51b8f-20547581d602.png'
    }
  }
};

function createDeck() {
  const deck = [];
  for (const r of RANKS) {
    for (const s of SUITS) {
      deck.push(r + s);
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    const tmp = deck[i];
    deck[i] = deck[j];
    deck[j] = tmp;
  }
  return deck;
}

function getCombinations5(arr) {
  const res = [];
  const n = arr.length;
  if (n < 5) return [arr.slice()];
  for (let i = 0; i < n - 4; i++) {
    for (let j = i + 1; j < n - 3; j++) {
      for (let k = j + 1; k < n - 2; k++) {
        for (let l = k + 1; l < n - 1; l++) {
          for (let m = l + 1; m < n; m++) {
            res.push([arr[i], arr[j], arr[k], arr[l], arr[m]]);
          }
        }
      }
    }
  }
  return res;
}

function evaluate5Cards(cards5) {
  const ranks = cards5.map(c => RANK_VALUE[c[0]]).sort((a, b) => b - a);
  const suits = cards5.map(c => c[1]);
  const isFlush = suits.every(s => s === suits[0]);

  const counts = {};
  for (const r of ranks) counts[r] = (counts[r] || 0) + 1;

  const groups = Object.entries(counts)
    .map(([r, c]) => ({ rank: Number(r), count: c }))
    .sort((a, b) => b.count - a.count || b.rank - a.rank);

  let isStraight = false;
  let straightHigh = 0;
  if (groups.length === 5) {
    if (ranks[0] - ranks[4] === 4) {
      isStraight = true;
      straightHigh = ranks[0];
    } else if (ranks[0] === 14 && ranks[1] === 5 && ranks[2] === 4 && ranks[3] === 3 && ranks[4] === 2) {
      isStraight = true;
      straightHigh = 5;
    }
  }

  let category = 0;
  let tiebreakers = [];

  if (isFlush && isStraight) {
    category = straightHigh === 14 ? 9 : 8;
    tiebreakers = [straightHigh];
  } else if (groups[0].count === 4) {
    category = 7;
    tiebreakers = [groups[0].rank, groups[1].rank];
  } else if (groups[0].count === 3 && groups[1].count === 2) {
    category = 6;
    tiebreakers = [groups[0].rank, groups[1].rank];
  } else if (isFlush) {
    category = 5;
    tiebreakers = ranks;
  } else if (isStraight) {
    category = 4;
    tiebreakers = [straightHigh];
  } else if (groups[0].count === 3) {
    category = 3;
    tiebreakers = [groups[0].rank, groups[1].rank, groups[2].rank];
  } else if (groups[0].count === 2 && groups[1].count === 2) {
    category = 2;
    tiebreakers = [groups[0].rank, groups[1].rank, groups[2].rank];
  } else if (groups[0].count === 2) {
    category = 1;
    tiebreakers = [groups[0].rank, groups[1].rank, groups[2].rank, groups[3].rank];
  } else {
    category = 0;
    tiebreakers = ranks;
  }

  let score = category * 1e10;
  for (let i = 0; i < tiebreakers.length; i++) {
    score += tiebreakers[i] * Math.pow(15, 4 - i);
  }

  return {
    category,
    score,
    name: HAND_NAMES[category],
    cards: cards5
  };
}

function evaluateCards(cards) {
  const valid = (cards || []).filter(Boolean);
  if (valid.length < 5) {
    if (valid.length === 2) {
      const r1 = RANK_VALUE[valid[0][0]];
      const r2 = RANK_VALUE[valid[1][0]];
      return {
        category: r1 === r2 ? 1 : 0,
        score: r1 === r2 ? 1e10 + r1 : Math.max(r1, r2),
        name: r1 === r2 ? 'One Pair' : 'High Card',
        best5: valid
      };
    }
    return { category: 0, score: 0, name: null, best5: valid };
  }

  const combos = getCombinations5(valid);
  let best = null;
  for (const c5 of combos) {
    const ev = evaluate5Cards(c5);
    if (!best || ev.score > best.score) {
      best = ev;
    }
  }
  return {
    category: best.category,
    score: best.score,
    name: best.name,
    best5: best.cards
  };
}

function generateId(len = 10) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-';
  let out = '';
  for (let i = 0; i < len; i++) {
    out += chars[crypto.randomInt(0, chars.length)];
  }
  return out;
}

const BOT_NAMES_POOL = [
  'WEALTH13ABUXAU', 'ddjeker', 'TiffUnhinged', 'JustIn', 'Ghost®',
  'Mrdestroyer', 'CheckYours', 'BlueGiraffe', 'focusedemu', 'kakk',
  'gsw__AA', 'RiverRegis', 'Thug.123', 'Carl Kim', 'John Strategy',
  'Rk733', 'Tami webb', 'eggricyang', 'PokerEnjoyer:)', 'King Lelouch'
];

class PokerGameRoom {
  constructor(options = {}) {
    this.id = options.id || ('pgl' + generateId(22));
    this.ownerID = options.ownerID || null;
    this.themeKey = options.themeKey || 'halloween-2026';
    this.smallBlind = options.smallBlind || 10;
    this.bigBlind = options.bigBlind || 20;
    this.mode = options.mode || '4fun';
    this.clubID = options.clubID || null;
    this.clubType = options.clubType || null;
    this.chipType = options.chipType || null;
    this.minMaxBuyIn = options.minMaxBuyIn || null;
    this.allowWaitlist = Boolean(options.allowWaitlist);
    this.noOwner = Boolean(options.noOwner);

    this.status = 'waiting'; // 'waiting' | 'inProgress'
    this.gM = 'th';
    this.gT = [];
    this.nR = [1];
    this.gN = options.gN || 0;
    this.hI = null;
    this.pot = 0;
    this.cHB = 0;
    this.mR = this.bigBlind * 2;
    this.mAVTB = 10000;
    this.seats = []; // [[seatNum, playerID], ...]
    this.players = {}; // playerID -> player obj
    this.pC = {}; // playerID -> { cards: [{value, showing}, ...], name1, ... }
    this.holeCardsSecret = {}; // playerID -> ['As', 'Kd']
    this.pGS = {}; // playerID -> 'inGame' | 'fold' | 'allIn' | 'waiting'
    this.tB = {}; // playerID -> number | 'check'
    this.totalHandBet = {}; // playerID -> total chips put into pot this hand
    this.pTB = {}; // playerID -> timebank ms
    this.oTC = { '1': [] };
    this.iHPI = [];
    this.wBACPI = [];
    this.cRPI = [];
    this.actedInStreet = new Set();
    this.dealerID = null;
    this.dealerSeat = null;
    this.sBPI = null;
    this.bBPI = null;
    this.sBS = null;
    this.cPI = null;
    this.pITT = null;
    this.pASA = null;
    this.dLTWoTB = null;
    this.dLTWTB = null;
    this.sNA = null;
    this.sNAA = null;
    this.gameResult = null;
    this.tHC = null;
    this.uP = false;
    this.waitlistIds = [];
    this.emojis = {}; // playerID -> emoji
    this.mEV = 0;

    this.configs = {
      aD: true,
      aGC: true,
      aS: false,
      aCP: true,
      aVC: true,
      cM: false,
      dAC: false,
      decisionLimitTime: 20,
      mTB: 10,
      rAH: null,
      gM: 'th',
      rH: true,
      rIT: 'no',
      sAHWBF: true,
      sPM: false,
      sS: 'n',
      autoTrimExcessBets: false,
      recordChatForReplay: true,
      allowStandaloneRebuy: true,
      bombPot: false,
      bombPotProbability: null,
      bombPotBBQty: null,
      doubleBoard: null,
      sevenDeuceBounty: null,
      nitGame: false,
      rake: false,
      bTT: null,
      rBL: false,
      bS: [[this.smallBlind, this.bigBlind, null, null]]
    };

    this.chatMessages = options.initialChat || [
      {
        at: Date.now(),
        playerID: 'poker-now',
        playerName: 'Poker Now',
        message: 'Elevate Your Game with Poker Now Plus. Activate your Free 7-Day Trial Today!',
        autoMessage: true,
        highlight: true
      }
    ];

    this.handLogs = {}; // handNumber -> [{ createdAt, msg }]
    this.ledger = {}; // playerID -> { id, names: [], buyInSum, buyOutSum, inGame, net }

    this.deck = [];
    this.turnTimer = null;
    this.nextStepTimer = null;
    this.botTimer = null;
    this.onBroadcast = null; // callback(room)
  }

  addLog(msg) {
    const h = this.gN || 1;
    if (!this.handLogs[h]) this.handLogs[h] = [];
    const createdAt = Date.now() * 100 + crypto.randomInt(0, 99);
    this.handLogs[h].unshift({ createdAt, msg });
  }

  updateLedger(playerID, name, deltaBuyIn = 0, deltaBuyOut = 0) {
    if (!this.ledger[playerID]) {
      this.ledger[playerID] = {
        id: playerID,
        names: [name],
        buyInSum: 0,
        buyOutSum: 0,
        inGame: 0,
        net: 0
      };
    }
    const entry = this.ledger[playerID];
    if (name && !entry.names.includes(name)) entry.names.push(name);
    entry.buyInSum += deltaBuyIn;
    entry.buyOutSum += deltaBuyOut;
    const p = this.players[playerID];
    const currentStack = p && this.isPlayerSeated(playerID) ? (p.stack || 0) : 0;
    entry.inGame = currentStack;
    entry.net = entry.buyOutSum + entry.inGame - entry.buyInSum;
  }

  syncAllLedgers() {
    for (const pid of Object.keys(this.ledger)) {
      const p = this.players[pid];
      const entry = this.ledger[pid];
      const inHandBet = this.totalHandBet[pid] || 0;
      const seated = this.isPlayerSeated(pid);
      entry.inGame = seated && p ? (p.stack || 0) + (this.status === 'inProgress' ? inHandBet : 0) : 0;
      entry.net = entry.buyOutSum + entry.inGame - entry.buyInSum;
    }
  }

  isPlayerSeated(playerID) {
    return this.seats.some(s => s[1] === playerID);
  }

  getSeatOfPlayer(playerID) {
    const found = this.seats.find(s => s[1] === playerID);
    return found ? found[0] : null;
  }

  ensureValidOwner(preferredPlayerID = null) {
    if (this.noOwner) {
      this.ownerID = null;
      return;
    }

    // Whenever table is in 'waiting' state, any seated player with chips waiting for next hand should be 'inGame'
    // so that Poker Now's showingStartGame condition (players with status === 'inGame' > 1) is satisfied.
    if (this.status === 'waiting') {
      for (const [, pid] of this.seats) {
        const p = this.players[pid];
        if (p && p.status === 'waitingNextGameToEnter' && (p.stack || 0) > 0) {
          p.status = 'inGame';
        }
      }
    }

    const currentOwner = this.ownerID ? this.players[this.ownerID] : null;
    const isCurrentOwnerSeatedHuman = Boolean(
      currentOwner && !currentOwner.isBot && this.isPlayerSeated(this.ownerID)
    );

    if (!isCurrentOwnerSeatedHuman) {
      if (
        preferredPlayerID &&
        this.players[preferredPlayerID] &&
        !this.players[preferredPlayerID].isBot &&
        this.isPlayerSeated(preferredPlayerID)
      ) {
        this.ownerID = preferredPlayerID;
      } else {
        const seatedHuman = this.seats
          .map(([, pid]) => this.players[pid])
          .find(p => p && !p.isBot);
        if (seatedHuman) {
          this.ownerID = seatedHuman.id;
        } else if (
          preferredPlayerID &&
          this.players[preferredPlayerID] &&
          !this.players[preferredPlayerID].isBot
        ) {
          this.ownerID = preferredPlayerID;
        } else if (!currentOwner || this.ownerID === 'p_teste_owner') {
          const anyRealHuman = Object.values(this.players).find(
            p => p && !p.isBot && p.id !== 'p_teste_owner'
          );
          if (anyRealHuman) {
            this.ownerID = anyRealHuman.id;
          }
        }
      }
    }
  }

  ensurePlayerRecord(playerID, defaultName = null) {
    if (!this.players[playerID]) {
      this.players[playerID] = {
        id: playerID,
        name: defaultName,
        status: 'watching',
        winCount: 0,
        quitCount: 0,
        isNetworkPlayer: false,
        stack: 0,
        avatarID: null
      };
    } else if (defaultName && !this.players[playerID].name) {
      this.players[playerID].name = defaultName;
    }
    if (!this.pTB[playerID]) {
      this.pTB[playerID] = (this.configs.mTB || 10) * 1000;
    }
    this.ensureValidOwner(playerID);
    return this.players[playerID];
  }

  seatPlayer({ playerID, playerName, seat, stack, sitAsAway = false, isBot = false, winCount = 0, quitCount = 0, emoji = null, statusOverride = null }) {
    const seatNum = Number(seat);
    if (!seatNum || seatNum < 1 || seatNum > 10) {
      return { ok: false, error: { seat: 'Invalid seat number' } };
    }
    if (this.seats.some(s => s[0] === seatNum && s[1] !== playerID)) {
      return { ok: false, error: { seat: 'This seat is already taken' } };
    }
    const parsedStack = Number(stack);
    if (!parsedStack || parsedStack <= 0) {
      return { ok: false, error: { stack: 'Please enter a valid stack' } };
    }
    const cleanName = String(playerName || 'Player').trim().slice(0, 14) || 'Player';

    // Remove from old seat if any
    this.seats = this.seats.filter(s => s[1] !== playerID);
    this.seats.push([seatNum, playerID]);
    this.seats.sort((a, b) => a[0] - b[0]);

    let initialStatus = 'inGame';
    if (statusOverride) {
      initialStatus = statusOverride;
    } else if (sitAsAway) {
      initialStatus = 'standingUp';
    } else if (this.status === 'inProgress') {
      initialStatus = 'waitingNextGameToEnter';
    }

    this.players[playerID] = {
      id: playerID,
      name: cleanName,
      status: initialStatus,
      winCount: winCount || (this.players[playerID]?.winCount || 0),
      quitCount: quitCount || (this.players[playerID]?.quitCount || 0),
      isNetworkPlayer: Boolean(this.clubID) || isBot,
      stack: parsedStack,
      nPY: true,
      avatarID: null,
      isBot: Boolean(isBot),
      sUNH: false,
      qNH: false
    };

    if (emoji) {
      this.emojis[playerID] = emoji;
      this.mEV++;
    }

    this.pTB[playerID] = (this.configs.mTB || 10) * 1000;
    this.updateLedger(playerID, cleanName, parsedStack, 0);
    this.addLog(`The player "${cleanName} @ ${playerID}" joined the game with a stack of ${parsedStack}.`);
    this.ensureValidOwner(!isBot ? playerID : null);
    this.broadcast();
    return { ok: true };
  }

  addBot(customOpts = {}) {
    const takenSeats = new Set(this.seats.map(s => s[0]));
    const emptySeats = [];
    for (let i = 1; i <= 10; i++) {
      if (!takenSeats.has(i)) emptySeats.push(i);
    }
    if (emptySeats.length === 0) return null;

    const seat = customOpts.seat && !takenSeats.has(customOpts.seat)
      ? customOpts.seat
      : emptySeats[0];

    const usedNames = new Set(Object.values(this.players).map(p => p.name));
    const availableNames = BOT_NAMES_POOL.filter(n => !usedNames.has(n));
    const botName = customOpts.name || (availableNames.length > 0 ? availableNames[0] : `Bot_${seat}`);
    const botID = customOpts.id || ('bot_' + generateId(6));
    const defaultStack = customOpts.stack || (this.bigBlind * 100);

    this.seatPlayer({
      playerID: botID,
      playerName: botName,
      seat,
      stack: defaultStack,
      sitAsAway: Boolean(customOpts.sitAsAway),
      isBot: true,
      winCount: customOpts.winCount ?? crypto.randomInt(0, 6),
      quitCount: customOpts.quitCount ?? 0,
      emoji: customOpts.emoji || null,
      statusOverride: customOpts.statusOverride || null
    });

    return this.players[botID];
  }

  removeBots() {
    const botIDs = Object.values(this.players).filter(p => p.isBot).map(p => p.id);
    for (const bid of botIDs) {
      this.removePlayerFromSeat(bid);
    }
    this.broadcast();
  }

  removePlayerFromSeat(playerID) {
    const p = this.players[playerID];
    if (!p) return;
    if (this.status === 'inProgress' && this.iHPI.includes(playerID) && this.pGS[playerID] === 'inGame') {
      this.handleFold(playerID);
    }
    const cashOut = p.stack || 0;
    this.seats = this.seats.filter(s => s[1] !== playerID);
    p.status = 'watching';
    p.stack = 0;
    p.sUNH = false;
    p.qNH = false;
    this.updateLedger(playerID, p.name, 0, cashOut);
    this.addLog(`The player "${p.name} @ ${playerID}" left the seat.`);

    const activePlayers = this.getActiveSeatedPlayers();
    if (this.status === 'inProgress' && activePlayers.length < 2) {
      this.clearTimers();
      this.status = 'waiting';
      this.gT = [];
      this.pC = {};
      this.pGS = {};
      this.tB = {};
      this.oTC = { '1': [] };
      this.gameResult = null;
      this.tHC = null;
      this.pITT = null;
      this.cPI = null;
      this.sNA = null;
      this.sNAA = null;
    }
    this.ensureValidOwner();
    this.broadcast();
  }

  getActiveSeatedPlayers() {
    return this.seats
      .map(([seat, pid]) => ({ seat, player: this.players[pid] }))
      .filter(x => x.player && ['inGame', 'waitingNextGameToEnter'].includes(x.player.status) && x.player.stack > 0);
  }

  startGame() {
    this.enqueuedStop = false;
    // Convert any waitingNextGameToEnter with stack > 0 to inGame
    for (const [, pid] of this.seats) {
      const p = this.players[pid];
      if (p && p.status === 'waitingNextGameToEnter' && p.stack > 0) {
        p.status = 'inGame';
      }
    }
    const ready = this.seats
      .map(([seat, pid]) => ({ seat, player: this.players[pid] }))
      .filter(x => x.player && x.player.status === 'inGame' && x.player.stack > 0);

    if (ready.length < 2) {
      return { ok: false, message: 'At least 2 players with chips are required to start the game.' };
    }

    this.status = 'inProgress';
    this.initBlindClock();
    this.startNewHand();
    return { ok: true };
  }

  // ---- Blind level clock (configs.bS = [[sb, bb, durationMinutes, ante], ...]) ----
  getBlindLevels() {
    const bS = Array.isArray(this.configs.bS) ? this.configs.bS : [];
    if (bS.length <= 1) return [];
    return bS;
  }

  blindLevelDurationMs(level) {
    const mins = Number(level && level[2]);
    return mins > 0 ? mins * 60000 : 0;
  }

  initBlindClock() {
    const levels = this.getBlindLevels();
    this.blindLevelIdx = 0;
    this.blindLevelEndsAt = null;
    this.blindClockStarted = true;
    if (!levels.length) return;
    const first = levels[0];
    this.smallBlind = Number(first[0]) || this.smallBlind;
    this.bigBlind = Number(first[1]) || this.bigBlind;
    const dur = this.blindLevelDurationMs(first);
    this.blindLevelEndsAt = dur ? Date.now() + dur : null;
  }

  resetBlindClock() {
    this.blindLevelIdx = 0;
    this.blindLevelEndsAt = null;
    this.blindClockStarted = false;
  }

  // Called at the beginning of every hand: moves to the next level(s) if time is up.
  advanceBlindLevelIfDue() {
    const levels = this.getBlindLevels();
    if (!levels.length) return;
    // Levels configured after the game already started: start the clock now.
    if (!this.blindClockStarted) this.initBlindClock();
    if (this.blindLevelIdx == null) this.blindLevelIdx = 0;
    if (!this.blindLevelEndsAt) return;
    const now = Date.now();
    let changed = false;
    while (
      this.blindLevelEndsAt &&
      now >= this.blindLevelEndsAt &&
      this.blindLevelIdx < levels.length - 1
    ) {
      const prevEnd = this.blindLevelEndsAt;
      this.blindLevelIdx += 1;
      const lvl = levels[this.blindLevelIdx];
      const dur = this.blindLevelDurationMs(lvl);
      // 'c' = never stop the countdown; otherwise countdown restarts at the hand's beginning
      const base = this.configs.bTT === 'c' ? prevEnd : now;
      this.blindLevelEndsAt = dur ? base + dur : null;
      changed = true;
    }
    if (changed) {
      const lvl = levels[this.blindLevelIdx];
      if (Number(lvl[0]) > 0 && Number(lvl[1]) > 0) {
        this.smallBlind = Number(lvl[0]);
        this.bigBlind = Number(lvl[1]);
        this.addLog(`The blinds are now ${this.smallBlind}/${this.bigBlind} (level ${this.blindLevelIdx + 1}).`);
      }
    }
  }

  getNextBlindInfo() {
    const levels = this.getBlindLevels();
    if (!levels.length || !this.blindLevelEndsAt) return { nB: null, nBA: null };
    const next = levels[this.blindLevelIdx + 1];
    if (!next) return { nB: null, nBA: null };
    return {
      nB: [Number(next[0]) || 0, Number(next[1]) || 0, next[2] == null ? null : Number(next[2]), next[3] == null ? null : Number(next[3])],
      nBA: this.blindLevelEndsAt
    };
  }

  startNewHand() {
    this.clearTimers();

    // Apply any enqueued stack changes from owner / add-on requests
    if (this.enqueuedStackChanges) {
      for (const [pid, change] of Object.entries(this.enqueuedStackChanges)) {
        const p = this.players[pid];
        if (!p) continue;
        const val = Math.max(0, Math.round(Number(change.stackChange) || 0));
        if (val > 0 || change.stackChangeMode === 'set') {
          const oldStack = p.stack || 0;
          let newStack = oldStack;
          if (change.stackChangeMode === 'add') newStack = oldStack + val;
          else if (change.stackChangeMode === 'remove') newStack = Math.max(0, oldStack - val);
          else if (change.stackChangeMode === 'set') newStack = val;
          const diff = newStack - oldStack;
          p.stack = newStack;
          if (diff > 0) this.updateLedger(pid, p.name, diff, 0);
          else if (diff < 0) this.updateLedger(pid, p.name, 0, -diff);
          this.addLog(`The stack of "${p.name} @ ${pid}" was updated from ${oldStack} to ${newStack}.`);
        }
      }
      this.enqueuedStackChanges = {};
    }

    // Process pre-hand status changes (qNH, sUNH, waitingNextGameToEnter, bust outs)
    for (const [seat, pid] of [...this.seats]) {
      const p = this.players[pid];
      if (!p) continue;
      if (p.qNH) {
        const cashOut = p.stack || 0;
        this.seats = this.seats.filter(s => s[1] !== pid);
        p.status = 'watching';
        p.stack = 0;
        p.qNH = false;
        this.updateLedger(pid, p.name, 0, cashOut);
        continue;
      }
      if (p.sUNH) {
        p.status = 'standingUp';
        p.sUNH = false;
      } else if (p.status === 'waitingNextGameToEnter' && p.stack > 0) {
        p.status = 'inGame';
      }
      if ((p.stack || 0) <= 0) {
        // NEVER auto-rebuy busted players! Set them to standingUp (Away) with 0 chips.
        p.stack = 0;
        p.status = 'standingUp';
        p.sUNH = false;
      }
    }

    const active = this.seats
      .map(([seat, pid]) => ({ seat, player: this.players[pid] }))
      .filter(x => x.player && x.player.status === 'inGame' && x.player.stack > 0);

    if (this.enqueuedStop || active.length < 2) {
      this.enqueuedStop = false;
      this.resetBlindClock();
      this.status = 'waiting';
      this.gT = [];
      this.pC = {};
      this.pGS = {};
      this.tB = {};
      this.oTC = { '1': [] };
      this.gameResult = null;
      this.tHC = null;
      this.pITT = null;
      this.cPI = null;
      this.sNA = null;
      this.sNAA = null;
      this.ensureValidOwner();
      this.syncAllLedgers();
      this.broadcast();
      return;
    }

    this.status = 'inProgress';
    this.advanceBlindLevelIfDue();
    this.gN = (this.gN || 0) + 1;
    this.hI = generateId(12);
    this.gT = [1, 0]; // PRE_FLOP
    this.nR = [1];
    this.pot = 0;
    this.oTC = { '1': [] };
    this.gameResult = null;
    this.tHC = null;
    this.sNA = null;
    this.sNAA = null;
    this.pC = {};
    this.holeCardsSecret = {};
    this.pGS = {};
    this.tB = {};
    this.totalHandBet = {};
    this.wBACPI = [];
    this.cRPI = [];
    this.actedInStreet = new Set();

    // Rotate dealer button to next active seat
    let dealerIdx = 0;
    if (this.dealerSeat !== null) {
      const nextIdx = active.findIndex(x => x.seat > this.dealerSeat);
      dealerIdx = nextIdx !== -1 ? nextIdx : 0;
    }
    const dealerEntry = active[dealerIdx];
    this.dealerID = dealerEntry.player.id;
    this.dealerSeat = dealerEntry.seat;

    const sbIdx = active.length === 2 ? dealerIdx : (dealerIdx + 1) % active.length;
    const bbIdx = active.length === 2 ? (dealerIdx + 1) % 2 : (dealerIdx + 2) % active.length;
    const firstActIdx = active.length === 2 ? dealerIdx : (dealerIdx + 3) % active.length;

    const sbPlayer = active[sbIdx].player;
    const bbPlayer = active[bbIdx].player;

    this.sBPI = sbPlayer.id;
    this.sBS = active[sbIdx].seat;
    this.bBPI = bbPlayer.id;

    this.addLog(`-- starting hand #${this.gN} (No Limit Texas Hold'em) (dealer: "${dealerEntry.player.name} @ ${dealerEntry.player.id}") --`);

    this.deck = createDeck();
    this.iHPI = active.map(x => x.player.id);

    for (const { player } of active) {
      const c1 = this.deck.pop();
      const c2 = this.deck.pop();
      this.holeCardsSecret[player.id] = [c1, c2];
      const ev = evaluateCards([c1, c2]);
      this.pC[player.id] = {
        cards: [
          { value: c1, showing: false },
          { value: c2, showing: false }
        ],
        name1: ev.name,
        name2: null,
        name1RH: null,
        name2RH: null,
        prob1: null
      };
      this.pGS[player.id] = 'inGame';
      this.totalHandBet[player.id] = 0;
      delete player.nPY;
    }

    // Post Small Blind and Big Blind
    const sbAmount = Math.min(this.smallBlind, sbPlayer.stack);
    sbPlayer.stack -= sbAmount;
    this.tB[sbPlayer.id] = sbAmount;
    this.totalHandBet[sbPlayer.id] = sbAmount;
    if (sbPlayer.stack === 0) this.pGS[sbPlayer.id] = 'allIn';
    this.addLog(`"${sbPlayer.name} @ ${sbPlayer.id}" posts a small blind of ${sbAmount}`);

    const bbAmount = Math.min(this.bigBlind, bbPlayer.stack);
    bbPlayer.stack -= bbAmount;
    this.tB[bbPlayer.id] = bbAmount;
    this.totalHandBet[bbPlayer.id] = bbAmount;
    if (bbPlayer.stack === 0) this.pGS[bbPlayer.id] = 'allIn';
    this.addLog(`"${bbPlayer.name} @ ${bbPlayer.id}" posts a big blind of ${bbAmount}`);

    this.cHB = Math.max(sbAmount, bbAmount);
    this.mR = this.cHB + this.bigBlind;
    this.wBACPI = [bbPlayer.id];

    this.setTurnPlayer(active[firstActIdx].player.id);
    this.syncAllLedgers();
    this.broadcast();
  }

  updateHandEvaluations(revealAll = false) {
    const board = this.oTC['1'] || [];
    for (const pid of this.iHPI) {
      const secret = this.holeCardsSecret[pid];
      if (!secret) continue;
      const ev = evaluateCards([...secret, ...board]);
      const curCards = this.pC[pid]?.cards || [
        { value: secret[0], showing: false },
        { value: secret[1], showing: false }
      ];
      this.pC[pid] = {
        cards: [
          { value: secret[0], showing: revealAll || curCards[0]?.showing || false },
          { value: secret[1], showing: revealAll || curCards[1]?.showing || false }
        ],
        name1: ev.name,
        name2: null,
        name1RH: null,
        name2RH: null,
        prob1: null
      };
    }
  }

  setTurnPlayer(playerID) {
    this.clearTimers();
    this.cPI = playerID;
    this.pITT = playerID;

    if (!playerID) {
      this.pASA = null;
      this.dLTWoTB = null;
      this.dLTWTB = null;
      this.sNA = null;
      this.sNAA = null;
      return;
    }

    const p = this.players[playerID];
    const myTotal = (p?.stack || 0) + (typeof this.tB[playerID] === 'number' ? this.tB[playerID] : 0);
    this.mAVTB = Math.max(myTotal, this.cHB);

    const now = Date.now();
    const limitMs = (this.configs.decisionLimitTime || 20) * 1000;
    const tbMs = this.pTB[playerID] || 0;
    this.pASA = now;
    this.dLTWoTB = now + limitMs;
    this.dLTWTB = now + limitMs + tbMs;
    this.sNA = 'FCPFS';
    this.sNAA = this.dLTWoTB;

    if (p && p.isBot) {
      const delay = crypto.randomInt(1200, 2300);
      this.botTimer = setTimeout(() => {
        this.executeBotTurn(playerID);
      }, delay);
    } else {
      this.turnTimer = setTimeout(() => {
        if (this.pITT === playerID) {
          const curBet = typeof this.tB[playerID] === 'number' ? this.tB[playerID] : 0;
          if (curBet >= this.cHB) {
            this.handleCheck(playerID);
          } else {
            this.handleFold(playerID);
          }
        }
      }, limitMs + tbMs + 500);
    }
  }

  executeBotTurn(botID) {
    if (this.status !== 'inProgress' || this.pITT !== botID) return;
    const bot = this.players[botID];
    if (!bot) return;

    const myBet = typeof this.tB[botID] === 'number' ? this.tB[botID] : 0;
    const toCall = Math.max(0, this.cHB - myBet);
    const secret = this.holeCardsSecret[botID] || [];
    const board = this.oTC['1'] || [];
    const ev = evaluateCards([...secret, ...board]);

    const r1 = secret[0] ? RANK_VALUE[secret[0][0]] : 7;
    const r2 = secret[1] ? RANK_VALUE[secret[1][0]] : 2;
    const highCard = Math.max(r1, r2);
    const isPair = r1 === r2;
    const isSuited = secret[0] && secret[1] && secret[0][1] === secret[1][1];
    const roll = crypto.randomInt(0, 100);

    if (toCall === 0) {
      if ((ev.category >= 1 || isPair || highCard >= 13) && roll < 45 && bot.stack > this.bigBlind) {
        const betSize = Math.min(
          bot.stack + myBet,
          Math.max(this.mR, Math.round((this.pot || this.bigBlind * 2) * 0.6))
        );
        this.handleRaise(botID, betSize);
      } else {
        this.handleCheck(botID);
      }
      return;
    }

    // Facing a bet
    const strength = ev.category * 25 + (isPair ? 25 : 0) + (highCard >= 12 ? 15 : 0) + (isSuited ? 8 : 0);
    if (toCall >= bot.stack) {
      if (strength >= 35 || roll < 22) {
        this.handleCall(botID);
      } else {
        this.handleFold(botID);
      }
      return;
    }

    if (strength >= 45 && roll < 30 && bot.stack + myBet > this.mR && !this.cRPI.includes(botID)) {
      const raiseTo = Math.min(bot.stack + myBet, Math.max(this.mR, this.cHB * 2 + this.bigBlind));
      this.handleRaise(botID, raiseTo);
    } else if (strength >= 15 || toCall <= this.bigBlind * 2 || roll < 55) {
      this.handleCall(botID);
    } else {
      this.handleFold(botID);
    }
  }

  handleFold(playerID) {
    if (this.status !== 'inProgress' || this.pITT !== playerID) return;
    const p = this.players[playerID];
    this.pGS[playerID] = 'fold';
    this.actedInStreet.add(playerID);
    this.wBACPI = this.wBACPI.filter(id => id !== playerID);
    if (p) this.addLog(`"${p.name} @ ${playerID}" folds`);
    this.advanceTurnOrStreet(playerID);
  }

  handleCheck(playerID) {
    if (this.status !== 'inProgress' || this.pITT !== playerID) return;
    const myBet = typeof this.tB[playerID] === 'number' ? this.tB[playerID] : 0;
    if (this.cHB > myBet) return this.handleCall(playerID);
    const p = this.players[playerID];
    if (this.cHB === 0) {
      this.tB[playerID] = 'check';
    }
    this.actedInStreet.add(playerID);
    this.wBACPI = this.wBACPI.filter(id => id !== playerID);
    if (p) this.addLog(`"${p.name} @ ${playerID}" checks`);
    this.advanceTurnOrStreet(playerID);
  }

  handleCall(playerID) {
    if (this.status !== 'inProgress' || this.pITT !== playerID) return;
    const p = this.players[playerID];
    if (!p) return;
    const myBet = typeof this.tB[playerID] === 'number' ? this.tB[playerID] : 0;

    // In Poker Now, when cHB === 0, the quick-action button is "Bet <BB>" and dispatches PLAYER_CALL.
    // It must place a 1 BB bet instead of checking!
    if (this.cHB === 0 && p.stack > 0) {
      return this.handleRaise(playerID, myBet + Math.min(this.bigBlind, p.stack));
    }

    const diff = Math.max(0, this.cHB - myBet);
    if (diff === 0) return this.handleCheck(playerID);

    const actualCall = Math.min(diff, p.stack);
    p.stack -= actualCall;
    const newBet = myBet + actualCall;
    this.tB[playerID] = newBet;
    this.totalHandBet[playerID] = (this.totalHandBet[playerID] || 0) + actualCall;
    if (p.stack === 0) {
      this.pGS[playerID] = 'allIn';
    }
    this.actedInStreet.add(playerID);
    this.wBACPI = this.wBACPI.filter(id => id !== playerID);
    this.addLog(`"${p.name} @ ${playerID}" calls ${ newBet }${p.stack === 0 ? ' and go all in' : ''}`);
    this.advanceTurnOrStreet(playerID);
  }

  handleRaise(playerID, targetTotalBet) {
    if (this.status !== 'inProgress' || this.pITT !== playerID) return;
    const p = this.players[playerID];
    if (!p) return;
    const myBet = typeof this.tB[playerID] === 'number' ? this.tB[playerID] : 0;
    const maxPossible = p.stack + myBet;

    let desired = Math.round(Number(targetTotalBet) || 0);
    if (this.configs.autoTrimExcessBets && desired > this.mAVTB && this.mAVTB > this.cHB) {
      desired = this.mAVTB;
    }
    if (desired <= this.cHB) {
      if (maxPossible > this.cHB) {
        desired = Math.min(maxPossible, Math.max(this.mR || (this.cHB + this.bigBlind), this.cHB + this.bigBlind));
      } else {
        return this.handleCall(playerID);
      }
    }
    if (desired > maxPossible) desired = maxPossible;
    if (desired <= myBet) {
      return this.handleCall(playerID);
    }

    const added = desired - myBet;
    p.stack -= added;
    const prevCHB = this.cHB;
    const raiseIncrement = desired - prevCHB;
    this.cHB = desired;
    this.mR = desired + Math.max(this.bigBlind, raiseIncrement);
    this.tB[playerID] = desired;
    this.totalHandBet[playerID] = (this.totalHandBet[playerID] || 0) + added;

    if (p.stack === 0) {
      this.pGS[playerID] = 'allIn';
    }

    this.actedInStreet = new Set([playerID]);
    this.wBACPI = [];
    this.cRPI = [];
    const actionWord = prevCHB === 0 ? 'bets' : 'raises to';
    this.addLog(`"${p.name} @ ${playerID}" ${actionWord} ${desired}${p.stack === 0 ? ' and go all in' : ''}`);
    this.advanceTurnOrStreet(playerID);
  }

  advanceTurnOrStreet(lastActorID) {
    const inHand = this.iHPI.filter(id => this.pGS[id] !== 'fold');
    if (inHand.length <= 1) {
      this.collectBetsIntoPot();
      this.finishHandUncontested(inHand[0]);
      return;
    }

    const canAct = inHand.filter(id => this.pGS[id] === 'inGame' && (this.players[id]?.stack || 0) > 0);
    const everyoneMatched = canAct.every(id => {
      const b = typeof this.tB[id] === 'number' ? this.tB[id] : 0;
      return this.actedInStreet.has(id) && b === this.cHB && !this.wBACPI.includes(id);
    });

    if (everyoneMatched || canAct.length === 0) {
      this.nextStreet();
      return;
    }

    // Find next player clockwise after lastActorID
    const lastSeat = this.getSeatOfPlayer(lastActorID) || 0;
    const orderedSeats = [...this.seats].sort((a, b) => a[0] - b[0]);
    const rotated = [
      ...orderedSeats.filter(s => s[0] > lastSeat),
      ...orderedSeats.filter(s => s[0] <= lastSeat)
    ];

    const nextEntry = rotated.find(([, pid]) => canAct.includes(pid));
    if (nextEntry) {
      this.setTurnPlayer(nextEntry[1]);
      this.syncAllLedgers();
      this.broadcast();
    } else {
      this.nextStreet();
    }
  }

  collectBetsIntoPot() {
    for (const [pid, val] of Object.entries(this.tB)) {
      if (typeof val === 'number' && val > 0) {
        this.pot += val;
      }
    }
    this.tB = {};
    this.cHB = 0;
    this.mR = this.bigBlind;
    this.wBACPI = [];
    this.cRPI = [];
    this.actedInStreet.clear();
  }

  nextStreet() {
    this.clearTimers();
    this.collectBetsIntoPot();

    const inHand = this.iHPI.filter(id => this.pGS[id] !== 'fold');
    const canAct = inHand.filter(id => this.pGS[id] === 'inGame' && (this.players[id]?.stack || 0) > 0);

    const currentStreet = this.gT[1] || 0;
    if (currentStreet >= 3 || canAct.length <= 1) {
      // Run out remaining community cards and go to showdown!
      if (this.configs.sAHWBF) {
        this.updateHandEvaluations(true);
      }
      while (this.oTC['1'].length < 5) {
        this.oTC['1'].push(this.deck.pop());
        if (this.oTC['1'].length === 3) {
          this.addLog(`flop: [${this.oTC['1'].slice(0, 3).join(', ')}]`);
        } else if (this.oTC['1'].length === 4) {
          this.addLog(`turn: ${this.oTC['1'][3]}`);
        } else if (this.oTC['1'].length === 5) {
          this.addLog(`river: ${this.oTC['1'][4]}`);
        }
      }
      this.resolveShowdown();
      return;
    }

    const nextStreetNum = currentStreet + 1;
    this.gT = [1, nextStreetNum];

    if (nextStreetNum === 1) {
      this.oTC['1'].push(this.deck.pop(), this.deck.pop(), this.deck.pop());
      this.addLog(`flop: [${this.oTC['1'].join(', ')}]`);
    } else if (nextStreetNum === 2) {
      const c = this.deck.pop();
      this.oTC['1'].push(c);
      this.addLog(`turn: ${c}`);
    } else if (nextStreetNum === 3) {
      const c = this.deck.pop();
      this.oTC['1'].push(c);
      this.addLog(`river: ${c}`);
    }

    this.updateHandEvaluations(false);

    // First active player after dealerSeat
    const orderedSeats = [...this.seats].sort((a, b) => a[0] - b[0]);
    const rotated = [
      ...orderedSeats.filter(s => s[0] > (this.dealerSeat || 0)),
      ...orderedSeats.filter(s => s[0] <= (this.dealerSeat || 0))
    ];
    const firstActor = rotated.find(([, pid]) => canAct.includes(pid));
    if (firstActor) {
      this.setTurnPlayer(firstActor[1]);
      this.syncAllLedgers();
      this.broadcast();
    } else {
      this.resolveShowdown();
    }
  }

  finishHandUncontested(winnerID) {
    this.clearTimers();
    this.cPI = null;
    this.pITT = null;
    this.gT = [1, 5]; // GAME_RESULT

    const winner = this.players[winnerID];
    const gained = this.pot;
    if (winner) {
      winner.stack += gained;
      winner.winCount = (winner.winCount || 0) + 1;
      this.addLog(`"${winner.name} @ ${winnerID}" collected ${gained} from pot`);
    }

    this.gameResult = {
      [winnerID]: {
        '1': { position: 1, hC: [] },
        gained
      }
    };
    for (const pid of this.iHPI) {
      if (pid !== winnerID && !this.gameResult[pid]) {
        this.gameResult[pid] = {
          '1': { position: 2, hC: [] },
          gained: 0
        };
      }
    }

    const waitMs = 3200;
    this.sNA = 'NSAGR';
    this.sNAA = Date.now() + waitMs;
    this.syncAllLedgers();
    this.broadcast();

    if (this.configs.aD) {
      this.nextStepTimer = setTimeout(() => {
        this.startNewHand();
      }, waitMs);
    }
  }

  returnUncalledBets() {
    const contenders = this.iHPI.filter(id => this.pGS[id] !== 'fold');
    if (contenders.length < 2) return;
    for (const pid of contenders) {
      const myTotal = this.totalHandBet[pid] || 0;
      const maxOther = Math.max(
        0,
        ...contenders.filter(id => id !== pid).map(id => this.totalHandBet[id] || 0)
      );
      if (myTotal > maxOther) {
        const excess = myTotal - maxOther;
        const p = this.players[pid];
        if (p) {
          p.stack = (p.stack || 0) + excess;
          if (this.pGS[pid] === 'allIn' && p.stack > 0) {
            this.pGS[pid] = 'inGame';
          }
          this.addLog(`Uncalled bet of ${excess} returned to "${p.name} @ ${pid}"`);
        }
        this.totalHandBet[pid] = maxOther;
        this.pot = Math.max(0, this.pot - excess);
      }
    }
  }

  resolveShowdown() {
    this.clearTimers();
    this.returnUncalledBets();
    this.cPI = null;
    this.pITT = null;
    this.gT = [1, 5]; // GAME_RESULT
    this.updateHandEvaluations(true);

    const contenders = this.iHPI.filter(id => this.pGS[id] !== 'fold');
    const board = this.oTC['1'] || [];
    const evals = {};
    for (const pid of contenders) {
      const secret = this.holeCardsSecret[pid] || [];
      evals[pid] = evaluateCards([...secret, ...board]);
    }

    // Side-pot aware distribution using totalHandBet
    const betLevels = [...new Set(Object.values(this.totalHandBet).filter(v => v > 0))].sort((a, b) => a - b);
    const winnings = {};
    const winningCards = new Set();
    const firstPlaceWinners = new Set();

    let prevLevel = 0;
    for (const level of betLevels) {
      const slice = level - prevLevel;
      if (slice <= 0) continue;
      const contributors = Object.keys(this.totalHandBet).filter(pid => this.totalHandBet[pid] >= level);
      const slicePot = slice * contributors.length;
      const eligible = contributors.filter(pid => contenders.includes(pid));

      if (eligible.length > 0) {
        let bestScore = -1;
        let winners = [];
        for (const pid of eligible) {
          const sc = evals[pid].score;
          if (sc > bestScore) {
            bestScore = sc;
            winners = [pid];
          } else if (sc === bestScore) {
            winners.push(pid);
          }
        }
        const share = Math.floor(slicePot / winners.length);
        let remainder = slicePot - share * winners.length;
        for (const wid of winners) {
          const extra = remainder > 0 ? 1 : 0;
          if (remainder > 0) remainder--;
          winnings[wid] = (winnings[wid] || 0) + share + extra;
          firstPlaceWinners.add(wid);
          for (const c of evals[wid].best5 || []) winningCards.add(c);
        }
      }
      prevLevel = level;
    }

    this.tHC = [...winningCards];
    this.gameResult = {};

    for (const pid of contenders) {
      const gained = winnings[pid] || 0;
      const p = this.players[pid];
      if (p && gained > 0) {
        p.stack += gained;
        p.winCount = (p.winCount || 0) + 1;
        this.addLog(`"${p.name} @ ${pid}" collected ${gained} from pot with ${evals[pid].name} (combination: ${(evals[pid].best5 || []).join(', ')})`);
      }
      this.gameResult[pid] = {
        '1': {
          position: firstPlaceWinners.has(pid) ? 1 : 2,
          hC: firstPlaceWinners.has(pid) ? (evals[pid].best5 || []) : []
        },
        gained
      };
    }

    const waitMs = 5000;
    this.sNA = 'NSAGRS';
    this.sNAA = Date.now() + waitMs;
    this.syncAllLedgers();
    this.broadcast();

    if (this.configs.aD) {
      this.nextStepTimer = setTimeout(() => {
        this.startNewHand();
      }, waitMs);
    }
  }

  clearTimers() {
    if (this.turnTimer) {
      clearTimeout(this.turnTimer);
      this.turnTimer = null;
    }
    if (this.nextStepTimer) {
      clearTimeout(this.nextStepTimer);
      this.nextStepTimer = null;
    }
    if (this.botTimer) {
      clearTimeout(this.botTimer);
      this.botTimer = null;
    }
  }

  buildGameStateForPlayer(viewerID) {
    this.ensureValidOwner();
    const now = Date.now();
    const pCForViewer = {};

    for (const [pid, cardInfo] of Object.entries(this.pC)) {
      const isViewer = pid === viewerID;
      pCForViewer[pid] = {
        cards: (cardInfo.cards || []).map(c => ({
          value: isViewer || c.showing ? c.value : null,
          showing: Boolean(c.showing)
        })),
        name1: isViewer || (cardInfo.cards || []).every(c => c.showing) ? cardInfo.name1 : null,
        name2: null,
        name1RH: null,
        name2RH: null,
        prob1: null
      };
    }

    // Poker Now frontend subtracts currentBet (tB[pid]) from player.stack when rendering the seat stack
    // (ne.prototype.renderStack: e.stack - e.currentBet) and uses player.stack as the total street All-In value.
    const playersForViewer = {};
    for (const [pid, p] of Object.entries(this.players)) {
      const currentStreetBet =
        this.status === 'inProgress' && typeof this.tB[pid] === 'number' ? this.tB[pid] : 0;
      playersForViewer[pid] = {
        ...p,
        stack: (p.stack || 0) + currentStreetBet
      };
    }

    return {
      r: true,
      aD: this.configs.aD,
      aS: this.configs.aS,
      cM: this.configs.cM,
      gM: this.gM,
      gT: this.gT,
      id: this.id,
      lE: true,
      nR: this.nR,
      pC: pCForViewer,
      rH: this.configs.rH,
      aCP: this.configs.aCP,
      aGC: this.configs.aGC,
      aVC: this.configs.aVC,
      gDM: [],
      mTB: this.configs.mTB,
      now,
      oTC: this.oTC,
      pGS: this.pGS,
      pTB: this.pTB,
      pot: this.pot,
      rHP: [],
      rIT: this.configs.rIT,
      sPI: [],
      sPM: this.configs.sPM,
      iHPI: this.iHPI,
      mode: this.mode,
      seats: this.seats,
      clubID: this.clubID,
      clubType: this.clubType,
      chipType: this.chipType,
      minMaxBuyIn: this.minMaxBuyIn,
      allowWaitlist: this.allowWaitlist,
      maxQuantityPlayers: { user: 10 },
      status: this.status,
      wBACPI: this.wBACPI,
      ownerID: this.ownerID,
      noOwner: this.noOwner,
      players: playersForViewer,
      enqueuedStop: Boolean(this.enqueuedStop),
      version: '0.1.72',
      bigBlind: this.bigBlind,
      smallBlind: this.smallBlind,
      eventsData: [],
      recordChatForReplay: this.configs.recordChatForReplay,
      tHC: this.tHC,
      directToNexTurn: false,
      lSPI: null,
      sNA: this.sNA,
      sNAA: this.sNAA,
      cHB: this.cHB,
      cRPI: this.cRPI,
      rHC: null,
      tB: this.tB,
      gameResult: this.gameResult,
      deadButton: false,
      sBS: this.sBS,
      dSB: false,
      gN: this.gN,
      hI: this.hI,
      mR: this.mR,
      dealerID: this.dealerID,
      dealerSeat: this.dealerSeat,
      sBPI: this.sBPI,
      bBPI: this.bBPI,
      bigBlindCheck: false,
      cPI: this.cPI,
      pITT: this.pITT,
      pASA: this.pASA,
      mAVTB: this.mAVTB,
      dLTWoTB: this.dLTWoTB,
      dLTWTB: this.dLTWTB,
      uP: this.uP,
      nB: this.getNextBlindInfo().nB,
      nBA: this.getNextBlindInfo().nBA,
      gB: false,
      cR: false,
      waitlistIds: this.waitlistIds,
      pre: now,
      mEV: this.mEV,
      fV: '0.1.72',
      sN: now
    };
  }

  getGameData() {
    const theme = THEMES[this.themeKey] || THEMES['halloween-2026'];
    return {
      plusFeatures: {
        double_board: true,
        custom_felt: true,
        bomb_pot: true,
        seven_deuce_bounty: true,
        nit_game: true,
        rake: true,
        game_type_cycle: true
      },
      recordChat: true,
      ...theme,
      club: this.clubID
        ? {
            name: 'Poker Now Lounge',
            slug: 'lounge',
            disableGestureSuggestion: false,
            currentPlayerUsername: 'Player',
            currentPlayerIsMember: true
          }
        : undefined
    };
  }

  broadcast() {
    if (typeof this.onBroadcast === 'function') {
      this.onBroadcast(this);
    }
  }
}

module.exports = {
  PokerGameRoom,
  THEMES,
  evaluateCards,
  generateId
};
