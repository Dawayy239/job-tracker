import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from './supabaseClient';
import './App.css';

const STATUS_OPTIONS = ['รอติดต่อกลับ', 'มีการติดต่อมา', 'ทำแบบทดสอบ', 'นัดสัมภาษณ์', 'ได้รับ Offer', 'ปฏิเสธ Offer', 'ไม่ผ่าน'];
const WORK_MODES = ['On-site', 'Hybrid', 'Remote'];
const SALARY_RANGES = ['ไม่ระบุ', 'น้อยกว่า 15,000 ฿', '15,000 - 18,000 ฿', '18,000 - 20,000 ฿', '20,000 - 25,000 ฿', '25,000 - 30,000 ฿', '30,000 - 35,000 ฿', '35,000 - 40,000 ฿', '40,000 - 45,000 ฿', '45,000 - 50,000 ฿', '50,000 - 60,000 ฿', '60,000 - 70,000 ฿', '70,000 - 80,000 ฿', '80,000 - 100,000 ฿', 'มากกว่า 100,000 ฿'];

const STATUS_BADGES = {
  'รอติดต่อกลับ': 'xp-badge-waiting',
  'มีการติดต่อมา': 'xp-badge-contact',
  'ทำแบบทดสอบ': 'xp-badge-test',
  'นัดสัมภาษณ์': 'xp-badge-interview',
  'ได้รับ Offer': 'xp-badge-offer',
  'ปฏิเสธ Offer': 'xp-badge-decline',
  'ไม่ผ่าน': 'xp-badge-reject',
};

// 💡 ย้าย XPWindow ออกมาด้านนอก เพื่อป้องกันการ Re-render และ Scroll เด้งกลับ
const XPWindow = ({ title, icon, children, width = 600, height = 'auto', windowId, zIndex = 10, onClose, className = '', isMobile, windowPositions, activeWindow, onMouseDown }) => {
  const pos = windowPositions[windowId] || { x: 100, y: 20 };

  if (isMobile) {
    return (
      <div className={`xp-window-mobile ${className}`}>
        <div className="xp-title-bar-mobile">
          <div className="xp-title-icon">{icon}</div>
          <div className="xp-title-text">{title}</div>
        </div>
        <div className="xp-window-content-mobile">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`xp-window ${className}`}
      style={{
        width, height, top: pos.y, left: pos.x,
        zIndex: activeWindow === windowId ? 20 : zIndex,
        position: 'absolute'
      }}
    >
      <div
        className={`xp-title-bar ${activeWindow === windowId ? '' : 'inactive'}`}
        onMouseDown={(e) => onMouseDown(e, windowId)}
        style={{ cursor: 'move' }}
      >
        <div className="xp-title-icon">{icon}</div>
        <div className="xp-title-text">{title}</div>
        <div className="xp-window-buttons">
          <button className="xp-win-btn">_</button>
          <button className="xp-win-btn">□</button>
          {onClose && <button className="xp-win-btn close" onClick={onClose}>×</button>}
        </div>
      </div>
      <div className="xp-window-content xp-scroll">
        {children}
      </div>
    </div>
  );
};

// 💡 ย้าย XPDialog ออกมาด้านนอกเช่นกัน
const XPDialog = ({ icon, message, onConfirm, onCancel, confirmText = 'ตกลง', cancelText = 'ยกเลิก', danger = false }) => (
  <div className="xp-dialog-overlay">
    <div className="xp-dialog xp-animate-open">
      <div className="xp-title-bar">
        <div className="xp-title-icon">💻</div>
        <div className="xp-title-text">Job Tracker</div>
      </div>
      <div className="xp-dialog-content">
        <div className="xp-dialog-icon">{icon}</div>
        <div style={{ fontSize: '11px', lineHeight: '1.5' }}>{message}</div>
      </div>
      <div className="xp-dialog-buttons">
        <button className={`xp-button ${danger ? 'danger' : 'primary'}`} onClick={onConfirm}>{confirmText}</button>
        {onCancel && <button className="xp-button" onClick={onCancel}>{cancelText}</button>}
      </div>
    </div>
  </div>
);

