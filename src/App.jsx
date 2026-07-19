import React, { useState, useEffect, useRef, useCallback } from "react";
import { updateRoom, subscribeToRoom } from "./firebase";

const TOTAL_ROUNDS = 8;
const OPT_COLORS = ["#F2779E", "#E8B85C", "#8FE3C0", "#9B8CFF"];

const THIS_OR_THAT = [
  { id: "c1", category: "This or That", text: "Our ideal Friday night is...", options: [{ key: "A", label: "Cozy night in" }, { key: "B", label: "Adventure out" }] },
  { id: "c2", category: "This or That", text: "If we got a pet today, it'd be...", options: [{ key: "A", label: "A dog" }, { key: "B", label: "A cat" }] },
  { id: "c3", category: "This or That", text: "Best way to spend a rainy afternoon", options: [{ key: "A", label: "Reading together" }, { key: "B", label: "Movie marathon" }] },
  { id: "c4", category: "This or That", text: "Dream vacation vibe", options: [{ key: "A", label: "Mountains" }, { key: "B", label: "Beach" }] },
  { id: "c5", category: "This or That", text: "Worth splurging on", options: [{ key: "A", label: "Fancy dinner" }, { key: "B", label: "Weekend getaway" }] },
  { id: "c6", category: "This or That", text: "Us, as a couple, are more...", options: [{ key: "A", label: "Morning people" }, { key: "B", label: "Night owls" }] },
  { id: "c7", category: "This or That", text: "Ideal home vibe", options: [{ key: "A", label: "Minimal & tidy" }, { key: "B", label: "Cozy & cluttered" }] },
  { id: "c8", category: "This or That", text: "Perfect Sunday", options: [{ key: "A", label: "Sleep in late" }, { key: "B", label: "Early adventure" }] },
  { id: "c9", category: "This or That", text: "Road trip soundtrack", options: [{ key: "A", label: "Sing-along pop" }, { key: "B", label: "Chill lo-fi" }] },
  { id: "c10", category: "This or That", text: "Dream anniversary", options: [{ key: "A", label: "Big party" }, { key: "B", label: "Just us two" }] },
  { id: "c11", category: "This or That", text: "Comfort food craving", options: [{ key: "A", label: "Pizza" }, { key: "B", label: "Ramen" }] },
  { id: "c12", category: "This or That", text: "When we disagree, we'd rather...", options: [{ key: "A", label: "Talk it out now" }, { key: "B", label: "Cool off first" }] },
  { id: "c13", category: "This or That", text: "Our future pet's name should be...", options: [{ key: "A", label: "A proper name" }, { key: "B", label: "Something silly" }] },
  { id: "c14", category: "This or That", text: "Ideal gift energy", options: [{ key: "A", label: "Thoughtful & small" }, { key: "B", label: "Big & surprising" }] },
  { id: "c15", category: "This or That", text: "Weekend project mood", options: [{ key: "A", label: "Fix up the space" }, { key: "B", label: "Do nothing at all" }] },
];

