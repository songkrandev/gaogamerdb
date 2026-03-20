import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../services/api';
import { useDialog } from '../components/DialogProvider';
import '../styles/AdminDashboard.css';

function AdminDashboard({ onLogout }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sidebarCollapsed] = useState(false);
  const [newUser, setNewUser] = useState({
    full_name: '',
    email: '',
    address: '',
    phone: '',
    password: ''
  });
  const [editingUser, setEditingUser] = useState(null);
  const [scores, setScores] = useState([]);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  // Report states
  const [reportStart, setReportStart] = useState('');
  const [reportEnd, setReportEnd] = useState('');
  const [summary, setSummary] = useState([]);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetails, setUserDetails] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const { confirm } = useDialog();
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
    const intervalId = setInterval(loadData, 5000);

    return () => clearInterval(intervalId);
  }, [activeTab]);

  // Auto-clear messages
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const loadData = async () => {
    try {
      const [usersRes, statsRes, scoresRes] = await Promise.all([
        adminAPI.getAllUsers(),
        adminAPI.getStats(),
        adminAPI.getAllScores()
      ]);
      setUsers(usersRes.data.data);
      setStats(statsRes.data.data);
      setScores(scoresRes.data.data || []);
    } catch (err) {
      setError('ไม่สามารถโหลดข้อมูลได้');
    }
  };

  // Fetch summarized usage by user
  const fetchSummary = async () => {
    try {
      setSummaryLoading(true);
      const res = await adminAPI.getScoreSummary(reportStart, reportEnd);
      setSummary(res.data.data || []);
    } catch (e) {
      // Fallback: สรุปจากคะแนนทั้งหมดที่มีในระบบฝั่ง client
      try {
        const scoresRes = await adminAPI.getAllScores();
        const items = scoresRes.data.data || [];
        const inRange = (iso) => {
          const d = new Date(iso);
          if (reportStart) {
            const s = new Date(reportStart);
            if (d < new Date(s.getFullYear(), s.getMonth(), s.getDate(), 0, 0, 0)) return false;
          }
          if (reportEnd) {
            const eDate = new Date(reportEnd);
            if (d > new Date(eDate.getFullYear(), eDate.getMonth(), eDate.getDate(), 23, 59, 59)) return false;
          }
          return true;
        };
        const map = {};
        for (const s of items) {
          if (!inRange(s.created_at)) continue;
          const uid = s.user_id;
          if (!map[uid]) map[uid] = { user_id: uid, full_name: s.full_name || `User ${uid}`, sessions: 0, plays: 0, sessionSet: new Set() };
          map[uid].plays += 1;
          if (s.session_id && !map[uid].sessionSet.has(s.session_id)) {
            map[uid].sessionSet.add(s.session_id);
            map[uid].sessions += 1;
          }
        }
        const arr = Object.values(map).sort((a, b) => b.sessions - a.sessions).map(x => {
          delete x.sessionSet;
          return x;
        });
        setSummary(arr);
        if (!arr.length) setError('ยังไม่มีข้อมูลสรุปในช่วงที่เลือก');
      } catch (err2) {
        setError('ไม่สามารถดึงรายงานสรุปได้');
      }
    } finally {
      setSummaryLoading(false);
    }
  };

  const fetchUserDetails = async (user_id, full_name) => {
    try {
      setDetailsLoading(true);
      setSelectedUser({ user_id, full_name });
      const res = await adminAPI.getUserScoreDetails(user_id, reportStart, reportEnd);
      setUserDetails(res.data.data?.scores || []);
    } catch (e) {
      // Fallback: กรองจากคะแนนทั้งหมด
      try {
        const scoresRes = await adminAPI.getAllScores();
        const items = scoresRes.data.data || [];
        const inRange = (iso) => {
          const d = new Date(iso);
          if (reportStart) {
            const s = new Date(reportStart);
            if (d < new Date(s.getFullYear(), s.getMonth(), s.getDate(), 0, 0, 0)) return false;
          }
          if (reportEnd) {
            const eDate = new Date(reportEnd);
            if (d > new Date(eDate.getFullYear(), eDate.getMonth(), eDate.getDate(), 23, 59, 59)) return false;
          }
          return true;
        };
        const details = items.filter(s => s.user_id === user_id && inRange(s.created_at)).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setUserDetails(details);
        if (!details.length) setError('ยังไม่มีรายละเอียดการเล่นในช่วงที่เลือก');
      } catch (err2) {
        setError('ไม่สามารถดึงรายละเอียดได้');
      }
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleDeleteScore = async (score_id) => {
    const ok = await confirm({
      title: 'ยืนยันการลบ',
      message: 'คุณต้องการลบข้อมูลคะแนนนี้ใช่หรือไม่?',
      confirmText: 'ลบ',
      cancelText: 'ยกเลิก'
    });
    if (ok) {
      try {
        await adminAPI.deleteScore(score_id);
        loadData();
        setSuccessMsg('✅ ลบข้อมูลคะแนนสำเร็จ!');
      } catch (err) {
        setError('ไม่สามารถลบข้อมูลคะแนนได้');
      }
    }
  };

  const handleDeleteAllScores = async () => {
    const ok = await confirm({
      title: 'คำเตือน',
      message: 'คุณต้องการลบข้อมูลคะแนนทั้งหมดใช่หรือไม่?\nการกระทำนี้ไม่สามารถย้อนกลับได้',
      variant: 'warning',
      confirmText: 'ลบทั้งหมด',
      cancelText: 'ยกเลิก'
    });
    if (ok) {
      try {
        await adminAPI.deleteAllScores();
        loadData();
        setSuccessMsg('✅ ลบข้อมูลคะแนนทั้งหมดสำเร็จ!');
      } catch (err) {
        setError('ไม่สามารถลบข้อมูลคะแนนทั้งหมดได้');
      }
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await adminAPI.createUser(newUser);
      setNewUser({ full_name: '', email: '', address: '', phone: '', password: '' });
      loadData();
      setSuccessMsg('✅ สร้างผู้ใช้สำเร็จ!');
    } catch (err) {
      setError(err.response?.data?.message || 'ไม่สามารถสร้างผู้ใช้ได้');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    setLoading(true);
    setError('');

    try {
      const updateData = {
        full_name: editingUser.full_name,
        email: editingUser.email,
        address: editingUser.address,
        phone: editingUser.phone
      };
      if (editingUser.newPassword) {
        updateData.password = editingUser.newPassword;
      }
      await adminAPI.updateUser(editingUser.user_id, updateData);
      setEditingUser(null);
      loadData();
      setSuccessMsg('✅ อัปเดตข้อมูลสำเร็จ!');
    } catch (err) {
      setError(err.response?.data?.message || 'ไม่สามารถอัปเดตได้');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (user_id) => {
    const ok = await confirm({
      title: 'ยืนยันการลบ',
      message: 'คุณต้องการลบผู้ใช้นี้ใช่หรือไม่?',
      confirmText: 'ลบ',
      cancelText: 'ยกเลิก'
    });
    if (ok) {
      try {
        await adminAPI.deleteUser(user_id);
        loadData();
        setSuccessMsg('✅ ลบผู้ใช้สำเร็จ!');
      } catch (err) {
        setError('ไม่สามารถลบผู้ใช้ได้');
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userType');
    onLogout();
    navigate('/login');
  };

  const togglePasswordVisibility = (userId) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const filteredUsers = users.filter(user =>
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.user_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.phone?.includes(searchTerm)
  );

  // Sidebar menu items
  const menuItems = [
    { id: 'dashboard', icon: '📊', label: 'แดชบอร์ด' },
    { id: 'users', icon: '👥', label: 'จัดการผู้เล่น' },
    { id: 'scores', icon: '🏆', label: 'ผลการเล่นทั้งหมด' },
    { id: 'reports', icon: '📑', label: 'รายงานสรุปสถิติการใช้งาน' },
  ];

  // Calculate stats for display
  const totalPlayers = stats?.total_senior_users || 0;
  const totalSessions = stats?.total_sessions || 0;
  const avgScore = stats?.average_score || 0;
  const totalScores = stats?.total_scores || 0;
  const gamePopularity = stats?.game_popularity || [];

  const gameNameMap = {
    'traffic_game': 'เกมส์จราจรอัจฉริยะ',
    'catch_game': 'เกมส์จับให้ได้ไล่ให้ทัน',
    'puzzle_game': 'เกมส์ปริศนาตัวเลข',
    'wheel_game': 'เกมส์วงล้อเสี่ยงโชค',
    'decode_game': 'เกมส์ถอดรหัสลับ'
  };
  const getGameName = (k) => gameNameMap[k] || 'เกมส์ไม่ทราบประเภท';

  return (
    <div className={`admin-layout ${sidebarCollapsed ? 'collapsed' : ''}`}>
      {/* ====== SIDEBAR ====== */}
      <aside className="admin-sidebar">
        <div className="sidebar-profile">
          <div className="profile-avatar">👤</div>
          {!sidebarCollapsed && (
            <div className="profile-info">
              <span className="profile-name">ผู้ดูแลระบบ P</span>
              <span className="profile-email">admin@gaogamer.com</span>
            </div>
          )}
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">
            {menuItems.map(item => (
              <button
                key={item.id}
                className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => setActiveTab(item.id)}
              >
                <span className="nav-icon">{item.icon}</span>
                {!sidebarCollapsed && <span className="nav-label">{item.label}</span>}
              </button>
            ))}

          </div>
        </nav>

        <div className="sidebar-footer">
          <button className="logout-sidebar-btn" onClick={handleLogout}>
            <span className="nav-icon">⏻</span>
            {!sidebarCollapsed && <span className="nav-label">ออกจากระบบ</span>}
          </button>
        </div>
      </aside>

      {/* ====== MAIN CONTENT ====== */}
      <main className="admin-main">
        {/* Top Header */}
        <header className="admin-topbar">
          <div className="topbar-left">
            <h2>ยินดีต้อนรับ ผู้ดูแลระบบ !</h2>
          </div>
          <div className="topbar-center">
            <div className="header-search">
              <input type="text" placeholder="ค้นหา..." />
              <span className="search-icon">🔍</span>
            </div>
          </div>
          <div className="topbar-right">
            <div className="header-icons">
              <span className="icon-btn">☀️</span>
              <span className="icon-btn">🌙</span>
              <span className="icon-btn">🔔</span>
            </div>
          </div>
        </header>

        {/* Messages */}
        {error && <div className="alert alert-error">⚠️ {error}</div>}
        {successMsg && <div className="alert alert-success">{successMsg}</div>}

        {/* ====== DASHBOARD TAB ====== */}
        {activeTab === 'dashboard' && (
          <div className="dashboard-content">
            <div className="section-title">ภาพรวมระบบ</div>
            {/* Stat Cards Row */}
            <div className="stat-cards">
              <div className="stat-card card-teal">
                <div className="card-icon-circle">👤</div>
                <div className="stat-card-info">
                  <span className="stat-card-value">{totalPlayers}</span>
                  <span className="stat-card-label">ผู้ใช้งานทั้งหมด</span>
                </div>
              </div>

              <div className="stat-card card-light-teal">
                <div className="card-icon-circle">📋</div>
                <div className="stat-card-info">
                  <span className="stat-card-value">{totalSessions}</span>
                  <span className="stat-card-label">จำนวนการเล่นทั้งหมด</span>
                </div>
              </div>

              <div className="stat-card card-green">
                <div className="card-icon-circle">📈</div>
                <div className="stat-card-info">
                  <span className="stat-card-value">{Math.round(avgScore)}</span>
                  <span className="stat-card-label">คะแนนเฉลี่ย</span>
                </div>
              </div>
            </div>

            {/* Main Dashboard Grid */}
            <div className="dashboard-grid">
              {/* Left Col: No of Users */}
              <div className="grid-card users-card">
                <div className="card-header-simple">
                  <span>จำนวนผู้ใช้งาน</span>
                  <span className="more-icon">⋮</span>
                </div>
                <div className="users-card-content">
                  <div className="user-icon-bg">👤</div>
                  <div className="users-count-big">{totalPlayers}</div>
                  <span className="users-label">ผู้ใช้งานทั้งหมดในระบบ</span>
                </div>
              </div>

              {/* Middle Col: Inventory Values (Pie Chart) */}
              <div className="grid-card pie-chart-card">
                <div className="card-header-simple">สัดส่วนเกมส์ที่เล่น</div>
                <div className="pie-chart-container">
                  {gamePopularity.length > 0 ? (
                    <>
                      <div className="pie-chart-placeholder" style={{
                        background: `conic-gradient(
                          var(--primary-dark) 0% ${(gamePopularity[0]?.value / totalScores) * 100}%,
                          var(--primary-accent) ${(gamePopularity[0]?.value / totalScores) * 100}% ${((gamePopularity[0]?.value + (gamePopularity[1]?.value || 0)) / totalScores) * 100}%,
                          var(--card-icon-bg) ${((gamePopularity[0]?.value + (gamePopularity[1]?.value || 0)) / totalScores) * 100}% 100%
                        )`
                      }}>
                        <div className="pie-segment">{Math.round((gamePopularity[0]?.value / totalScores) * 100)}%</div>
                      </div>
                      <div className="pie-legend">
                        <div className="legend-item"><span className="dot" style={{backgroundColor: 'var(--primary-dark)'}}></span> {getGameName(gamePopularity[0]?.label)}</div>
                        {gamePopularity[1] && <div className="legend-item"><span className="dot" style={{backgroundColor: 'var(--primary-accent)'}}></span> {getGameName(gamePopularity[1]?.label)}</div>}
                        {gamePopularity.length > 2 && <div className="legend-item"><span className="dot" style={{backgroundColor: 'var(--card-icon-bg)'}}></span> อื่นๆ</div>}
                      </div>
                    </>
                  ) : (
                    <div className="empty-chart-msg">ยังไม่มีข้อมูลการเล่นเกมส์</div>
                  )}
                </div>
              </div>

              {/* Right Col: Top Stores (Bar Chart) */}
              <div className="grid-card bar-chart-card">
                <div className="card-header-simple">5 อันดับเกมส์ยอดนิยม</div>
                <div className="bar-chart-container">
                  {gamePopularity.length > 0 ? (
                    gamePopularity.map((item, i) => (
                      <div key={i} className="bar-row">
                        <span className="bar-label">{getGameName(item.label)}</span>
                        <div className="bar-wrapper">
                          <div className="bar-fill" style={{ width: `${(item.value / gamePopularity[0].value) * 100}%` }}></div>
                        </div>
                        <span className="bar-value">{item.value} ครั้ง</span>
                      </div>
                    ))
                  ) : (
                    <div className="empty-chart-msg">ยังไม่มีข้อมูลการเล่นเกม</div>
                  )}
                </div>
              </div>

              {/* Bottom: Expense vs Profit (Line Chart) */}
              <div className="grid-card line-chart-card full-width">
                <div className="card-header-simple">
                  <span>ประสิทธิภาพเทียบกับเป้าหมาย</span>
                  <span className="last-months">6 เดือนที่ผ่านมา</span>
                </div>
                <div className="line-chart-placeholder">
                  <div className="line-chart-svg">
                    {/* Visual line using CSS gradient/border */}
                    <div className="chart-line-1"></div>
                    <div className="chart-line-2"></div>
                    <div className="chart-marker highest-exp">คะแนนสูงสุด</div>
                    <div className="chart-marker highest-profit">เป้าหมาย</div>
                  </div>
                  <div className="chart-months">
                    {['ธ.ค.', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.'].map(m => (
                      <span key={m}>{m}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ====== USERS TAB ====== */}
        {activeTab === 'users' && (
          <div className="users-content">
            {/* Add User Form */}
            <div className="grid-card add-user-card">
              <div className="card-header-simple">
                <h3>{editingUser ? '✏️ แก้ไขข้อมูลผู้เล่น' : '➕ เพิ่มผู้เล่นใหม่'}</h3>
                {editingUser && (
                  <button className="cancel-edit-btn" onClick={() => setEditingUser(null)}>
                    ✕ ยกเลิก
                  </button>
                )}
              </div>
              <form onSubmit={editingUser ? handleUpdateUser : handleAddUser} className="user-form">
                <div className="form-grid">
                  <div className="form-field">
                    <label>ชื่อ-สกุล</label>
                    <input
                      type="text"
                      placeholder="กรอกชื่อและนามสกุล"
                      value={editingUser ? editingUser.full_name : newUser.full_name}
                      onChange={(e) => editingUser
                        ? setEditingUser({ ...editingUser, full_name: e.target.value })
                        : setNewUser({ ...newUser, full_name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label>อีเมล</label>
                    <input
                      type="email"
                      placeholder="example@email.com"
                      value={editingUser ? (editingUser.email || '') : newUser.email}
                      onChange={(e) => editingUser
                        ? setEditingUser({ ...editingUser, email: e.target.value })
                        : setNewUser({ ...newUser, email: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label>เบอร์โทรศัพท์</label>
                    <input
                      type="tel"
                      placeholder="08x-xxx-xxxx"
                      value={editingUser ? editingUser.phone : newUser.phone}
                      onChange={(e) => editingUser
                        ? setEditingUser({ ...editingUser, phone: e.target.value })
                        : setNewUser({ ...newUser, phone: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label>{editingUser ? 'รหัสผ่านใหม่ (เว้นว่างถ้าไม่เปลี่ยน)' : 'รหัสผ่าน'}</label>
                    <input
                      type="text"
                      placeholder={editingUser ? 'รหัสผ่านใหม่' : 'สร้างรหัสผ่าน'}
                      value={editingUser ? (editingUser.newPassword || '') : newUser.password}
                      onChange={(e) => editingUser
                        ? setEditingUser({ ...editingUser, newPassword: e.target.value })
                        : setNewUser({ ...newUser, password: e.target.value })
                      }
                      required={!editingUser}
                    />
                  </div>
                  <div className="form-field full-width">
                    <label>ที่อยู่</label>
                    <textarea
                      placeholder="กรอกที่อยู่ปัจจุบัน"
                      value={editingUser ? editingUser.address : newUser.address}
                      onChange={(e) => editingUser
                        ? setEditingUser({ ...editingUser, address: e.target.value })
                        : setNewUser({ ...newUser, address: e.target.value })
                      }
                      required
                    ></textarea>
                  </div>
                </div>
                <button type="submit" className="submit-user-btn" disabled={loading}>
                  {loading ? '⏳ กำลังบันทึก...' : (editingUser ? '💾 บันทึกการแก้ไข' : '➕ สร้างผู้เล่น')}
                </button>
              </form>
            </div>

            {/* Users Table */}
            <div className="grid-card users-table-card">
              <div className="card-header">
                <h3>📋 รายชื่อผู้เล่น ({filteredUsers.length} คน)</h3>
                <div className="search-box">
                  <span className="search-icon">🔍</span>
                  <input
                    type="text"
                    placeholder="ค้นหาชื่อ, อีเมล, เบอร์โทร..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="table-container">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>ลำดับ</th>
                      <th>ชื่อ-สกุล</th>
                      <th>อีเมล</th>
                      <th>เบอร์โทร</th>
                      <th>รหัสผ่าน</th>
                      <th>ที่อยู่</th>
                      <th>การดำเนินการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user, index) => (
                      <tr key={user.user_id}>
                        <td>
                          <span className="user-id-badge">{index + 1}</span>
                        </td>
                        <td>
                          <div className="user-name-cell">
                            <div className="user-avatar-sm">
                              {(user.full_name || 'U').charAt(0)}
                            </div>
                            <span>{user.full_name}</span>
                          </div>
                        </td>
                        <td className="email-cell">{user.email || '-'}</td>
                        <td>{user.phone}</td>
                        <td>
                          <div className="password-cell">
                            <code className="password-code">
                              {visiblePasswords[user.user_id]
                                ? (user.plain_password || user.password)
                                : '•'.repeat(Math.min((user.plain_password || user.password || '').length, 12))}
                            </code>
                            <button
                              className="eye-btn"
                              onClick={() => togglePasswordVisibility(user.user_id)}
                              title={visiblePasswords[user.user_id] ? 'ซ่อน' : 'แสดง'}
                            >
                              {visiblePasswords[user.user_id] ? '👁️' : '👁️‍🗨️'}
                            </button>
                          </div>
                        </td>
                        <td className="address-cell">{user.address}</td>
                        <td>
                          <div className="action-btns">
                            <button
                              className="action-btn edit-btn"
                              onClick={() => setEditingUser({ ...user })}
                              title="แก้ไข"
                            >
                              ✏️ แก้ไข
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.user_id)}
                              className="action-btn delete-btn"
                              title="ลบ"
                            >
                              🗑️ ลบ
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredUsers.length === 0 && (
                  <div className="empty-table">
                    <p>😔 ไม่พบข้อมูล{searchTerm ? ' ที่ค้นหา' : ''}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ====== SCORES TAB ====== */}
        {activeTab === 'scores' && (
          <div className="scores-content">
            <div className="stat-cards">
              <div className="stat-card card-players">
                <div className="stat-card-icon">🎮</div>
                <div className="stat-card-info">
                  <span className="stat-card-label">รายการคะแนนทั้งหมด</span>
                  <span className="stat-card-value">{scores.length}</span>
                </div>
                <div className="stat-card-trend"><span>รายการ</span></div>
              </div>
              <div className="stat-card card-sessions">
                <div className="stat-card-icon">📊</div>
                <div className="stat-card-info">
                  <span className="stat-card-label">คะแนนเฉลี่ยรวม</span>
                  <span className="stat-card-value">{Math.round(avgScore)}</span>
                </div>
                <div className="stat-card-trend"><span>คะแนน</span></div>
              </div>
              <div className="stat-card card-delete" onClick={handleDeleteAllScores}>
                <div className="stat-card-icon">🗑️</div>
                <div className="stat-card-info">
                  <span className="stat-card-label">ลบข้อมูลทั้งหมด</span>
                  <span className="stat-card-value">&nbsp;</span>
                </div>
              </div>
            </div>

            <div className="dashboard-card full-width">
              <div className="card-header">
                <h3>📊 ตารางผลคะแนนของผู้เล่นทั้งหมด</h3>
                <div className="search-box">
                  <span className="search-icon">🔍</span>
                  <input
                    type="text"
                    placeholder="ค้นหาชื่อ หรือประเภทเกมส์..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="table-container">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>ลำดับ</th>
                      <th>ชื่อผู้เล่น</th>
                      <th>ประเภทเกมส์</th>
                      <th>ระดับ</th>
                      <th>คะแนน</th>
                      <th>วันที่เล่น</th>
                      <th>การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scores
                      .filter(score => 
                        score.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        score.game_type?.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((score, idx) => (
                      <tr key={idx}>
                        <td><span className="user-id-badge">{idx + 1}</span></td>
                        <td>
                          <div className="user-name-cell">
                            <div className="user-avatar-sm">
                              {(score.full_name || 'U').charAt(0)}
                            </div>
                            <span>{score.full_name}</span>
                          </div>
                        </td>
                        <td>{gameNameMap[score.game_type] || score.game_type}</td>
                        <td>{score.level || '-'}</td>
                        <td className="score-cell"><strong>{score.score}</strong></td>
                        <td>{new Date(score.created_at).toLocaleString('th-TH')}</td>
                        <td>
                          <button
                            onClick={() => handleDeleteScore(score.score_id)}
                            className="delete-btn"
                            title="ลบข้อมูลนี้"
                          >
                            🗑️ ลบ
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {scores.length === 0 && (
                  <div className="empty-table">
                    <p>😔 ยังไม่มีข้อมูลคะแนนในระบบ</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ====== REPORTS TAB ====== */}
        {activeTab === 'reports' && (
          <div className="scores-content">
            <div className="dashboard-card">
              <div className="card-header">
                <h3>📑 รายงานสรุปสถิติการใช้งาน</h3>
              </div>
              {/* Filters */}
              <div className="filters-row">
                <div className="date-filter">
                  <label>วันที่เริ่ม</label>
                  <input type="date" value={reportStart} onChange={(e) => setReportStart(e.target.value)} />
                </div>
                <div className="date-filter">
                  <label>ถึงวันที่</label>
                  <input type="date" value={reportEnd} onChange={(e) => setReportEnd(e.target.value)} />
                </div>
                <button className="action-btn query-btn" onClick={fetchSummary} disabled={summaryLoading}>
                  {summaryLoading ? '⏳ กำลังค้นหา...' : '🔎 ดูรายงาน'}
                </button>
              </div>

              {/* Summary by user */}
              <div className="table-container">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>ลำดับ</th>
                      <th>ชื่อผู้เล่น</th>
                      <th>ใช้งานทั้งหมด</th>
                      <th>จำนวนการเล่น</th>
                      <th>รายละเอียด</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.map((row, idx) => (
                      <tr key={row.user_id}>
                        <td><span className="user-id-badge">{idx + 1}</span></td>
                        <td>
                          <button className="link-btn" onClick={() => fetchUserDetails(row.user_id, row.full_name)}>
                            {row.full_name}
                          </button>
                        </td>
                        <td>{row.sessions}</td>
                        <td>{row.plays}</td>
                        <td>
                          <button className="action-btn" onClick={() => fetchUserDetails(row.user_id, row.full_name)}>รายละเอียด</button>
                        </td>
                      </tr>
                    ))}
                    {summary.length === 0 && !summaryLoading && (
                      <tr><td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-light)' }}>ยังไม่มีข้อมูลสรุปในช่วงที่เลือก</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Details for selected user */}
              {selectedUser && (
                <div className="dashboard-card" style={{ marginTop: 20 }}>
                  <div className="card-header-simple">
                    <span>รายละเอียดการเล่นของ {selectedUser.full_name}</span>
                  </div>
                  <div className="table-container">
                    <table className="users-table">
                      <thead>
                        <tr>
                          <th>วันที่</th>
                          <th>เกมส์</th>
                          <th>ระดับ</th>
                          <th>คะแนน</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailsLoading ? (
                          <tr><td colSpan="4" style={{ textAlign: 'center' }}>⏳ กำลังโหลด...</td></tr>
                        ) : (
                          userDetails.map((s, i) => (
                            <tr key={i}>
                              <td>{new Date(s.created_at).toLocaleString('th-TH')}</td>
                              <td>{getGameName(s.game_type)}</td>
                              <td>{s.level || '-'}</td>
                              <td className="score-cell"><strong>{s.score}</strong></td>
                            </tr>
                          ))
                        )}
                        {(!detailsLoading && userDetails.length === 0) && (
                          <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-light)' }}>ยังไม่มีข้อมูล</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default AdminDashboard;
