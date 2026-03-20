import React, { useEffect, useMemo, useRef, useState } from 'react';
import '../styles/WheelGame.css';
import wheelCardImage from '../assets/wheel/wheel_card.png';

const SLOTS = [
  { key: 'hundreds', label: 'หลักร้อย' },
  { key: 'tens', label: 'หลักสิบ' },
  { key: 'ones', label: 'หลักหน่วย' }
];

const TURNS_PER_ROUND = 3;
const TOTAL_ROUNDS = 10;

function randDigit() {
  return Math.floor(Math.random() * 10);
}

function calcNumber(slots) {
  const h = slots.hundreds ?? 0;
  const t = slots.tens ?? 0;
  const o = slots.ones ?? 0;
  return h * 100 + t * 10 + o;
}

function getRemainingSlotKeys(slots) {
  return SLOTS.map(s => s.key).filter(k => slots[k] === null);
}

export default function WheelGame({ onScoreUpdate, onGameEnd }) {
  const [roundIndex, setRoundIndex] = useState(0);
  const [wins, setWins] = useState(0);
  const [turn, setTurn] = useState(0);
  const [playerDraw, setPlayerDraw] = useState(null);
  const [drawPhase, setDrawPhase] = useState('idle'); // idle | flipping | revealed
  const [playerSlots, setPlayerSlots] = useState({ hundreds: null, tens: null, ones: null });
  const [computerSlots, setComputerSlots] = useState({ hundreds: null, tens: null, ones: null });
  const [message, setMessage] = useState('กด “จั่วเลข” หรือกดที่ไพ่ แล้วลากไปวางในช่องหลักร้อย / หลักสิบ / หลักหน่วย');
  const [roundFinished, setRoundFinished] = useState(false);
  const [sessionFinished, setSessionFinished] = useState(false);
  const [computerRevealStage, setComputerRevealStage] = useState(0); // 0 none, 1 ones, 2 tens, 3 hundreds
  const [result, setResult] = useState(null);
  const timerRef = useRef(null);
  const revealTimersRef = useRef([]);
  const deckRef = useRef(null);
  const computerSlotRefs = useRef({ hundreds: null, tens: null, ones: null });
  const flyResolveRef = useRef(null);
  const [flyCard, setFlyCard] = useState(null);
  const [isCompAnimating, setIsCompAnimating] = useState(false);

  const remainingTurns = useMemo(() => TURNS_PER_ROUND - turn, [turn]);

  const canDraw = !sessionFinished && !roundFinished && !isCompAnimating && playerDraw === null && remainingTurns > 0;

  const clearTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  const clearRevealTimers = () => {
    for (const id of revealTimersRef.current) clearTimeout(id);
    revealTimersRef.current = [];
  };

  const resetRoundState = () => {
    clearTimer();
    clearRevealTimers();
    if (flyResolveRef.current) flyResolveRef.current();
    flyResolveRef.current = null;
    setFlyCard(null);
    setIsCompAnimating(false);
    setTurn(0);
    setPlayerDraw(null);
    setDrawPhase('idle');
    setPlayerSlots({ hundreds: null, tens: null, ones: null });
    setComputerSlots({ hundreds: null, tens: null, ones: null });
    setRoundFinished(false);
    setComputerRevealStage(0);
    setResult(null);
  };

  useEffect(() => {
    return () => {
      clearTimer();
      clearRevealTimers();
    };
  }, []);

  const startComputerFly = (slotKey) => {
    const fromEl = deckRef.current;
    const toEl = computerSlotRefs.current?.[slotKey];
    if (!fromEl || !toEl) return Promise.resolve();

    const from = fromEl.getBoundingClientRect();
    const to = toEl.getBoundingClientRect();

    setIsCompAnimating(true);
    setFlyCard({ phase: 'from', from, to });

    return new Promise((resolve) => {
      flyResolveRef.current = resolve;
      requestAnimationFrame(() => {
        setFlyCard(prev => (prev ? { ...prev, phase: 'to' } : prev));
      });
    });
  };

  const drawForPlayer = () => {
    if (!canDraw) return;
    const d = randDigit();
    setPlayerDraw(d);
    setDrawPhase('flipping');
    setTimeout(() => setDrawPhase('revealed'), 450);
    setMessage('ลากเลขที่ได้ไปวางในช่องที่ต้องการ (หรือแตะช่องเพื่อวาง)');
  };

  const finishRound = (nextPlayerSlots, nextComputerSlots) => {
    const p = calcNumber(nextPlayerSlots);
    const c = calcNumber(nextComputerSlots);
    const revealStepMs = 500;
    const afterRevealMs = 1200;

    setRoundFinished(true);
    setComputerRevealStage(0);

    let winner = 'tie';
    let winDelta = 0;
    if (p > c) {
      winner = 'player';
      winDelta = 1;
    } else if (p < c) {
      winner = 'computer';
    }

    setResult({ winner, player: p, computer: c });

    const nextWins = wins + winDelta;
    if (winDelta) setWins(nextWins);
    onScoreUpdate?.(nextWins);

    const roundLabel = `รอบที่ ${roundIndex + 1}/${TOTAL_ROUNDS}`;
    if (winner === 'player') setMessage(`${roundLabel}: คุณชนะ`);
    else if (winner === 'computer') setMessage(`${roundLabel}: คู่แข่งชนะ`);
    else setMessage(`${roundLabel}: เสมอ`);

    clearTimer();
    clearRevealTimers();

    revealTimersRef.current = [
      setTimeout(() => setComputerRevealStage(1), revealStepMs),
      setTimeout(() => setComputerRevealStage(2), revealStepMs * 2),
      setTimeout(() => setComputerRevealStage(3), revealStepMs * 3)
    ];

    const totalDelay = revealStepMs * 3 + afterRevealMs;
    const isLastRound = roundIndex + 1 >= TOTAL_ROUNDS;
    if (isLastRound) {
      setSessionFinished(true);
      timerRef.current = setTimeout(() => {
        onScoreUpdate?.(nextWins);
        onGameEnd?.();
      }, totalDelay);
      return;
    }

    timerRef.current = setTimeout(() => {
      setRoundIndex(prev => prev + 1);
      resetRoundState();
      setMessage('กด “จั่วเลข” หรือกดที่ไพ่ แล้วลากไปวางในช่องหลักร้อย / หลักสิบ / หลักหน่วย');
    }, totalDelay);
  };

  const placeForPlayer = async (slotKey) => {
    if (sessionFinished) return;
    if (roundFinished) return;
    if (isCompAnimating) return;
    if (playerDraw === null) return;
    if (drawPhase !== 'revealed') return;
    if (playerSlots[slotKey] !== null) return;

    const digit = playerDraw;
    const nextPlayerSlots = { ...playerSlots, [slotKey]: digit };
    setPlayerSlots(nextPlayerSlots);
    setPlayerDraw(null);
    setDrawPhase('idle');

    const compDigit = randDigit();

    const compChoices = getRemainingSlotKeys(computerSlots);
    const picked = compChoices[Math.floor(Math.random() * compChoices.length)];
    const nextComputerSlots = { ...computerSlots, [picked]: compDigit };
    await startComputerFly(picked);
    setComputerSlots(nextComputerSlots);

    const nextTurn = turn + 1;
    setTurn(nextTurn);

    if (nextTurn >= TURNS_PER_ROUND) {
      setTimeout(() => finishRound(nextPlayerSlots, nextComputerSlots), 200);
      return;
    }

    setMessage('กด “จั่วเลข” เพื่อเล่นครั้งถัดไป');
  };

  const onDragStart = (e) => {
    if (playerDraw === null) return;
    if (drawPhase !== 'revealed') return;
    e.dataTransfer.setData('text/plain', String(playerDraw));
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e, slotKey) => {
    if (sessionFinished) return;
    if (roundFinished) return;
    if (playerDraw === null) return;
    if (drawPhase !== 'revealed') return;
    if (playerSlots[slotKey] !== null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const onDrop = (e, slotKey) => {
    e.preventDefault();
    if (sessionFinished) return;
    if (roundFinished) return;
    if (playerDraw === null) return;
    if (drawPhase !== 'revealed') return;
    const raw = e.dataTransfer.getData('text/plain');
    if (!raw) return;
    const n = Number(raw);
    if (Number.isNaN(n)) return;
    if (n !== playerDraw) return;
    placeForPlayer(slotKey);
  };

  return (
    <div className="wheel-game">
      {flyCard && (
        <div
          className={`wheel-fly-card ${flyCard.phase === 'to' ? 'to' : ''}`}
          style={{
            left: `${(flyCard.phase === 'to' ? flyCard.to.left : flyCard.from.left)}px`,
            top: `${(flyCard.phase === 'to' ? flyCard.to.top : flyCard.from.top)}px`,
            width: `${(flyCard.phase === 'to' ? flyCard.to.width : flyCard.from.width)}px`,
            height: `${(flyCard.phase === 'to' ? flyCard.to.height : flyCard.from.height)}px`,
            backgroundImage: `url(${wheelCardImage})`
          }}
          onTransitionEnd={() => {
            if (flyCard.phase !== 'to') return;
            setFlyCard(null);
            setIsCompAnimating(false);
            const done = flyResolveRef.current;
            flyResolveRef.current = null;
            if (done) done();
          }}
        />
      )}
      <div className="wheel-row">
        <div className="wheel-board">

          <div className="wheel-slots">
            {SLOTS.map(s => {
              const filled = computerSlots[s.key] !== null;
              const revealNeeded =
                s.key === 'ones' ? 1 : s.key === 'tens' ? 2 : 3;
              const revealed = computerRevealStage >= revealNeeded;
              const showBack = filled && (
                (!(roundFinished || sessionFinished)) ||
                ((roundFinished || sessionFinished) && !revealed)
              );
              const showNumber = filled && (roundFinished || sessionFinished) && revealed;

              return (
                <div key={s.key} className="wheel-slot">
                  <div className="wheel-slot-label">{s.label}</div>
                  <div
                    ref={(el) => {
                      computerSlotRefs.current[s.key] = el;
                    }}
                    className={`wheel-slot-box ${showBack ? 'back' : ''}`}
                    style={showBack ? { backgroundImage: `url(${wheelCardImage})` } : undefined}
                  >
                    {showNumber ? computerSlots[s.key] : ''}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        </div>

      <div className="wheel-center">
        <div className="wheel-message">{message}</div>

        <div className="wheel-controls">
          <button className="wheel-btn primary" onClick={drawForPlayer} disabled={!canDraw}>
            จั่วเลข
          </button>

          <div className="wheel-current">
            <div
              ref={deckRef}
              className={`wheel-draw ${drawPhase !== 'idle' ? 'flipped' : ''} ${drawPhase === 'revealed' ? 'revealed' : ''} ${playerDraw === null ? 'disabled' : ''}`}
              draggable={playerDraw !== null && drawPhase === 'revealed'}
              onClick={canDraw ? drawForPlayer : undefined}
              onDragStart={onDragStart}
            >
              <div className="wheel-draw-inner">
                <div className="wheel-draw-face wheel-draw-front">
                  <div className="wheel-card-digit">{playerDraw === null ? '—' : playerDraw}</div>
                </div>
                <div className="wheel-draw-face wheel-draw-back" style={{ backgroundImage: `url(${wheelCardImage})` }} />
              </div>
            </div>
            <div className="wheel-hint">ลากเลขนี้ไปวางในช่องด้านล่าง</div>
          </div>

          {roundFinished && result && (
            <div className="wheel-result">
              <div className="wheel-result-row">
                <span>ผู้เล่น:</span> <strong>{result.player}</strong>
              </div>
              <div className="wheel-result-row">
                <span>คู่แข่ง:</span> <strong>{result.computer}</strong>
              </div>
              <div className="wheel-result-winner">
                {result.winner === 'tie'
                  ? 'ผลลัพธ์: เสมอ'
                  : result.winner === 'player'
                    ? 'ผลลัพธ์: ผู้เล่นชนะ'
                    : 'ผลลัพธ์: คู่แข่งชนะ'}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="wheel-row">
        <div className="wheel-board">
          <div className="wheel-slots">
            {SLOTS.map(s => {
              const filled = playerSlots[s.key] !== null;
              return (
                <div key={s.key} className="wheel-slot">
                  <div className="wheel-slot-label">{s.label}</div>
                  <div
                    className={`wheel-slot-box drop ${filled ? 'filled' : ''}`}
                    onDragOver={(e) => onDragOver(e, s.key)}
                    onDrop={(e) => onDrop(e, s.key)}
                    onClick={() => placeForPlayer(s.key)}
                    role="button"
                    tabIndex={0}
                  >
                    {playerSlots[s.key] ?? ''}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="wheel-number">
            <span>ค่ารวม:</span>            
            <span className="wheel-turns">รอบ: <strong>{roundIndex + 1}</strong>/{TOTAL_ROUNDS}</span>
            <span className="wheel-turns">ชนะ: <strong>{wins}</strong> ครั้ง</span>            
          </div>
        </div>
      </div>

      <div className="wheel-footer-note">
        กติกา: เล่นทั้งหมด 10 รอบ (รอบละจั่ว 3 ครั้ง) ผู้เล่นมากกว่า = ชนะ คะแนน = จำนวนรอบที่ชนะ
      </div>
    </div>
  );
}