const PICK_ONE = [
  { id: "m1", category: "Pick One", text: "Our go-to celebration meal", options: [{ key: "A", label: "Sushi" }, { key: "B", label: "Tacos" }, { key: "C", label: "Pasta" }, { key: "D", label: "Burgers" }] },
  { id: "m2", category: "Pick One", text: "If we could teleport right now", options: [{ key: "A", label: "Tokyo" }, { key: "B", label: "Paris" }, { key: "C", label: "A cabin in the woods" }, { key: "D", label: "Nowhere, home is enough" }] },
  { id: "m3", category: "Pick One", text: "Our love language leans most toward", options: [{ key: "A", label: "Words" }, { key: "B", label: "Touch" }, { key: "C", label: "Quality time" }, { key: "D", label: "Acts of service" }] },
  { id: "m4", category: "Pick One", text: "Best use of a surprise $500", options: [{ key: "A", label: "Trip fund" }, { key: "B", label: "Fancy dinner" }, { key: "C", label: "A new gadget" }, { key: "D", label: "Straight to savings" }] },
  { id: "m5", category: "Pick One", text: "Our communication style is mostly", options: [{ key: "A", label: "Texting all day" }, { key: "B", label: "Phone calls" }, { key: "C", label: "Voice notes" }, { key: "D", label: "In person only" }] },
  { id: "m6", category: "Pick One", text: "Ideal third wheel for date night", options: [{ key: "A", label: "Our dog" }, { key: "B", label: "A best friend" }, { key: "C", label: "A bottle of wine" }, { key: "D", label: "No one, just us" }] },
  { id: "m7", category: "Pick One", text: "Our house plant survival rate", options: [{ key: "A", label: "Thriving jungle" }, { key: "B", label: "A few survivors" }, { key: "C", label: "Mostly cacti" }, { key: "D", label: "We've killed them all" }] },
  { id: "m8", category: "Pick One", text: "Dream dinner guest is...", options: [{ key: "A", label: "A musician" }, { key: "B", label: "An author" }, { key: "C", label: "A chef" }, { key: "D", label: "A comedian" }] },
  { id: "m9", category: "Pick One", text: "Our ideal weekend soundtrack", options: [{ key: "A", label: "Pop" }, { key: "B", label: "R&B" }, { key: "C", label: "Indie" }, { key: "D", label: "Jazz" }] },
  { id: "m10", category: "Pick One", text: "What our future kitchen smells like most", options: [{ key: "A", label: "Fresh coffee" }, { key: "B", label: "Something baking" }, { key: "C", label: "Garlic and onions" }, { key: "D", label: "Takeout containers" }] },
];

const ONE_WORD = [
  { id: "t1", category: "One Word", text: "One word for our relationship right now" },
  { id: "t2", category: "One Word", text: "First thing you'd buy if we won the lottery" },
  { id: "t3", category: "One Word", text: "A silly nickname we should use more" },
  { id: "t4", category: "One Word", text: "One word for where we'll be in 5 years" },
  { id: "t5", category: "One Word", text: "A smell that reminds you of home" },
  { id: "t6", category: "One Word", text: "One word for how today's going" },
  { id: "t7", category: "One Word", text: "If our love story were a movie genre, it'd be" },
  { id: "t8", category: "One Word", text: "One word for the next place we should travel" },
  { id: "t9", category: "One Word", text: "Your favorite memory of us, in a phrase" },
  { id: "t10", category: "One Word", text: "One thing you're grateful for about us today" },
];

const NUMBERS = [
  { id: "n1", category: "Guess the Number", text: "Rate our chemistry today, 1–10" },
  { id: "n2", category: "Guess the Number", text: "How many years until our next big adventure?" },
  { id: "n3", category: "Guess the Number", text: "On a scale of 1–10, how much do you love surprises?" },
  { id: "n4", category: "Guess the Number", text: "Minutes we'd survive without our phones, in tens" },
  { id: "n5", category: "Guess the Number", text: "Rate today's outfit choice, 1–10" },
];

const ALL_PROMPTS = [
  ...THIS_OR_THAT.map((p) => ({ ...p, type: "options" })),
  ...PICK_ONE.map((p) => ({ ...p, type: "options" })),
  ...ONE_WORD.map((p) => ({ ...p, type: "text" })),
  ...NUMBERS.map((p) => ({ ...p, type: "number" })),
];

function normalize(v) {
  return (v || "").trim().toLowerCase().replace(/[^a-z0-9 ]/g, "");
}

function genId() {
  return Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
}

function pickNextPrompt(playedIds) {
  let pool = ALL_PROMPTS.filter((p) => !playedIds.includes(p.id));
  let reset = false;
  if (pool.length === 0) {
    pool = ALL_PROMPTS;
    reset = true;
  }
  const next = pool[Math.floor(Math.random() * pool.length)];
  return { next, reset };
}

