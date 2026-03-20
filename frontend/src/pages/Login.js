import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL, authAPI } from '../services/api';
import '../styles/Login.css';

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [serverOk, setServerOk] = useState(true);
  const [showLegacy] = useState(false);
  const [legacyRole, setLegacyRole] = useState('admin'); // 'admin' | 'senior'
  const navigate = useNavigate();

  // Ping server health to give clearer feedback
  useEffect(() => {
    const ping = async () => {
      try {        
        await fetch(API_BASE_URL + '/health');        
        setServerOk(true);
      } catch {
        setServerOk(false);
      }
    };
    ping();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.login(email, password);
      const { token, role } = response.data;

      onLogin(token, role);

      if (role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/game');
      }
    } catch (err) {
      const msg = err.response?.data?.message;
      if (!serverOk || err.message?.includes('Network')) {
        setError('ติดต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบการเชื่อมต่อหรือสตาร์ตเซิร์ฟเวอร์');
      } else if (err.response?.status === 401) {
        setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      } else {
        setError(msg || 'เข้าสู่ระบบไม่สำเร็จ');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLegacyLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let response;
      if (legacyRole === 'admin') {
        response = await authAPI.adminLogin(email, password);
        onLogin(response.data.token, 'admin');
        navigate('/admin');
      } else {
        // ผู้สูงอายุ (legacy) ใช้ user_id แทนอีเมลในช่องอีเมล
        response = await authAPI.seniorLogin(email, password);
        onLogin(response.data.token, 'senior');
        navigate('/game');
      }
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(msg || 'เข้าสู่ระบบแบบเดิมไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-logo">🎮</div>
        <h1>GaoGamer</h1>
        <p className="login-subtitle">เล่นเกมฝึกสมอง</p>

        {(!serverOk) && <div className="error-message">⚠️ เซิร์ฟเวอร์ออฟไลน์ (ตรวจสอบที่พอร์ต 5000)</div>}
        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>📧 อีเมล</label>
            <input
              type="email"
              placeholder="กรอกอีเมลของคุณ"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>🔒 รหัสผ่าน</label>
            <input
              type="password"
              placeholder="กรอกรหัสผ่าน"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? '⏳ กำลังเข้าสู่ระบบ...' : '🔓 เข้าสู่ระบบ'}
          </button>
        </form>



        {showLegacy && (
          <form onSubmit={handleLegacyLogin} style={{ marginTop: 10 }}>
            <div className="form-group">
              <label>โหมดเข้าสู่ระบบสำรอง</label>
              <div style={{ display: 'flex', gap: 12 }}>
                <label><input type="radio" name="legacyRole" checked={legacyRole==='admin'} onChange={() => setLegacyRole('admin')} /> ผู้ดูแลระบบ</label>
                <label><input type="radio" name="legacyRole" checked={legacyRole==='senior'} onChange={() => setLegacyRole('senior')} /> ผู้เล่นผู้สูงอายุ</label>
              </div>
              {legacyRole==='senior' && <small>หมายเหตุ: กรอก “รหัสผู้ใช้ (เช่น SU123)” ในช่องอีเมล</small>}
            </div>
            <button type="submit" disabled={loading}>
              {loading ? '⏳ เข้าสู่ระบบ...' : 'เข้าสู่ระบบแบบเดิม'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default Login;
