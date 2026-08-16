import React, { useState, useEffect, useRef, useCallback } from "react";
import { updateRoom, subscribeToRoom } from "./firebase";

const MAX_ROUNDS = 8;
const OPT_COLORS = ["#F2779E", "#E8B85C", "#8FE3C0", "#9B8CFF"];

const DECKS = [
  { key: "sweet", label: "Sweet & Silly", blurb: "Light, playful, no wrong answers" },
  { key: "closer", label: "Getting Closer", blurb: "A little more real" },
  { key: "justus", label: "Just Between Us", blurb: "Flirty ratings & guesses" },
];

const PROMPTS = [
  { id: "s1", deck: "sweet", type: "options", text: "Our ideal Friday night is...", options: [{ key: "A", label: "Cozy night in" }, { key: "B", label: "Adventure out" }] },
  { id: "s2", deck: "sweet", type: "options", text: "If we got a pet today, it'd be...", options: [{ key: "A", label: "A dog" }, { key: "B", label: "A cat" }] },
  { id: "s3", deck: "sweet", type: "options", text: "Best way to spend a rainy afternoon", options: [{ key: "A", label: "Reading together" }, { key: "B", label: "Movie marathon" }] },
  { id: "s4", deck: "sweet", type: "options", text: "Dream vacation vibe", options: [{ key: "A", label: "Mountains" }, { key: "B", label: "Beach" }] },
  { id: "s5", deck: "sweet", type: "options", text: "Comfort food craving", options: [{ key: "A", label: "Pizza" }, { key: "B", label: "Ramen" }] },
  { id: "s6", deck: "sweet", type: "options", text: "Our go-to celebration meal", options: [{ key: "A", label: "Sushi" }, { key: "B", label: "Tacos" }, { key: "C", label: "Pasta" }, { key: "D", label: "Burgers" }] },
  { id: "s7", deck: "sweet", type: "options", text: "Ideal third wheel for date night", options: [{ key: "A", label: "Our dog" }, { key: "B", label: "A best friend" }, { key: "C", label: "A bottle of wine" }, { key: "D", label: "No one, just us" }] },
  { id: "s8", deck: "sweet", type: "options", text: "Our weekend soundtrack", options: [{ key: "A", label: "Pop" }, { key: "B", label: "R&B" }, { key: "C", label: "Indie" }, { key: "D", label: "Jazz" }] },
  { id: "s9", deck: "sweet", type: "options", text: "Dream anniversary", options: [{ key: "A", label: "Big party" }, { key: "B", label: "Just us two" }] },
  { id: "s10", deck: "sweet", type: "options", text: "Our house plant survival rate", options: [{ key: "A", label: "Thriving jungle" }, { key: "B", label: "A few survivors" }, { key: "C", label: "Mostly cacti" }, { key: "D", label: "We've killed them all" }] },
  { id: "c1", deck: "closer", type: "text", text: "One word for how you're feeling about 'us' right now" },
  { id: "c2", deck: "closer", type: "text", text: "The moment you knew this was different" },
  { id: "c3", deck: "closer", type: "text", text: "What you're most grateful for about me today" },
  { id: "c4", deck: "closer", type: "text", text: "Something small I do that means more than I probably know" },
  { id: "c5", deck: "closer", type: "text", text: "One word for how safe you feel with me" },
  { id: "c6", deck: "closer", type: "text", text: "One thing about us you never want to change" },
  { id: "c7", deck: "closer", type: "text", text: "One word for where you hope we are in five years" },
  { id: "c8", deck: "closer", type: "text", text: "A memory of us you'd relive on repeat" },
  { id: "j1", deck: "justus", type: "number", text: "Rate how much you missed me today, 1–10" },
  { id: "j2", deck: "justus", type: "number", text: "How excited are you to fall asleep next to me tonight, 1–10" },
  { id: "j3", deck: "justus", type: "number", text: "Rate our chemistry today, 1–10" },
  { id: "j4", deck: "justus", type: "number", text: "Guess: how many times today did you think about me" },
  { id: "j5", deck: "justus", type: "number", text: "Rate how good I am at reading your mood, 1–10" },
  { id: "j6", deck: "justus", type: "number", text: "How much do you love our inside jokes, 1–10" },
  { id: "j7", deck: "justus", type: "number", text: "Rate today's outfit choice, 1–10" },
  { id: "j8", deck: "justus", type: "number", text: "How many years until we're the annoying couple still holding hands in public" },
];

const SUITS = [
  { s: "♠", red: false },
  { s: "♥", red: true },
  { s: "♦", red: true },
  { s: "♣", red: false },
];
const RANKS = [
  { r: "2", v: 2 }, { r: "3", v: 3 }, { r: "4", v: 4 }, { r: "5", v: 5 }, { r: "6", v: 6 },
  { r: "7", v: 7 }, { r: "8", v: 8 }, { r: "9", v: 9 }, { r: "10", v: 10 },
  { r: "J", v: 11 }, { r: "Q", v: 12 }, { r: "K", v: 13 }, { r: "A", v: 14 },
];

function normalize(v) {
  return (v || "").trim().toLowerCase().replace(/[^a-z0-9 ]/g, "");
}
function genId() {
  return Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
}
function getDeviceId() {
  try {
    let id = localStorage.getItem("insync-device-id");
    if (!id) { id = genId(); localStorage.setItem("insync-device-id", id); }
    return id;
  } catch { return genId(); }
}
function loadSession() {
  try { return JSON.parse(localStorage.getItem("insync-session") || "null"); } catch { return null; }
}
function saveSession(s) { try { localStorage.setItem("insync-session", JSON.stringify(s)); } catch {} }
function clearSession() { try { localStorage.removeItem("insync-session"); } catch {} }

function pickNextPrompt(playedIds, decks) {
  const activeDecks = decks && decks.length ? decks : DECKS.map((d) => d.key);
  let pool = PROMPTS.filter((p) => activeDecks.includes(p.deck) && !playedIds.includes(p.id));
  let reset = false;
  if (pool.length === 0) {
    pool = PROMPTS.filter((p) => activeDecks.includes(p.deck));
    reset = true;
  }
  const next = pool[Math.floor(Math.random() * pool.length)];
  return { next, reset };
}

function buildQAGame(decks) {
  const poolSize = PROMPTS.filter((p) => decks.includes(p.deck)).length;
  const totalRounds = Math.min(MAX_ROUNDS, poolSize);
  const { next } = pickNextPrompt([], decks);
  return {
    type: "qa",
    selectedDecks: decks,
    totalRounds,
    playedIds: [],
    history: [],
    matches: 0,
    status: "playing",
    round: { promptId: next.id, promptText: next.text, type: next.type, deck: next.deck, options: next.options || null, answers: {}, revealed: false, match: null },
  };
}

function freshDeck() {
  const deck = [];
  for (const suit of SUITS) for (const rank of RANKS) deck.push({ suit: suit.s, red: suit.red, rank: rank.r, value: rank.v });
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function buildWarGame(p1id, p2id) {
  const deck = freshDeck();
  return {
    type: "war",
    hands: { [p1id]: deck.slice(0, 26), [p2id]: deck.slice(26) },
    cardCounts: { [p1id]: 26, [p2id]: 26 },
    flips: {},
    lastResult: null,
    phase: "active",
    overWinnerId: null,
  };
}

function resolveWarRound(hands, p1id, p2id) {
  const pot = [];
  while (true) {
    if (hands[p1id].length === 0) return { winnerId: p2id, pot };
    if (hands[p2id].length === 0) return { winnerId: p1id, pot };
    const card1 = hands[p1id].shift();
    const card2 = hands[p2id].shift();
    pot.push(card1, card2);
    if (card1.value !== card2.value) {
      return { winnerId: card1.value > card2.value ? p1id : p2id, pot, cards: { [p1id]: card1, [p2id]: card2 } };
    }
  }
}

function doFlip(latest, myId) {
  if (!latest) return undefined;
  const g = latest.game;
  if (!g || g.type !== "war" || g.phase === "over") return latest;
  const flips = g.flips || {};
  if (flips[myId] !== undefined) return latest;
  const myHand = g.hands[myId] || [];
  if (myHand.length === 0) return latest;
  const myCard = myHand[0]; // peek without removing yet
  const newFlips = { ...flips, [myId]: myCard };
  const playerIds = latest.players.map((p) => p.id);
  const bothFlipped = playerIds.every((id) => newFlips[id] !== undefined);
  if (!bothFlipped) {
    return { ...latest, game: { ...g, flips: newFlips } };
  }
  const [p1id, p2id] = playerIds;
  const hands = { [p1id]: [...(g.hands[p1id] || [])], [p2id]: [...(g.hands[p2id] || [])] };
  const result = resolveWarRound(hands, p1id, p2id);
  const cardCounts = { [p1id]: hands[p1id].length, [p2id]: hands[p2id].length };
  const over = cardCounts[p1id] === 0 || cardCounts[p2id] === 0;
  const overWinnerId = over ? (cardCounts[p1id] > 0 ? p1id : p2id) : null;
  return {
    ...latest,
    scoreboard: over ? creditScoreboard(latest, overWinnerId) : latest.scoreboard,
    game: {
      ...g,
      hands,
      cardCounts,
      flips: {},
      lastResult: { winnerId: result.winnerId, cardsWon: result.pot.length, cards: result.cards || null, warHappened: result.pot.length > 2 },
      phase: over ? "over" : "active",
      overWinnerId,
      finalCounts: over ? cardCounts : g.finalCounts || null,
    },
  };
}

function buildTwoTruthsGame(turnPlayerId, p1id, p2id) {
  return {
    type: "twoTruths",
    turnPlayerId,
    phase: "writing",
    statements: null,
    lieIndex: null,
    guess: null,
    scores: { [p1id]: 0, [p2id]: 0 },
  };
}

const MEMORY_SYMBOLS = ["💕", "🌙", "⭐", "🍓", "🎵", "🦋"];

function decideWinner(scores, players) {
  const [p1, p2] = players.map((p) => p.id);
  const s1 = scores[p1] || 0;
  const s2 = scores[p2] || 0;
  if (s1 === s2) return "tie";
  return s1 > s2 ? p1 : p2;
}

function creditScoreboard(latest, winnerId) {
  const sb = { ...(latest.scoreboard || {}) };
  if (winnerId && winnerId !== "tie") {
    sb[winnerId] = (sb[winnerId] || 0) + 1;
  }
  return sb;
}

function buildMemoryGame(starterId, p1id, p2id) {
  const pairs = [...MEMORY_SYMBOLS, ...MEMORY_SYMBOLS];
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
  }
  return {
    type: "memory",
    board: pairs.map((symbol) => ({ symbol, matched: false })),
    flippedIndices: [],
    turnPlayerId: starterId,
    scores: { [p1id]: 0, [p2id]: 0 },
    resolution: null,
    phase: "active",
    overWinnerId: null,
  };
}

function buildHeartHuntGame(starterId) {
  return {
    type: "heartHunt",
    placements: {},
    shotsAt: {},
    turnPlayerId: starterId,
    phase: "placing",
    overWinnerId: null,
  };
}

function buildGoFishGame(starterId, p1id, p2id) {
  const deck = freshDeck();
  const hands = { [p1id]: deck.slice(0, 7), [p2id]: deck.slice(7, 14) };
  const pond = deck.slice(14);
  return {
    type: "goFish",
    hands,
    pond,
    books: { [p1id]: [], [p2id]: [] },
    turnPlayerId: starterId,
    phase: "active",
    lastAction: null,
    overWinnerId: null,
  };
}

function extractBooks(hand) {
  const counts = {};
  hand.forEach((c) => { counts[c.rank] = (counts[c.rank] || 0) + 1; });
  const completedRanks = Object.keys(counts).filter((r) => counts[r] === 4);
  const remainingHand = hand.filter((c) => !completedRanks.includes(c.rank));
  return { hand: remainingHand, completedRanks };
}

function doAskForRank(latest, myId, rank) {
  if (!latest) return undefined;
  const g = latest.game;
  if (!g || g.type !== "goFish" || g.phase !== "active") return latest;
  if (g.turnPlayerId !== myId) return latest;
  const otherId = latest.players.find((p) => p.id !== myId)?.id;
  const hands = g.hands || {};
  const myHand = hands[myId] || [];
  if (!myHand.some((c) => c.rank === rank)) return latest;
  const theirHand = hands[otherId] || [];
  const matches = theirHand.filter((c) => c.rank === rank);
  let newHands = { ...hands };
  let lastAction;
  let goAgain;
  const pond = [...(g.pond || [])];
  if (matches.length > 0) {
    newHands[otherId] = theirHand.filter((c) => c.rank !== rank);
    newHands[myId] = [...myHand, ...matches];
    lastAction = { askerId: myId, text: `asked for ${rank}s — got ${matches.length}!` };
    goAgain = true;
  } else if (pond.length > 0) {
    const drawn = pond.shift();
    newHands[myId] = [...myHand, drawn];
    goAgain = drawn.rank === rank;
    lastAction = { askerId: myId, text: goAgain ? `asked for ${rank}s — Go Fish, and drew one!` : `asked for ${rank}s — Go Fish!` };
  } else {
    goAgain = false;
    lastAction = { askerId: myId, text: `asked for ${rank}s — Go Fish, but the pond's empty!` };
  }
  const books = { ...(g.books || {}) };
  const myExtract = extractBooks(newHands[myId] || []);
  newHands[myId] = myExtract.hand;
  books[myId] = [...(books[myId] || []), ...myExtract.completedRanks];
  const theirExtract = extractBooks(newHands[otherId] || []);
  newHands[otherId] = theirExtract.hand;
  books[otherId] = [...(books[otherId] || []), ...theirExtract.completedRanks];

  const totalBooks = (books[myId] || []).length + (books[otherId] || []).length;
  const over = totalBooks >= 13;
  const overWinnerId = over ? ((books[myId] || []).length > (books[otherId] || []).length ? myId : otherId) : null;

  return {
    ...latest,
    scoreboard: over ? creditScoreboard(latest, overWinnerId) : latest.scoreboard,
    game: {
      ...g,
      hands: newHands,
      pond,
      books,
      lastAction,
      turnPlayerId: over ? g.turnPlayerId : goAgain ? myId : otherId,
      phase: over ? "over" : "active",
      overWinnerId,
    },
  };
}

function buildCrazyEightsGame(starterId, p1id, p2id) {
  const deck = freshDeck();
  const hands = { [p1id]: deck.slice(0, 7), [p2id]: deck.slice(7, 14) };
  let rest = deck.slice(14);
  let discardTop = rest.shift();
  let safety = 0;
  while (discardTop.rank === "8" && rest.length > 0 && safety < 10) {
    rest.push(discardTop);
    discardTop = rest.shift();
    safety++;
  }
  return {
    type: "crazyEights",
    hands,
    drawPile: rest,
    discardTop,
    declaredSuit: null,
    turnPlayerId: starterId,
    phase: "active",
    overWinnerId: null,
    lastAction: null,
  };
}

