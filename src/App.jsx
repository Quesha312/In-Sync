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
  const newFlips = { ...flips, [myId]: true };
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
  return {
    ...latest,
    game: {
      ...g,
      hands,
      cardCounts,
      flips: {},
      lastResult: { winnerId: result.winnerId, cardsWon: result.pot.length, cards: result.cards || null, warHappened: result.pot.length > 2 },
      phase: over ? "over" : "active",
      overWinnerId: over ? (cardCounts[p1id] > 0 ? p1id : p2id) : null,
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

const GAME_MENU = [
  { key: "qa", label: "In Sync Q&A", blurb: "See how many answers line up" },
  { key: "war", label: "War", blurb: "Flip cards, highest wins the pot" },
  { key: "twoTruths", label: "Two Truths & a Lie", blurb: "One of you fibs, the other guesses" },
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
                      <div className="orbWrap"><div className="orb" style={{ background: "#F2779E", color: "#F2779E" }}></div><div className="orb" style={{ background: "#E8B85C", color: "#E8B85C", animationDelay: "0.4s" }}></div></div>
                      <p style={styles.sub}>Waiting on {partner?.name}...</p>
                    </div>
                  )}
                </div>
              )}
              {g.phase === "over" && (
                <div style={styles.center}>
                  <div className="heartPop" style={styles.matchText}>{g.overWinnerId === myId.current ? "You win!" : `${partner?.name} wins!`}</div>
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
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "linear-gradient(160deg, #1B1035 0%, #241645 55%, #1B1035 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", position: "relative", overflow: "hidden", fontFamily: "'Manrope', sans-serif" },
  card: { position: "relative", zIndex: 1, width: "100%", maxWidth: 420, background: "rgba(42, 27, 77, 0.65)", backdropFilter: "blur(14px)", border: "1px solid rgba(245, 239, 255, 0.1)", borderRadius: 24, padding: "32px 28px", boxShadow: "0 20px 60px rgba(0,0,0,0.35)" },
  eyebrow: { fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "#E8B85C", marginBottom: 8 },
  h1: { fontFamily: "'Fraunces', serif", fontStyle: "italic", fontWeight: 500, fontSize: 40, color: "#F5EFFF", margin: "0 0 10px 0" },
  h2: { fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 26, color: "#F5EFFF", margin: "0 0 10px 0", textAlign: "center" },
  sub: { color: "#C9BEE0", fontSize: 15, lineHeight: 1.5, margin: "0 0 20px 0", textAlign: "center" },
  field: { marginBottom: 16, textAlign: "left" },
  label: { display: "block", fontSize: 12, color: "#C9BEE0", marginBottom: 6, fontWeight: 600 },
  input: { width: "100%", padding: "13px 14px", borderRadius: 12, border: "1px solid rgba(245,239,255,0.18)", background: "rgba(245,239,255,0.06)", color: "#F5EFFF", fontSize: 15, fontFamily: "'Manrope', sans-serif" },
  primaryBtn: { width: "100%", padding: "14px 16px", borderRadius: 12, border: "none", background: "linear-gradient(135deg, #F2779E, #E8B85C)", color: "#1B1035", fontWeight: 700, fontSize: 15, marginTop: 4 },
  hint: { marginTop: 14, fontSize: 12, color: "#8B7FA8", textAlign: "center" },
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