export default function App() {
  const myId = useRef(genId());
  const [name, setName] = useState("");
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [joined, setJoined] = useState(false);
  const [room, setRoom] = useState(null);
  const [error, setError] = useState("");
  const [textVal, setTextVal] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setTextVal("");
  }, [room?.round?.promptId]);

  // Realtime subscription replaces the artifact's polling loop.
  useEffect(() => {
    if (!joined || !roomCode) return;
    const unsubscribe = subscribeToRoom(roomCode, (data) => setRoom(data));
    return () => unsubscribe();
  }, [joined, roomCode]);

  const handleJoin = useCallback(async () => {
    setError("");
    if (!name.trim() || !roomCodeInput.trim()) {
      setError("Fill in both a name and a room code, love.");
      return;
    }
    setBusy(true);
    const code = roomCodeInput.trim().toUpperCase().replace(/\s+/g, "");
    try {
      let joinError = null;
      await updateRoom(code, (latest) => {
        if (!latest) {
          return {
            code,
            players: [{ id: myId.current, name: name.trim() }],
            playedIds: [],
            history: [],
            matches: 0,
            status: "lobby",
            round: null,
          };
        }
        const exists = latest.players.find((p) => p.id === myId.current);
        if (exists) return latest;
        if (latest.players.length >= 2) {
          joinError = "This room's already got two people in it. Try another code.";
          return latest;
        }
        return { ...latest, players: [...latest.players, { id: myId.current, name: name.trim() }] };
      });
      if (joinError) {
        setError(joinError);
        setBusy(false);
        return;
      }
      setRoomCode(code);
      setJoined(true);
    } catch (e) {
      console.error(e);
      setError("Couldn't reach the room. Check your connection and try again.");
    }
    setBusy(false);
  }, [name, roomCodeInput]);

  const startOrNext = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      await updateRoom(roomCode, (latest) => {
        if (!latest) return undefined; // abort this pass, retry once real data loads
        const roundsPlayed = latest.history?.length || 0;
        if (roundsPlayed >= TOTAL_ROUNDS) {
          return { ...latest, status: "finished" };
        }
        const { next, reset } = pickNextPrompt(latest.playedIds || []);
        return {
          ...latest,
          playedIds: reset ? [] : latest.playedIds,
          status: "playing",
          round: {
            promptId: next.id,
            promptText: next.text,
            type: next.type,
            category: next.category,
            options: next.options || null,
            answers: {},
            revealed: false,
            match: null,
          },
        };
      });
    } catch (e) {
      console.error(e);
      setError("Couldn't start the round. Check your connection and try again.");
    }
    setBusy(false);
  }, [roomCode]);

  const submitAnswer = useCallback(
    async (value) => {
      setBusy(true);
      setError("");
      try {
      await updateRoom(roomCode, (latest) => {
        if (!latest) return undefined; // abort this pass, retry once real data loads
        if (!latest.round) return latest;
        const updatedAnswers = { ...latest.round.answers, [myId.current]: value };
        const playerIds = latest.players.map((p) => p.id);
        const bothAnswered = playerIds.length === 2 && playerIds.every((id) => updatedAnswers[id] !== undefined);
        let updatedRoom = { ...latest, round: { ...latest.round, answers: updatedAnswers } };

        if (bothAnswered) {
          const [p1, p2] = playerIds;
          let match;
          if (latest.round.type === "options") {
            match = updatedAnswers[p1] === updatedAnswers[p2];
          } else if (latest.round.type === "number") {
            match = Number(updatedAnswers[p1]) === Number(updatedAnswers[p2]);
          } else {
            match = normalize(updatedAnswers[p1]) === normalize(updatedAnswers[p2]);
          }
          updatedRoom.round.revealed = true;
          updatedRoom.round.match = match;
          updatedRoom.matches = (latest.matches || 0) + (match ? 1 : 0);
          updatedRoom.playedIds = [...(latest.playedIds || []), latest.round.promptId];
          updatedRoom.history = [
            ...(latest.history || []),
            {
              promptId: latest.round.promptId,
              promptText: latest.round.promptText,
              type: latest.round.type,
              category: latest.round.category,
              options: latest.round.options,
              answers: updatedAnswers,
              match,
            },
          ];
        }
        return updatedRoom;
      });
      } catch (e) {
        console.error(e);
        setError("Couldn't submit your answer. Check your connection and try again.");
      }
      setBusy(false);
    },
    [roomCode]
  );

  const playAgain = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      await updateRoom(roomCode, (latest) => {
        if (!latest) return undefined; // abort this pass, retry once real data loads
        return { ...latest, history: [], matches: 0, status: "lobby", round: null };
      });
    } catch (e) {
      console.error(e);
      setError("Couldn't reset the game. Check your connection and try again.");
    }
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
  const iAmFirst = room?.players?.[0]?.id === myId.current;
  const iAnswered = room?.round && room.round.answers[myId.current] !== undefined;
  const roundsPlayed = room?.history?.length || 0;

  const displayAnswer = (round, raw) => {
    if (!round) return raw;
    if (round.type === "options") {
      return round.options?.find((o) => o.key === raw)?.label || raw;
    }
    return raw;
  };

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
      `}</style>
      <div className="glow glow1"></div>
      <div className="glow glow2"></div>

      <div style={styles.card}>
        {error && joined && <div style={styles.error}>{error}</div>}
        {!joined && (
          <div className="fadeUp">
            <div style={styles.eyebrow}>a little game for two</div>
            <h1 style={styles.h1}>In Sync</h1>
            <p style={styles.sub}>
              Pick a room code, share it with your person, and see how many answers line up across
              this-or-that, pick-one, one-word, and number rounds.
            </p>
            <div style={styles.field}>
              <label style={styles.label}>Your name</label>
              <input
                style={styles.input}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="What should we call you?"
                maxLength={20}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Room code</label>
              <input
                style={{ ...styles.input, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em" }}
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                placeholder="e.g. LOVE24"
                maxLength={12}
              />
            </div>
            {error && <div style={styles.error}>{error}</div>}
            <button style={styles.primaryBtn} onClick={handleJoin} disabled={busy}>
              {busy ? "Entering..." : "Enter room"}
            </button>
            <div style={styles.hint}>Same code as your partner = same room, on any device.</div>
          </div>
        )}

        {joined && room && room.players.length < 2 && (
          <div style={styles.center} className="fadeUp">
            <div style={styles.eyebrow}>waiting</div>
            <h2 style={styles.h2}>Almost there, {me?.name}</h2>
            <div className="orbWrap">
              <div className="orb" style={{ background: "#F2779E", color: "#F2779E" }}></div>
            </div>
            <p style={styles.sub}>Send this code to your person:</p>
            <div style={styles.codeBox} onClick={copyCode}>
              {roomCode} <span style={styles.copyHint}>{copied ? "copied!" : "tap to copy"}</span>
            </div>
          </div>
        )}

        {joined && room && room.players.length === 2 && room.status === "lobby" && (
          <div style={styles.center} className="fadeUp">
            <div style={styles.eyebrow}>ready</div>
            <h2 style={styles.h2}>
              {me?.name} &amp; {partner?.name}
            </h2>
            <div className="orbWrap">
              <div className="orb" style={{ background: "#F2779E", color: "#F2779E" }}></div>
              <div className="orb" style={{ background: "#E8B85C", color: "#E8B85C" }}></div>
            </div>
            <p style={styles.sub}>{TOTAL_ROUNDS} rounds, four kinds of questions. No wrong answers, just honest ones.</p>
            <button style={styles.primaryBtn} onClick={startOrNext} disabled={busy}>
              {busy ? "..." : "Start playing"}
            </button>
          </div>
        )}

        {joined && room && room.status === "playing" && room.round && (
          <div className="fadeUp">
            <div style={styles.roundMeta}>
              Round {roundsPlayed + 1} of {TOTAL_ROUNDS} · {room.round.category}
            </div>
            <h2 style={styles.prompt}>{room.round.promptText}</h2>

            {!room.round.revealed && !iAnswered && room.round.type === "options" && (
              <div style={styles.choiceRow}>
                {room.round.options.map((opt, i) => (
                  <button
                    key={opt.key}
                    style={{ ...styles.choiceBtn, borderColor: OPT_COLORS[i % OPT_COLORS.length] }}
                    onClick={() => submitAnswer(opt.key)}
                    disabled={busy}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}

            {!room.round.revealed && !iAnswered && room.round.type === "text" && (
              <div style={{ marginTop: 18 }}>
                <input
                  style={styles.input}
                  value={textVal}
                  onChange={(e) => setTextVal(e.target.value)}
                  placeholder="Your answer..."
                  maxLength={40}
                  onKeyDown={(e) => e.key === "Enter" && textVal.trim() && submitAnswer(textVal)}
                />
                <button
                  style={{ ...styles.primaryBtn, marginTop: 12 }}
                  onClick={() => submitAnswer(textVal)}
                  disabled={busy || !textVal.trim()}
                >
                  Submit answer
                </button>
              </div>
            )}

            {!room.round.revealed && !iAnswered && room.round.type === "number" && (
              <div style={{ marginTop: 18 }}>
                <input
                  type="number"
                  style={styles.input}
                  value={textVal}
                  onChange={(e) => setTextVal(e.target.value)}
                  placeholder="Your number..."
                  onKeyDown={(e) => e.key === "Enter" && textVal !== "" && submitAnswer(textVal)}
                />
                <button
                  style={{ ...styles.primaryBtn, marginTop: 12 }}
                  onClick={() => submitAnswer(textVal)}
                  disabled={busy || textVal === ""}
                >
                  Submit answer
                </button>
              </div>
            )}

            {!room.round.revealed && iAnswered && (
              <div style={styles.center}>
                <div className="orbWrap">
                  <div className="orb" style={{ background: "#F2779E", color: "#F2779E" }}></div>
                  <div className="orb" style={{ background: "#E8B85C", color: "#E8B85C", animationDelay: "0.4s" }}></div>
                </div>
                <p style={styles.sub}>Waiting on {partner ? partner.name : "your partner"}...</p>
              </div>
            )}

            {room.round.revealed && (
              <div style={styles.center} className="fadeUp">
                <div className="orbWrap">
                  <div
                    className={`orb ${room.round.match ? (iAmFirst ? "match" : "matchB") : iAmFirst ? "nomatch" : "nomatchB"}`}
                    style={{ background: "#F2779E", color: "#F2779E" }}
                  ></div>
                  <div
                    className={`orb ${room.round.match ? (iAmFirst ? "matchB" : "match") : iAmFirst ? "nomatchB" : "nomatch"}`}
                    style={{ background: "#E8B85C", color: "#E8B85C" }}
                  ></div>
                </div>
                {room.round.match ? (
                  <div className="heartPop" style={styles.matchText}>
                    ✦ In sync ✦
                  </div>
                ) : (
                  <div style={styles.noMatchText}>Different, but now you both know</div>
                )}
                <div style={styles.answerPair}>
                  {room.players.map((p) => (
                    <div key={p.id} style={styles.answerChip}>
                      <span style={styles.answerChipName}>{p.name}</span>
                      <span>{displayAnswer(room.round, room.round.answers[p.id])}</span>
                    </div>
                  ))}
                </div>
                <button style={styles.primaryBtn} onClick={startOrNext} disabled={busy}>
                  {roundsPlayed >= TOTAL_ROUNDS ? "See results" : "Next round"}
                </button>
              </div>
            )}
          </div>
        )}

        {joined && room && room.status === "finished" && (
          <div className="fadeUp">
            <div style={styles.center}>
              <div style={styles.eyebrow}>results</div>
              <h2 style={styles.h2}>
                {room.matches} / {TOTAL_ROUNDS} in sync
              </h2>
              <p style={styles.sub}>
                {room.matches >= 6
                  ? "Practically the same person."
                  : room.matches >= 3
                  ? "A sweet mix of alike and different."
                  : "Opposites, doing just fine."}
              </p>
            </div>
            <div style={styles.historyList}>
              {room.history.map((h, i) => (
                <div key={i} style={styles.historyItem}>
                  <div style={styles.historyPrompt}>
                    {h.match ? "✦" : "·"} {h.promptText}
                  </div>
                  <div style={styles.historyAnswers}>
                    {room.players.map((p) => (
                      <span key={p.id} style={styles.historyAnswer}>
                        {p.name}: {displayAnswer(h, h.answers[p.id])}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div style={styles.center}>
              <button style={styles.primaryBtn} onClick={playAgain} disabled={busy}>
                Play again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(160deg, #1B1035 0%, #241645 55%, #1B1035 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    position: "relative",
    overflow: "hidden",
    fontFamily: "'Manrope', sans-serif",
  },
  card: {
    position: "relative",
    zIndex: 1,
    width: "100%",
    maxWidth: 420,
    background: "rgba(42, 27, 77, 0.65)",
    backdropFilter: "blur(14px)",
    border: "1px solid rgba(245, 239, 255, 0.1)",
    borderRadius: 24,
    padding: "32px 28px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
  },
  eyebrow: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: "#E8B85C",
    marginBottom: 8,
  },
  h1: {
    fontFamily: "'Fraunces', serif",
    fontStyle: "italic",
    fontWeight: 500,
    fontSize: 40,
    color: "#F5EFFF",
    margin: "0 0 10px 0",
  },
  h2: {
    fontFamily: "'Fraunces', serif",
    fontWeight: 600,
    fontSize: 26,
    color: "#F5EFFF",
    margin: "0 0 10px 0",
    textAlign: "center",
  },
  sub: {
    color: "#C9BEE0",
    fontSize: 15,
    lineHeight: 1.5,
    margin: "0 0 20px 0",
    textAlign: "center",
  },
  field: { marginBottom: 16, textAlign: "left" },
  label: {
    display: "block",
    fontSize: 12,
    color: "#C9BEE0",
    marginBottom: 6,
    fontWeight: 600,
  },
  input: {
    width: "100%",
    padding: "13px 14px",
    borderRadius: 12,
    border: "1px solid rgba(245,239,255,0.18)",
    background: "rgba(245,239,255,0.06)",
    color: "#F5EFFF",
    fontSize: 15,
    fontFamily: "'Manrope', sans-serif",
  },
  primaryBtn: {
    width: "100%",
    padding: "14px 16px",
    borderRadius: 12,
    border: "none",
    background: "linear-gradient(135deg, #F2779E, #E8B85C)",
    color: "#1B1035",
    fontWeight: 700,
    fontSize: 15,
    marginTop: 4,
  },
  hint: {
    marginTop: 14,
    fontSize: 12,
    color: "#8B7FA8",
    textAlign: "center",
  },
  error: {
    color: "#F2779E",
    fontSize: 13,
    marginBottom: 12,
    textAlign: "center",
  },
  center: { textAlign: "center" },
  codeBox: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 24,
    letterSpacing: "0.15em",
    color: "#F5EFFF",
    background: "rgba(245,239,255,0.08)",
    border: "1px dashed rgba(232,184,92,0.5)",
    borderRadius: 14,
    padding: "16px",
    cursor: "pointer",
  },
  copyHint: {
    display: "block",
    fontFamily: "'Manrope', sans-serif",
    fontSize: 11,
    letterSpacing: "normal",
    color: "#8B7FA8",
    marginTop: 6,
  },
  roundMeta: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 12,
    color: "#8B7FA8",
    textAlign: "center",
    marginBottom: 6,
  },
  prompt: {
    fontFamily: "'Fraunces', serif",
    fontWeight: 600,
    fontSize: 24,
    color: "#F5EFFF",
    textAlign: "center",
    margin: "0 0 22px 0",
    lineHeight: 1.3,
  },
  choiceRow: { display: "flex", flexDirection: "column", gap: 12 },
  choiceBtn: {
    padding: "16px",
    borderRadius: 14,
    border: "2px solid",
    background: "rgba(245,239,255,0.05)",
    color: "#F5EFFF",
    fontSize: 15,
    fontWeight: 600,
  },
  matchText: {
    fontFamily: "'Fraunces', serif",
    fontStyle: "italic",
    fontSize: 20,
    color: "#E8B85C",
    margin: "6px 0 18px 0",
  },
  noMatchText: {
    color: "#C9BEE0",
    fontSize: 14,
    margin: "6px 0 18px 0",
  },
  answerPair: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 },
  answerChip: {
    background: "rgba(245,239,255,0.06)",
    borderRadius: 10,
    padding: "10px 14px",
    display: "flex",
    justifyContent: "space-between",
    fontSize: 14,
    color: "#F5EFFF",
  },
  answerChipName: { color: "#8B7FA8", fontWeight: 600 },
  historyList: { display: "flex", flexDirection: "column", gap: 10, margin: "20px 0" },
  historyItem: {
    background: "rgba(245,239,255,0.05)",
    borderRadius: 12,
    padding: "12px 14px",
  },
  historyPrompt: { color: "#F5EFFF", fontSize: 13, fontWeight: 600, marginBottom: 4 },
  historyAnswers: { display: "flex", gap: 12, flexWrap: "wrap" },
  historyAnswer: { color: "#C9BEE0", fontSize: 12 },
};