function doPlayEightsCard(latest, myId, cardIndex, declaredSuit) {
  if (!latest) return undefined;
  const g = latest.game;
  if (!g || g.type !== "crazyEights" || g.phase !== "active") return latest;
  if (g.turnPlayerId !== myId) return latest;
  const hand = (g.hands || {})[myId] || [];
  const card = hand[cardIndex];
  if (!card) return latest;
  const effectiveSuit = g.declaredSuit || g.discardTop.suit;
  const canPlay = card.rank === "8" || card.suit === effectiveSuit || card.rank === g.discardTop.rank;
  if (!canPlay) return latest;
  const newHand = hand.filter((_, i) => i !== cardIndex);
  const otherId = latest.players.find((p) => p.id !== myId)?.id;
  const over = newHand.length === 0;
  return {
    ...latest,
    scoreboard: over ? creditScoreboard(latest, myId) : latest.scoreboard,
    game: {
      ...g,
      hands: { ...g.hands, [myId]: newHand },
      discardTop: card,
      declaredSuit: card.rank === "8" ? declaredSuit : null,
      turnPlayerId: over ? g.turnPlayerId : otherId,
      phase: over ? "over" : "active",
      overWinnerId: over ? myId : null,
      lastAction: { text: `played ${card.rank}${card.suit}${card.rank === "8" ? ` — called ${declaredSuit}` : ""}` },
    },
  };
}

function doDrawEightsCard(latest, myId) {
  if (!latest) return undefined;
  const g = latest.game;
  if (!g || g.type !== "crazyEights" || g.phase !== "active") return latest;
  if (g.turnPlayerId !== myId) return latest;
  const drawPile = [...(g.drawPile || [])];
  if (drawPile.length === 0) return latest;
  const drawn = drawPile.shift();
  const newHand = [...((g.hands || {})[myId] || []), drawn];
  return { ...latest, game: { ...g, drawPile, hands: { ...g.hands, [myId]: newHand }, lastAction: { text: "drew a card" } } };
}

function doPassEightsTurn(latest, myId) {
  if (!latest) return undefined;
  const g = latest.game;
  if (!g || g.type !== "crazyEights" || g.phase !== "active") return latest;
  if (g.turnPlayerId !== myId) return latest;
  const otherId = latest.players.find((p) => p.id !== myId)?.id;
  return { ...latest, game: { ...g, turnPlayerId: otherId, lastAction: { text: "passed" } } };
}

function cardValue10(card) {
  if (card.rank === "A") return 1;
  if (["J", "Q", "K"].includes(card.rank)) return 10;
  return Number(card.rank);
}
function tonkHandValue(hand) {
  return hand.reduce((sum, c) => sum + cardValue10(c), 0);
}
function isValidTonkMeld(cards) {
  if (cards.length < 3) return false;
  const sameRank = cards.every((c) => c.rank === cards[0].rank);
  if (sameRank) return true;
  const sameSuit = cards.every((c) => c.suit === cards[0].suit);
  if (!sameSuit) return false;
  const sorted = [...cards].sort((a, b) => a.value - b.value);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].value !== sorted[i - 1].value + 1) return false;
  }
  return true;
}

function buildTonkGame(starterId, p1id, p2id) {
  const deck = freshDeck();
  const hands = { [p1id]: deck.slice(0, 5), [p2id]: deck.slice(5, 10) };
  const rest = deck.slice(10);
  const discardTop = rest.shift();
  return {
    type: "tonk",
    hands,
    melds: { [p1id]: [], [p2id]: [] },
    drawPile: rest,
    discardPile: [discardTop],
    turnPlayerId: starterId,
    stage: "draw",
    phase: "active",
    overWinnerId: null,
    lastAction: null,
    finalValues: null,
  };
}

function doDrawStock(latest, myId) {
  if (!latest) return undefined;
  const g = latest.game;
  if (!g || g.type !== "tonk" || g.phase !== "active") return latest;
  if (g.turnPlayerId !== myId || g.stage !== "draw") return latest;
  const drawPile = [...(g.drawPile || [])];
  if (drawPile.length === 0) return latest;
  const drawn = drawPile.shift();
  const hand = [...((g.hands || {})[myId] || []), drawn];
  return { ...latest, game: { ...g, drawPile, hands: { ...g.hands, [myId]: hand }, stage: "act", lastAction: { text: "drew from the pile" } } };
}

function doDrawDiscardTonk(latest, myId) {
  if (!latest) return undefined;
  const g = latest.game;
  if (!g || g.type !== "tonk" || g.phase !== "active") return latest;
  if (g.turnPlayerId !== myId || g.stage !== "draw") return latest;
  const discardPile = [...(g.discardPile || [])];
  if (discardPile.length === 0) return latest;
  const drawn = discardPile.shift();
  const hand = [...((g.hands || {})[myId] || []), drawn];
  return { ...latest, game: { ...g, discardPile, hands: { ...g.hands, [myId]: hand }, stage: "act", lastAction: { text: "took the discard" } } };
}

function doLayMeld(latest, myId, indices) {
  if (!latest) return undefined;
  const g = latest.game;
  if (!g || g.type !== "tonk" || g.phase !== "active") return latest;
  if (g.turnPlayerId !== myId || g.stage !== "act") return latest;
  const hand = (g.hands || {})[myId] || [];
  const selected = indices.map((i) => hand[i]).filter(Boolean);
  if (selected.length !== indices.length || !isValidTonkMeld(selected)) return latest;
  const remaining = hand.filter((_, i) => !indices.includes(i));
  const melds = { ...(g.melds || {}) };
  melds[myId] = [...(melds[myId] || []), selected];
  const handEmpty = remaining.length === 0;
  return {
    ...latest,
    scoreboard: handEmpty ? creditScoreboard(latest, myId) : latest.scoreboard,
    game: {
      ...g,
      hands: { ...g.hands, [myId]: remaining },
      melds,
      lastAction: { text: `laid down a meld of ${selected.length}` },
      phase: handEmpty ? "over" : "active",
      overWinnerId: handEmpty ? myId : null,
    },
  };
}

function doDiscardTonk(latest, myId, index) {
  if (!latest) return undefined;
  const g = latest.game;
  if (!g || g.type !== "tonk" || g.phase !== "active") return latest;
  if (g.turnPlayerId !== myId || g.stage !== "act") return latest;
  const hand = (g.hands || {})[myId] || [];
  const card = hand[index];
  if (!card) return latest;
  const remaining = hand.filter((_, i) => i !== index);
  const discardPile = [card, ...(g.discardPile || [])];
  const otherId = latest.players.find((p) => p.id !== myId)?.id;
  return {
    ...latest,
    game: {
      ...g,
      hands: { ...g.hands, [myId]: remaining },
      discardPile,
      turnPlayerId: otherId,
      stage: "draw",
      lastAction: { text: `discarded ${card.rank}${card.suit}` },
    },
  };
}

function doKnockTonk(latest, myId) {
  if (!latest) return undefined;
  const g = latest.game;
  if (!g || g.type !== "tonk" || g.phase !== "active") return latest;
  if (g.turnPlayerId !== myId || g.stage !== "act") return latest;
  const myHand = (g.hands || {})[myId] || [];
  const myVal = tonkHandValue(myHand);
  if (myVal > 10) return latest;
  const otherId = latest.players.find((p) => p.id !== myId)?.id;
  const otherVal = tonkHandValue((g.hands || {})[otherId] || []);
  let overWinnerId;
  if (myVal < otherVal) overWinnerId = myId;
  else if (otherVal < myVal) overWinnerId = otherId;
  else overWinnerId = "tie";
  return {
    ...latest,
    scoreboard: creditScoreboard(latest, overWinnerId),
    game: { ...g, phase: "over", overWinnerId, lastAction: { text: `knocked with ${myVal}` }, finalValues: { [myId]: myVal, [otherId]: otherVal } },
  };
}

function cardRankValue14(rank) {
  if (rank === "A") return 14;
  if (rank === "K") return 13;
  if (rank === "Q") return 12;
  if (rank === "J") return 11;
  return Number(rank);
}

function evaluateDeucesHand(cards) {
  const wilds = cards.filter((c) => c.rank === "2");
  const nat = cards.filter((c) => c.rank !== "2");
  const numWilds = wilds.length;

  const rankCounts = {};
  nat.forEach((c) => { rankCounts[c.rank] = (rankCounts[c.rank] || 0) + 1; });
  const counts = Object.values(rankCounts).sort((a, b) => b - a);
  const bestGroup = (counts[0] || 0) + numWilds;

  const suitCounts = {};
  nat.forEach((c) => { suitCounts[c.suit] = (suitCounts[c.suit] || 0) + 1; });
  const maxSuitCount = nat.length ? Math.max(...Object.values(suitCounts)) : 0;
  const isFlushPossible = maxSuitCount + numWilds >= 5;

  const toVals = (aceLow) => [...new Set(nat.map((c) => (aceLow && c.rank === "A" ? 1 : cardRankValue14(c.rank))))].sort((a, b) => a - b);
  function checkStraightWindow(vals) {
    for (let start = 1; start <= 10; start++) {
      const windowVals = [start, start + 1, start + 2, start + 3, start + 4];
      const present = windowVals.filter((v) => vals.includes(v)).length;
      if (5 - present <= numWilds) return true;
    }
    return false;
  }
  const isStraightPossible = checkStraightWindow(toVals(false)) || checkStraightWindow(toVals(true));
  const isStraightFlushPossible = isFlushPossible && isStraightPossible;

  const secondGroup = counts[1] || 0;
  const wildsLeftForSecond = Math.max(0, numWilds - Math.max(0, 3 - (counts[0] || 0)));
  const fullHousePossible = bestGroup >= 3 && secondGroup + wildsLeftForSecond >= 2 && counts.length + (numWilds > 0 ? 1 : 0) >= 2;

  const highCardSum = nat.reduce((s, c) => s + cardRankValue14(c.rank), 0) + numWilds * 14;

  let category, rankLabel;
  if (bestGroup >= 5) { category = 9; rankLabel = "Five of a Kind"; }
  else if (isStraightFlushPossible) { category = 8; rankLabel = "Straight Flush"; }
  else if (bestGroup >= 4) { category = 7; rankLabel = "Four of a Kind"; }
  else if (fullHousePossible) { category = 6; rankLabel = "Full House"; }
  else if (isFlushPossible) { category = 5; rankLabel = "Flush"; }
  else if (isStraightPossible) { category = 4; rankLabel = "Straight"; }
  else if (bestGroup >= 3) { category = 3; rankLabel = "Three of a Kind"; }
  else if (counts.filter((c) => c >= 2).length >= 2) { category = 2; rankLabel = "Two Pair"; }
  else if (bestGroup >= 2) { category = 1; rankLabel = "Pair"; }
  else { category = 0; rankLabel = "High Card"; }

  return { category, rankLabel, tiebreak: highCardSum };
}

function buildDeucesGame(p1id, p2id) {
  const deck = freshDeck();
  const hands = { [p1id]: deck.slice(0, 5), [p2id]: deck.slice(5, 10) };
  const rest = deck.slice(10);
  return { type: "deuces", hands, deck: rest, kept: {}, phase: "drawing", results: null };
}

function doDeucesDraw(latest, myId, discardIndices) {
  if (!latest) return undefined;
  const g = latest.game;
  if (!g || g.type !== "deuces" || g.phase !== "drawing") return latest;
  const kept = { ...(g.kept || {}) };
  if (kept[myId] !== undefined) return latest;
  kept[myId] = discardIndices;
  const playerIds = latest.players.map((p) => p.id);
  const bothReady = playerIds.every((id) => kept[id] !== undefined);
  if (!bothReady) {
    return { ...latest, game: { ...g, kept } };
  }
  let deck = [...(g.deck || [])];
  const newHands = {};
  playerIds.forEach((id) => {
    const hand = g.hands[id];
    const discards = kept[id];
    const finalHand = hand.map((c, i) => (discards.includes(i) ? null : c));
    for (let i = 0; i < finalHand.length; i++) {
      if (finalHand[i] === null) finalHand[i] = deck.shift();
    }
    newHands[id] = finalHand;
  });
  const [p1, p2] = playerIds;
  const eval1 = evaluateDeucesHand(newHands[p1]);
  const eval2 = evaluateDeucesHand(newHands[p2]);
  let winnerId;
  if (eval1.category !== eval2.category) winnerId = eval1.category > eval2.category ? p1 : p2;
  else if (eval1.tiebreak !== eval2.tiebreak) winnerId = eval1.tiebreak > eval2.tiebreak ? p1 : p2;
  else winnerId = "tie";
  return {
    ...latest,
    scoreboard: creditScoreboard(latest, winnerId),
    game: { ...g, hands: newHands, deck, kept, phase: "revealed", results: { [p1]: eval1, [p2]: eval2, winnerId } },
  };
}

function buildTicTacToeGame(starterId, p1id, p2id) {
  return {
    type: "tictactoe",
    board: Array(9).fill(""),
    symbols: { [p1id]: "X", [p2id]: "O" },
    turnPlayerId: starterId,
    phase: "active",
    overWinnerId: null,
    winLine: null,
  };
}

function doTicTacToeMove(latest, myId, index) {
  if (!latest) return undefined;
  const g = latest.game;
  if (!g || g.type !== "tictactoe" || g.phase !== "active") return latest;
  if (g.turnPlayerId !== myId) return latest;
  const board = g.board || Array(9).fill("");
  if (board[index]) return latest;
  const mySymbol = g.symbols[myId];
  const newBoard = [...board];
  newBoard[index] = mySymbol;
  const lines = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  let winLine = null;
  for (const line of lines) {
    const [a, b, c] = line;
    if (newBoard[a] && newBoard[a] === newBoard[b] && newBoard[a] === newBoard[c]) { winLine = line; break; }
  }
  const full = newBoard.every((c) => c !== "");
  const over = !!winLine || full;
  const otherId = latest.players.find((p) => p.id !== myId)?.id;
  const overWinnerId = winLine ? myId : full ? "tie" : null;
  return {
    ...latest,
    scoreboard: winLine ? creditScoreboard(latest, myId) : latest.scoreboard,
    game: { ...g, board: newBoard, winLine, phase: over ? "over" : "active", overWinnerId, turnPlayerId: over ? g.turnPlayerId : otherId },
  };
}

function buildConnectFourGame(starterId, p1id, p2id) {
  return {
    type: "connectFour",
    board: Array(42).fill(""),
    symbols: { [p1id]: "💗", [p2id]: "💛" },
    turnPlayerId: starterId,
    phase: "active",
    overWinnerId: null,
  };
}

