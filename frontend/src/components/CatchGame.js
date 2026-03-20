import React, { useCallback, useEffect, useRef, useState } from 'react';
import { gameAPI } from '../services/api';
import { useDialog } from './DialogProvider';
import { Fireworks } from '@fireworks-js/react';
import '../styles/CatchGame.css';

const CatchGame = ({ onScoreUpdate, onGameEnd, onBackToMenu }) => {
  const [sessionId, setSessionId] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const [maxRounds, setMaxRounds] = useState(10);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAnswering, setIsAnswering] = useState(false);
  const [correctPulse, setCorrectPulse] = useState(false);
  const [wrongShake, setWrongShake] = useState(false);
  const [highlightAnswer, setHighlightAnswer] = useState(null);
  const [wrongAnswer, setWrongAnswer] = useState(null);
  const [questionAnimKey, setQuestionAnimKey] = useState(0);

  const timerRef = useRef(null);
  const fw = useRef(null);
  const { alert } = useDialog();

  const answerCards = [
    'answer_card_1.png',
    'answer_card_2.png',
    'answer_card_3.png',
    'answer_card_4.png',
    'answer_card_5.png'
  ];

  const formatTime = (totalSeconds) => {
    const mm = Math.floor((Number(totalSeconds) || 0) / 60);
    const ss = Math.floor((Number(totalSeconds) || 0) % 60);
    return `${mm}:${String(ss).padStart(2, '0')}`;
  };

  const startGame = useCallback(async () => {
    try {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      setLoading(true);
      setIsAnswering(false);
      setIsFinished(false);
      setElapsedSeconds(0);
      setScore(0);
      setWrongShake(false);
      setWrongAnswer(null);
      if (onScoreUpdate) onScoreUpdate(0);

      const res = await gameAPI.startCatchSession();
      const sid = res?.data?.session_id;
      const first = res?.data?.first_question;
      const mr = Number(res?.data?.max_rounds);

      setSessionId(sid || null);
      setCurrentQuestion(first || null);
      setMaxRounds(!Number.isNaN(mr) && mr > 0 ? mr : 10);
      setRound(1);
      setQuestionAnimKey(0);
      setLoading(false);
    } catch (err) {
      console.error('Failed to start catch game:', err);
      setLoading(false);
      await alert({ variant: 'error', title: 'ไม่สำเร็จ', message: 'ไม่สามารถเริ่มเกมส์ได้ กรุณาลองใหม่' });
    }
  }, [alert, onScoreUpdate]);

  useEffect(() => {
    startGame();
  }, [startGame]);

  useEffect(() => {
    if (loading || isFinished || !sessionId) return;

    timerRef.current = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [loading, isFinished, sessionId]);

  useEffect(() => {
    if (!isFinished) return;
    const instance = fw.current;
    if (!instance) return;
    if (typeof instance.start === 'function') instance.start();
    return () => {
      if (typeof instance.stop === 'function') instance.stop();
    };
  }, [isFinished]);

  const handleAnswer = async (answerCard) => {
    if (loading || isFinished || isAnswering) return;
    if (!sessionId) return;

    try {
      setIsAnswering(true);
      const res = await gameAPI.playCatchRound(sessionId, answerCard);

      const nextScore = Number(res?.data?.score);
      const hasScore = !Number.isNaN(nextScore);
      const isCorrect = !!res?.data?.is_correct;
      const isFinishedNext = !!res?.data?.is_finished;
      const nextQuestion = res?.data?.next_question;
      const nextIdx = Number(res?.data?.current_question_index);
      const mr = Number(res?.data?.max_rounds);

      if (!Number.isNaN(mr) && mr > 0) setMaxRounds(mr);

      if (hasScore) {
        setScore(nextScore);
        if (onScoreUpdate) onScoreUpdate(nextScore);
      }

      if (isCorrect) {
        setHighlightAnswer(answerCard);
        setCorrectPulse(true);
        await new Promise(r => setTimeout(r, 520));
        setCorrectPulse(false);
        await new Promise(r => setTimeout(r, 80));
      } else {
        // ❌ Wrong answer feedback — shake + red border
        setWrongAnswer(answerCard);
        setWrongShake(true);
        await new Promise(r => setTimeout(r, 600));
        setWrongShake(false);
        await new Promise(r => setTimeout(r, 80));
      }

      if (!Number.isNaN(nextIdx)) {
        setRound(Math.min(nextIdx + 1, (!Number.isNaN(mr) && mr > 0) ? mr : (maxRounds || 10)));
      } else {
        setRound(prev => prev + 1);
      }

      setHighlightAnswer(null);
      setWrongAnswer(null);

      if (isFinishedNext) {
        setIsFinished(true);
        if (onGameEnd) onGameEnd();
        await alert({ variant: 'success', title: 'เกมส์จบแล้ว', message: `คะแนนของคุณคือ ${hasScore ? nextScore : score}` });
        return;
      }

      if (typeof nextQuestion === 'string' && nextQuestion.length > 0) {
        setCurrentQuestion(nextQuestion);
        // Always increment animKey to force re-render & slide-in animation
        setQuestionAnimKey(prev => prev + 1);
      } else {
        await alert({ variant: 'error', title: 'เกิดข้อผิดพลาด', message: 'ไม่พบคำถามถัดไป กรุณาเริ่มเกมใหม่' });
      }
    } catch (err) {
      console.error('Failed to play round:', err);
      const status = err?.response?.status;
      const msg = err?.response?.data?.message || 'ไม่สามารถส่งคำตอบได้ กรุณาลองใหม่';
      await alert({
        variant: 'error',
        title: status === 401 ? 'กรุณาเข้าสู่ระบบใหม่' : 'เกิดข้อผิดพลาด',
        message: msg
      });
    } finally {
      setIsAnswering(false);
    }
  };

  if (loading) return <div className="game-status">กำลังเตรียมเกม...</div>;

  if (isFinished) {
    return (
      <div className="game-result">
        <Fireworks
          ref={fw}
          options={{ opacity: 0.5, backgroundColor: 'transparent' }}
          style={{
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            position: 'fixed',
            zIndex: 9999,
            pointerEvents: 'none'
          }}
        />
        <h2>จบเกมแล้ว!</h2>
        <div className="final-score">คะแนนของคุณคือ: {score}</div>
        <div className="final-time">เวลารวม: {formatTime(elapsedSeconds)}</div>
        <div className="button-group">
          <button onClick={startGame} className="play-again-btn">เล่นอีกครั้ง</button>
          {onBackToMenu && (
            <button onClick={onBackToMenu} className="menu-btn">กลับเมนู</button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="catch-game-container">
      <div className="game-header-info">
        <div className="catch-stats">
          <span className="round-info">รอบที่: {Math.min(round || 1, maxRounds || 10)} / {maxRounds || 10}</span>
          <span className="time-info">เวลา: {formatTime(elapsedSeconds)}</span>
          <span className="score-info">คะแนน: {score}</span>
        </div>
      </div>

      <div className="question-section">
        <h3>การ์ดคำถาม</h3>
        <div className={`card-display question-card ${correctPulse ? 'pulse' : ''} ${wrongShake ? 'shake' : ''}`}>
          <div key={questionAnimKey} className="question-slide">
            <img
              src={currentQuestion ? `/card1/${currentQuestion}?v=${questionAnimKey}` : ''}
              alt="Question"
              onError={(e) => { e.target.style.opacity = '0.3'; }}
            />
          </div>
          {correctPulse && <div className="correct-burst">✅</div>}
          {wrongShake && <div className="wrong-burst">❌</div>}
        </div>
        <p className="instruction-text">เลือกคำตอบที่ตรงกับรูปภาพด้านบน</p>
      </div>

      <div className="answer-section">
        <h3>เลือกคำตอบ (5 ใบ)</h3>
        <div className="answer-grid">
          {answerCards.map((card, index) => (
            <div
              key={index}
              className={`card-display answer-card ${highlightAnswer === card ? 'correct' : ''} ${wrongAnswer === card ? 'wrong' : ''}`}
              onClick={() => handleAnswer(card)}
            >
              <img
                src={`/card1/${card}`}
                alt={`Answer ${index + 1}`}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CatchGame;
