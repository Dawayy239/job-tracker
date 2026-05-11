// XPClassicIcons.jsx
// Classic Windows XP style pixel‑art icons (simplified SVG representations)
// These icons mimic the 256‑color XP aesthetic.

import React from 'react';

export const XPClassicIcons = {
  // Classic folder with a document (yellow folder with a sheet of paper)
  FolderDoc: () => (
    <svg width="24" height="24" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="6" width="28" height="22" fill="#FFCC00" stroke="#B08900" strokeWidth="2" />
      <rect x="6" y="10" width="20" height="14" fill="#FFFFFF" stroke="#CCCCCC" strokeWidth="1" />
    </svg>
  ),
  // Classic 3D bar chart
  BarChart3D: () => (
    <svg width="24" height="24" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="20" width="5" height="8" fill="#0054E3" />
      <rect x="12" y="16" width="5" height="12" fill="#0066CC" />
      <rect x="20" y="12" width="5" height="16" fill="#0077DD" />
      <line x1="2" y1="28" x2="30" y2="28" stroke="#000" strokeWidth="1" />
    </svg>
  ),
  // Notepad with a pencil (edit)
  NotepadPencil: () => (
    <svg width="24" height="24" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="6" width="20" height="20" fill="#FFFFFF" stroke="#919B9C" strokeWidth="2" />
      <line x1="6" y1="12" x2="26" y2="12" stroke="#919B9C" strokeWidth="1" />
      <line x1="6" y1="18" x2="26" y2="18" stroke="#919B9C" strokeWidth="1" />
      <polygon points="20,22 24,26 28,22" fill="#3AA93F" />
    </svg>
  ),
  // Classic red recycle bin
  RecycleBinRed: () => (
    <svg width="24" height="24" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="10" width="16" height="14" fill="#FF6666" stroke="#C00000" strokeWidth="2" />
      <rect x="12" y="6" width="8" height="4" fill="#FFCCCC" stroke="#C00000" strokeWidth="2" />
    </svg>
  ),
  // Classic blue naval mine (for Minesweeper)
  MineBlue: () => (
    <svg width="24" height="24" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="12" fill="#0054E3" stroke="#003C74" strokeWidth="2" />
      <line x1="16" y1="4" x2="16" y2="8" stroke="#FFFFFF" strokeWidth="2" />
      <line x1="16" y1="24" x2="16" y2="28" stroke="#FFFFFF" strokeWidth="2" />
      <line x1="4" y1="16" x2="8" y2="16" stroke="#FFFFFF" strokeWidth="2" />
      <line x1="24" y1="16" x2="28" y2="16" stroke="#FFFFFF" strokeWidth="2" />
    </svg>
  ),
};

export default XPClassicIcons;