function doConnectFourMove(latest, myId, col) {
  if (!latest) return undefined;
  const g = latest.game;
  if (!g || g.type !== "connectFour" || g.phase !== "active") return latest;
  if (g.turnPlayerId !== myId) return latest;
  const board = g.board || Array(42).fill("");
  let targetIdx = -1;
  for (let row = 5; row >= 0; row--) {
    const idx = row * 7 + col;
    if (!board[idx]) { targetIdx = idx; break; }
  }
  if (targetIdx === -1) return latest;
  const symbol = g.symbols[myId];
  const newBoard = [...board];
  newBoard[targetIdx] = symbol;
  const row = Math.floor(targetIdx / 7), col2 = targetIdx % 7;
  function countDir(dr, dc) {
    let r = row + dr, c = col2 + dc, count = 0;
    while (r >= 0 && r < 6 && c >= 0 && c < 7 && newBoard[r * 7 + c] === symbol) { count++; r += dr; c += dc; }
    return count;
  }
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
  let won = false;
  for (const [dr, dc] of dirs) {
    if (1 + countDir(dr, dc) + countDir(-dr, -dc) >= 4) { won = true; break; }
  }
  const full = newBoard.every((c) => c !== "");
  const over = won || full;
  const otherId = latest.players.find((p) => p.id !== myId)?.id;
  const overWinnerId = won ? myId : full ? "tie" : null;
  return {
    ...latest,
    scoreboard: won ? creditScoreboard(latest, myId) : latest.scoreboard,
    game: { ...g, board: newBoard, phase: over ? "over" : "active", overWinnerId, turnPlayerId: over ? g.turnPlayerId : otherId },
  };
}

function buildRPSGame() {
  return { type: "rps", choices: {}, lastResult: null, roundNum: 0 };
}

function doRPSChoice(latest, myId, choice) {
  if (!latest) return undefined;
  const g = latest.game;
  if (!g || g.type !== "rps") return latest;
  const choices = { ...(g.choices || {}) };
  if (choices[myId] !== undefined) return latest;
  choices[myId] = choice;
  const playerIds = latest.players.map((p) => p.id);
  const bothChosen = playerIds.every((id) => choices[id] !== undefined);
  if (!bothChosen) {
    return { ...latest, game: { ...g, choices } };
  }
  const [p1, p2] = playerIds;
  const c1 = choices[p1], c2 = choices[p2];
  let winnerId;
  if (c1 === c2) winnerId = "tie";
  else if ((c1 === "rock" && c2 === "scissors") || (c1 === "paper" && c2 === "rock") || (c1 === "scissors" && c2 === "paper")) winnerId = p1;
  else winnerId = p2;
  return {
    ...latest,
    scoreboard: creditScoreboard(latest, winnerId),
    game: { ...g, choices: {}, lastResult: { [p1]: c1, [p2]: c2, winnerId }, roundNum: (g.roundNum || 0) + 1 },
  };
}

function buildHangmanGame(setterId, guesserId) {
  return { type: "hangman", setterId, guesserId, word: null, guessedLetters: [], wrongCount: 0, phase: "setting", overResult: null };
}

function doSetHangmanWord(latest, myId, word) {
  if (!latest) return undefined;
  const g = latest.game;
  if (!g || g.type !== "hangman" || g.phase !== "setting") return latest;
  if (g.setterId !== myId) return latest;
  const clean = word.trim().toUpperCase().replace(/[^A-Z ]/g, "");
  if (!clean) return latest;
  return { ...latest, game: { ...g, word: clean, phase: "guessing", guessedLetters: [], wrongCount: 0 } };
}

function doGuessLetter(latest, myId, letter) {
  if (!latest) return undefined;
  const g = latest.game;
  if (!g || g.type !== "hangman" || g.phase !== "guessing") return latest;
  if (g.guesserId !== myId) return latest;
  const guessed = g.guessedLetters || [];
  if (guessed.includes(letter)) return latest;
  const newGuessed = [...guessed, letter];
  const correct = g.word.includes(letter);
  const wrongCount = (g.wrongCount || 0) + (correct ? 0 : 1);
  const wordLetters = [...new Set(g.word.replace(/ /g, "").split(""))];
  const allFound = wordLetters.every((l) => newGuessed.includes(l));
  const lost = wrongCount >= 6;
  const over = allFound || lost;
  const overResult = over ? (allFound ? "won" : "lost") : null;
  return {
    ...latest,
    scoreboard: over ? creditScoreboard(latest, allFound ? myId : g.setterId) : latest.scoreboard,
    game: { ...g, guessedLetters: newGuessed, wrongCount, phase: over ? "over" : "guessing", overResult },
  };
}

function buildTwentyQGame(chooserId, guesserId) {
  return { type: "twentyQ", chooserId, guesserId, secret: null, phase: "choosing", log: [], questionCount: 0, overResult: null, pendingQuestion: null, pendingGuess: null };
}

function doSetSecret(latest, myId, secret) {
  if (!latest) return undefined;
  const g = latest.game;
  if (!g || g.type !== "twentyQ" || g.phase !== "choosing") return latest;
  if (g.chooserId !== myId) return latest;
  const clean = secret.trim();
  if (!clean) return latest;
  return { ...latest, game: { ...g, secret: clean, phase: "playing", log: [], questionCount: 0 } };
}

function doAskQuestion(latest, myId, text) {
  if (!latest) return undefined;
  const g = latest.game;
  if (!g || g.type !== "twentyQ" || g.phase !== "playing") return latest;
  if (g.guesserId !== myId) return latest;
  if (g.pendingQuestion || g.pendingGuess) return latest;
  const clean = text.trim();
  if (!clean || (g.questionCount || 0) >= 20) return latest;
  return { ...latest, game: { ...g, pendingQuestion: clean } };
}

function doAnswerQuestion(latest, myId, answer) {
  if (!latest) return undefined;
  const g = latest.game;
  if (!g || g.type !== "twentyQ" || g.phase !== "playing") return latest;
  if (g.chooserId !== myId || !g.pendingQuestion) return latest;
  const log = [...(g.log || []), { question: g.pendingQuestion, answer }];
  const questionCount = (g.questionCount || 0) + 1;
  const outOfQuestions = questionCount >= 20;
  return {
    ...latest,
    scoreboard: outOfQuestions ? creditScoreboard(latest, g.chooserId) : latest.scoreboard,
    game: { ...g, log, questionCount, pendingQuestion: null, phase: outOfQuestions ? "over" : "playing", overResult: outOfQuestions ? "lost" : null },
  };
}

function doSubmitGuess20Q(latest, myId, text) {
  if (!latest) return undefined;
  const g = latest.game;
  if (!g || g.type !== "twentyQ" || g.phase !== "playing") return latest;
  if (g.guesserId !== myId) return latest;
  if (g.pendingQuestion || g.pendingGuess) return latest;
  const clean = text.trim();
  if (!clean) return latest;
  return { ...latest, game: { ...g, pendingGuess: clean } };
}

function doConfirmGuess20Q(latest, myId, correct) {
  if (!latest) return undefined;
  const g = latest.game;
  if (!g || g.type !== "twentyQ" || g.phase !== "playing") return latest;
  if (g.chooserId !== myId || !g.pendingGuess) return latest;
  if (correct) {
    return { ...latest, scoreboard: creditScoreboard(latest, g.guesserId), game: { ...g, phase: "over", overResult: "won", pendingGuess: null } };
  }
  return { ...latest, game: { ...g, pendingGuess: null } };
}

const GAME_MENU = [
  { key: "qa", label: "In Sync Q&A", blurb: "See how many answers line up" },
  { key: "war", label: "War", blurb: "Flip cards, highest wins the pot" },
  { key: "twoTruths", label: "Two Truths & a Lie", blurb: "One of you fibs, the other guesses" },
  { key: "memory", label: "Memory Match", blurb: "Flip and find 6 cute pairs" },
  { key: "heartHunt", label: "Heart Hunt", blurb: "Battleship, but make it cute" },
  { key: "goFish", label: "Go Fish", blurb: "Collect books of 4, ask nicely" },
  { key: "crazyEights", label: "Crazy Eights", blurb: "Match rank or suit, 8s are wild" },
  { key: "tonk", label: "Tonk", blurb: "Meld sets, keep your hand low" },
  { key: "deuces", label: "Deuces Wild", blurb: "Draw poker, 2s are wild" },
  { key: "tictactoe", label: "Tic Tac Toe", blurb: "Three in a row" },
  { key: "connectFour", label: "Connect Four", blurb: "Four in a row, drop and win" },
  { key: "rps", label: "Rock Paper Scissors", blurb: "Quick rounds, best reflexes" },
  { key: "hangman", label: "Hangman", blurb: "Guess the word, letter by letter" },
  { key: "twentyQ", label: "20 Questions", blurb: "Guess what they're thinking of" },
];