export default function App() {
  // 🔐 Auth State
  const [session, setSession] = useState(null);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  // 📊 Jobs State
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [sortBy, setSortBy] = useState('newest');
  const [itemToDelete, setItemToDelete] = useState(null);

  const initialForm = {
    company: '', position: '', status: 'รอติดต่อกลับ',
    date: new Date().toISOString().split('T')[0],
    salary: 'ไม่ระบุ', workMode: 'Hybrid', link: '', notes: ''
  };
  const [formData, setFormData] = useState(initialForm);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  // 🖥️ XP Desktop State
  const [clock, setClock] = useState(new Date());
  const [activeWindow, setActiveWindow] = useState('main');
  const [windowPositions, setWindowPositions] = useState({
    main: { x: 100, y: 30 },
    stats: { x: 600, y: 30 },
    list: { x: 600, y: 230 }
  });
  const [isMobile, setIsMobile] = useState(false);

  // 🖱️ Drag State
  const dragRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // 📱 Detect Mobile
  useEffect(() => {
    const checkMobile = () => { setIsMobile(window.innerWidth <= 768); };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ⏱️ Clock Timer
  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setIsAuthLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) fetchJobs();
  }, [session]);

  const handleAuth = async (e) => {
    e.preventDefault();
    if(username.length < 3) { setAuthError('ชื่อผู้ใช้งานต้องมีความยาวอย่างน้อย 3 ตัวอักษร'); return; }
    if(password.length < 6) { setAuthError('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร'); return; }
    try {
      setIsAuthLoading(true); setAuthError('');
      const fakeEmail = `${username}@app.com`;
      if (isLoginMode) {
        const { error } = await supabase.auth.signInWithPassword({ email: fakeEmail, password });
        if (error) throw error;
        showToast('เข้าสู่ระบบสำเร็จ! ยินดีต้อนรับครับ', 'success');
      } else {
        const { error } = await supabase.auth.signUp({ email: fakeEmail, password });
        if (error) throw error;
        showToast('สมัครสมาชิกสำเร็จ! เข้าสู่ระบบได้เลย', 'success');
      }
    } catch (error) {
      setAuthError(isLoginMode ? 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง' : 'เกิดข้อผิดพลาดในการสมัครสมาชิก');
    } finally { setIsAuthLoading(false); }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) { setJobs([]); setSession(null); showToast('ออกจากระบบเรียบร้อยแล้ว', 'success'); }
  };

  // CRUD
  const fetchJobs = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.from('jobs').select('*').order('updated_at', { ascending: false });
      if (error) throw error;
      setJobs(data || []);
    } catch (error) { showToast('ดึงข้อมูลล้มเหลว กรุณาลองใหม่', 'error'); }
    finally { setIsLoading(false); }
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.company || !formData.position) {
      showToast('กรุณากรอกชื่อบริษัทและตำแหน่งให้ครบถ้วนครับ', 'error'); return;
    }
    try {
      if (isEditing) {
        const { id, created_at, user_id, ...updateData } = formData;
        updateData.updated_at = new Date().toISOString();
        const { error } = await supabase.from('jobs').update(updateData).eq('id', editId);
        if (error) throw error;
        showToast('อัปเดตข้อมูลสำเร็จ!', 'success');
      } else {
        const { error } = await supabase.from('jobs').insert([formData]);
        if (error) throw error;
        showToast('เพิ่มประวัติลง Cloud เรียบร้อย!', 'success');
      }
      setFormData(initialForm); setIsEditing(false); setEditId(null); fetchJobs();
    } catch (error) { showToast('เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error'); console.error(error); }
  };

  const handleEdit = (job) => {
    setFormData(job); setIsEditing(true); setEditId(job.id);
    setActiveWindow('main');
    if (!isMobile) {
      setTimeout(() => {
        const formElement = document.querySelector('.xp-form-container');
        if (formElement) formElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  };

  const executeDelete = async () => {
    if(itemToDelete) {
      try {
        const { error } = await supabase.from('jobs').delete().eq('id', itemToDelete);
        if (error) throw error;
        if (isEditing && editId === itemToDelete) { setIsEditing(false); setFormData(initialForm); }
        showToast('ลบข้อมูลออกจากระบบแล้ว', 'error');
        setItemToDelete(null); fetchJobs();
      } catch (error) { showToast('เกิดข้อผิดพลาดในการลบ', 'error'); }
    }
  };

  const handleQuickStatusChange = async (id, newStatus) => {
    try {
      const { error } = await supabase.from('jobs').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
      if(newStatus === 'ได้รับ Offer') showToast('ยินดีด้วยครับ! ได้รับ Offer แล้ว', 'success');
      else showToast(`อัปเดตสถานะเป็น ${newStatus} แล้ว`, 'success');
      fetchJobs();
    } catch (error) { showToast('อัปเดตสถานะล้มเหลว', 'error'); }
  };

  const filteredJobs = useMemo(() => {
    let result = jobs.filter(job => {
      const matchSearch = job.company.toLowerCase().includes(searchTerm.toLowerCase()) || job.position.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = filterStatus === 'All' || job.status === filterStatus;
      return matchSearch && matchStatus;
    });
    if (sortBy === 'newest') result.sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));
    if (sortBy === 'oldest') result.sort((a, b) => new Date(a.updated_at || a.created_at) - new Date(b.updated_at || b.created_at));
    if (sortBy === 'a-z') result.sort((a, b) => a.company.localeCompare(b.company));
    return result;
  }, [jobs, searchTerm, filterStatus, sortBy]);

  const stats = useMemo(() => ({
    total: jobs.length,
    interview: jobs.filter(j => j.status === 'นัดสัมภาษณ์').length,
    offer: jobs.filter(j => j.status === 'ได้รับ Offer').length,
    rejected: jobs.filter(j => j.status === 'ไม่ผ่าน' || j.status === 'ปฏิเสธ Offer').length,
  }), [jobs]);

  // 🖱️ Drag Handlers (Desktop only)
  const handleMouseDown = useCallback((e, windowId) => {
    if (isMobile) return;
    if (e.target.closest('.xp-win-btn')) return;
    setActiveWindow(windowId);
    setIsDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    dragRef.current = windowId;
  }, [isMobile]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging || !dragRef.current || isMobile) return;
    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;
    setWindowPositions(prev => ({
      ...prev,
      [dragRef.current]: {
        x: Math.max(0, Math.min(newX, window.innerWidth - 300)),
        y: Math.max(0, Math.min(newY, window.innerHeight - 100))
      }
    }));
  }, [isDragging, dragOffset, isMobile]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    dragRef.current = null;
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);


  // ⏳ Loading
  if (isAuthLoading) {
    return (
      <div className="xp-login-screen">
        <div className="xp-loading">
          <div className="xp-hourglass"></div>
          <span>กำลังโหลดระบบ...</span>
        </div>
      </div>
    );
  }

  // 🔐 XP Login Screen
  if (!session) {
    return (
      <div className="xp-login-screen">
        {toast.show && (
          <div className="xp-balloon" style={{ top: '20px', right: '20px', left: 'auto', bottom: 'auto' }}>
            {toast.message}
          </div>
        )}
        <div className="xp-login-box xp-animate-open">
          <div className="xp-login-title">Job Tracker 🍏</div>
          <div className="xp-login-user-icon">👤</div>
          <div style={{ color: 'white', fontSize: '14px', fontWeight: 'bold', marginBottom: '16px', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
            {isLoginMode ? 'เข้าสู่ระบบ' : 'สร้างบัญชีใหม่'}
          </div>

          {authError && (
            <div style={{ marginBottom: '12px', padding: '8px', background: '#FFFFE1', border: '1px solid #000', borderRadius: '4px', fontSize: '11px', color: '#C00000', textAlign: 'left' }}>
              ⚠️ {authError}
            </div>
          )}

          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div className="xp-flex xp-items-center xp-gap-2">
              <label style={{ color: 'white', fontSize: '11px', width: '80px', textAlign: 'right', textShadow: '1px 1px 0 rgba(0,0,0,0.3)' }}>Username:</label>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="xp-input" style={{ flex: 1 }} required />
            </div>
            <div className="xp-flex xp-items-center xp-gap-2">
              <label style={{ color: 'white', fontSize: '11px', width: '80px', textAlign: 'right', textShadow: '1px 1px 0 rgba(0,0,0,0.3)' }}>Password:</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="xp-input" style={{ flex: 1 }} required />
            </div>
            <div className="xp-flex xp-justify-center xp-gap-2 xp-mt-2">
              <button type="submit" disabled={isAuthLoading} className="xp-button primary" style={{ minWidth: '80px' }}>
                {isAuthLoading ? '...' : (isLoginMode ? 'OK' : 'สมัคร')}
              </button>
              <button type="button" className="xp-button" onClick={() => { setIsLoginMode(!isLoginMode); setAuthError(''); }}>
                {isLoginMode ? 'สมัคร' : 'เข้าสู่ระบบ'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // 🖥️ XP Desktop
  return (
    <div className="xp-desktop">
      {/* Desktop Icons - Hidden on mobile */}
      {!isMobile && (
        <div className="xp-desktop-icons">
          <div className="xp-desktop-icon selected">
            <div className="xp-desktop-icon-img">💼</div>
            <div className="xp-desktop-icon-label">Job Tracker</div>
          </div>
          <div className="xp-desktop-icon">
            <div className="xp-desktop-icon-img">🗑️</div>
            <div className="xp-desktop-icon-label">Recycle Bin</div>
          </div>
          <div className="xp-desktop-icon">
            <div className="xp-desktop-icon-img">💻</div>
            <div className="xp-desktop-icon-label">My Computer</div>
          </div>
        </div>
      )}

      {/* Delete Dialog */}
      {itemToDelete && (
        <XPDialog
          icon="🗑️"
          message="แน่ใจหรือไม่ว่าต้องการลบข้อมูลนี้? ข้อมูลจะถูกลบออกจาก Database อย่างถาวร"
          onConfirm={executeDelete}
          onCancel={() => setItemToDelete(null)}
          confirmText="ใช่, ลบเลย"
          cancelText="ยกเลิก"
          danger={true}
        />
      )}

      {/* Toast Balloon */}
      {toast.show && (
        <div className="xp-balloon" style={{ top: 'auto', bottom: isMobile ? '70px' : '40px', right: '10px' }}>
          <strong>{toast.type === 'error' ? 'แจ้งเตือน' : 'สำเร็จ'}</strong><br/>
          {toast.message}
        </div>
      )}

      {/* Mobile Layout */}
      {isMobile ? (
        <div className="xp-mobile-container">
          {/* Mobile Stats Bar */}
          <div className="xp-mobile-stats">
            <div className="xp-mobile-stat">
              <span className="xp-mobile-stat-value">{stats.total}</span>
              <span className="xp-mobile-stat-label">ทั้งหมด</span>
            </div>
            <div className="xp-mobile-stat">
              <span className="xp-mobile-stat-value" style={{color: '#0066CC'}}>{stats.interview}</span>
              <span className="xp-mobile-stat-label">สัมภาษณ์</span>
            </div>
            <div className="xp-mobile-stat">
              <span className="xp-mobile-stat-value" style={{color: '#1B5E20'}}>{stats.offer}</span>
              <span className="xp-mobile-stat-label">Offer</span>
            </div>
            <div className="xp-mobile-stat">
              <span className="xp-mobile-stat-value" style={{color: '#C00000'}}>{stats.rejected}</span>
              <span className="xp-mobile-stat-label">ไม่ผ่าน</span>
            </div>
          </div>

          {/* Mobile Form */}
          <XPWindow
            title={isEditing ? "Edit Job" : "Add New Job"}
            icon={isEditing ? "✏️" : "✨"}
            windowId="main"
            isMobile={isMobile}
            windowPositions={windowPositions}
            activeWindow={activeWindow}
            onMouseDown={handleMouseDown}
          >
            <div className="xp-form-container">
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div className="xp-groupbox">
                  <div className="xp-groupbox-title">ข้อมูลบริษัท</div>
                  <div className="xp-mb-1">
                    <label style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '2px' }}>ชื่อบริษัท *</label>
                    <input type="text" name="company" value={formData.company} onChange={handleChange} className="xp-input xp-w-full" placeholder="เช่น Google, Agoda" required />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '2px' }}>ตำแหน่งที่สมัคร *</label>
                    <input type="text" name="position" value={formData.position} onChange={handleChange} className="xp-input xp-w-full" placeholder="เช่น Senior Frontend" required />
                  </div>
                </div>

                <div className="xp-grid-2">
                  <div className="xp-groupbox" style={{ margin: 0 }}>
                    <div className="xp-groupbox-title">สถานะ & รูปแบบ</div>
                    <div className="xp-mb-1">
                      <label style={{ fontSize: '11px', display: 'block', marginBottom: '2px' }}>สถานะ</label>
                      <select name="status" value={formData.status} onChange={handleChange} className="xp-select xp-w-full">
                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', display: 'block', marginBottom: '2px' }}>รูปแบบงาน</label>
                      <select name="workMode" value={formData.workMode} onChange={handleChange} className="xp-select xp-w-full">
                        {WORK_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="xp-groupbox" style={{ margin: 0 }}>
                    <div className="xp-groupbox-title">รายละเอียด</div>
                    <div className="xp-mb-1">
                      <label style={{ fontSize: '11px', display: 'block', marginBottom: '2px' }}>เงินเดือน</label>
                      <select name="salary" value={formData.salary} onChange={handleChange} className="xp-select xp-w-full">
                        {SALARY_RANGES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', display: 'block', marginBottom: '2px' }}>วันที่สมัคร</label>
                      <input type="date" name="date" value={formData.date} onChange={handleChange} className="xp-input xp-w-full" />
                    </div>
                  </div>
                </div>

                <div className="xp-groupbox">
                  <div className="xp-groupbox-title">ข้อมูลเพิ่มเติม</div>
                  <div className="xp-mb-1">
                    <label style={{ fontSize: '11px', display: 'block', marginBottom: '2px' }}>ลิงก์ประกาศงาน</label>
                    <input type="url" name="link" value={formData.link || ''} onChange={handleChange} className="xp-input xp-w-full" placeholder="https://..." />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', display: 'block', marginBottom: '2px' }}>บันทึกเพิ่มเติม</label>
                    <textarea name="notes" value={formData.notes || ''} onChange={handleChange} placeholder="เทคโนโลยีที่ใช้, คำถามที่เจอ..." rows="3" className="xp-textarea xp-w-full"></textarea>
                  </div>
                </div>

                <div className="xp-flex xp-gap-2 xp-justify-center xp-mt-1">
                  <button type="submit" disabled={isLoading} className="xp-button primary">
                    {isLoading ? '...' : (isEditing ? '💾 บันทึก' : '+ เพิ่มประวัติ')}
                  </button>
                  {isEditing && (
                    <button type="button" onClick={() => { setIsEditing(false); setFormData(initialForm); }} className="xp-button">ยกเลิก</button>
                  )}
                </div>
              </form>
            </div>
          </XPWindow>

          {/* Mobile Job List */}
          <XPWindow
            title="Job Applications"
            icon="📁"
            windowId="list"
            isMobile={isMobile}
            windowPositions={windowPositions}
            activeWindow={activeWindow}
            onMouseDown={handleMouseDown}
          >
            <div className="xp-menubar xp-mb-2">
              <div className="xp-menu-item">File</div>
              <div className="xp-menu-item">Edit</div>
              <div className="xp-menu-item">View</div>
              <div className="xp-menu-item">Help</div>
            </div>

            <div className="xp-flex xp-gap-2 xp-mb-2">
              <input type="text" placeholder="ค้นหา..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="xp-input xp-flex-1" />
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="xp-select" style={{ width: '80px' }}>
                <option value="newest">ล่าสุด</option>
                <option value="oldest">เก่าสุด</option>
                <option value="a-z">A-Z</option>
              </select>
            </div>

            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="xp-select xp-w-full xp-mb-2">
              <option value="All">📌 ทุกสถานะ</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            {isLoading && jobs.length === 0 ? (
              <div className="xp-loading">
                <div className="xp-hourglass"></div>
                <span>กำลังดึงข้อมูล...</span>
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="xp-list" style={{ height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#808080' }}>
                ยังไม่มีประวัติ
              </div>
            ) : (
              <div className="xp-list xp-scroll" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {filteredJobs.map((job) => (
                  <div key={job.id} className="xp-list-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px', padding: '10px' }}>
                    <div className="xp-flex xp-justify-between xp-w-full xp-items-center">
                      <strong style={{ fontSize: '13px' }}>{job.company}</strong>
                      <div className="xp-flex xp-gap-1">
                        <button onClick={() => handleEdit(job)} className="xp-button" style={{ padding: '2px 8px', fontSize: '11px' }}>✏️</button>
                        <button onClick={() => setItemToDelete(job.id)} className="xp-button danger" style={{ padding: '2px 8px', fontSize: '11px' }}>🗑️</button>
                      </div>
                    </div>
                    <div style={{ fontSize: '12px', color: '#0054E3', fontWeight: 'bold' }}>{job.position}</div>
                    <div className="xp-flex xp-gap-2 xp-wrap">
                      <span className={`xp-badge ${STATUS_BADGES[job.status] || 'xp-badge-waiting'}`}>{job.status}</span>
                      <span className="xp-badge" style={{ background: '#F0F0F0', borderColor: '#808080' }}>{job.workMode}</span>
                    </div>
                    <div className="xp-flex xp-gap-3" style={{ fontSize: '11px', color: '#404040' }}>
                      <span>🗓 {job.date}</span>
                      {job.salary && job.salary !== 'ไม่ระบุ' && <span>💰 {job.salary}</span>}
                    </div>
                    {job.link && <a href={job.link} target="_blank" rel="noopener noreferrer" style={{ color: '#0054E3', fontSize: '11px' }}>🔗 ดูประกาศงาน</a>}
                    {job.notes && <div style={{ fontSize: '11px', color: '#606060', background: '#F8F8F8', padding: '4px', border: '1px solid #E0E0E0', width: '100%' }}>📝 {job.notes}</div>}
                    <div className="xp-flex xp-gap-1 xp-mt-1 xp-items-center">
                      <label style={{ fontSize: '11px' }}>สถานะ:</label>
                      <select value={job.status} onChange={(e) => handleQuickStatusChange(job.id, e.target.value)} className="xp-select" style={{ fontSize: '11px', padding: '2px 4px', minHeight: '20px' }}>
                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="xp-status-bar xp-mt-2">
              <div className="xp-status-panel">รายการ: {filteredJobs.length} จาก {jobs.length}</div>
              <div className="xp-status-panel" style={{ flex: '0 0 auto', width: '60px', justifyContent: 'center' }}>Ready</div>
            </div>
          </XPWindow>
        </div>
      ) : (
        /* Desktop Layout */
        <>
          {/* Main Window - Job Tracker */}
          <XPWindow
            title={isEditing ? "Edit Job Application" : "Job Tracker - Add New"}
            icon={isEditing ? "✏️" : "✨"}
            width={480}
            height="auto"
            windowId="main"
            zIndex={10}
            isMobile={isMobile}
            windowPositions={windowPositions}
            activeWindow={activeWindow}
            onMouseDown={handleMouseDown}
          >
            <div className="xp-form-container">
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div className="xp-groupbox">
                  <div className="xp-groupbox-title">ข้อมูลบริษัท</div>
                  <div className="xp-mb-1">
                    <label style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '2px' }}>ชื่อบริษัท *</label>
                    <input type="text" name="company" value={formData.company} onChange={handleChange} className="xp-input xp-w-full" placeholder="เช่น Google, Agoda" required />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '2px' }}>ตำแหน่งที่สมัคร *</label>
                    <input type="text" name="position" value={formData.position} onChange={handleChange} className="xp-input xp-w-full" placeholder="เช่น Senior Frontend" required />
                  </div>
                </div>

                <div className="xp-grid-2">
                  <div className="xp-groupbox" style={{ margin: 0 }}>
                    <div className="xp-groupbox-title">สถานะ & รูปแบบ</div>
                    <div className="xp-mb-1">
                      <label style={{ fontSize: '11px', display: 'block', marginBottom: '2px' }}>สถานะ</label>
                      <select name="status" value={formData.status} onChange={handleChange} className="xp-select xp-w-full">
                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', display: 'block', marginBottom: '2px' }}>รูปแบบงาน</label>
                      <select name="workMode" value={formData.workMode} onChange={handleChange} className="xp-select xp-w-full">
                        {WORK_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="xp-groupbox" style={{ margin: 0 }}>
                    <div className="xp-groupbox-title">รายละเอียด</div>
                    <div className="xp-mb-1">
                      <label style={{ fontSize: '11px', display: 'block', marginBottom: '2px' }}>เงินเดือน</label>
                      <select name="salary" value={formData.salary} onChange={handleChange} className="xp-select xp-w-full">
                        {SALARY_RANGES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', display: 'block', marginBottom: '2px' }}>วันที่สมัคร</label>
                      <input type="date" name="date" value={formData.date} onChange={handleChange} className="xp-input xp-w-full" />
                    </div>
                  </div>
                </div>

                <div className="xp-groupbox">
                  <div className="xp-groupbox-title">ข้อมูลเพิ่มเติม</div>
                  <div className="xp-mb-1">
                    <label style={{ fontSize: '11px', display: 'block', marginBottom: '2px' }}>ลิงก์ประกาศงาน</label>
                    <input type="url" name="link" value={formData.link || ''} onChange={handleChange} className="xp-input xp-w-full" placeholder="https://..." />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', display: 'block', marginBottom: '2px' }}>บันทึกเพิ่มเติม</label>
                    <textarea name="notes" value={formData.notes || ''} onChange={handleChange} placeholder="เทคโนโลยีที่ใช้, คำถามที่เจอ..." rows="3" className="xp-textarea xp-w-full"></textarea>
                  </div>
                </div>

                <div className="xp-flex xp-gap-2 xp-justify-center xp-mt-1">
                  <button type="submit" disabled={isLoading} className="xp-button primary">
                    {isLoading ? '...' : (isEditing ? '💾 บันทึก' : '+ เพิ่มประวัติ')}
                  </button>
                  {isEditing && (
                    <button type="button" onClick={() => { setIsEditing(false); setFormData(initialForm); }} className="xp-button">ยกเลิก</button>
                  )}
                </div>
              </form>
            </div>
          </XPWindow>

          {/* Window - Statistics */}
          <XPWindow
            title="Statistics"
            icon="📊"
            width={280}
            height="auto"
            windowId="stats"
            zIndex={10}
            isMobile={isMobile}
            windowPositions={windowPositions}
            activeWindow={activeWindow}
            onMouseDown={handleMouseDown}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div className="xp-groupbox" style={{ margin: 0, textAlign: 'center' }}>
                <div className="xp-groupbox-title">ทั้งหมด</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0054E3' }}>{stats.total}</div>
              </div>
              <div className="xp-groupbox" style={{ margin: 0, textAlign: 'center' }}>
                <div className="xp-groupbox-title">สัมภาษณ์</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0066CC' }}>{stats.interview}</div>
              </div>
              <div className="xp-groupbox" style={{ margin: 0, textAlign: 'center' }}>
                <div className="xp-groupbox-title">Offer</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1B5E20' }}>{stats.offer}</div>
              </div>
              <div className="xp-groupbox" style={{ margin: 0, textAlign: 'center' }}>
                <div className="xp-groupbox-title">ไม่ผ่าน</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#C00000' }}>{stats.rejected}</div>
              </div>
            </div>
          </XPWindow>

          {/* Window - Job List */}
          <XPWindow
            title="Job Applications"
            icon="📁"
            width={560}
            height={440}
            windowId="list"
            zIndex={10}
            isMobile={isMobile}
            windowPositions={windowPositions}
            activeWindow={activeWindow}
            onMouseDown={handleMouseDown}
          >
            <div className="xp-menubar xp-mb-2">
              <div className="xp-menu-item">File</div>
              <div className="xp-menu-item">Edit</div>
              <div className="xp-menu-item">View</div>
              <div className="xp-menu-item">Help</div>
            </div>

            <div className="xp-flex xp-gap-2 xp-mb-2">
              <input type="text" placeholder="ค้นหาบริษัท หรือ ตำแหน่ง..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="xp-input xp-flex-1" />
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="xp-select" style={{ width: '90px' }}>
                <option value="newest">ล่าสุด</option>
                <option value="oldest">เก่าสุด</option>
                <option value="a-z">A-Z</option>
              </select>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="xp-select" style={{ width: '110px' }}>
                <option value="All">ทุกสถานะ</option>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {isLoading && jobs.length === 0 ? (
              <div className="xp-loading">
                <div className="xp-hourglass"></div>
                <span>กำลังดึงข้อมูลจาก Cloud Database...</span>
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="xp-list" style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#808080' }}>
                ยังไม่มีประวัติใน Database ครับ
              </div>
            ) : (
              <div className="xp-list xp-scroll" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                {filteredJobs.map((job) => (
                  <div key={job.id} className="xp-list-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px', padding: '8px' }}>
                    <div className="xp-flex xp-justify-between xp-w-full xp-items-center">
                      <div className="xp-flex xp-gap-2 xp-items-center">
                        <strong style={{ fontSize: '12px' }}>{job.company}</strong>
                        <span className={`xp-badge ${STATUS_BADGES[job.status] || 'xp-badge-waiting'}`}>{job.status}</span>
                        <span className="xp-badge" style={{ background: '#F0F0F0', borderColor: '#808080' }}>{job.workMode}</span>
                      </div>
                      <div className="xp-flex xp-gap-1">
                        <button onClick={() => handleEdit(job)} className="xp-button" style={{ padding: '1px 6px', fontSize: '10px' }}>✏️ แก้ไข</button>
                        <button onClick={() => setItemToDelete(job.id)} className="xp-button danger" style={{ padding: '1px 6px', fontSize: '10px' }}>🗑️ ลบ</button>
                      </div>
                    </div>
                    <div style={{ fontSize: '11px', color: '#0054E3', fontWeight: 'bold' }}>{job.position}</div>
                    <div className="xp-flex xp-gap-3" style={{ fontSize: '10px', color: '#404040' }}>
                      <span>🗓 {job.date}</span>
                      {job.salary && job.salary !== 'ไม่ระบุ' && <span>💰 {job.salary}</span>}
                      {job.link && <a href={job.link} target="_blank" rel="noopener noreferrer" style={{ color: '#0054E3' }}>🔗 ดูประกาศงาน</a>}
                    </div>
                    {job.notes && <div style={{ fontSize: '10px', color: '#606060', background: '#F8F8F8', padding: '4px', border: '1px solid #E0E0E0', width: '100%' }}>📝 {job.notes}</div>}
                    <div className="xp-flex xp-gap-1 xp-mt-1">
                      <label style={{ fontSize: '10px' }}>เปลี่ยนสถานะ:</label>
                      <select value={job.status} onChange={(e) => handleQuickStatusChange(job.id, e.target.value)} className="xp-select" style={{ fontSize: '10px', padding: '1px 2px', minHeight: '18px' }}>
                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="xp-status-bar xp-mt-2">
              <div className="xp-status-panel">รายการ: {filteredJobs.length} จาก {jobs.length}</div>
              <div className="xp-status-panel" style={{ flex: '0 0 auto', width: '80px', justifyContent: 'center' }}>Ready</div>
            </div>
          </XPWindow>
        </>
      )}

      {/* Taskbar */}
      <div className="xp-taskbar">
        <button className="xp-start-button">
          <div className="xp-start-icon">🍏</div>
          <span>start</span>
        </button>
        <div className="xp-taskbar-divider"></div>
        <div className="xp-taskbar-user">
          {session.user?.email?.split('@')[0] || 'User'}
        </div>
        <div className="xp-taskbar-divider"></div>
        <button onClick={handleLogout} className="xp-start-button" style={{ borderRadius: '4px', background: 'linear-gradient(180deg, #FF6B6B 0%, #C00000 100%)', borderColor: '#800000' }}>
          <span>ออกจากระบบ</span>
        </button>
        <div className="xp-taskbar-clock">
          <span>🔊</span>
          <span>{clock.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>
    </div>
  );
}