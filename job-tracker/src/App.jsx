import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from './supabaseClient';
import XPClassicIcons from './XPClassicIcons';
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
const XPWindow = ({ title, icon, menuBar, disableResize, children, width = 600, height = 'auto', windowId, zIndex = 10, onClose, onMinimize, onMaximize, winState, className = '', isMobile, windowPositions, activeWindow, onMouseDown }) => {
  const pos = windowPositions[windowId] || { x: 100, y: 20 };
  const windowRef = useRef(null);
  const [size, setSize] = useState({ width, height });
  const isResizing = useRef(false);

  // Sync size when width/height props change
  useEffect(() => {
    setSize({ width, height });
  }, [width, height]);

  const handleResizeMouseDown = (e) => {
    if (winState?.isMaximized) return;
    e.preventDefault();
    e.stopPropagation();

    isResizing.current = true;
    const startWidth = windowRef.current.offsetWidth;
    const startHeight = windowRef.current.offsetHeight;
    const startX = e.clientX;
    const startY = e.clientY;

    document.body.style.userSelect = 'none';

    const handleMouseMove = (moveEvent) => {
      if (!isResizing.current) return;
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      setSize({
        width: Math.max(350, startWidth + deltaX),
        height: Math.max(200, startHeight + deltaY)
      });
    };

    const handleMouseUp = () => {
      isResizing.current = false;
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // 💡 return null เฉพาะตอนที่ปิดหน้าต่าง (isOpen = false)
  // แต่ถ้าแค่ย่อ (isMinimized = true) เราจะใช้ display: none แทน เพื่อไม่ให้ข้อมูลหาย
  if (winState && !winState.isOpen) return null;

  if (isMobile) {
    if (windowId === 'addJob' || windowId === 'stats') {
      return (
        <div className="xp-mobile-modal-overlay" onClick={(e) => { e.stopPropagation(); onClose(windowId); }}>
          <div className="xp-mobile-modal" onClick={e => e.stopPropagation()}>
            <div className="xp-title-bar-mobile" style={{ borderRadius: '12px 12px 0 0', height: '44px' }}>
              <div className="xp-title-icon">{icon}</div>
              <div className="xp-title-text">{title}</div>
              <div className="xp-window-buttons">
                {onClose && <button className="xp-win-btn close" style={{ width: '32px', height: '32px', fontSize: '18px' }} onClick={(e) => { e.stopPropagation(); onClose(windowId); }}>×</button>}
              </div>
            </div>
            <div className="xp-window-content-mobile xp-scroll">
              {children}
            </div>
          </div>
        </div>
      );
    }

    if (activeWindow !== windowId) return null;

    return (
      <div className={`xp-mobile-main-view ${className}`}>
        <div className="xp-title-bar-mobile" style={{ height: '44px', borderRadius: 0 }}>
          <div className="xp-title-icon">{icon}</div>
          <div className="xp-title-text">{title}</div>
        </div>
        {menuBar && (
          <div style={{ display: 'flex', background: '#ECE9D8', padding: '8px', fontSize: '14px', borderBottom: '1px solid #ACA899', gap: '16px' }}>
            {menuBar}
          </div>
        )}
        <div className="xp-window-content-mobile xp-scroll" style={{ padding: disableResize ? 0 : '10px', display: 'flex', flexDirection: 'column', height: '100%', overflow: windowId === 'main' ? 'hidden' : 'auto', paddingBottom: windowId === 'main' ? '10px' : '40px' }}>
          {children}
        </div>
      </div>
    );
  }

  const isMaximized = winState?.isMaximized;
  // เพิ่มการซ่อนหน้าต่างเมื่อ isMinimized
  const style = isMaximized
    ? { display: winState?.isMinimized ? 'none' : 'flex', width: '100%', height: 'calc(100% - 30px)', top: 0, left: 0, zIndex: activeWindow === windowId ? 20 : zIndex, position: 'absolute' }
    : { display: winState?.isMinimized ? 'none' : 'flex', width: size.width, height: size.height, top: pos.y, left: pos.x, zIndex: activeWindow === windowId ? 20 : zIndex, position: 'absolute' };

  return (
    <div
      ref={windowRef}
      className={`xp-window ${isMaximized ? 'maximized' : ''} ${className}`}
      style={style}
      onMouseDown={(e) => onMouseDown(e, windowId)}
    >
      <div
        className={`xp-title-bar ${activeWindow === windowId ? '' : 'inactive'}`}
        onDoubleClick={() => onMaximize && onMaximize(windowId)}
        style={{ cursor: isMaximized ? 'default' : 'move' }}
      >
        <div className="xp-title-icon">{icon}</div>
        <div className="xp-title-text">{title}</div>
        <div className="xp-window-buttons">
          {onMinimize && <button className="xp-win-btn" onClick={(e) => { e.stopPropagation(); onMinimize(windowId); }}>_</button>}
          {onMaximize && <button className="xp-win-btn" onClick={(e) => { e.stopPropagation(); onMaximize(windowId); }}>{isMaximized ? '❐' : '□'}</button>}
          {onClose && <button className="xp-win-btn close" onClick={(e) => { e.stopPropagation(); onClose(windowId); }}>×</button>}
        </div>
      </div>
      {menuBar && (
        <div style={{ display: 'flex', background: '#ECE9D8', padding: '1px 4px', fontSize: '11px', borderBottom: '1px solid #ACA899', gap: '8px' }}>
          {menuBar}
        </div>
      )}
      <div className="xp-window-content xp-scroll">
        {children}
      </div>

      {!isMaximized && !isMobile && !disableResize && (
        <div
          className="xp-resize-handle"
          onMouseDown={handleResizeMouseDown}
          title="Resize window"
        ></div>
      )}
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

const XPBalloon = ({ title, message, onClose }) => (
  <div className="xp-balloon xp-animate-open" style={{ right: '20px', bottom: '50px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <div style={{
          width: '16px', height: '16px', borderRadius: '50%', background: '#0054E3',
          color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 'bold', fontSize: '12px', fontStyle: 'italic', fontFamily: 'serif'
        }}>i</div>
        <strong style={{ fontSize: '13px', color: '#000000' }}>{title}</strong>
      </div>
      <button
        onClick={onClose}
        style={{
          background: 'transparent', border: '1px solid #000', borderRadius: '2px',
          width: '14px', height: '14px', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: '10px', fontWeight: 'bold',
          cursor: 'pointer', padding: 0, marginLeft: '10px', color: '#000'
        }}
      >×</button>
    </div>
    <div style={{ paddingLeft: '22px', color: '#000000' }}>
      {message}
    </div>
  </div>
);

const SVGIcons = {
  AddDocument: () => (
    <svg width="100%" height="100%" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 2 L20 2 L26 8 L26 30 L6 30 Z" fill="#FAFAFA" stroke="#919B9C" strokeWidth="1.5" />
      <path d="M19 2 L19 9 L26 9" fill="none" stroke="#919B9C" strokeWidth="1.5" />
      <circle cx="16" cy="18" r="7" fill="#3AA93F" />
      <line x1="16" y1="14" x2="16" y2="22" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <line x1="12" y1="18" x2="20" y2="18" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  MyComputer: () => (
    <svg width="100%" height="100%" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="24" height="18" fill="#ECE9D8" stroke="#003C74" strokeWidth="1.5" rx="2" />
      <rect x="6" y="6" width="20" height="14" fill="#3A6EA5" />
      <path d="M12 22 L20 22 L22 28 L10 28 Z" fill="#D4D0C8" stroke="#003C74" strokeWidth="1" />
      <rect x="8" y="28" width="16" height="2" fill="#919B9C" />
    </svg>
  ),
  RecycleBin: () => (
    <svg width="100%" height="100%" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 8 L24 8 L22 28 L10 28 Z" fill="#ECE9D8" stroke="#919B9C" strokeWidth="1.5" />
      <rect x="6" y="5" width="20" height="3" fill="#D4D0C8" stroke="#919B9C" strokeWidth="1" />
      <path d="M12 5 L12 2 L20 2 L20 5" fill="none" stroke="#919B9C" strokeWidth="1.5" />
      <line x1="12" y1="12" x2="12" y2="24" stroke="#919B9C" strokeWidth="1.5" />
      <line x1="16" y1="12" x2="16" y2="24" stroke="#919B9C" strokeWidth="1.5" />
      <line x1="20" y1="12" x2="20" y2="24" stroke="#919B9C" strokeWidth="1.5" />
    </svg>
  ),
  Folder: () => (
    <svg width="100%" height="100%" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 8 L12 8 L16 12 L30 12 L30 26 L2 26 Z" fill="#FFCC00" stroke="#E4A11B" strokeWidth="1.5" />
      <path d="M4 14 L28 14 L28 24 L4 24 Z" fill="#FFE066" />
    </svg>
  ),
  BarChart: () => (
    <svg width="100%" height="100%" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="28" height="28" fill="#ECE9D8" stroke="#919B9C" strokeWidth="1" rx="1" />
      <line x1="5" y1="27" x2="27" y2="27" stroke="#404040" strokeWidth="1.5" />
      <line x1="5" y1="6" x2="5" y2="27" stroke="#404040" strokeWidth="1.5" />
      <rect x="7" y="17" width="4" height="10" fill="#0054E3" />
      <rect x="13" y="11" width="4" height="16" fill="#3AA93F" />
      <rect x="19" y="14" width="4" height="13" fill="#E4A11B" />
      <rect x="25" y="8" width="4" height="19" fill="#C00000" />
      <line x1="5" y1="22" x2="27" y2="22" stroke="#BDBDBD" strokeWidth="0.5" strokeDasharray="2,2" />
      <line x1="5" y1="17" x2="27" y2="17" stroke="#BDBDBD" strokeWidth="0.5" strokeDasharray="2,2" />
      <line x1="5" y1="12" x2="27" y2="12" stroke="#BDBDBD" strokeWidth="0.5" strokeDasharray="2,2" />
    </svg>
  ),
  MinesweeperClassic: () => (
    <svg width="100%" height="100%" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="8" r="5" fill="#0000A8" />
      <path d="M8 2v2M8 12v2M2 8h2M12 8h2M4 4l1 1M11 11l1 1M4 12l1-1M11 5l1-1" stroke="#0000A8" strokeWidth="1.5" />
      <rect x="6" y="6" width="2" height="2" fill="#FFFFFF" />
    </svg>
  ),
  Minesweeper: () => (
    <svg width="100%" height="100%" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="28" height="28" fill="#BDBDBD" stroke="#7B7B7B" strokeWidth="1.5" />
      <circle cx="16" cy="16" r="9" fill="#1a1a1a" />
      <line x1="16" y1="3" x2="16" y2="8" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="16" y1="24" x2="16" y2="29" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="3" y1="16" x2="8" y2="16" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="24" y1="16" x2="29" y2="16" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="6" y1="6" x2="10" y2="10" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" />
      <line x1="22" y1="22" x2="26" y2="26" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" />
      <line x1="26" y1="6" x2="22" y2="10" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" />
      <line x1="6" y1="26" x2="10" y2="22" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="13" cy="12" rx="3" ry="2" fill="white" opacity="0.7" />
    </svg>
  )
};

// XP Minesweeper - Pixel-accurate replica
const XPBomb = () => (
  <svg viewBox="0 0 16 16" width="16" height="16" xmlns="http://www.w3.org/2000/svg">
    <circle cx="8" cy="9" r="6" fill="#1a1a1a" />
    <line x1="8" y1="1" x2="8" y2="4" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" />
    <line x1="11" y1="2" x2="9.5" y2="3.5" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="5" y1="2" x2="6.5" y2="3.5" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="1" y1="9" x2="3" y2="9" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" />
    <line x1="13" y1="9" x2="15" y2="9" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" />
    <line x1="3" y1="5" x2="4.5" y2="6.5" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="13" y1="5" x2="11.5" y2="6.5" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="6" cy="7" r="1.5" fill="white" opacity="0.7" />
    <rect x="8" y="1" width="2" height="3" rx="1" fill="#FF6600" />
  </svg>
);

const XPFlag = () => (
  <svg viewBox="0 0 16 16" width="14" height="14" xmlns="http://www.w3.org/2000/svg">
    <line x1="5" y1="2" x2="5" y2="14" stroke="#1a1a1a" strokeWidth="1.5" />
    <polygon points="5,2 13,5 5,8" fill="#FF0000" />
    <line x1="3" y1="14" x2="9" y2="14" stroke="#1a1a1a" strokeWidth="1.5" />
  </svg>
);

const XPMineHit = () => (
  <svg viewBox="0 0 16 16" width="16" height="16" xmlns="http://www.w3.org/2000/svg">
    <rect width="16" height="16" fill="#FF0000" />
    <circle cx="8" cy="9" r="5.5" fill="#1a1a1a" />
    <line x1="8" y1="1" x2="8" y2="4" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" />
    <line x1="1" y1="9" x2="3" y2="9" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" />
    <line x1="13" y1="9" x2="15" y2="9" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" />
    <line x1="3" y1="5" x2="4.5" y2="6.5" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="13" y1="5" x2="11.5" y2="6.5" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="6" cy="7" r="1.2" fill="white" opacity="0.7" />
    <rect x="8" y="1" width="2" height="3" rx="1" fill="#FF6600" />
  </svg>
);

const XPWrongMine = () => (
  <svg viewBox="0 0 16 16" width="14" height="14" xmlns="http://www.w3.org/2000/svg">
    <circle cx="8" cy="9" r="5.5" fill="#1a1a1a" />
    <line x1="8" y1="1" x2="8" y2="4" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" />
    <circle cx="6" cy="7" r="1.2" fill="white" opacity="0.7" />
    <rect x="8" y="1" width="2" height="3" rx="1" fill="#FF6600" />
    <line x1="2" y1="2" x2="14" y2="14" stroke="red" strokeWidth="2" />
    <line x1="14" y1="2" x2="2" y2="14" stroke="red" strokeWidth="2" />
  </svg>
);

const LCDDigit = ({ value }) => {
  const str = String(Math.max(0, Math.min(999, value))).padStart(3, '0');
  return (
    <div style={{ background: '#000000', color: '#FF0000', fontFamily: '"Digital-7 Mono", "Courier New", monospace', fontSize: '24px', fontWeight: 'bold', padding: '1px 3px', border: '1px solid', borderTopColor: '#808080', borderLeftColor: '#808080', borderBottomColor: '#FFFFFF', borderRightColor: '#FFFFFF', letterSpacing: '1px', minWidth: '40px', textAlign: 'center', lineHeight: 1 }}>
      {str}
    </div>
  );
};

const XPSmiley = ({ type }) => {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="10" r="9" fill="#FFFF00" stroke="#000000" strokeWidth="1" />
      {type === 'dead' ? (
        <g stroke="#000000" strokeWidth="1" strokeLinecap="round">
          <line x1="6" y1="6" x2="8" y2="8" /><line x1="8" y1="6" x2="6" y2="8" />
          <line x1="12" y1="6" x2="14" y2="8" /><line x1="14" y1="6" x2="12" y2="8" />
        </g>
      ) : type === 'win' ? (
        <g>
          <path d="M 5 7 L 15 7 L 14 9 L 11 9 L 10 7 L 9 9 L 6 9 Z" fill="#000000" />
          <line x1="4" y1="7" x2="16" y2="7" stroke="#000000" strokeWidth="1" />
        </g>
      ) : type === 'ooh' ? (
        <g fill="#000000">
          <rect x="6" y="6" width="2" height="2" />
          <rect x="12" y="6" width="2" height="2" />
        </g>
      ) : (
        <g fill="#000000">
          <rect x="6" y="7" width="2" height="2" />
          <rect x="12" y="7" width="2" height="2" />
        </g>
      )}
      {type === 'dead' ? (
        <path d="M 6 14 Q 10 12 14 14" fill="none" stroke="#000000" strokeWidth="1" />
      ) : type === 'win' ? (
        <path d="M 6 12 Q 10 16 14 12" fill="none" stroke="#000000" strokeWidth="1" />
      ) : type === 'ooh' ? (
        <circle cx="10" cy="14" r="2" fill="none" stroke="#000000" strokeWidth="1" />
      ) : (
        <path d="M 6 13 Q 10 16 14 13" fill="none" stroke="#000000" strokeWidth="1" />
      )}
    </svg>
  );
};

const NUM_COLORS = ['transparent', '#0000FF', '#007B00', '#FF0000', '#00007B', '#7B0000', '#007B7B', '#000000', '#7B7B7B'];

const Minesweeper = () => {
  const ROWS = 9, COLS = 9, MINES = 10;
  const [grid, setGrid] = useState([]);
  const [gameOver, setGameOver] = useState(false);
  const [win, setWin] = useState(false);
  const [minesLeft, setMinesLeft] = useState(MINES);
  const [seconds, setSeconds] = useState(0);
  const [started, setStarted] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => { initGame(); }, []);

  useEffect(() => {
    if (started && !gameOver && !win) {
      timerRef.current = setInterval(() => setSeconds(s => Math.min(s + 1, 999)), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [started, gameOver, win]);

  const initGame = () => {
    clearInterval(timerRef.current);
    const newGrid = Array(ROWS).fill(null).map(() =>
      Array(COLS).fill(null).map(() => ({ isMine: false, isRevealed: false, isFlagged: false, count: 0, isHit: false }))
    );
    let placed = 0;
    while (placed < MINES) {
      const r = Math.floor(Math.random() * ROWS);
      const c = Math.floor(Math.random() * COLS);
      if (!newGrid[r][c].isMine) { newGrid[r][c].isMine = true; placed++; }
    }
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (!newGrid[r][c].isMine) {
          let count = 0;
          for (let dr = -1; dr <= 1; dr++)
            for (let dc = -1; dc <= 1; dc++)
              if (r + dr >= 0 && r + dr < ROWS && c + dc >= 0 && c + dc < COLS && newGrid[r + dr][c + dc].isMine) count++;
          newGrid[r][c].count = count;
        }
      }
    }
    setGrid(newGrid);
    setGameOver(false);
    setWin(false);
    setMinesLeft(MINES);
    setSeconds(0);
    setStarted(false);
  };

  const floodReveal = (g, r, c) => {
    const queue = [[r, c]];
    while (queue.length) {
      const [cr, cc] = queue.shift();
      if (cr < 0 || cr >= ROWS || cc < 0 || cc >= COLS || g[cr][cc].isRevealed || g[cr][cc].isFlagged) continue;
      g[cr][cc].isRevealed = true;
      if (g[cr][cc].count === 0)
        for (let dr = -1; dr <= 1; dr++)
          for (let dc = -1; dc <= 1; dc++)
            queue.push([cr + dr, cc + dc]);
    }
  };

  const reveal = (r, c) => {
    if (gameOver || win || grid[r][c].isRevealed || grid[r][c].isFlagged) return;
    if (!started) setStarted(true);
    const g = grid.map(row => row.map(cell => ({ ...cell })));
    if (g[r][c].isMine) {
      g[r][c].isHit = true;
      for (let rr = 0; rr < ROWS; rr++)
        for (let cc = 0; cc < COLS; cc++)
          if (g[rr][cc].isMine && !g[rr][cc].isFlagged) g[rr][cc].isRevealed = true;
          else if (!g[rr][cc].isMine && g[rr][cc].isFlagged) g[rr][cc].isWrongFlag = true;
      setGrid(g);
      setGameOver(true);
    } else {
      floodReveal(g, r, c);
      setGrid(g);
      let revCount = 0;
      g.forEach(row => row.forEach(cell => { if (cell.isRevealed) revCount++; }));
      if (revCount === ROWS * COLS - MINES) setWin(true);
    }
  };

  const toggleFlag = (e, r, c) => {
    e.preventDefault();
    if (gameOver || win || grid[r][c].isRevealed) return;
    if (!started) setStarted(true);
    const g = grid.map(row => row.map(cell => ({ ...cell })));
    g[r][c].isFlagged = !g[r][c].isFlagged;
    setGrid(g);
    setMinesLeft(prev => g[r][c].isFlagged ? prev - 1 : prev + 1);
  };

  const face = gameOver ? <XPSmiley type="dead" /> : win ? <XPSmiley type="win" /> : isPressed ? <XPSmiley type="ooh" /> : <XPSmiley type="normal" />;

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', background: '#C0C0C0', border: '3px solid', borderTopColor: '#FFFFFF', borderLeftColor: '#FFFFFF', borderBottomColor: '#808080', borderRightColor: '#808080', padding: '6px', userSelect: 'none' }}>
      {/* Score panel */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#C0C0C0', border: '2px solid', borderTopColor: '#808080', borderLeftColor: '#808080', borderBottomColor: '#FFFFFF', borderRightColor: '#FFFFFF', padding: '4px 8px', marginBottom: '6px' }}>
        <LCDDigit value={minesLeft} />
        <button
          onMouseDown={() => setIsPressed(true)}
          onMouseUp={() => { setIsPressed(false); initGame(); }}
          onMouseLeave={() => setIsPressed(false)}
          style={{ width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', background: '#C0C0C0', border: '2px solid', borderTopColor: isPressed ? '#808080' : '#FFFFFF', borderLeftColor: isPressed ? '#808080' : '#FFFFFF', borderBottomColor: isPressed ? '#FFFFFF' : '#808080', borderRightColor: isPressed ? '#FFFFFF' : '#808080', cursor: 'pointer', padding: 0, lineHeight: 1 }}
        >{face}</button>
        <LCDDigit value={seconds} />
      </div>

      {/* Grid */}
      <div style={{ border: '3px solid', borderTopColor: '#808080', borderLeftColor: '#808080', borderBottomColor: '#FFFFFF', borderRightColor: '#FFFFFF' }}>
        {grid.map((row, r) => (
          <div key={r} style={{ display: 'flex' }}>
            {row.map((cell, c) => {
              let content = null;
              let bg = '#C0C0C0';
              let bStyle = { border: '2px solid', borderTopColor: '#FFFFFF', borderLeftColor: '#FFFFFF', borderBottomColor: '#808080', borderRightColor: '#808080' };
              if (cell.isRevealed) {
                bStyle = { border: '1px solid #808080' };
                if (cell.isHit) {
                  bg = '#FF0000';
                  content = <XPBomb />;
                } else if (cell.isMine) {
                  content = <XPBomb />;
                } else if (cell.isWrongFlag) {
                  content = <XPWrongMine />;
                } else if (cell.count > 0) {
                  content = <span style={{ fontSize: '13px', fontWeight: 'bold', color: NUM_COLORS[cell.count], lineHeight: 1 }}>{cell.count}</span>;
                }
              } else if (cell.isFlagged) {
                content = <XPFlag />;
              }
              return (
                <div
                  key={c}
                  onClick={() => reveal(r, c)}
                  onContextMenu={(e) => toggleFlag(e, r, c)}
                  onMouseDown={() => { if (!cell.isRevealed && !cell.isFlagged) setIsPressed(true); }}
                  onMouseUp={() => setIsPressed(false)}
                  style={{ width: '16px', height: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', boxSizing: 'border-box', background: bg, cursor: 'default', flexShrink: 0, ...bStyle }}
                >
                  {content}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

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
  const [balloon, setBalloon] = useState({ visible: false, title: '', message: '' });

  const showBalloon = (title, message) => {
    setBalloon({ visible: true, title, message });
    setTimeout(() => {
      setBalloon(prev => (prev.title === title && prev.message === message ? { ...prev, visible: false } : prev));
    }, 5000);
  };
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
  const [isStartMenuOpen, setIsStartMenuOpen] = useState(false);
  const [windowPositions, setWindowPositions] = useState({
    main: { x: 80, y: 20 },
    addJob: { x: 150, y: 50 },
    stats: { x: 200, y: 60 },
    minesweeper: { x: 500, y: 80 }
  });
  const [isMobile, setIsMobile] = useState(false);

  // 🪟 Windows Management
  const defaultWindows = {
    main: { isOpen: true, isMinimized: false, isMaximized: false, title: 'Job Tracker', icon: <SVGIcons.Folder /> },
    addJob: { isOpen: false, isMinimized: false, isMaximized: false, title: 'Add Job', icon: '✨' },
    stats: { isOpen: false, isMinimized: false, isMaximized: false, title: 'Statistics', icon: <SVGIcons.BarChart /> },
    minesweeper: { isOpen: false, isMinimized: false, isMaximized: false, title: 'Minesweeper', icon: <SVGIcons.Minesweeper /> }
  };
  const [windows, setWindows] = useState(defaultWindows);

  const openWindow = (id) => {
    setWindows(prev => ({ ...prev, [id]: { ...prev[id], isOpen: true, isMinimized: false } }));
    setActiveWindow(id);
  };
  const toggleMinimizeWindow = (id) => {
    setWindows(prev => {
      const isMin = prev[id].isMinimized;
      if (isMin) setActiveWindow(id);
      return { ...prev, [id]: { ...prev[id], isMinimized: !isMin } };
    });
  };
  const maximizeWindow = (id) => {
    setWindows(prev => ({ ...prev, [id]: { ...prev[id], isMaximized: !prev[id].isMaximized } }));
  };
  const closeWindow = (id) => {
    setWindows(prev => ({ ...prev, [id]: { ...prev[id], isOpen: false } }));
    if (isMobile) setActiveWindow('main');
  };
  // 🖱️ Drag State
  const dragRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // 📱 Detect Mobile & Initial Window Centering
  useEffect(() => {
    const checkMobile = () => { setIsMobile(window.innerWidth <= 768); };
    checkMobile();
    window.addEventListener('resize', checkMobile);

    // Center the pop-up windows and main window initially
    setWindowPositions(prev => ({
      ...prev,
      main: {
        x: Math.max(20, (window.innerWidth - 600) / 2), // assuming default width 600
        y: Math.max(20, (window.innerHeight - 500) / 2)
      },
      addJob: { x: Math.max(20, (window.innerWidth - 480) / 2), y: Math.max(20, (window.innerHeight - 500) / 2) },
      stats: { x: Math.max(20, (window.innerWidth - 400) / 2), y: Math.max(20, (window.innerHeight - 400) / 2) }
    }));

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
    if (username.length < 3) { setAuthError('ชื่อผู้ใช้งานต้องมีความยาวอย่างน้อย 3 ตัวอักษร'); return; }
    if (password.length < 6) { setAuthError('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร'); return; }
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
        showBalloon('Job Tracker', 'อัปเดตข้อมูลสำเร็จ!');
      } else {
        const { error } = await supabase.from('jobs').insert([formData]);
        if (error) throw error;
        showBalloon('Job Tracker', 'เพิ่มประวัติลง Cloud เรียบร้อย!');
      }
      setFormData(initialForm); setIsEditing(false); setEditId(null); fetchJobs();
    } catch (error) { showToast('เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error'); console.error(error); }
  };

  const handleEdit = (job) => {
    setFormData(job); setIsEditing(true); setEditId(job.id);
    openWindow('addJob');
  };

  const executeDelete = async () => {
    if (itemToDelete) {
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
      if (newStatus === 'ได้รับ Offer') showToast('ยินดีด้วยครับ! ได้รับ Offer แล้ว', 'success');
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
    const winState = windows[windowId];
    if (winState?.isMaximized) return; // Prevent drag if maximized
    setActiveWindow(windowId);
    setIsDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    dragRef.current = windowId;
  }, [isMobile, windows]);

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

  // 🔐 XP Login Screen - Windows XP Welcome Screen style
  if (!session) {
    return (
      <div className="xp-login-screen">
        {toast.show && (
          <div className="xp-balloon" style={{ top: '20px', right: '20px', left: 'auto', bottom: 'auto' }}>
            {toast.message}
          </div>
        )}

        {/* XP Welcome Screen Top Bar */}
        <div className="xp-welcome-top"></div>

        {/* Center Panel */}
        <div className="xp-welcome-center">
          <div className="xp-welcome-left-side">
            <div className="xp-welcome-logo">
              {/* สี่เหลี่ยมธรรมดา ตามที่ขอ */}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="60" height="60">
                <path fill="#F65314" d="M0 0h7.6v7.6H0z" />
                <path fill="#7CBB00" d="M8.4 0H16v7.6H8.4z" />
                <path fill="#00A1F1" d="M0 8.4h7.6V16H0z" />
                <path fill="#FFBB00" d="M8.4 8.4H16V16H8.4z" />
              </svg>
              <div className="xp-welcome-logo-text">
                <div style={{ fontSize: '16px', color: 'white', fontFamily: 'Tahoma, Arial, sans-serif' }}>Microsoft<sup style={{ fontSize: '10px' }}>®</sup></div>
                <div style={{ fontSize: '42px', fontWeight: 'bold', color: 'white', fontFamily: '"Franklin Gothic Medium", Arial, sans-serif', textShadow: '2px 2px 4px rgba(0,0,0,0.5)', lineHeight: 0.9 }}>Windows<sup style={{ fontSize: '18px', fontWeight: 'normal' }}>xp</sup></div>
              </div>
            </div>
            <div style={{ color: 'white', fontSize: '18px', marginTop: '16px', fontFamily: 'Tahoma, Arial, sans-serif', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
              To begin, click your user name
            </div>
          </div>

          <div className="xp-welcome-divider-v" />

          <div className="xp-welcome-right-side">
            {authError && (
              <div style={{ marginBottom: '12px', padding: '8px 12px', background: 'rgba(255,220,220,0.95)', border: '1px solid #C00000', borderRadius: '4px', fontSize: '12px', color: '#C00000', textAlign: 'left', maxWidth: '320px' }}>
                ⚠️ {authError}
              </div>
            )}

            {/* User Card */}
            <div className="xp-welcome-user-card xp-animate-open">
              <div className="xp-welcome-avatar">
                <svg viewBox="0 0 64 64" width="64" height="64" xmlns="http://www.w3.org/2000/svg" style={{ borderRadius: '4px', border: '2px solid white', boxShadow: '1px 1px 4px rgba(0,0,0,0.5)' }}>
                  <rect width="64" height="64" fill="#E68A00" />
                  <path d="M 20 40 L 32 15 L 44 40 Z" fill="#FFCC00" />
                  <path d="M 10 50 L 22 25 L 34 50 Z" fill="#CC6600" />
                  <path d="M 30 50 L 42 25 L 54 50 Z" fill="#994C00" />
                </svg>
              </div>
              <div className="xp-welcome-user-info">
                <div className="xp-welcome-user-name">{isLoginMode ? 'User' : 'New Account'}</div>

                <form onSubmit={handleAuth} className="xp-welcome-form">
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="Username"
                    className="xp-welcome-input"
                    required
                    autoFocus
                  />
                  <div className="xp-welcome-password-row">
                    <input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Password"
                      className="xp-welcome-input"
                      required
                    />
                    <button type="submit" disabled={isAuthLoading} className="xp-welcome-btn-primary" title={isLoginMode ? 'เข้าสู่ระบบ' : 'สร้างบัญชี'}>
                      →
                    </button>
                  </div>
                </form>
              </div>
            </div>

            <button className="xp-welcome-switch-btn" onClick={() => { setIsLoginMode(!isLoginMode); setAuthError(''); }}>
              {isLoginMode ? '» Create a new account' : '« Back to login'}
            </button>
          </div>
        </div>

        {/* XP Welcome Screen Bottom Bar */}
        <div className="xp-welcome-bottom">
          <button className="xp-welcome-turnoff">
            <div className="xp-welcome-turnoff-icon">⏻</div>
            <div>
              <div style={{ fontSize: '18px', color: 'white', fontFamily: 'Tahoma, Arial, sans-serif' }}>Turn off computer</div>
            </div>
          </button>
          <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', fontFamily: 'Tahoma, Arial, sans-serif', textAlign: 'right', paddingRight: '20px' }}>
            After you log on, you can add or change accounts.<br />Just go to Control Panel and click User Accounts.
          </div>
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
          <div className="xp-desktop-icon" onDoubleClick={() => openWindow('main')}>
            <div className="xp-desktop-icon-img"><SVGIcons.Folder /></div>
            <div className="xp-desktop-icon-label">Job Tracker</div>
          </div>
          <div className="xp-desktop-icon" onDoubleClick={() => openWindow('stats')}>
            <div className="xp-desktop-icon-img"><SVGIcons.BarChart /></div>
            <div className="xp-desktop-icon-label">Statistics</div>
          </div>
          <div className="xp-desktop-icon" onDoubleClick={() => openWindow('minesweeper')}>
            <div className="xp-desktop-icon-img"><SVGIcons.Minesweeper /></div>
            <div className="xp-desktop-icon-label">Minesweeper</div>
          </div>
          <div className="xp-desktop-icon">
            <div className="xp-desktop-icon-img"><SVGIcons.RecycleBin /></div>
            <div className="xp-desktop-icon-label">Recycle Bin</div>
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
          <strong>{toast.type === 'error' ? 'แจ้งเตือน' : 'สำเร็จ'}</strong><br />
          {toast.message}
        </div>
      )}

      {/* Mobile Layout */}
      {isMobile ? (
        <div className="xp-mobile-container">
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {/* Mobile Stats */}
            <XPWindow
              title="Statistics"
              icon="📊"
              windowId="stats"
              isMobile={isMobile}
              windowPositions={windowPositions}
              activeWindow={activeWindow}
              onMouseDown={handleMouseDown}
              winState={windows['stats']}
              onClose={() => closeWindow('stats')}
            >
              <div style={{ paddingBottom: '80px' }}>
                <div className="xp-mobile-stats">
                  <div className="xp-mobile-stat">
                    <span className="xp-mobile-stat-value">{stats.total}</span>
                    <span className="xp-mobile-stat-label">ทั้งหมด</span>
                  </div>
                  <div className="xp-mobile-stat">
                    <span className="xp-mobile-stat-value" style={{ color: '#0066CC' }}>{stats.interview}</span>
                    <span className="xp-mobile-stat-label">สัมภาษณ์</span>
                  </div>
                  <div className="xp-mobile-stat">
                    <span className="xp-mobile-stat-value" style={{ color: '#1B5E20' }}>{stats.offer}</span>
                    <span className="xp-mobile-stat-label">Offer</span>
                  </div>
                  <div className="xp-mobile-stat">
                    <span className="xp-mobile-stat-value" style={{ color: '#C00000' }}>{stats.rejected}</span>
                    <span className="xp-mobile-stat-label">ไม่ผ่าน</span>
                  </div>
                </div>
                {/* Status breakdown */}
                <div className="xp-groupbox" style={{ marginTop: '12px' }}>
                  <div className="xp-groupbox-title">สถานะทั้งหมด</div>
                  {STATUS_OPTIONS.map(s => {
                    const count = jobs.filter(j => j.status === s).length;
                    return (
                      <div key={s} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: '11px', borderBottom: '1px solid #F0F0F0' }}>
                        <span className={`xp-badge ${STATUS_BADGES[s]}`}>{s}</span>
                        <span style={{ fontWeight: 'bold' }}>{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </XPWindow>

            {/* Mobile Form */}
            <XPWindow
              title={isEditing ? "Edit Job" : "Add New Job"}
              icon={isEditing ? "✏️" : "✨"}
              windowId="addJob"
              isMobile={isMobile}
              windowPositions={windowPositions}
              activeWindow={activeWindow}
              onMouseDown={handleMouseDown}
              winState={windows['addJob']}
              onClose={() => { closeWindow('addJob'); setIsEditing(false); setFormData(initialForm); }}
            >
              <div className="xp-form-container">
                <form onSubmit={(e) => { handleSubmit(e); closeWindow('addJob'); }} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
                    <button type="button" onClick={() => { closeWindow('addJob'); setIsEditing(false); setFormData(initialForm); }} className="xp-button">ยกเลิก</button>
                  </div>
                </form>
              </div>
            </XPWindow>

            {/* Mobile Job List */}
            <XPWindow
              title="Job Tracker"
              icon="📁"
              windowId="main"
              isMobile={isMobile}
              windowPositions={windowPositions}
              activeWindow={activeWindow}
              onMouseDown={handleMouseDown}
            >
              <div className="xp-flex xp-gap-2 xp-mb-2" style={{ padding: '4px 0', borderBottom: '1px solid var(--xp-gray)' }}>
                <button onClick={() => { setFormData(initialForm); setIsEditing(false); openWindow('addJob'); }} className="xp-button primary" style={{ fontWeight: 'bold', flex: 1 }}>
                  <span style={{ fontSize: '14px', marginRight: '4px' }}>+</span> เพิ่มงาน
                </button>
                <button onClick={() => openWindow('stats')} className="xp-button" style={{ flex: 1 }}>
                  📊 สถิติ
                </button>
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
                <div className="xp-list" style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#808080' }}>
                  ยังไม่มีประวัติ
                </div>
              ) : (
                <div className="xp-list xp-scroll" style={{ flexGrow: 1, overflowY: 'auto' }}>
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

              <div className="xp-status-bar xp-mt-2" style={{ margin: 'auto -10px -10px -10px', flexShrink: 0 }}>
                <div className="xp-status-panel">รายการ: {filteredJobs.length} จาก {jobs.length}</div>
                <div className="xp-status-panel" style={{ flex: '0 0 auto', width: '60px', justifyContent: 'center' }}>Ready</div>
              </div>
            </XPWindow>

            {/* Mobile Minesweeper */}
            <XPWindow
              title="Minesweeper"
              icon={<SVGIcons.MinesweeperClassic />}
              width="fit-content"
              height="auto"
              windowId="minesweeper"
              zIndex={10}
              isMobile={isMobile}
              windowPositions={windowPositions}
              activeWindow={activeWindow}
              onMouseDown={handleMouseDown}
              winState={windows['minesweeper']}
              onMinimize={toggleMinimizeWindow}
              onClose={closeWindow}
              className="xp-minesweeper-window"
              disableResize={true}
              menuBar={
                <>
                  <div style={{ padding: '2px 4px', cursor: 'pointer' }}><u>G</u>ame</div>
                  <div style={{ padding: '2px 4px', cursor: 'pointer' }}><u>H</u>elp</div>
                </>
              }
            >
              <Minesweeper />
            </XPWindow>

          </div>
        </div>
      ) : (
        /* Desktop Layout */
        <>
          {/* Main Window - Job Tracker */}
          <XPWindow
            title="Job Tracker"
            icon={<SVGIcons.Folder />}
            width={680}
            height={560}
            windowId="main"
            zIndex={10}
            isMobile={isMobile}
            windowPositions={windowPositions}
            activeWindow={activeWindow}
            onMouseDown={handleMouseDown}
            winState={windows['main']}
            onMinimize={toggleMinimizeWindow}
            onMaximize={maximizeWindow}
            onClose={closeWindow}
          >
            <div style={{ padding: '0', display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div className="xp-flex xp-gap-2 xp-mb-2" style={{ padding: '8px 8px 0', borderBottom: '1px solid var(--xp-gray)', paddingBottom: '8px' }}>
                <button onClick={() => { setFormData(initialForm); setIsEditing(false); openWindow('addJob'); }} className="xp-button primary" style={{ fontWeight: 'bold' }}>
                  <span style={{ fontSize: '14px', marginRight: '4px' }}>+</span> เพิ่มงาน
                </button>
                <button onClick={() => openWindow('stats')} className="xp-button">
                  <div style={{ width: '14px', height: '14px', display: 'flex', alignItems: 'center' }}><SVGIcons.BarChart /></div>
                  <span style={{ marginLeft: '6px' }}>สถิติ</span>
                </button>
              </div>

              <div className="xp-flex xp-gap-2 xp-mb-2" style={{ padding: '0 8px' }}>
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
                  <span>กำลังดึงข้อมูล...</span>
                </div>
              ) : filteredJobs.length === 0 ? (
                <div className="xp-list" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#808080', margin: '8px' }}>
                  ยังไม่มีประวัติใน Database ครับ
                </div>
              ) : (
                <div className="xp-list xp-scroll" style={{ flex: 1, overflowY: 'auto', margin: '0 8px 8px' }}>
                  {filteredJobs.map((job) => (
                    <div key={job.id} className="xp-list-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px', padding: '8px' }}>
                      <div className="xp-flex xp-justify-between xp-w-full xp-items-center">
                        <div className="xp-flex xp-gap-2 xp-items-center">
                          <strong style={{ fontSize: '12px' }}>{job.company}</strong>
                          <span className={`xp-badge ${STATUS_BADGES[job.status] || 'xp-badge-waiting'}`}>{job.status}</span>
                          <span className="xp-badge" style={{ background: '#F0F0F0', borderColor: '#808080' }}>{job.workMode}</span>
                        </div>
                        <div className="xp-flex xp-gap-1">
                          <button onClick={() => { handleEdit(job); }} className="xp-button" style={{ padding: '1px 6px', fontSize: '10px' }}>✏️ แก้ไข</button>
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
              <div className="xp-status-bar" style={{ margin: '0 8px 8px' }}>
                <div className="xp-status-panel">รายการ: {filteredJobs.length} จาก {jobs.length}</div>
                <div className="xp-status-panel" style={{ flex: '0 0 auto', width: '80px', justifyContent: 'center' }}>Ready</div>
              </div>
            </div>
          </XPWindow>

          {/* Add Job Window */}
          <XPWindow
            title={isEditing ? "Edit Job" : "Add New Job"}
            icon="✨"
            width={480}
            windowId="addJob"
            zIndex={15}
            isMobile={isMobile}
            windowPositions={windowPositions}
            activeWindow={activeWindow}
            onMouseDown={handleMouseDown}
            winState={windows['addJob']}
            onMinimize={toggleMinimizeWindow}
            onClose={() => { closeWindow('addJob'); setIsEditing(false); setFormData(initialForm); }}
          >
            <div className="xp-form-container">
              <form onSubmit={(e) => { handleSubmit(e); closeWindow('addJob'); }} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
                    <textarea name="notes" value={formData.notes || ''} onChange={handleChange} placeholder="เทคโนโลยีที่ใช้, คำถามที่เจอ..." rows="2" className="xp-textarea xp-w-full"></textarea>
                  </div>
                </div>

                <div className="xp-flex xp-gap-2 xp-justify-center xp-mt-1">
                  <button type="submit" disabled={isLoading} className="xp-button primary">
                    {isLoading ? '...' : (isEditing ? '💾 บันทึก' : '+ เพิ่มประวัติ')}
                  </button>
                  <button type="button" onClick={() => { closeWindow('addJob'); setIsEditing(false); setFormData(initialForm); }} className="xp-button">ยกเลิก</button>
                </div>
              </form>
            </div>
          </XPWindow>

          {/* Statistics Window */}
          <XPWindow
            title="Statistics"
            icon={<SVGIcons.BarChart />}
            width={400}
            windowId="stats"
            zIndex={15}
            isMobile={isMobile}
            windowPositions={windowPositions}
            activeWindow={activeWindow}
            onMouseDown={handleMouseDown}
            winState={windows['stats']}
            onMinimize={toggleMinimizeWindow}
            onClose={closeWindow}
          >
            <div style={{ padding: '8px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div className="xp-groupbox" style={{ margin: 0, textAlign: 'center' }}>
                  <div className="xp-groupbox-title">ทั้งหมด</div>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#0054E3' }}>{stats.total}</div>
                </div>
                <div className="xp-groupbox" style={{ margin: 0, textAlign: 'center' }}>
                  <div className="xp-groupbox-title">สัมภาษณ์</div>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#0066CC' }}>{stats.interview}</div>
                </div>
                <div className="xp-groupbox" style={{ margin: 0, textAlign: 'center' }}>
                  <div className="xp-groupbox-title">Offer</div>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#1B5E20' }}>{stats.offer}</div>
                </div>
                <div className="xp-groupbox" style={{ margin: 0, textAlign: 'center' }}>
                  <div className="xp-groupbox-title">ไม่ผ่าน</div>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#C00000' }}>{stats.rejected}</div>
                </div>
              </div>
              {/* Status breakdown */}
              <div className="xp-groupbox" style={{ marginTop: '12px' }}>
                <div className="xp-groupbox-title">สถานะทั้งหมด</div>
                {STATUS_OPTIONS.map(s => {
                  const count = jobs.filter(j => j.status === s).length;
                  return (
                    <div key={s} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: '11px', borderBottom: '1px solid #F0F0F0' }}>
                      <span className={`xp-badge ${STATUS_BADGES[s]}`}>{s}</span>
                      <span style={{ fontWeight: 'bold' }}>{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </XPWindow>

          {/* Window - Minesweeper */}
          <XPWindow
            title="Minesweeper"
            icon={<SVGIcons.MinesweeperClassic />}
            width="fit-content"
            height="auto"
            windowId="minesweeper"
            zIndex={10}
            isMobile={isMobile}
            windowPositions={windowPositions}
            activeWindow={activeWindow}
            onMouseDown={handleMouseDown}
            winState={windows['minesweeper']}
            onMinimize={toggleMinimizeWindow}
            onClose={closeWindow}
            className="xp-minesweeper-window"
            disableResize={true}
            menuBar={
              <>
                <div style={{ padding: '2px 4px', cursor: 'pointer' }}><u>G</u>ame</div>
                <div style={{ padding: '2px 4px', cursor: 'pointer' }}><u>H</u>elp</div>
              </>
            }
          >
            <Minesweeper />
          </XPWindow>
        </>
      )}

      {!isMobile && (
        <>
          {/* Taskbar */}
          {/* 🚀 Start Menu Overlay (คลิกที่อื่นเพื่อปิดเมนู) */}
          {isStartMenuOpen && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 9998 }} onClick={() => setIsStartMenuOpen(false)}></div>
          )}

          {/* 🚀 Start Menu Panel */}
          {isStartMenuOpen && (
            <div className="xp-start-menu">
              <div className="xp-start-menu-header">
                <div className="xp-start-user-icon">👤</div>
                <span style={{ fontSize: '14px' }}>{session.user?.email?.split('@')[0] || 'Administrator'}</span>
              </div>
              <div className="xp-start-menu-body">
                <div className="xp-start-menu-left">
                  <div style={{ padding: '8px 12px', fontSize: '11px', fontWeight: 'bold' }}>Programs</div>
                  <div className="xp-start-divider"></div>
                  <div className="xp-start-item" onClick={() => { openWindow('main'); setIsStartMenuOpen(false); }}>
                    <div style={{ width: '24px', height: '24px', marginRight: '8px' }}><SVGIcons.Folder /></div>
                    <div>
                      <div style={{ fontWeight: 'bold' }}>Job Tracker</div>
                      <div style={{ color: '#808080', fontSize: '10px' }}>Manage job applications</div>
                    </div>
                  </div>
                  <div className="xp-start-item" onClick={() => { openWindow('addJob'); setIsStartMenuOpen(false); }}>
                    <div style={{ width: '24px', height: '24px', marginRight: '8px' }}><SVGIcons.AddDocument /></div>
                    <div>
                      <div style={{ fontWeight: 'bold' }}>Add New Job</div>
                      <div style={{ color: '#808080', fontSize: '10px' }}>Create a new record</div>
                    </div>
                  </div>
                  <div className="xp-start-item" onClick={() => { openWindow('stats'); setIsStartMenuOpen(false); }}>
                    <div style={{ width: '24px', height: '24px', marginRight: '8px' }}><SVGIcons.BarChart /></div>
                    <div>
                      <div style={{ fontWeight: 'bold' }}>Statistics</div>
                      <div style={{ color: '#808080', fontSize: '10px' }}>View job insights</div>
                    </div>
                  </div>
                  <div className="xp-start-item" onClick={() => { openWindow('minesweeper'); setIsStartMenuOpen(false); }}>
                    <div style={{ width: '24px', height: '24px', marginRight: '8px' }}><SVGIcons.Minesweeper /></div>
                    <div>
                      <div style={{ fontWeight: 'bold' }}>Minesweeper</div>
                      <div style={{ color: '#808080', fontSize: '10px' }}>Play mini-game</div>
                    </div>
                  </div>
                </div>
                <div className="xp-start-menu-right">
                  <div className="xp-start-item"><b>My Documents</b></div>
                  <div className="xp-start-item"><b>My Recent Documents</b></div>
                  <div className="xp-start-item"><b>My Pictures</b></div>
                  <div className="xp-start-item"><b>My Music</b></div>
                  <div className="xp-start-item"><b>My Computer</b></div>
                  <div className="xp-start-divider"></div>
                  <div className="xp-start-item">Control Panel</div>
                  <div className="xp-start-item">Printers and Faxes</div>
                  <div className="xp-start-divider"></div>
                  <div className="xp-start-item">Help and Support</div>
                  <div className="xp-start-item">Search</div>
                  <div className="xp-start-item">Run...</div>
                </div>
              </div>
              <div className="xp-start-menu-footer">
                <button className="xp-start-footer-btn" onClick={handleLogout}>
                  <div className="xp-logout-icon">🔑</div>
                  <span>Log Off</span>
                </button>
                <button className="xp-start-footer-btn" onClick={() => setIsStartMenuOpen(false)}>
                  <div className="xp-shutdown-icon">⏻</div>
                  <span>Turn Off Computer</span>
                </button>
              </div>
            </div>
          )}

          {/* 🚀 Classic XP Taskbar */}
          <div className="xp-taskbar">
            <button
              className={`xp-start-button ${isStartMenuOpen ? 'active' : ''}`}
              onClick={() => setIsStartMenuOpen(!isStartMenuOpen)}
            >
              <div className="xp-start-icon">
                {/* โลโก้ Windows SVG แท้ */}
                <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' width="16" height="16"><path fill='#F65314' d='M2 3h5v5H2z' /><path fill='#7CBB00' d='M8 3h6v5H8z' /><path fill='#00A1F1' d='M2 9h5v5H2z' /><path fill='#FFBB00' d='M8 9h6v5H8z' /></svg>
              </div>
              {/* ตัวอักษร start เอียงและหนา เหมือนของจริงเป๊ะ */}
              <span style={{ fontStyle: 'italic', fontWeight: 'bold', fontSize: '16px', fontFamily: '"Franklin Gothic Medium", Arial, sans-serif' }}>start</span>
            </button>

            {/* กล่องแสดงโปรแกรมที่กำลังเปิดอยู่ (Task Buttons) */}
            <div className="xp-task-buttons">
              {Object.entries(windows).filter(([_, state]) => state.isOpen).map(([id, state]) => (
                <div
                  key={id}
                  className={`xp-task-button ${activeWindow === id && !state.isMinimized ? 'active' : ''}`}
                  onClick={() => {
                    if (activeWindow === id && !state.isMinimized) {
                      toggleMinimizeWindow(id);
                    } else {
                      setWindows(prev => ({ ...prev, [id]: { ...prev[id], isMinimized: false } }));
                      setActiveWindow(id);
                    }
                  }}
                >
                  <div style={{ width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {state.icon}
                  </div>
                  {state.title}
                </div>
              ))}
            </div>

            {/* แถบนาฬิกาขวาสุด (System Tray) */}
            <div className="xp-system-tray">
              <span>🔊</span>
              <span>{clock.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        </>
      )}

      {balloon.visible && (
        <XPBalloon
          title={balloon.title}
          message={balloon.message}
          onClose={() => setBalloon(prev => ({ ...prev, visible: false }))}
        />
      )}
    </div>
  );
}