export default function App() {
  const myId = useRef(getDeviceId());
  const [name, setName] = useState("");
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [joined, setJoined] = useState(false);
  const [room, setRoom] = useState(null);
  const [error, setError] = useState("");
  const [textVal, setTextVal] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qaSetupDecks, setQaSetupDecks] = useState(DECKS.map((d) => d.key));
  const [showQaSetup, setShowQaSetup] = useState(false);
  const [draftStatements, setDraftStatements] = useState(["", "", ""]);
  const [draftLieIndex, setDraftLieIndex] = useState(0);
  const [heartSelection, setHeartSelection] = useState([]);
  const [pendingEightIndex, setPendingEightIndex] = useState(null);
  const [tonkSelection, setTonkSelection] = useState([]);
  const [deucesSelection, setDeucesSelection] = useState([]);
  const [hangmanWordInput, setHangmanWordInput] = useState("");
  const [secretInput, setSecretInput] = useState("");
  const [questionInput, setQuestionInput] = useState("");
  const [guessInput, setGuessInput] = useState("");

  useEffect(() => { setTextVal(""); }, [room?.game?.round?.promptId]);

  useEffect(() => {
    const session = loadSession();
    if (session?.roomCode && session?.name) {
      setName(session.name);
      setRoomCodeInput(session.roomCode);
      doJoin(session.roomCode, session.name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!joined || !roomCode) return;
    const unsubscribe = subscribeToRoom(roomCode, (data) => setRoom(data));
    return () => unsubscribe();
  }, [joined, roomCode]);

  const doJoin = useCallback(async (codeRaw, nameRaw) => {
    setError("");
    if (!nameRaw?.trim() || !codeRaw?.trim()) {
      setError("Fill in both a name and a room code, love.");
      return;
    }
    setBusy(true);
    const code = codeRaw.trim().toUpperCase().replace(/\s+/g, "");
    try {
      let joinError = null;
      await updateRoom(code, (latest) => {
        if (!latest) {
          return {
            code,
            players: [{ id: myId.current, name: nameRaw.trim() }],
            pickerId: myId.current,
            status: "lobby",
            game: null,
            scoreboard: {},
          };
        }
        const exists = (latest.players || []).find((p) => p.id === myId.current);
        if (exists) return latest;
        if ((latest.players || []).length >= 2) {
          joinError = "This room's already got two people in it. Try another code.";
          return latest;
        }
        const newPlayers = [...(latest.players || []), { id: myId.current, name: nameRaw.trim() }];
        return { ...latest, players: newPlayers, status: newPlayers.length === 2 ? "picking" : latest.status };
      });
      if (joinError) { setError(joinError); setBusy(false); return; }
      saveSession({ roomCode: code, name: nameRaw.trim() });
      setRoomCode(code);
      setJoined(true);
    } catch (e) {
      console.error(e);
      setError(`Couldn't reach the room: ${e.code || e.message || "unknown error"}`);
    }
    setBusy(false);
  }, []);

  const handleJoin = useCallback(() => doJoin(roomCodeInput, name), [doJoin, roomCodeInput, name]);

  const pickGame = useCallback(async (initialGame) => {
    setBusy(true);
    setError("");
    try {
      await updateRoom(roomCode, (latest) => {
        if (!latest) return undefined;
        if (latest.pickerId !== myId.current) return latest;
        return { ...latest, status: "playing", game: initialGame };
      });
      setShowQaSetup(false);
    } catch (e) {
      console.error(e);
      setError(`Couldn't start the game: ${e.code || e.message || "unknown error"}`);
    }
    setBusy(false);
  }, [roomCode]);

  const backToMenu = useCallback(async () => {
    setBusy(true);
    setError("");
    setShowQaSetup(false);
    setHeartSelection([]);
    try {
      await updateRoom(roomCode, (latest) => {
        if (!latest) return undefined;
        const otherId = (latest.players || []).find((p) => p.id !== latest.pickerId)?.id || latest.pickerId;
        return { ...latest, status: "picking", game: null, pickerId: otherId };
      });
    } catch (e) {
      console.error(e);
      setError(`Couldn't return to the menu: ${e.code || e.message || "unknown error"}`);
    }
    setBusy(false);
  }, [roomCode]);

  const qaSubmitAnswer = useCallback(async (value) => {
    setBusy(true);
    setError("");
    try {
      await updateRoom(roomCode, (latest) => {
        if (!latest) return undefined;
        const g = latest.game;
        if (!g || g.type !== "qa" || !g.round) return latest;
        const currentAnswers = g.round.answers || {};
        const updatedAnswers = { ...currentAnswers, [myId.current]: value };
        const playerIds = latest.players.map((p) => p.id);
        const bothAnswered = playerIds.length === 2 && playerIds.every((id) => updatedAnswers[id] !== undefined);
        let newGame = { ...g, round: { ...g.round, answers: updatedAnswers } };
        if (bothAnswered) {
          const [p1, p2] = playerIds;
          let match;
          if (g.round.type === "options") match = updatedAnswers[p1] === updatedAnswers[p2];
          else if (g.round.type === "number") match = Number(updatedAnswers[p1]) === Number(updatedAnswers[p2]);
          else match = normalize(updatedAnswers[p1]) === normalize(updatedAnswers[p2]);
          newGame.round.revealed = true;
          newGame.round.match = match;
          newGame.matches = (g.matches || 0) + (match ? 1 : 0);
          newGame.playedIds = [...(g.playedIds || []), g.round.promptId];
          newGame.history = [...(g.history || []), { promptId: g.round.promptId, promptText: g.round.promptText, type: g.round.type, deck: g.round.deck, options: g.round.options, answers: updatedAnswers, match }];
        }
        return { ...latest, game: newGame };
      });
    } catch (e) {
      console.error(e);
      setError(`Couldn't submit your answer: ${e.code || e.message || "unknown error"}`);
    }
    setBusy(false);
  }, [roomCode]);

  const qaNextRound = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      await updateRoom(roomCode, (latest) => {
        if (!latest) return undefined;
        const g = latest.game;
        if (!g || g.type !== "qa") return latest;
        const roundsPlayed = g.history?.length || 0;
        if (roundsPlayed >= g.totalRounds) {
          return { ...latest, game: { ...g, status: "finished" } };
        }
        const { next, reset } = pickNextPrompt(g.playedIds || [], g.selectedDecks);
        return {
          ...latest,
          game: {
            ...g,
            playedIds: reset ? [] : (g.playedIds || []),
            status: "playing",
            round: { promptId: next.id, promptText: next.text, type: next.type, deck: next.deck, options: next.options || null, answers: {}, revealed: false, match: null },
          },
        };
      });
    } catch (e) {
      console.error(e);
      setError(`Couldn't start the round: ${e.code || e.message || "unknown error"}`);
    }
    setBusy(false);
  }, [roomCode]);

  const flipWar = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      await updateRoom(roomCode, (latest) => doFlip(latest, myId.current));
    } catch (e) {
      console.error(e);
      setError(`Couldn't flip: ${e.code || e.message || "unknown error"}`);
    }
    setBusy(false);
  }, [roomCode]);

  const submitStatements = useCallback(async (statements, lieIndex) => {
    setBusy(true);
    setError("");
    try {
      await updateRoom(roomCode, (latest) => {
        if (!latest) return undefined;
        const g = latest.game;
        if (!g || g.type !== "twoTruths") return latest;
        return { ...latest, game: { ...g, statements, lieIndex, phase: "guessing" } };
      });
    } catch (e) {
      console.error(e);
      setError(`Couldn't submit: ${e.code || e.message || "unknown error"}`);
    }
    setBusy(false);
  }, [roomCode]);

  const submitGuess = useCallback(async (guessIdx) => {
    setBusy(true);
    setError("");
    try {
      await updateRoom(roomCode, (latest) => {
        if (!latest) return undefined;
        const g = latest.game;
        if (!g || g.type !== "twoTruths" || g.phase !== "guessing") return latest;
        const correct = guessIdx === g.lieIndex;
        const scores = { ...(g.scores || {}) };
        scores[myId.current] = (scores[myId.current] || 0) + (correct ? 1 : 0);
        return { ...latest, game: { ...g, guess: guessIdx, phase: "revealed", scores } };
      });
    } catch (e) {
      console.error(e);
      setError(`Couldn't submit your guess: ${e.code || e.message || "unknown error"}`);
    }
    setBusy(false);
  }, [roomCode]);

  const nextTruthsRound = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      await updateRoom(roomCode, (latest) => {
        if (!latest) return undefined;
        const g = latest.game;
        if (!g || g.type !== "twoTruths") return latest;
        const otherId = latest.players.find((p) => p.id !== g.turnPlayerId)?.id || g.turnPlayerId;
        return { ...latest, game: { ...g, turnPlayerId: otherId, phase: "writing", statements: null, lieIndex: null, guess: null } };
      });
    } catch (e) {
      console.error(e);
      setError(`Couldn't start the next round: ${e.code || e.message || "unknown error"}`);
    }
    setBusy(false);
  }, [roomCode]);

  const flipMemoryCard = useCallback(async (index) => {
    setBusy(true);
    setError("");
    try {
      await updateRoom(roomCode, (latest) => {
        if (!latest) return undefined;
        const g = latest.game;
        if (!g || g.type !== "memory" || g.phase !== "active") return latest;
        if (g.turnPlayerId !== myId.current) return latest;
        if (g.resolution) return latest;
        const flipped = g.flippedIndices || [];
        if (flipped.includes(index) || g.board[index].matched || flipped.length >= 2) return latest;
        const newFlipped = [...flipped, index];
        if (newFlipped.length < 2) {
          return { ...latest, game: { ...g, flippedIndices: newFlipped } };
        }
        const [i1, i2] = newFlipped;
        const isMatch = g.board[i1].symbol === g.board[i2].symbol;
        if (isMatch) {
          const newBoard = g.board.map((c, idx) => (idx === i1 || idx === i2 ? { ...c, matched: true } : c));
          const scores = { ...(g.scores || {}) };
          scores[myId.current] = (scores[myId.current] || 0) + 1;
          const allMatched = newBoard.every((c) => c.matched);
          const memWinnerId = allMatched ? decideWinner(scores, latest.players) : null;
          return {
            ...latest,
            scoreboard: allMatched ? creditScoreboard(latest, memWinnerId) : latest.scoreboard,
            game: {
              ...g,
              board: newBoard,
              flippedIndices: [],
              scores,
              phase: allMatched ? "over" : "active",
              overWinnerId: memWinnerId,
            },
          };
        }
        return { ...latest, game: { ...g, flippedIndices: newFlipped, resolution: { matched: false, indices: newFlipped } } };
      });
    } catch (e) {
      console.error(e);
      setError(`Couldn't flip that card: ${e.code || e.message || "unknown error"}`);
    }
    setBusy(false);
  }, [roomCode]);

  const continueMemory = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      await updateRoom(roomCode, (latest) => {
        if (!latest) return undefined;
        const g = latest.game;
        if (!g || g.type !== "memory" || !g.resolution) return latest;
        const otherId = latest.players.find((p) => p.id !== g.turnPlayerId)?.id || g.turnPlayerId;
        return { ...latest, game: { ...g, flippedIndices: [], resolution: null, turnPlayerId: otherId } };
      });
    } catch (e) {
      console.error(e);
      setError(`Couldn't continue: ${e.code || e.message || "unknown error"}`);
    }
    setBusy(false);
  }, [roomCode]);

  const placeHearts = useCallback(async (indices) => {
    setBusy(true);
    setError("");
    try {
      await updateRoom(roomCode, (latest) => {
        if (!latest) return undefined;
        const g = latest.game;
        if (!g || g.type !== "heartHunt" || g.phase !== "placing") return latest;
        const placements = { ...(g.placements || {}), [myId.current]: indices };
        const bothPlaced = latest.players.every((p) => placements[p.id] !== undefined);
        return { ...latest, game: { ...g, placements, phase: bothPlaced ? "battling" : "placing" } };
      });
      setHeartSelection([]);
    } catch (e) {
      console.error(e);
      setError(`Couldn't place your hearts: ${e.code || e.message || "unknown error"}`);
    }
    setBusy(false);
  }, [roomCode]);

  const fireShot = useCallback(async (targetId, index) => {
    setBusy(true);
    setError("");
    try {
      await updateRoom(roomCode, (latest) => {
        if (!latest) return undefined;
        const g = latest.game;
        if (!g || g.type !== "heartHunt" || g.phase !== "battling") return latest;
        if (g.turnPlayerId !== myId.current) return latest;
        const shotsAt = { ...(g.shotsAt || {}) };
        const existing = shotsAt[targetId] || [];
        if (existing.some((s) => s.index === index)) return latest;
        const placements = g.placements || {};
        const targetHearts = placements[targetId] || [];
        const hit = targetHearts.includes(index);
        const newShots = [...existing, { index, hit }];
        shotsAt[targetId] = newShots;
        const hitsCount = newShots.filter((s) => s.hit).length;
        const over = hitsCount >= 3;
        const otherId = latest.players.find((p) => p.id !== myId.current)?.id || myId.current;
        return {
          ...latest,
          scoreboard: over ? creditScoreboard(latest, myId.current) : latest.scoreboard,
          game: {
            ...g,
            shotsAt,
            phase: over ? "over" : "battling",
            overWinnerId: over ? myId.current : null,
            turnPlayerId: over ? g.turnPlayerId : hit ? myId.current : otherId,
          },
        };
      });
    } catch (e) {
      console.error(e);
      setError(`Couldn't fire: ${e.code || e.message || "unknown error"}`);
    }
    setBusy(false);
  }, [roomCode]);

  const askForRank = useCallback(async (rank) => {
    setBusy(true);
    setError("");
    try {
      await updateRoom(roomCode, (latest) => doAskForRank(latest, myId.current, rank));
    } catch (e) {
      console.error(e);
      setError(`Couldn't ask: ${e.code || e.message || "unknown error"}`);
    }
    setBusy(false);
  }, [roomCode]);

  const playEightsCard = useCallback(async (cardIndex, declaredSuit) => {
    setBusy(true);
    setError("");
    try {
      await updateRoom(roomCode, (latest) => doPlayEightsCard(latest, myId.current, cardIndex, declaredSuit));
      setPendingEightIndex(null);
    } catch (e) {
      console.error(e);
      setError(`Couldn't play that card: ${e.code || e.message || "unknown error"}`);
    }
    setBusy(false);
  }, [roomCode]);

  const drawEightsCard = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      await updateRoom(roomCode, (latest) => doDrawEightsCard(latest, myId.current));
    } catch (e) {
      console.error(e);
      setError(`Couldn't draw: ${e.code || e.message || "unknown error"}`);
    }
    setBusy(false);
  }, [roomCode]);

  const passEightsTurn = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      await updateRoom(roomCode, (latest) => doPassEightsTurn(latest, myId.current));
    } catch (e) {
      console.error(e);
      setError(`Couldn't pass: ${e.code || e.message || "unknown error"}`);
    }
    setBusy(false);
  }, [roomCode]);

  const drawStock = useCallback(async () => {
    setBusy(true);
    setError("");
    try { await updateRoom(roomCode, (latest) => doDrawStock(latest, myId.current)); }
    catch (e) { console.error(e); setError(`Couldn't draw: ${e.code || e.message || "unknown error"}`); }
    setBusy(false);
  }, [roomCode]);

  const drawDiscardTonk = useCallback(async () => {
    setBusy(true);
    setError("");
    try { await updateRoom(roomCode, (latest) => doDrawDiscardTonk(latest, myId.current)); }
    catch (e) { console.error(e); setError(`Couldn't take that: ${e.code || e.message || "unknown error"}`); }
    setBusy(false);
  }, [roomCode]);

  const layMeld = useCallback(async (indices) => {
    setBusy(true);
    setError("");
    try {
      await updateRoom(roomCode, (latest) => doLayMeld(latest, myId.current, indices));
      setTonkSelection([]);
    } catch (e) { console.error(e); setError(`Couldn't lay that meld: ${e.code || e.message || "unknown error"}`); }
    setBusy(false);
  }, [roomCode]);

  const discardTonk = useCallback(async (index) => {
    setBusy(true);
    setError("");
    try {
      await updateRoom(roomCode, (latest) => doDiscardTonk(latest, myId.current, index));
      setTonkSelection([]);
    } catch (e) { console.error(e); setError(`Couldn't discard: ${e.code || e.message || "unknown error"}`); }
    setBusy(false);
  }, [roomCode]);

  const knockTonk = useCallback(async () => {
    setBusy(true);
    setError("");
    try { await updateRoom(roomCode, (latest) => doKnockTonk(latest, myId.current)); }
    catch (e) { console.error(e); setError(`Couldn't knock: ${e.code || e.message || "unknown error"}`); }
    setBusy(false);
  }, [roomCode]);

  const submitDeucesDraw = useCallback(async (discardIndices) => {
    setBusy(true);
    setError("");
    try {
      await updateRoom(roomCode, (latest) => doDeucesDraw(latest, myId.current, discardIndices));
      setDeucesSelection([]);
    } catch (e) { console.error(e); setError(`Couldn't submit: ${e.code || e.message || "unknown error"}`); }
    setBusy(false);
  }, [roomCode]);

  const playTicTacToe = useCallback(async (index) => {
    setBusy(true); setError("");
    try { await updateRoom(roomCode, (latest) => doTicTacToeMove(latest, myId.current, index)); }
    catch (e) { console.error(e); setError(`Couldn't play: ${e.code || e.message || "unknown error"}`); }
    setBusy(false);
  }, [roomCode]);

  const playConnectFour = useCallback(async (col) => {
    setBusy(true); setError("");
    try { await updateRoom(roomCode, (latest) => doConnectFourMove(latest, myId.current, col)); }
    catch (e) { console.error(e); setError(`Couldn't drop that: ${e.code || e.message || "unknown error"}`); }
    setBusy(false);
  }, [roomCode]);

  const playRPS = useCallback(async (choice) => {
    setBusy(true); setError("");
    try { await updateRoom(roomCode, (latest) => doRPSChoice(latest, myId.current, choice)); }
    catch (e) { console.error(e); setError(`Couldn't submit: ${e.code || e.message || "unknown error"}`); }
    setBusy(false);
  }, [roomCode]);

  const setHangmanWord = useCallback(async (word) => {
    setBusy(true); setError("");
    try { await updateRoom(roomCode, (latest) => doSetHangmanWord(latest, myId.current, word)); setHangmanWordInput(""); }
    catch (e) { console.error(e); setError(`Couldn't set that: ${e.code || e.message || "unknown error"}`); }
    setBusy(false);
  }, [roomCode]);

  const guessHangmanLetter = useCallback(async (letter) => {
    setBusy(true); setError("");
    try { await updateRoom(roomCode, (latest) => doGuessLetter(latest, myId.current, letter)); }
    catch (e) { console.error(e); setError(`Couldn't guess: ${e.code || e.message || "unknown error"}`); }
    setBusy(false);
  }, [roomCode]);

  const setTwentyQSecret = useCallback(async (secret) => {
    setBusy(true); setError("");
    try { await updateRoom(roomCode, (latest) => doSetSecret(latest, myId.current, secret)); setSecretInput(""); }
    catch (e) { console.error(e); setError(`Couldn't set that: ${e.code || e.message || "unknown error"}`); }
    setBusy(false);
  }, [roomCode]);

  const askTwentyQ = useCallback(async (text) => {
    setBusy(true); setError("");
    try { await updateRoom(roomCode, (latest) => doAskQuestion(latest, myId.current, text)); setQuestionInput(""); }
    catch (e) { console.error(e); setError(`Couldn't ask: ${e.code || e.message || "unknown error"}`); }
    setBusy(false);
  }, [roomCode]);

  const answerTwentyQ = useCallback(async (answer) => {
    setBusy(true); setError("");
    try { await updateRoom(roomCode, (latest) => doAnswerQuestion(latest, myId.current, answer)); }
    catch (e) { console.error(e); setError(`Couldn't answer: ${e.code || e.message || "unknown error"}`); }
    setBusy(false);
  }, [roomCode]);

  const submitTwentyQGuess = useCallback(async (text) => {
    setBusy(true); setError("");
    try { await updateRoom(roomCode, (latest) => doSubmitGuess20Q(latest, myId.current, text)); setGuessInput(""); }
    catch (e) { console.error(e); setError(`Couldn't submit: ${e.code || e.message || "unknown error"}`); }
    setBusy(false);
  }, [roomCode]);

  const confirmTwentyQGuess = useCallback(async (correct) => {
    setBusy(true); setError("");
    try { await updateRoom(roomCode, (latest) => doConfirmGuess20Q(latest, myId.current, correct)); }
    catch (e) { console.error(e); setError(`Couldn't confirm: ${e.code || e.message || "unknown error"}`); }
    setBusy(false);
  }, [roomCode]);

  const leaveRoom = useCallback(async () => {
    setBusy(true);
    try {
      await updateRoom(roomCode, (latest) => {
        if (!latest) return undefined;
        const remaining = (latest.players || []).filter((p) => p.id !== myId.current);
        if (remaining.length === 0) return null;
        return { ...latest, players: remaining, status: "lobby", game: null, pickerId: remaining[0].id };
      });
    } catch (e) { console.error(e); }
    clearSession();
    setJoined(false);
    setRoom(null);
    setRoomCode("");
    setRoomCodeInput("");
    setError("");
    setShowQaSetup(false);
    setBusy(false);
  }, [roomCode]);

  const copyCode = () => {
    try {
      navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const partner = room?.players?.find((p) => p.id !== myId.current);
  const me = room?.players?.find((p) => p.id === myId.current);
  const isPicker = room?.pickerId === myId.current;

  const displayAnswer = (round, raw) => {
    if (!round) return raw;
    if (round.type === "options") return round.options?.find((o) => o.key === raw)?.label || raw;
    return raw;
  };

  const cardLabel = (card) => `${card.rank}${card.suit}`;

  return (
    <div style={styles.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;1,9..144,500&family=Manrope:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; }
        .glow { position: absolute; border-radius: 50%; filter: blur(60px); opacity: 0.35; pointer-events: none; }
        .glow1 { width: 260px; height: 260px; background: #F2779E; top: -60px; left: -60px; animation: drift1 14s ease-in-out infinite; }
        .glow2 { width: 320px; height: 320px; background: #E8B85C; bottom: -100px; right: -80px; animation: drift2 16s ease-in-out infinite; }
        @keyframes drift1 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(30px, 40px); } }
        @keyframes drift2 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(-40px, -20px); } }
        @keyframes floatOrb { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
        @keyframes pulseHeart { 0% { transform: scale(0.6); opacity: 0; } 50% { transform: scale(1.15); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .orbWrap { display: flex; align-items: center; justify-content: center; gap: 28px; margin: 28px 0; }
        .orb { width: 46px; height: 46px; border-radius: 50%; animation: floatOrb 3s ease-in-out infinite; box-shadow: 0 0 22px 4px currentColor; transition: transform 0.6s ease; }
        .orb.match { transform: translateX(37px); }
        .orb.matchB { transform: translateX(-37px); }
        .orb.nomatch { transform: translateX(-16px) translateY(6px); }
        .orb.nomatchB { transform: translateX(16px) translateY(-6px); }
        .heartPop { animation: pulseHeart 0.5s ease-out forwards; }
        .fadeUp { animation: fadeUp 0.4s ease-out forwards; }
        input:focus, button:focus-visible { outline: 2px solid #E8B85C; outline-offset: 2px; }
        button { cursor: pointer; font-family: 'Manrope', sans-serif; }
        ::selection { background: #F2779E55; }
        .optionRow { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 12px; border: 1px solid rgba(245,239,255,0.15); margin-bottom: 8px; text-align: left; width: 100%; background: rgba(245,239,255,0.03); color: #F5EFFF; }
        .optionRow.active { border-color: #E8B85C; background: rgba(232,184,92,0.08); }
        .leaveLink { background: none; border: none; color: #8B7FA8; font-size: 12px; text-decoration: underline; padding: 0; }
        .menuCard { width: 100%; text-align: left; padding: 16px; border-radius: 14px; border: 2px solid rgba(245,239,255,0.15); background: rgba(245,239,255,0.04); color: #F5EFFF; margin-bottom: 10px; }
        .cardFace { display: inline-block; padding: 10px 16px; border-radius: 10px; background: #F5EFFF; font-weight: 700; font-size: 20px; margin: 0 8px; }
      `}</style>
      <div className="glow glow1"></div>
      <div className="glow glow2"></div>

      <div style={styles.card}>
        {joined && (
          <div style={{ textAlign: "right", marginBottom: 8 }}>
            <button className="leaveLink" onClick={leaveRoom} disabled={busy}>Leave room</button>
          </div>
        )}
        {joined && room && room.players.length === 2 && (() => {
          const scoreboard = room.scoreboard || {};
          const myWins = scoreboard[myId.current] || 0;
          const theirWins = scoreboard[partner?.id] || 0;
          if (myWins === 0 && theirWins === 0) return null;
          return (
            <div style={styles.scoreboardBar}>
              <span>{myWins > theirWins ? "👑 " : ""}You {myWins}</span>
              <span style={{ color: "#8B7FA8" }}>·</span>
              <span>{theirWins} {partner?.name}{theirWins > myWins ? " 👑" : ""}</span>
            </div>
          );
        })()}
        {error && <div style={styles.error}>{error}</div>}

        {!joined && (
          <div className="fadeUp">
            <div style={styles.eyebrow}>a little game night for two</div>
            <h1 style={styles.h1}>In Sync</h1>
            <p style={styles.sub}>Pick a room code, share it with your person, and take turns choosing what to play.</p>
            <div style={styles.field}>
              <label style={styles.label}>Your name</label>
              <input style={styles.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="What should we call you?" maxLength={20} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Room code</label>
              <input style={{ ...styles.input, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em" }} value={roomCodeInput} onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())} placeholder="e.g. LOVE24" maxLength={12} />
            </div>
            <button style={styles.primaryBtn} onClick={handleJoin} disabled={busy}>{busy ? "Entering..." : "Enter room"}</button>
            <div style={styles.hint}>Same code as your partner = same room, on any device.</div>
          </div>
        )}

        {joined && room && room.players.length < 2 && (
          <div style={styles.center} className="fadeUp">
            <div style={styles.eyebrow}>waiting</div>
            <h2 style={styles.h2}>Almost there, {me?.name}</h2>
            <div className="orbWrap"><div className="orb" style={{ background: "#F2779E", color: "#F2779E" }}></div></div>
            <p style={styles.sub}>Send this code to your person:</p>
            <div style={styles.codeBox} onClick={copyCode}>{roomCode} <span style={styles.copyHint}>{copied ? "copied!" : "tap to copy"}</span></div>
          </div>
        )}

        {joined && room && room.players.length === 2 && room.status === "picking" && !showQaSetup && (
          <div className="fadeUp">
            <div style={styles.center}>
              <div style={styles.eyebrow}>{isPicker ? "your pick" : "waiting"}</div>
              <h2 style={styles.h2}>{isPicker ? "What should we play?" : `${partner?.name} is choosing...`}</h2>
            </div>
            {isPicker ? (
              <div>
                {GAME_MENU.map((g) => (
                  <button key={g.key} className="menuCard" onClick={() => {
                    if (g.key === "qa") setShowQaSetup(true);
                    else if (g.key === "war") pickGame(buildWarGame(myId.current, partner.id));
                    else if (g.key === "twoTruths") pickGame(buildTwoTruthsGame(myId.current, myId.current, partner.id));
                    else if (g.key === "memory") pickGame(buildMemoryGame(myId.current, myId.current, partner.id));
                    else if (g.key === "heartHunt") pickGame(buildHeartHuntGame(myId.current));
                    else if (g.key === "goFish") pickGame(buildGoFishGame(myId.current, myId.current, partner.id));
                    else if (g.key === "crazyEights") pickGame(buildCrazyEightsGame(myId.current, myId.current, partner.id));
                    else if (g.key === "tonk") pickGame(buildTonkGame(myId.current, myId.current, partner.id));
                    else if (g.key === "deuces") pickGame(buildDeucesGame(myId.current, partner.id));
                    else if (g.key === "tictactoe") pickGame(buildTicTacToeGame(myId.current, myId.current, partner.id));
                    else if (g.key === "connectFour") pickGame(buildConnectFourGame(myId.current, myId.current, partner.id));
                    else if (g.key === "rps") pickGame(buildRPSGame());
                    else if (g.key === "hangman") pickGame(buildHangmanGame(myId.current, partner.id));
                    else if (g.key === "twentyQ") pickGame(buildTwentyQGame(myId.current, partner.id));
                  }} disabled={busy}>
                    <div style={{ fontWeight: 700, fontFamily: "'Fraunces', serif", fontSize: 17 }}>{g.label}</div>
                    <div style={{ fontSize: 12, color: "#8B7FA8", marginTop: 2 }}>{g.blurb}</div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="orbWrap"><div className="orb" style={{ background: "#F2779E", color: "#F2779E" }}></div><div className="orb" style={{ background: "#E8B85C", color: "#E8B85C", animationDelay: "0.4s" }}></div></div>
            )}
          </div>
        )}

        {joined && room && showQaSetup && (
          <div className="fadeUp">
            <div style={styles.center}><div style={styles.eyebrow}>Q&A setup</div><h2 style={styles.h2}>Pick your decks</h2></div>
            {DECKS.map((d) => (
              <button key={d.key} className={`optionRow ${qaSetupDecks.includes(d.key) ? "active" : ""}`}
                onClick={() => setQaSetupDecks((prev) => prev.includes(d.key) ? prev.filter((k) => k !== d.key) : [...prev, d.key])}>
                <span style={{ fontSize: 18 }}>{qaSetupDecks.includes(d.key) ? "●" : "○"}</span>
                <span><div style={{ fontWeight: 700, fontSize: 14 }}>{d.label}</div><div style={{ fontSize: 12, color: "#8B7FA8" }}>{d.blurb}</div></span>
              </button>
            ))}
            <button style={styles.primaryBtn} onClick={() => pickGame(buildQAGame(qaSetupDecks))} disabled={busy || qaSetupDecks.length === 0}>Begin</button>
            <button style={{ ...styles.primaryBtn, background: "transparent", border: "1px solid rgba(245,239,255,0.2)", color: "#C9BEE0", marginTop: 8 }} onClick={() => setShowQaSetup(false)}>Back</button>
          </div>
        )}

        {joined && room && room.status === "playing" && room.game?.type === "qa" && room.game.status !== "finished" && room.game.round && (() => {
          const g = room.game;
          const roundAnswers = g.round.answers || {};
          const iAnswered = roundAnswers[myId.current] !== undefined;
          const roundsPlayed = g.history?.length || 0;
          return (
            <div className="fadeUp">
              <div style={styles.roundMeta}>Round {roundsPlayed + 1} of {g.totalRounds} · {DECKS.find((d) => d.key === g.round.deck)?.label}</div>
              <h2 style={styles.prompt}>{g.round.promptText}</h2>
              {!g.round.revealed && !iAnswered && g.round.type === "options" && (
                <div style={styles.choiceRow}>
                  {g.round.options.map((opt, i) => (
                    <button key={opt.key} style={{ ...styles.choiceBtn, borderColor: OPT_COLORS[i % OPT_COLORS.length] }} onClick={() => qaSubmitAnswer(opt.key)} disabled={busy}>{opt.label}</button>
                  ))}
                </div>
              )}
              {!g.round.revealed && !iAnswered && g.round.type === "text" && (
                <div style={{ marginTop: 18 }}>
                  <input style={styles.input} value={textVal} onChange={(e) => setTextVal(e.target.value)} placeholder="Your answer..." maxLength={40} onKeyDown={(e) => e.key === "Enter" && textVal.trim() && qaSubmitAnswer(textVal)} />
                  <button style={{ ...styles.primaryBtn, marginTop: 12 }} onClick={() => qaSubmitAnswer(textVal)} disabled={busy || !textVal.trim()}>Submit answer</button>
                </div>
              )}
              {!g.round.revealed && !iAnswered && g.round.type === "number" && (
                <div style={{ marginTop: 18 }}>
                  <input type="number" style={styles.input} value={textVal} onChange={(e) => setTextVal(e.target.value)} placeholder="Your number..." onKeyDown={(e) => e.key === "Enter" && textVal !== "" && qaSubmitAnswer(textVal)} />
                  <button style={{ ...styles.primaryBtn, marginTop: 12 }} onClick={() => qaSubmitAnswer(textVal)} disabled={busy || textVal === ""}>Submit answer</button>
                </div>
              )}
              {!g.round.revealed && iAnswered && (
                <div style={styles.center}>
                  <div className="orbWrap"><div className="orb" style={{ background: "#F2779E", color: "#F2779E" }}></div><div className="orb" style={{ background: "#E8B85C", color: "#E8B85C", animationDelay: "0.4s" }}></div></div>
                  <p style={styles.sub}>Waiting on {partner ? partner.name : "your partner"}...</p>
                </div>
              )}
              {g.round.revealed && (
                <div style={styles.center} className="fadeUp">
                  <div className="orbWrap">
                    <div className={`orb ${g.round.match ? "match" : "nomatch"}`} style={{ background: "#F2779E", color: "#F2779E" }}></div>
                    <div className={`orb ${g.round.match ? "matchB" : "nomatchB"}`} style={{ background: "#E8B85C", color: "#E8B85C" }}></div>
                  </div>
                  {g.round.match ? <div className="heartPop" style={styles.matchText}>✦ In sync ✦</div> : <div style={styles.noMatchText}>Different, but now you both know</div>}
                  <div style={styles.answerPair}>
                    {room.players.map((p) => (<div key={p.id} style={styles.answerChip}><span style={styles.answerChipName}>{p.name}</span><span>{displayAnswer(g.round, roundAnswers[p.id])}</span></div>))}
                  </div>
                  <button style={styles.primaryBtn} onClick={qaNextRound} disabled={busy}>{roundsPlayed >= g.totalRounds ? "See results" : "Next round"}</button>
                </div>
              )}
            </div>
          );
        })()}

        {joined && room && room.status === "playing" && room.game?.type === "qa" && room.game.status === "finished" && (() => {
          const g = room.game;
          const historyList = g.history || [];
          return (
            <div className="fadeUp">
              <div style={styles.center}>
                <div style={styles.eyebrow}>results</div>
                <h2 style={styles.h2}>{g.matches} / {g.totalRounds} in sync</h2>
                <p style={styles.sub}>{g.matches >= g.totalRounds * 0.75 ? "Practically the same person." : g.matches >= g.totalRounds * 0.4 ? "A sweet mix of alike and different." : "Opposites, doing just fine."}</p>
              </div>
              <div style={styles.historyList}>
                {historyList.map((h, i) => (
                  <div key={i} style={styles.historyItem}>
                    <div style={styles.historyPrompt}>{h.match ? "✦" : "·"} {h.promptText}</div>
                    <div style={styles.historyAnswers}>{room.players.map((p) => (<span key={p.id} style={styles.historyAnswer}>{p.name}: {displayAnswer(h, (h.answers || {})[p.id])}</span>))}</div>
                  </div>
                ))}
              </div>
              <div style={styles.center}><button style={styles.primaryBtn} onClick={backToMenu} disabled={busy}>Back to menu</button></div>
            </div>
          );
        })()}

        {joined && room && room.status === "playing" && room.game?.type === "war" && (() => {
          const g = room.game;
          const flips = g.flips || {};
          const iFlipped = flips[myId.current] !== undefined;
          const myCount = g.cardCounts?.[myId.current] ?? 26;
          const theirCount = g.cardCounts?.[partner?.id] ?? 26;
          return (
            <div className="fadeUp">
              <div style={styles.center}>
                <div style={styles.eyebrow}>War</div>
                <p style={styles.sub}>You: {myCount} cards · {partner?.name}: {theirCount} cards</p>
              </div>
              {g.lastResult && (
                <div style={styles.center}>
                  {g.lastResult.cards && (
                    <div style={{ marginBottom: 12 }}>
                      <span className="cardFace" style={{ color: g.lastResult.cards[myId.current]?.red ? "#F2779E" : "#1B1035" }}>{cardLabel(g.lastResult.cards[myId.current])}</span>
                      <span className="cardFace" style={{ color: g.lastResult.cards[partner?.id]?.red ? "#F2779E" : "#1B1035" }}>{cardLabel(g.lastResult.cards[partner?.id])}</span>
                    </div>
                  )}
                  <p style={styles.sub}>
                    {g.lastResult.warHappened ? "War! " : ""}
                    {g.lastResult.winnerId === myId.current ? "You" : partner?.name} won {g.lastResult.cardsWon} cards
                  </p>
                </div>
              )}
              {g.phase === "active" && (
                <div style={styles.center}>
                  {!iFlipped ? (
                    <button style={styles.primaryBtn} onClick={flipWar} disabled={busy}>Flip!</button>
                  ) : (
                    <div>
                      <div style={{ marginBottom: 12 }}>
                        <span className="cardFace" style={{ color: flips[myId.current]?.red ? "#F2779E" : "#1B1035" }}>{cardLabel(flips[myId.current])}</span>
                      </div>
                      <div className="orbWrap"><div className="orb" style={{ background: "#F2779E", color: "#F2779E" }}></div><div className="orb" style={{ background: "#E8B85C", color: "#E8B85C", animationDelay: "0.4s" }}></div></div>
                      <p style={styles.sub}>Waiting on {partner?.name}...</p>
                    </div>
                  )}
                </div>
              )}
              {g.phase === "over" && (
                <div style={styles.center}>
                  <div className="heartPop" style={styles.matchText}>{g.overWinnerId === myId.current ? "You win!" : `${partner?.name} wins!`}</div>
                  <p style={styles.sub}>
                    Final count — You: {g.finalCounts?.[myId.current] ?? myCount} cards · {partner?.name}: {g.finalCounts?.[partner?.id] ?? theirCount} cards
                  </p>
                  <button style={styles.primaryBtn} onClick={backToMenu} disabled={busy}>Back to menu</button>
                </div>
              )}
              <div style={{ textAlign: "center", marginTop: 16 }}><button className="leaveLink" onClick={backToMenu} disabled={busy}>back to menu</button></div>
            </div>
          );
        })()}

        {joined && room && room.status === "playing" && room.game?.type === "twoTruths" && (() => {
          const g = room.game;
          const myTurn = g.turnPlayerId === myId.current;
          const scores = g.scores || {};
          return (
            <div className="fadeUp">
              <div style={styles.center}>
                <div style={styles.eyebrow}>Two Truths & a Lie</div>
                <p style={styles.sub}>Score — You: {scores[myId.current] || 0} · {partner?.name}: {scores[partner?.id] || 0}</p>
              </div>

              {g.phase === "writing" && myTurn && (
                <div>
                  <p style={styles.sub}>Write two true statements and one lie about yourself:</p>
                  {[0, 1, 2].map((i) => (
                    <input key={i} style={{ ...styles.input, marginBottom: 8 }} value={draftStatements[i]} placeholder={`Statement ${i + 1}`}
                      onChange={(e) => { const next = [...draftStatements]; next[i] = e.target.value; setDraftStatements(next); }} maxLength={80} />
                  ))}
                  <p style={{ ...styles.label, marginTop: 8 }}>Which one is the lie?</p>
                  {[0, 1, 2].map((i) => (
                    <button key={i} className={`optionRow ${draftLieIndex === i ? "active" : ""}`} onClick={() => setDraftLieIndex(i)}>
                      <span style={{ fontSize: 18 }}>{draftLieIndex === i ? "●" : "○"}</span><span>Statement {i + 1}</span>
                    </button>
                  ))}
                  <button style={styles.primaryBtn} onClick={() => { submitStatements(draftStatements, draftLieIndex); setDraftStatements(["", "", ""]); setDraftLieIndex(0); }}
                    disabled={busy || draftStatements.some((s) => !s.trim())}>Submit</button>
                </div>
              )}
              {g.phase === "writing" && !myTurn && (
                <div className="center" style={styles.center}>
                  <div className="orbWrap"><div className="orb" style={{ background: "#F2779E", color: "#F2779E" }}></div></div>
                  <p style={styles.sub}>Waiting for {partner?.name} to write their statements...</p>
                </div>
              )}
              {g.phase === "guessing" && !myTurn && (
                <div>
                  <p style={styles.sub}>Which one's the lie?</p>
                  {g.statements.map((s, i) => (
                    <button key={i} className="optionRow" onClick={() => submitGuess(i)} disabled={busy}>{s}</button>
                  ))}
                </div>
              )}
              {g.phase === "guessing" && myTurn && (
                <div style={styles.center}>
                  <div className="orbWrap"><div className="orb" style={{ background: "#E8B85C", color: "#E8B85C" }}></div></div>
                  <p style={styles.sub}>Waiting for {partner?.name} to guess...</p>
                </div>
              )}
              {g.phase === "revealed" && (
                <div>
                  {g.statements.map((s, i) => (
                    <div key={i} style={{ ...styles.answerChip, borderLeft: i === g.lieIndex ? "3px solid #F2779E" : "3px solid transparent", marginBottom: 8 }}>
                      <span>{s}</span>
                      <span style={{ color: i === g.lieIndex ? "#F2779E" : "#8FE3C0", fontSize: 12 }}>{i === g.lieIndex ? "the lie" : "true"}{i === g.guess ? " · guessed" : ""}</span>
                    </div>
                  ))}
                  <div style={styles.center}>
                    <p style={{ ...styles.matchText, fontStyle: "normal" }}>{g.guess === g.lieIndex ? "Caught it! ✦" : "Fooled you"}</p>
                    <button style={styles.primaryBtn} onClick={nextTruthsRound} disabled={busy}>Next round</button>
                  </div>
                </div>
              )}
              <div style={{ textAlign: "center", marginTop: 16 }}><button className="leaveLink" onClick={backToMenu} disabled={busy}>back to menu</button></div>
            </div>
          );
        })()}

        {joined && room && room.status === "playing" && room.game?.type === "memory" && (() => {
          const g = room.game;
          const flipped = g.flippedIndices || [];
          const scores = g.scores || {};
          const myTurn = g.turnPlayerId === myId.current;
          return (
            <div className="fadeUp">
              <div style={styles.center}>
                <div style={styles.eyebrow}>Memory Match</div>
                <p style={styles.sub}>You: {scores[myId.current] || 0} pairs · {partner?.name}: {scores[partner?.id] || 0} pairs</p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}>
                {g.board.map((cell, i) => {
                  const isFaceUp = cell.matched || flipped.includes(i);
                  const canTap = g.phase === "active" && myTurn && !g.resolution && !cell.matched && !flipped.includes(i) && flipped.length < 2;
                  return (
                    <button
                      key={i}
                      onClick={() => canTap && flipMemoryCard(i)}
                      disabled={!canTap}
                      style={{
                        aspectRatio: "1", borderRadius: 10, border: "1px solid rgba(245,239,255,0.15)",
                        background: isFaceUp ? "#F5EFFF" : "rgba(245,239,255,0.06)",
                        fontSize: 22, opacity: cell.matched ? 0.5 : 1,
                      }}
                    >
                      {isFaceUp ? cell.symbol : ""}
                    </button>
                  );
                })}
              </div>
              {g.phase === "active" && !g.resolution && (
                <p style={styles.sub}>{myTurn ? "Your turn — flip two cards" : `${partner?.name}'s turn`}</p>
              )}
              {g.resolution && (
                <div style={styles.center}>
                  <p style={styles.sub}>No match!</p>
                  <button style={styles.primaryBtn} onClick={continueMemory} disabled={busy}>Continue</button>
                </div>
              )}
              {g.phase === "over" && (
                <div style={styles.center}>
                  <div className="heartPop" style={styles.matchText}>
                    {g.overWinnerId === "tie" ? "It's a tie!" : g.overWinnerId === myId.current ? "You win!" : `${partner?.name} wins!`}
                  </div>
                  <button style={styles.primaryBtn} onClick={backToMenu} disabled={busy}>Back to menu</button>
                </div>
              )}
              {g.phase !== "over" && (
                <div style={{ textAlign: "center", marginTop: 16 }}><button className="leaveLink" onClick={backToMenu} disabled={busy}>back to menu</button></div>
              )}
            </div>
          );
        })()}

        {joined && room && room.status === "playing" && room.game?.type === "heartHunt" && (() => {
          const g = room.game;
          const placements = g.placements || {};
          const shotsAt = g.shotsAt || {};
          const iPlaced = placements[myId.current] !== undefined;
          const myTurn = g.turnPlayerId === myId.current;
          const myGridShots = shotsAt[myId.current] || [];
          const theirGridShots = partner ? (shotsAt[partner.id] || []) : [];

          if (g.phase === "placing" && !iPlaced) {
            return (
              <div className="fadeUp">
                <div style={styles.center}>
                  <div style={styles.eyebrow}>Heart Hunt</div>
                  <h2 style={styles.h2}>Hide 3 hearts on your grid</h2>
                  <p style={styles.sub}>{heartSelection.length}/3 selected</p>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6, marginBottom: 16 }}>
                  {Array.from({ length: 25 }).map((_, i) => {
                    const selected = heartSelection.includes(i);
                    return (
                      <button key={i}
                        onClick={() => setHeartSelection((prev) => {
                          if (prev.includes(i)) return prev.filter((x) => x !== i);
                          if (prev.length >= 3) return prev;
                          return [...prev, i];
                        })}
                        style={{ aspectRatio: "1", borderRadius: 8, border: selected ? "2px solid #E8B85C" : "1px solid rgba(245,239,255,0.15)", background: selected ? "rgba(232,184,92,0.15)" : "rgba(245,239,255,0.05)", fontSize: 18 }}
                      >{selected ? "💕" : ""}</button>
                    );
                  })}
                </div>
                <button style={styles.primaryBtn} onClick={() => placeHearts(heartSelection)} disabled={busy || heartSelection.length !== 3}>Confirm placement</button>
              </div>
            );
          }

          if (g.phase === "placing" && iPlaced) {
            return (
              <div style={styles.center} className="fadeUp">
                <div style={styles.eyebrow}>Heart Hunt</div>
                <div className="orbWrap"><div className="orb" style={{ background: "#F2779E", color: "#F2779E" }}></div></div>
                <p style={styles.sub}>Waiting for {partner?.name} to hide their hearts...</p>
              </div>
            );
          }

          if (g.phase === "battling" || g.phase === "over") {
            return (
              <div className="fadeUp">
                <div style={styles.center}>
                  <div style={styles.eyebrow}>Heart Hunt</div>
                  {g.phase === "battling" && <p style={styles.sub}>{myTurn ? "Your turn — take a shot" : `${partner?.name}'s turn`}</p>}
                </div>
                <p style={{ ...styles.label, marginBottom: 6 }}>{partner?.name}'s grid</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6, marginBottom: 16 }}>
                  {Array.from({ length: 25 }).map((_, i) => {
                    const shot = theirGridShots.find((s) => s.index === i);
                    const canFire = g.phase === "battling" && myTurn && !shot;
                    return (
                      <button key={i} onClick={() => canFire && partner && fireShot(partner.id, i)} disabled={!canFire}
                        style={{ aspectRatio: "1", borderRadius: 8, border: "1px solid rgba(245,239,255,0.15)", background: shot ? (shot.hit ? "rgba(242,119,158,0.25)" : "rgba(245,239,255,0.04)") : "rgba(245,239,255,0.08)", fontSize: 16 }}
                      >{shot ? (shot.hit ? "💔" : "·") : ""}</button>
                    );
                  })}
                </div>
                <p style={{ ...styles.label, marginBottom: 6 }}>Your grid</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6, marginBottom: 16 }}>
                  {Array.from({ length: 25 }).map((_, i) => {
                    const mine = (placements[myId.current] || []).includes(i);
                    const shot = myGridShots.find((s) => s.index === i);
                    return (
                      <div key={i} style={{ aspectRatio: "1", borderRadius: 8, border: "1px solid rgba(245,239,255,0.1)", background: "rgba(245,239,255,0.03)", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {shot ? (shot.hit ? "💔" : "·") : mine ? "💕" : ""}
                      </div>
                    );
                  })}
                </div>
                {g.phase === "over" && (
                  <div style={styles.center}>
                    <div className="heartPop" style={styles.matchText}>{g.overWinnerId === myId.current ? "You win!" : `${partner?.name} wins!`}</div>
                    <button style={styles.primaryBtn} onClick={backToMenu} disabled={busy}>Back to menu</button>
                  </div>
                )}
                {g.phase !== "over" && (
                  <div style={{ textAlign: "center" }}><button className="leaveLink" onClick={backToMenu} disabled={busy}>back to menu</button></div>
                )}
              </div>
            );
          }
          return null;
        })()}

        {joined && room && room.status === "playing" && room.game?.type === "goFish" && (() => {
          const g = room.game;
          const hands = g.hands || {};
          const myHand = hands[myId.current] || [];
          const books = g.books || {};
          const myBooks = books[myId.current] || [];
          const theirBooks = books[partner?.id] || [];
          const myTurn = g.turnPlayerId === myId.current;
          const uniqueRanks = [...new Set(myHand.map((c) => c.rank))];
          const rankCount = (r) => myHand.filter((c) => c.rank === r).length;
          return (
            <div className="fadeUp">
              <div style={styles.center}>
                <div style={styles.eyebrow}>Go Fish</div>
                <p style={styles.sub}>Books — You: {myBooks.length} · {partner?.name}: {theirBooks.length} · Pond: {(g.pond || []).length}</p>
                {g.lastAction && <p style={{ ...styles.sub, fontStyle: "italic" }}>{g.lastAction.askerId === myId.current ? "You" : partner?.name} {g.lastAction.text}</p>}
              </div>
              <p style={styles.label}>Your hand</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                {myHand.map((c, i) => (
                  <span key={i} className="cardFace" style={{ color: c.red ? "#F2779E" : "#1B1035", fontSize: 16, padding: "8px 10px" }}>{cardLabel(c)}</span>
                ))}
              </div>
              {myTurn ? (
                <div>
                  <p style={styles.sub}>Ask for a rank you're holding:</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {uniqueRanks.map((r) => (
                      <button key={r} className="optionRow" style={{ width: "auto", padding: "10px 16px" }} onClick={() => askForRank(r)} disabled={busy}>
                        {r}s ({rankCount(r)})
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={styles.center}>
                  <div className="orbWrap"><div className="orb" style={{ background: "#E8B85C", color: "#E8B85C" }}></div></div>
                  <p style={styles.sub}>{partner?.name}'s turn</p>
                </div>
              )}
              {g.phase === "over" && (
                <div style={styles.center}>
                  <div className="heartPop" style={styles.matchText}>{g.overWinnerId === myId.current ? "You win!" : `${partner?.name} wins!`}</div>
                  <button style={styles.primaryBtn} onClick={backToMenu} disabled={busy}>Back to menu</button>
                </div>
              )}
              {g.phase !== "over" && (
                <div style={{ textAlign: "center", marginTop: 16 }}><button className="leaveLink" onClick={backToMenu} disabled={busy}>back to menu</button></div>
              )}
            </div>
          );
        })()}

        {joined && room && room.status === "playing" && room.game?.type === "crazyEights" && (() => {
          const g = room.game;
          const hands = g.hands || {};
          const myHand = hands[myId.current] || [];
          const theirCount = (hands[partner?.id] || []).length;
          const myTurn = g.turnPlayerId === myId.current;
          const effectiveSuit = g.declaredSuit || g.discardTop.suit;
          const canPlay = (c) => c.rank === "8" || c.suit === effectiveSuit || c.rank === g.discardTop.rank;
          return (
            <div className="fadeUp">
              <div style={styles.center}>
                <div style={styles.eyebrow}>Crazy Eights</div>
                <p style={styles.sub}>{partner?.name}: {theirCount} cards · Draw pile: {(g.drawPile || []).length}</p>
                <span className="cardFace" style={{ color: g.discardTop.red ? "#F2779E" : "#1B1035" }}>{cardLabel(g.discardTop)}</span>
                {g.declaredSuit && <p style={{ ...styles.sub, marginTop: 8 }}>Called suit: {g.declaredSuit}</p>}
                {g.lastAction && <p style={{ ...styles.sub, fontStyle: "italic" }}>{g.lastAction.text}</p>}
              </div>

              {pendingEightIndex !== null ? (
                <div style={styles.center}>
                  <p style={styles.sub}>Pick a suit to call:</p>
                  <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
                    {SUITS.map((s) => (
                      <button key={s.s} className="optionRow" style={{ width: "auto", padding: "12px 16px", color: s.red ? "#F2779E" : "#F5EFFF" }} onClick={() => playEightsCard(pendingEightIndex, s.s)} disabled={busy}>{s.s}</button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <p style={styles.label}>Your hand</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                    {myHand.map((c, i) => (
                      <button key={i} className="cardFace" style={{ color: c.red ? "#F2779E" : "#1B1035", fontSize: 16, padding: "8px 10px", opacity: myTurn && canPlay(c) ? 1 : 0.35 }}
                        onClick={() => myTurn && canPlay(c) && (c.rank === "8" ? setPendingEightIndex(i) : playEightsCard(i, null))}
                        disabled={!myTurn || !canPlay(c) || busy}>
                        {cardLabel(c)}
                      </button>
                    ))}
                  </div>
                  {myTurn ? (
                    <div style={{ display: "flex", gap: 10 }}>
                      <button style={{ ...styles.primaryBtn, flex: 1 }} onClick={drawEightsCard} disabled={busy || (g.drawPile || []).length === 0}>Draw</button>
                      <button style={{ ...styles.primaryBtn, flex: 1, background: "transparent", border: "1px solid rgba(245,239,255,0.2)", color: "#C9BEE0" }} onClick={passEightsTurn} disabled={busy}>Pass</button>
                    </div>
                  ) : (
                    <div style={styles.center}>
                      <div className="orbWrap"><div className="orb" style={{ background: "#E8B85C", color: "#E8B85C" }}></div></div>
                      <p style={styles.sub}>{partner?.name}'s turn</p>
                    </div>
                  )}
                </>
              )}

              {g.phase === "over" && (
                <div style={styles.center}>
                  <div className="heartPop" style={styles.matchText}>{g.overWinnerId === myId.current ? "You win!" : `${partner?.name} wins!`}</div>
                  <button style={styles.primaryBtn} onClick={backToMenu} disabled={busy}>Back to menu</button>
                </div>
              )}
              {g.phase !== "over" && (
                <div style={{ textAlign: "center", marginTop: 16 }}><button className="leaveLink" onClick={backToMenu} disabled={busy}>back to menu</button></div>
              )}
            </div>
          );
        })()}

        {joined && room && room.status === "playing" && room.game?.type === "tonk" && (() => {
          const g = room.game;
          const hands = g.hands || {};
          const myHand = hands[myId.current] || [];
          const melds = g.melds || {};
          const myMelds = melds[myId.current] || [];
          const theirMelds = melds[partner?.id] || [];
          const theirCount = (hands[partner?.id] || []).length;
          const myTurn = g.turnPlayerId === myId.current;
          const discardTop = (g.discardPile || [])[0];
          const myVal = tonkHandValue(myHand);
          const selectedCards = tonkSelection.map((i) => myHand[i]).filter(Boolean);
          const meldValid = selectedCards.length >= 3 && isValidTonkMeld(selectedCards);
          return (
            <div className="fadeUp">
              <div style={styles.center}>
                <div style={styles.eyebrow}>Tonk</div>
                <p style={styles.sub}>{partner?.name}: {theirCount} cards · Pile: {(g.drawPile || []).length} · Your hand value: {myVal}</p>
                {discardTop && <span className="cardFace" style={{ color: discardTop.red ? "#F2779E" : "#1B1035" }}>{cardLabel(discardTop)}</span>}
                {g.lastAction && <p style={{ ...styles.sub, fontStyle: "italic", marginTop: 8 }}>{g.lastAction.text}</p>}
              </div>

              {(myMelds.length > 0 || theirMelds.length > 0) && (
                <div style={{ marginBottom: 16 }}>
                  {myMelds.map((meld, mi) => (
                    <div key={`m${mi}`} style={{ marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: "#8B7FA8" }}>your meld: </span>
                      {meld.map((c, ci) => <span key={ci} className="cardFace" style={{ fontSize: 13, padding: "4px 8px", color: c.red ? "#F2779E" : "#1B1035" }}>{cardLabel(c)}</span>)}
                    </div>
                  ))}
                  {theirMelds.map((meld, mi) => (
                    <div key={`t${mi}`} style={{ marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: "#8B7FA8" }}>{partner?.name}'s meld: </span>
                      {meld.map((c, ci) => <span key={ci} className="cardFace" style={{ fontSize: 13, padding: "4px 8px", color: c.red ? "#F2779E" : "#1B1035" }}>{cardLabel(c)}</span>)}
                    </div>
                  ))}
                </div>
              )}

              <p style={styles.label}>Your hand (tap to select)</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                {myHand.map((c, i) => (
                  <button key={i} className="cardFace" style={{ color: c.red ? "#F2779E" : "#1B1035", fontSize: 16, padding: "8px 10px", border: tonkSelection.includes(i) ? "2px solid #E8B85C" : "2px solid transparent" }}
                    onClick={() => setTonkSelection((prev) => prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i])} disabled={!myTurn || g.stage !== "act" || busy}>
                    {cardLabel(c)}
                  </button>
                ))}
              </div>

              {myTurn && g.stage === "draw" && (
                <div style={{ display: "flex", gap: 10 }}>
                  <button style={{ ...styles.primaryBtn, flex: 1 }} onClick={drawStock} disabled={busy || (g.drawPile || []).length === 0}>Draw from pile</button>
                  <button style={{ ...styles.primaryBtn, flex: 1, background: "transparent", border: "1px solid rgba(245,239,255,0.2)", color: "#C9BEE0" }} onClick={drawDiscardTonk} disabled={busy || !discardTop}>Take {discardTop ? cardLabel(discardTop) : ""}</button>
                </div>
              )}
              {myTurn && g.stage === "act" && (
                <div>
                  <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                    <button style={{ ...styles.primaryBtn, flex: 1 }} onClick={() => layMeld(tonkSelection)} disabled={busy || !meldValid}>Lay meld</button>
                    <button style={{ ...styles.primaryBtn, flex: 1, background: "transparent", border: "1px solid rgba(245,239,255,0.2)", color: "#C9BEE0" }} onClick={() => tonkSelection.length === 1 && discardTonk(tonkSelection[0])} disabled={busy || tonkSelection.length !== 1}>Discard selected</button>
                  </div>
                  <button style={{ ...styles.primaryBtn, background: "transparent", border: "1px solid #E8B85C", color: "#E8B85C" }} onClick={knockTonk} disabled={busy || myVal > 10}>Knock ({myVal <= 10 ? "eligible" : `need ≤10, have ${myVal}`})</button>
                </div>
              )}
              {!myTurn && g.phase === "active" && (
                <div style={styles.center}>
                  <div className="orbWrap"><div className="orb" style={{ background: "#E8B85C", color: "#E8B85C" }}></div></div>
                  <p style={styles.sub}>{partner?.name}'s turn</p>
                </div>
              )}

              {g.phase === "over" && (
                <div style={styles.center}>
                  <div className="heartPop" style={styles.matchText}>{g.overWinnerId === "tie" ? "It's a tie!" : g.overWinnerId === myId.current ? "You win!" : `${partner?.name} wins!`}</div>
                  {g.finalValues && <p style={styles.sub}>Final — You: {g.finalValues[myId.current]} · {partner?.name}: {g.finalValues[partner?.id]}</p>}
                  <button style={styles.primaryBtn} onClick={backToMenu} disabled={busy}>Back to menu</button>
                </div>
              )}
              {g.phase !== "over" && (
                <div style={{ textAlign: "center", marginTop: 16 }}><button className="leaveLink" onClick={backToMenu} disabled={busy}>back to menu</button></div>
              )}
            </div>
          );
        })()}

        {joined && room && room.status === "playing" && room.game?.type === "deuces" && (() => {
          const g = room.game;
          const kept = g.kept || {};
          const iReady = kept[myId.current] !== undefined;
          const myHand = (g.hands || {})[myId.current] || [];
          const results = g.results || {};
          return (
            <div className="fadeUp">
              <div style={styles.center}>
                <div style={styles.eyebrow}>Deuces Wild</div>
                <p style={styles.sub}>Deal 5, swap what you want once, 2s are wild.</p>
              </div>

              {g.phase === "drawing" && (
                <div>
                  <p style={styles.label}>{iReady ? "Your hand (waiting on partner)" : "Tap cards to swap out, then confirm"}</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                    {myHand.map((c, i) => (
                      <button key={i} className="cardFace" style={{ color: c.red ? "#F2779E" : "#1B1035", fontSize: 16, padding: "8px 10px", border: deucesSelection.includes(i) ? "2px solid #E8B85C" : "2px solid transparent" }}
                        onClick={() => !iReady && setDeucesSelection((prev) => prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i])} disabled={iReady || busy}>
                        {cardLabel(c)}
                      </button>
                    ))}
                  </div>
                  {!iReady ? (
                    <button style={styles.primaryBtn} onClick={() => submitDeucesDraw(deucesSelection)} disabled={busy}>Confirm ({deucesSelection.length} to swap)</button>
                  ) : (
                    <div style={styles.center}>
                      <div className="orbWrap"><div className="orb" style={{ background: "#F2779E", color: "#F2779E" }}></div></div>
                      <p style={styles.sub}>Waiting for {partner?.name}...</p>
                    </div>
                  )}
                </div>
              )}

              {g.phase === "revealed" && (
                <div>
                  {room.players.map((p) => (
                    <div key={p.id} style={{ marginBottom: 14 }}>
                      <p style={{ ...styles.label, marginBottom: 6 }}>{p.id === myId.current ? "You" : p.name} — {results[p.id]?.rankLabel}</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {((g.hands || {})[p.id] || []).map((c, i) => (
                          <span key={i} className="cardFace" style={{ color: c.red ? "#F2779E" : "#1B1035", fontSize: 16, padding: "8px 10px" }}>{cardLabel(c)}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div style={styles.center}>
                    <div className="heartPop" style={styles.matchText}>{results.winnerId === "tie" ? "It's a tie!" : results.winnerId === myId.current ? "You win!" : `${partner?.name} wins!`}</div>
                    <button style={styles.primaryBtn} onClick={() => pickGame(buildDeucesGame(myId.current, partner.id))} disabled={busy}>Deal again</button>
                  </div>
                </div>
              )}
              <div style={{ textAlign: "center", marginTop: 16 }}><button className="leaveLink" onClick={backToMenu} disabled={busy}>back to menu</button></div>
            </div>
          );
        })()}

        {joined && room && room.status === "playing" && room.game?.type === "tictactoe" && (() => {
          const g = room.game;
          const board = g.board || Array(9).fill("");
          const myTurn = g.turnPlayerId === myId.current;
          const mySymbol = g.symbols?.[myId.current];
          return (
            <div className="fadeUp">
              <div style={styles.center}>
                <div style={styles.eyebrow}>Tic Tac Toe</div>
                <p style={styles.sub}>You're {mySymbol} · {partner?.name} is {g.symbols?.[partner?.id]}</p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16, maxWidth: 240, marginLeft: "auto", marginRight: "auto" }}>
                {board.map((cell, i) => (
                  <button key={i} onClick={() => myTurn && !cell && g.phase === "active" && playTicTacToe(i)} disabled={!myTurn || !!cell || g.phase !== "active" || busy}
                    style={{ aspectRatio: "1", borderRadius: 10, border: g.winLine?.includes(i) ? "2px solid #E8B85C" : "1px solid rgba(245,239,255,0.15)", background: g.winLine?.includes(i) ? "rgba(232,184,92,0.15)" : "rgba(245,239,255,0.05)", fontSize: 28, color: "#F5EFFF", fontWeight: 700 }}>
                    {cell}
                  </button>
                ))}
              </div>
              {g.phase === "active" && (
                <p style={styles.sub}>{myTurn ? "Your turn" : `${partner?.name}'s turn`}</p>
              )}
              {g.phase === "over" && (
                <div style={styles.center}>
                  <div className="heartPop" style={styles.matchText}>{g.overWinnerId === "tie" ? "It's a tie!" : g.overWinnerId === myId.current ? "You win!" : `${partner?.name} wins!`}</div>
                  <button style={styles.primaryBtn} onClick={backToMenu} disabled={busy}>Back to menu</button>
                </div>
              )}
              {g.phase !== "over" && (
                <div style={{ textAlign: "center", marginTop: 16 }}><button className="leaveLink" onClick={backToMenu} disabled={busy}>back to menu</button></div>
              )}
            </div>
          );
        })()}

        {joined && room && room.status === "playing" && room.game?.type === "connectFour" && (() => {
          const g = room.game;
          const board = g.board || Array(42).fill("");
          const myTurn = g.turnPlayerId === myId.current;
          const mySymbol = g.symbols?.[myId.current];
          return (
            <div className="fadeUp">
              <div style={styles.center}>
                <div style={styles.eyebrow}>Connect Four</div>
                <p style={styles.sub}>You're {mySymbol} · {partner?.name} is {g.symbols?.[partner?.id]}</p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 8 }}>
                {Array.from({ length: 7 }).map((_, col) => (
                  <button key={col} onClick={() => myTurn && g.phase === "active" && playConnectFour(col)} disabled={!myTurn || g.phase !== "active" || busy || board[col] !== ""}
                    style={{ padding: "6px 0", borderRadius: 8, border: "1px solid rgba(245,239,255,0.2)", background: "rgba(245,239,255,0.06)", color: "#E8B85C", fontSize: 14 }}>▼</button>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 16 }}>
                {board.map((cell, i) => (
                  <div key={i} style={{ aspectRatio: "1", borderRadius: "50%", border: "1px solid rgba(245,239,255,0.15)", background: "rgba(245,239,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{cell}</div>
                ))}
              </div>
              {g.phase === "active" && (<p style={styles.sub}>{myTurn ? "Your turn" : `${partner?.name}'s turn`}</p>)}
              {g.phase === "over" && (
                <div style={styles.center}>
                  <div className="heartPop" style={styles.matchText}>{g.overWinnerId === "tie" ? "It's a tie!" : g.overWinnerId === myId.current ? "You win!" : `${partner?.name} wins!`}</div>
                  <button style={styles.primaryBtn} onClick={backToMenu} disabled={busy}>Back to menu</button>
                </div>
              )}
              {g.phase !== "over" && (
                <div style={{ textAlign: "center", marginTop: 16 }}><button className="leaveLink" onClick={backToMenu} disabled={busy}>back to menu</button></div>
              )}
            </div>
          );
        })()}

        {joined && room && room.status === "playing" && room.game?.type === "rps" && (() => {
          const g = room.game;
          const choices = g.choices || {};
          const iChose = choices[myId.current] !== undefined;
          const RPS_EMOJI = { rock: "🪨", paper: "📄", scissors: "✂️" };
          return (
            <div className="fadeUp">
              <div style={styles.center}>
                <div style={styles.eyebrow}>Rock Paper Scissors</div>
                <p style={styles.sub}>Round {(g.roundNum || 0) + 1}</p>
              </div>
              {g.lastResult && (
                <div style={styles.center}>
                  <p>
                    <span className="cardFace" style={{ fontSize: 28 }}>{RPS_EMOJI[g.lastResult[myId.current]]}</span>
                    <span style={{ margin: "0 10px", color: "#8B7FA8" }}>vs</span>
                    <span className="cardFace" style={{ fontSize: 28 }}>{RPS_EMOJI[g.lastResult[partner?.id]]}</span>
                  </p>
                  <p style={styles.sub}>{g.lastResult.winnerId === "tie" ? "Tie!" : g.lastResult.winnerId === myId.current ? "You won that round!" : `${partner?.name} won that round!`}</p>
                </div>
              )}
              {!iChose ? (
                <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
                  {["rock", "paper", "scissors"].map((c) => (
                    <button key={c} className="optionRow" style={{ width: "auto", padding: "16px 20px", fontSize: 24 }} onClick={() => playRPS(c)} disabled={busy}>{RPS_EMOJI[c]}</button>
                  ))}
                </div>
              ) : (
                <div style={styles.center}>
                  <div className="orbWrap"><div className="orb" style={{ background: "#F2779E", color: "#F2779E" }}></div></div>
                  <p style={styles.sub}>Waiting for {partner?.name}...</p>
                </div>
              )}
              <div style={{ textAlign: "center", marginTop: 16 }}><button className="leaveLink" onClick={backToMenu} disabled={busy}>back to menu</button></div>
            </div>
          );
        })()}

        {joined && room && room.status === "playing" && room.game?.type === "hangman" && (() => {
          const g = room.game;
          const iAmSetter = g.setterId === myId.current;
          const guessedLetters = g.guessedLetters || [];
          const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
          const displayWord = g.word ? g.word.split("").map((ch) => (ch === " " ? " " : guessedLetters.includes(ch) || g.phase === "over" ? ch : "_")).join(" ") : "";
          const livesLeft = 6 - (g.wrongCount || 0);
          return (
            <div className="fadeUp">
              <div style={styles.center}><div style={styles.eyebrow}>Hangman</div></div>
              {g.phase === "setting" && iAmSetter && (
                <div>
                  <p style={styles.sub}>Think of a secret word or phrase for {partner?.name} to guess:</p>
                  <input style={styles.input} value={hangmanWordInput} onChange={(e) => setHangmanWordInput(e.target.value)} placeholder="Type your secret..." maxLength={40} />
                  <button style={{ ...styles.primaryBtn, marginTop: 12 }} onClick={() => setHangmanWord(hangmanWordInput)} disabled={busy || !hangmanWordInput.trim()}>Lock it in</button>
                </div>
              )}
              {g.phase === "setting" && !iAmSetter && (
                <div style={styles.center}>
                  <div className="orbWrap"><div className="orb" style={{ background: "#F2779E", color: "#F2779E" }}></div></div>
                  <p style={styles.sub}>Waiting for {partner?.name} to pick a word...</p>
                </div>
              )}
              {(g.phase === "guessing" || g.phase === "over") && (
                <div>
                  <div style={styles.center}>
                    <p style={{ fontSize: 26, letterSpacing: "0.1em", fontFamily: "'JetBrains Mono', monospace", color: "#F5EFFF", marginBottom: 12 }}>{displayWord}</p>
                    <p style={styles.sub}>{"💗".repeat(Math.max(livesLeft, 0))}{"🖤".repeat(6 - Math.max(livesLeft, 0))}</p>
                  </div>
                  {g.phase === "guessing" && !iAmSetter && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", marginBottom: 16 }}>
                      {alphabet.map((l) => (
                        <button key={l} onClick={() => guessHangmanLetter(l)} disabled={busy || guessedLetters.includes(l)}
                          style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid rgba(245,239,255,0.2)", background: guessedLetters.includes(l) ? "rgba(245,239,255,0.03)" : "rgba(245,239,255,0.08)", color: guessedLetters.includes(l) ? "#8B7FA8" : "#F5EFFF", fontSize: 13 }}>
                          {l}
                        </button>
                      ))}
                    </div>
                  )}
                  {g.phase === "guessing" && iAmSetter && (
                    <div style={styles.center}>
                      <div className="orbWrap"><div className="orb" style={{ background: "#E8B85C", color: "#E8B85C" }}></div></div>
                      <p style={styles.sub}>{partner?.name} is guessing...</p>
                    </div>
                  )}
                  {g.phase === "over" && (
                    <div style={styles.center}>
                      <div className="heartPop" style={styles.matchText}>{g.overResult === "won" ? (iAmSetter ? `${partner?.name} got it!` : "You got it!") : iAmSetter ? "You stumped them!" : "Out of hearts!"}</div>
                      <button style={styles.primaryBtn} onClick={backToMenu} disabled={busy}>Back to menu</button>
                    </div>
                  )}
                </div>
              )}
              {g.phase !== "over" && (
                <div style={{ textAlign: "center", marginTop: 16 }}><button className="leaveLink" onClick={backToMenu} disabled={busy}>back to menu</button></div>
              )}
            </div>
          );
        })()}

        {joined && room && room.status === "playing" && room.game?.type === "twentyQ" && (() => {
          const g = room.game;
          const iAmChooser = g.chooserId === myId.current;
          const log = g.log || [];
          return (
            <div className="fadeUp">
              <div style={styles.center}>
                <div style={styles.eyebrow}>20 Questions</div>
                {g.phase === "playing" && <p style={styles.sub}>{g.questionCount || 0} / 20 questions asked</p>}
              </div>
              {g.phase === "choosing" && iAmChooser && (
                <div>
                  <p style={styles.sub}>Think of something for {partner?.name} to guess:</p>
                  <input style={styles.input} value={secretInput} onChange={(e) => setSecretInput(e.target.value)} placeholder="Type your secret..." maxLength={60} />
                  <button style={{ ...styles.primaryBtn, marginTop: 12 }} onClick={() => setTwentyQSecret(secretInput)} disabled={busy || !secretInput.trim()}>Lock it in</button>
                </div>
              )}
              {g.phase === "choosing" && !iAmChooser && (
                <div style={styles.center}>
                  <div className="orbWrap"><div className="orb" style={{ background: "#F2779E", color: "#F2779E" }}></div></div>
                  <p style={styles.sub}>Waiting for {partner?.name} to think of something...</p>
                </div>
              )}
              {(g.phase === "playing" || g.phase === "over") && (
                <div>
                  {log.length > 0 && (
                    <div style={{ ...styles.historyList, maxHeight: 200, overflowY: "auto" }}>
                      {log.map((entry, i) => (
                        <div key={i} style={styles.historyItem}>
                          <div style={styles.historyPrompt}>{entry.question}</div>
                          <div style={{ color: "#E8B85C", fontSize: 12 }}>{entry.answer}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {g.phase === "playing" && !iAmChooser && !g.pendingQuestion && !g.pendingGuess && (
                    <div>
                      <input style={styles.input} value={questionInput} onChange={(e) => setQuestionInput(e.target.value)} placeholder="Ask a yes/no question..." maxLength={100} />
                      <button style={{ ...styles.primaryBtn, marginTop: 8 }} onClick={() => askTwentyQ(questionInput)} disabled={busy || !questionInput.trim()}>Ask</button>
                      <input style={{ ...styles.input, marginTop: 16 }} value={guessInput} onChange={(e) => setGuessInput(e.target.value)} placeholder="Or make your final guess..." maxLength={60} />
                      <button style={{ ...styles.primaryBtn, marginTop: 8, background: "transparent", border: "1px solid #E8B85C", color: "#E8B85C" }} onClick={() => submitTwentyQGuess(guessInput)} disabled={busy || !guessInput.trim()}>Guess</button>
                    </div>
                  )}
                  {g.phase === "playing" && iAmChooser && g.pendingQuestion && (
                    <div style={styles.center}>
                      <p style={styles.prompt}>{g.pendingQuestion}</p>
                      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                        {["Yes", "No", "Maybe"].map((a) => (
                          <button key={a} className="optionRow" style={{ width: "auto", padding: "10px 18px" }} onClick={() => answerTwentyQ(a)} disabled={busy}>{a}</button>
                        ))}
                      </div>
                    </div>
                  )}
                  {g.phase === "playing" && iAmChooser && g.pendingGuess && (
                    <div style={styles.center}>
                      <p style={styles.sub}>{partner?.name} guesses: <strong style={{ color: "#F5EFFF" }}>{g.pendingGuess}</strong></p>
                      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                        <button className="optionRow" style={{ width: "auto", padding: "10px 18px" }} onClick={() => confirmTwentyQGuess(true)} disabled={busy}>Correct!</button>
                        <button className="optionRow" style={{ width: "auto", padding: "10px 18px" }} onClick={() => confirmTwentyQGuess(false)} disabled={busy}>Nope</button>
                      </div>
                    </div>
                  )}
                  {g.phase === "playing" && iAmChooser && !g.pendingQuestion && !g.pendingGuess && (
                    <div style={styles.center}>
                      <div className="orbWrap"><div className="orb" style={{ background: "#E8B85C", color: "#E8B85C" }}></div></div>
                      <p style={styles.sub}>Waiting for {partner?.name}'s next move...</p>
                    </div>
                  )}
                  {g.phase === "playing" && !iAmChooser && (g.pendingQuestion || g.pendingGuess) && (
                    <div style={styles.center}>
                      <div className="orbWrap"><div className="orb" style={{ background: "#F2779E", color: "#F2779E" }}></div></div>
                      <p style={styles.sub}>Waiting for {partner?.name} to respond...</p>
                    </div>
                  )}
                  {g.phase === "over" && (
                    <div style={styles.center}>
                      <p style={styles.sub}>It was: <strong style={{ color: "#F5EFFF" }}>{g.secret}</strong></p>
                      <div className="heartPop" style={styles.matchText}>{g.overResult === "won" ? (iAmChooser ? `${partner?.name} got it!` : "You got it!") : iAmChooser ? "You stumped them!" : "Out of questions!"}</div>
                      <button style={styles.primaryBtn} onClick={backToMenu} disabled={busy}>Back to menu</button>
                    </div>
                  )}
                </div>
              )}
              {g.phase !== "over" && (
                <div style={{ textAlign: "center", marginTop: 16 }}><button className="leaveLink" onClick={backToMenu} disabled={busy}>back to menu</button></div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "linear-gradient(160deg, #1B1035 0%, #241645 55%, #1B1035 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", position: "relative", overflow: "hidden", fontFamily: "'Manrope', sans-serif" },
  card: { position: "relative", zIndex: 1, width: "100%", maxWidth: 420, background: "rgba(35, 22, 66, 0.92)", border: "1px solid rgba(245, 239, 255, 0.1)", borderRadius: 24, padding: "32px 28px", boxShadow: "0 20px 60px rgba(0,0,0,0.35)" },
  eyebrow: { fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "#E8B85C", marginBottom: 8 },
  h1: { fontFamily: "'Fraunces', serif", fontStyle: "italic", fontWeight: 500, fontSize: 40, color: "#F5EFFF", margin: "0 0 10px 0" },
  h2: { fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 26, color: "#F5EFFF", margin: "0 0 10px 0", textAlign: "center" },
  sub: { color: "#C9BEE0", fontSize: 15, lineHeight: 1.5, margin: "0 0 20px 0", textAlign: "center" },
  field: { marginBottom: 16, textAlign: "left" },
  label: { display: "block", fontSize: 12, color: "#C9BEE0", marginBottom: 6, fontWeight: 600 },
  input: { width: "100%", padding: "13px 14px", borderRadius: 12, border: "1px solid rgba(245,239,255,0.18)", background: "rgba(245,239,255,0.06)", color: "#F5EFFF", fontSize: 16, fontFamily: "'Manrope', sans-serif" },
  primaryBtn: { width: "100%", padding: "14px 16px", borderRadius: 12, border: "none", background: "linear-gradient(135deg, #F2779E, #E8B85C)", color: "#1B1035", fontWeight: 700, fontSize: 15, marginTop: 4 },
  hint: { marginTop: 14, fontSize: 12, color: "#8B7FA8", textAlign: "center" },
  scoreboardBar: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: "#F5EFFF",
    background: "rgba(232,184,92,0.08)", border: "1px solid rgba(232,184,92,0.25)",
    borderRadius: 999, padding: "8px 16px", marginBottom: 16,
  },
  error: { color: "#F2779E", fontSize: 13, marginBottom: 12, textAlign: "center" },
  center: { textAlign: "center" },
  codeBox: { fontFamily: "'JetBrains Mono', monospace", fontSize: 24, letterSpacing: "0.15em", color: "#F5EFFF", background: "rgba(245,239,255,0.08)", border: "1px dashed rgba(232,184,92,0.5)", borderRadius: 14, padding: "16px", cursor: "pointer" },
  copyHint: { display: "block", fontFamily: "'Manrope', sans-serif", fontSize: 11, letterSpacing: "normal", color: "#8B7FA8", marginTop: 6 },
  roundMeta: { fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#8B7FA8", textAlign: "center", marginBottom: 6 },
  prompt: { fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 24, color: "#F5EFFF", textAlign: "center", margin: "0 0 22px 0", lineHeight: 1.3 },
  choiceRow: { display: "flex", flexDirection: "column", gap: 12 },
  choiceBtn: { padding: "16px", borderRadius: 14, border: "2px solid", background: "rgba(245,239,255,0.05)", color: "#F5EFFF", fontSize: 15, fontWeight: 600 },
  matchText: { fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 20, color: "#E8B85C", margin: "6px 0 18px 0" },
  noMatchText: { color: "#C9BEE0", fontSize: 14, margin: "6px 0 18px 0" },
  answerPair: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 },
  answerChip: { background: "rgba(245,239,255,0.06)", borderRadius: 10, padding: "10px 14px", display: "flex", justifyContent: "space-between", fontSize: 14, color: "#F5EFFF" },
  answerChipName: { color: "#8B7FA8", fontWeight: 600 },
  historyList: { display: "flex", flexDirection: "column", gap: 10, margin: "20px 0" },
  historyItem: { background: "rgba(245,239,255,0.05)", borderRadius: 12, padding: "12px 14px" },
  historyPrompt: { color: "#F5EFFF", fontSize: 13, fontWeight: 600, marginBottom: 4 },
  historyAnswers: { display: "flex", gap: 12, flexWrap: "wrap" },
  historyAnswer: { color: "#C9BEE0", fontSize: 12 },
};
