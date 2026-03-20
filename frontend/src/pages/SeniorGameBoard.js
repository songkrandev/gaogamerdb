import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { gameAPI } from '../services/api';
import TrafficGame from '../components/TrafficGame';
import CatchGame from '../components/CatchGame';
import WheelGame from '../components/WheelGame';
import { useDialog } from '../components/DialogProvider';
import '../styles/SeniorGameBoard.css';

function SeniorGameBoard({ onLogout }) {
  const [currentSession, setCurrentSession] = useState(null);
  const [scores, setScores] = useState([]);
  const [gameActive, setGameActive] = useState(false);
  const [score, setScore] = useState(0);
  const [gameType, setGameType] = useState('catch_game'); // Game types
  const { alert } = useDialog();
  const navigate = useNavigate();

  const gameNameMap = {
    traffic_game: '🚦 เกมส์จราจรอัจฉริยะ',
    catch_game: '🎯 เกมส์จับให้ได้ไล่ให้ทัน',
    wheel_game: '🎡 เกมส์วงล้อเสี่ยงทาย',
    decode_game: '🔐 เกมส์ถอดรหัส',
    puzzle_game: '🧩 เกมส์ต่อรูปให้เต็ม'
  };

  // Game definitions with descriptions
  const games = [
    {
      id: 'catch_game',
      name: '🎯 จับให้ได้ไล่ให้ทัน',
      description: 'คลิกเพื่อจับวัตถุที่เคลื่อนไหว',
      color: '#0F2A1D'
    },
    {
      id: 'wheel_game',
      name: '🎡 วงล้อเสี่ยงทาย',
      description: 'จั่วเลขแล้วลากวางให้ได้ค่าสูงสุด',
      color: '#375534'
    },
    {
      id: 'traffic_game',
      name: '🚦 จราจรอัจฉริยะ',
      description: 'ควบคุมการไหลเวียนจราจร',
      color: '#6B9071'
    },
    {
      id: 'decode_game',
      name: '🔐 ถอดรหัส',
      description: 'แก้รหัสและหาคำตอบ',
      color: '#375534'
    },
    {
      id: 'puzzle_game',
      name: '🧩 ต่อรูปให้เต็ม',
      description: 'วางชิ้นรูปให้ครบถ้วน',
      color: '#0F2A1D'
    }
  ];

  useEffect(() => {
    loadScores();
  }, []);

  const loadScores = async () => {
    try {
      const response = await gameAPI.getUserScores();
      setScores(response.data.data);
    } catch (err) {
      console.error('Failed to load scores:', err);
    }
  };

  const handleStartGame = async () => {
    // TrafficGame และ CatchGame จัดการเซสชันแยกต่างหาก
    if (gameType === 'traffic_game' || gameType === 'catch_game') {
      setGameActive(true);
      setScore(0);
      return;
    }

    try {
      const response = await gameAPI.startSession(gameType);
      setCurrentSession(response.data.data);
      setGameActive(true);
      setScore(0);
    } catch (err) {
      await alert({ variant: 'error', title: 'ไม่สำเร็จ', message: 'ไม่สามารถเริ่มเกมส์ได้' });
    }
  };

  const handleBackToMenu = () => {
    setGameActive(false);
    loadScores();
    setCurrentSession(null);
    setScore(0);
  };

  const handleEndGame = async () => {
    // For traffic_game, score is saved internally by the component
    if (gameType === 'traffic_game') {
      setGameActive(false);
      loadScores();
      setCurrentSession(null);
      setScore(0);
      return;
    }

    if (!currentSession) return;

    try {
      await gameAPI.endSession(currentSession.session_id);
      await gameAPI.saveScore(
        currentSession.session_id,
        gameType,
        Math.round(score),
        1
      );
      setGameActive(false);
      loadScores();
      setCurrentSession(null);
      setScore(0);
      await alert({ variant: 'success', title: 'เกมส์จบแล้ว', message: `คะแนนของคุณคือ ${Math.round(score)}` });
    } catch (err) {
      await alert({ variant: 'error', title: 'ไม่สำเร็จ', message: 'ไม่สามารถจบเกมส์ได้' });
      console.error(err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userType');
    onLogout();
    navigate('/login');
  };

  return (
    <div className="game-board">
      <header className="game-header">
        <div className="header-left">
          <h1>GaoGamer - ฝึกสมอง</h1>
        </div>
        <div className="header-right">
          {gameActive ? (
            <button onClick={handleBackToMenu} className="back-to-menu-btn">
              🏠 กลับเมนู
            </button>
          ) : (
            <button onClick={handleLogout} className="logout-btn">ออกจากระบบ</button>
          )}
        </div>
      </header>

      <div className="game-container">
        {!gameActive ? (
          <div className="game-menu">
            <h2>เลือกเกมที่ต้องการเล่น 🎮</h2>
            <div className="game-grid">
              {games.map(game => (
                <div
                  key={game.id}
                  className={`game-card ${gameType === game.id ? 'selected' : ''}`}
                  style={{ borderColor: game.color }}
                  onClick={() => setGameType(game.id)}
                >
                  <h3>{game.name}</h3>
                  <p>{game.description}</p>
                  {gameType === game.id && <div className="checkmark">✓</div>}
                </div>
              ))}
            </div>
            <button onClick={handleStartGame} className="start-btn">
              เริ่มเล่น
            </button>
          </div>
        ) : (
          <div className="game-active">
            <div className="game-info">
              <h3>{games.find(g => g.id === gameType)?.name}</h3>
            </div>

            <div className="game-content">
              {gameType === 'traffic_game' ? (
                <TrafficGame
                  onScoreUpdate={setScore}
                  onGameEnd={handleEndGame}
                  onBackToMenu={handleBackToMenu}
                />
              ) : gameType === 'catch_game' ? (
                <CatchGame 
                  onScoreUpdate={setScore}
                  onGameEnd={handleEndGame}
                  onBackToMenu={handleBackToMenu}
                />
              ) : gameType === 'wheel_game' ? (
                <WheelGame
                  onScoreUpdate={setScore}
                  onGameEnd={handleEndGame}
                  onBackToMenu={handleBackToMenu}
                />
              ) : (
                <>
                  <p>🎮 กำลังเล่นเกม: <strong>{games.find(g => g.id === gameType)?.name}</strong></p>
                </>
              )}
            </div>

            {gameType !== 'traffic_game' && gameType !== 'catch_game' && gameType !== 'wheel_game' && (
              <button onClick={handleEndGame} className="end-btn">
                สิ้นสุดเกม
              </button>
            )}
          </div>
        )}

        {!gameActive && (
          <div className="scores-history">
            <h3>ประวัติคะแนน</h3>
            <table>
              <thead>
                <tr>
                  <th>เกมส์</th>
                  <th>คะแนน</th>
                  <th>วันที่</th>
                </tr>
              </thead>
              <tbody>
                {scores.slice(-10).map((s, idx) => (
                  <tr key={idx}>
                    <td>{gameNameMap[s.game_type] || s.game_type}</td>
                    <td>{s.score}</td>
                    <td>{new Date(s.created_at).toLocaleDateString('th-TH')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default SeniorGameBoard;
