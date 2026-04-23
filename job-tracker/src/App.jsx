import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';

const STATUS_OPTIONS = ['รอติดต่อกลับ', 'มีการติดต่อมา', 'ทำแบบทดสอบ', 'นัดสัมภาษณ์', 'ได้รับ Offer', 'ปฏิเสธ Offer', 'ไม่ผ่าน'];
const WORK_MODES = ['On-site', 'Hybrid', 'Remote'];
const SALARY_RANGES = ['ไม่ระบุ', 'น้อยกว่า 15,000 ฿', '15,000 - 18,000 ฿', '18,000 - 20,000 ฿', '20,000 - 25,000 ฿', '25,000 - 30,000 ฿', '30,000 - 35,000 ฿', '35,000 - 40,000 ฿', '40,000 - 45,000 ฿', '45,000 - 50,000 ฿', '50,000 - 60,000 ฿', '60,000 - 70,000 ฿', '70,000 - 80,000 ฿', '80,000 - 100,000 ฿', 'มากกว่า 100,000 ฿'];

export default function App() {
  // ----------------------------------------------------------------------
  // 🔐 State สำหรับระบบ Login (เปลี่ยนจาก email เป็น username)
  // ----------------------------------------------------------------------
  const [session, setSession] = useState(null);
  const [username, setUsername] = useState(''); // 👈 เปลี่ยนเป็น username
  const [password, setPassword] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  // ----------------------------------------------------------------------
  // 📊 State เดิมของ App
  // ----------------------------------------------------------------------
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

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message, type: 'success' }), 3000);
  };

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

  // ----------------------------------------------------------------------
  // 🔐 ฟังก์ชัน Login ด้วย Username
  // ----------------------------------------------------------------------
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      setIsAuthLoading(true);
      setAuthError('');
      
      // 💡 ทริค Senior: แอบเติม @app.com ต่อท้ายชื่อที่พิมพ์เข้ามา
      const fakeEmail = `${username}@app.com`;
      
      const { error } = await supabase.auth.signInWithPassword({ 
        email: fakeEmail, // ส่งอีเมลหลอกๆ ให้ Supabase
        password 
      });

      if (error) throw error;
      showToast('เข้าสู่ระบบสำเร็จ! ยินดีต้อนรับครับ 🎉', 'success');
    } catch (error) {
      setAuthError('ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setJobs([]); 
      setSession(null);
      showToast('ออกจากระบบเรียบร้อยแล้ว 👋', 'success');
    }
  };

  const fetchJobs = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.from('jobs').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setJobs(data || []);
    } catch (error) {
      showToast('ดึงข้อมูลล้มเหลว กรุณาลองใหม่', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.company || !formData.position) {
      showToast('กรุณากรอกชื่อบริษัทและตำแหน่งให้ครบถ้วนครับ ✌️', 'error');
      return;
    }

    try {
      if (isEditing) {
        const { error } = await supabase.from('jobs').update(formData).eq('id', editId);
        if (error) throw error;
        showToast('อัปเดตข้อมูลสำเร็จ! ✨');
      } else {
        const { error } = await supabase.from('jobs').insert([formData]);
        if (error) throw error;
        showToast('เพิ่มประวัติลง Cloud เรียบร้อย! 🚀');
      }
      setFormData(initialForm);
      setIsEditing(false);
      setEditId(null);
      fetchJobs(); 
    } catch (error) {
      showToast('เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
    }
  };

  const handleEdit = (job) => {
    setFormData(job);
    setIsEditing(true);
    setEditId(job.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const executeDelete = async () => {
    if(itemToDelete) {
      try {
        const { error } = await supabase.from('jobs').delete().eq('id', itemToDelete);
        if (error) throw error;
        if (isEditing && editId === itemToDelete) {
          setIsEditing(false);
          setFormData(initialForm);
        }
        showToast('ลบข้อมูลออกจากระบบแล้ว 🗑️', 'error');
        setItemToDelete(null);
        fetchJobs();
      } catch (error) {
        showToast('เกิดข้อผิดพลาดในการลบ', 'error');
      }
    }
  };

  const handleQuickStatusChange = async (id, newStatus) => {
    try {
      const { error } = await supabase.from('jobs').update({ status: newStatus }).eq('id', id);
      if (error) throw error;
      if(newStatus === 'ได้รับ Offer') showToast('ยินดีด้วยครับ! ได้รับ Offer แล้ว 🎉', 'success');
      else showToast(`อัปเดตสถานะเป็น ${newStatus} แล้ว`, 'success');
      fetchJobs();
    } catch (error) {
      showToast('อัปเดตสถานะล้มเหลว', 'error');
    }
  };

  const filteredJobs = useMemo(() => {
    let result = jobs.filter(job => {
      const matchSearch = job.company.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          job.position.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = filterStatus === 'All' || job.status === filterStatus;
      return matchSearch && matchStatus;
    });
    if (sortBy === 'newest') result.sort((a, b) => b.id - a.id);
    if (sortBy === 'oldest') result.sort((a, b) => a.id - b.id);
    if (sortBy === 'a-z') result.sort((a, b) => a.company.localeCompare(b.company));
    return result;
  }, [jobs, searchTerm, filterStatus, sortBy]);

  const stats = useMemo(() => {
    return {
      total: jobs.length,
      interview: jobs.filter(j => j.status === 'นัดสัมภาษณ์').length,
      offer: jobs.filter(j => j.status === 'ได้รับ Offer').length,
      rejected: jobs.filter(j => j.status === 'ไม่ผ่าน' || j.status === 'ปฏิเสธ Offer').length,
    };
  }, [jobs]);

  const getStatusStyle = (status) => {
    switch (status) {
      case 'รอติดต่อกลับ': return 'bg-gradient-to-b from-white to-slate-100 text-slate-700 border-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,1)]';
      case 'มีการติดต่อมา': return 'bg-gradient-to-b from-amber-50 to-amber-100 text-amber-800 border-amber-300 shadow-[inset_0_1px_0_rgba(255,255,255,1)]';
      case 'ทำแบบทดสอบ': return 'bg-gradient-to-b from-purple-50 to-purple-100 text-purple-800 border-purple-300 shadow-[inset_0_1px_0_rgba(255,255,255,1)]';
      case 'นัดสัมภาษณ์': return 'bg-gradient-to-b from-sky-50 to-sky-100 text-sky-800 border-sky-300 shadow-[inset_0_1px_0_rgba(255,255,255,1)]';
      case 'ได้รับ Offer': return 'bg-gradient-to-b from-teal-50 to-teal-100 text-teal-800 border-teal-300 shadow-[inset_0_1px_0_rgba(255,255,255,1)]';
      case 'ปฏิเสธ Offer': return 'bg-gradient-to-b from-orange-50 to-orange-100 text-orange-800 border-orange-300 shadow-[inset_0_1px_0_rgba(255,255,255,1)]';
      case 'ไม่ผ่าน': return 'bg-gradient-to-b from-rose-50 to-rose-100 text-rose-800 border-rose-300 shadow-[inset_0_1px_0_rgba(255,255,255,1)]';
      default: return 'bg-gradient-to-b from-white to-slate-100 text-slate-700 border-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,1)]';
    }
  };

  const getCardBorderColor = (status) => {
    switch (status) {
      case 'ได้รับ Offer': return 'border-l-teal-400';
      case 'นัดสัมภาษณ์': return 'border-l-sky-400';
      case 'ทำแบบทดสอบ': return 'border-l-purple-400';
      case 'มีการติดต่อมา': return 'border-l-amber-400';
      case 'ไม่ผ่าน': return 'border-l-rose-400';
      case 'ปฏิเสธ Offer': return 'border-l-orange-400';
      default: return 'border-l-slate-300';
    }
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-50 via-sky-100 to-cyan-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-sky-500 mb-4 shadow-sm"></div>
      </div>
    );
  }

  // ----------------------------------------------------------------------
  // 🚪 หน้าจอ Login (เปลี่ยนช่อง Email เป็น Username)
  // ----------------------------------------------------------------------
  if (!session) {
    return (
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-50 via-sky-100 to-cyan-100 flex items-center justify-center p-4 font-sans selection:bg-sky-200 selection:text-sky-900">
        
        <div className={`fixed top-5 right-5 z-50 transition-all duration-500 transform ${toast.show ? 'translate-y-0 opacity-100' : '-translate-y-20 opacity-0 pointer-events-none'}`}>
          <div className={`px-6 py-4 rounded-2xl shadow-[0_4px_15px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.5)] border flex items-center gap-3 backdrop-blur-md ${toast.type === 'error' ? 'bg-gradient-to-b from-rose-50/90 to-rose-100/90 border-rose-300 text-rose-800' : 'bg-gradient-to-b from-emerald-50/90 to-emerald-100/90 border-emerald-300 text-emerald-800'}`}>
            <span className="text-2xl drop-shadow-sm">{toast.type === 'error' ? '⚠️' : '✅'}</span>
            <p className="font-bold drop-shadow-sm">{toast.message}</p>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-xl p-8 md:p-10 rounded-[2rem] shadow-[0_20px_60px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,1)] border border-white/50 max-w-md w-full text-center relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-sky-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50"></div>
          <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-teal-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50"></div>
          
          <div className="relative z-10">
            <h1 className="text-4xl font-extrabold mb-2 text-transparent bg-clip-text bg-gradient-to-b from-teal-700 to-blue-800 drop-shadow-sm">
              Job Tracker <span className="text-3xl">🍏</span>
            </h1>
            <p className="text-slate-500 font-medium mb-8">กรุณาเข้าสู่ระบบเพื่อจัดการข้อมูลส่วนตัว</p>
            
            {authError && (
              <div className="mb-6 p-3 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-sm font-bold animate-in fade-in slide-in-from-top-2">
                ⚠️ {authError}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5 text-left">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">ชื่อผู้ใช้งาน (Username)</label>
                <input 
                  type="text" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                  placeholder="เช่น admin"
                  className="w-full p-3.5 bg-slate-50 border border-slate-300 shadow-inner rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-400 focus:border-sky-400 outline-none transition-all text-sm font-medium" 
                  required 
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">รหัสผ่าน</label>
                <input 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  placeholder="••••••••"
                  className="w-full p-3.5 bg-slate-50 border border-slate-300 shadow-inner rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-400 focus:border-sky-400 outline-none transition-all text-sm font-medium" 
                  required 
                />
              </div>
              <button 
                type="submit" 
                disabled={isAuthLoading} 
                className="w-full mt-2 bg-gradient-to-b from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 border border-blue-600 text-white font-bold py-3.5 px-4 rounded-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_4px_10px_rgba(0,0,0,0.1)] disabled:opacity-70 transition-all active:scale-[0.98]"
              >
                {isAuthLoading ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ 🔐'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------------------
  // 🌟 หน้า Dashboard หลัก
  // ----------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-50 via-sky-100 to-cyan-100 p-4 md:p-8 font-sans pb-20 text-slate-800 selection:bg-sky-200 selection:text-sky-900 relative overflow-hidden">
      
      {itemToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 md:p-8 max-w-sm w-full shadow-[0_10px_40px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,1)] border border-slate-200">
            <div className="w-16 h-16 bg-gradient-to-b from-rose-50 to-rose-100 border border-rose-200 text-rose-500 rounded-full flex items-center justify-center text-3xl mb-5 mx-auto shadow-inner">🗑️</div>
            <h3 className="text-xl font-bold text-center text-slate-800 mb-2 drop-shadow-sm">ยืนยันการลบ</h3>
            <p className="text-center text-slate-500 mb-8 font-medium">แน่ใจหรือไม่ว่าต้องการลบข้อมูลนี้? ข้อมูลจะถูกลบออกจาก Database อย่างถาวร</p>
            <div className="flex gap-3">
              <button onClick={() => setItemToDelete(null)} className="flex-1 py-3 px-4 bg-gradient-to-b from-white to-slate-100 border border-slate-300 text-slate-700 font-bold rounded-full hover:from-slate-50 hover:to-slate-200 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,1),0_1px_2px_rgba(0,0,0,0.05)]">ยกเลิก</button>
              <button onClick={executeDelete} className="flex-1 py-3 px-4 bg-gradient-to-b from-rose-400 to-rose-500 border border-rose-600 text-white font-bold rounded-full hover:from-rose-400 hover:to-rose-600 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_2px_4px_rgba(0,0,0,0.15)]">ใช่, ลบเลย</button>
            </div>
          </div>
        </div>
      )}

      <div className={`fixed top-5 right-5 z-50 transition-all duration-500 transform ${toast.show ? 'translate-y-0 opacity-100' : '-translate-y-20 opacity-0 pointer-events-none'}`}>
        <div className={`px-6 py-4 rounded-2xl shadow-[0_4px_15px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.5)] border flex items-center gap-3 backdrop-blur-md ${toast.type === 'error' ? 'bg-gradient-to-b from-rose-50/90 to-rose-100/90 border-rose-300 text-rose-800' : 'bg-gradient-to-b from-emerald-50/90 to-emerald-100/90 border-emerald-300 text-emerald-800'}`}>
          <span className="text-2xl drop-shadow-sm">{toast.type === 'error' ? '⚠️' : '✅'}</span>
          <p className="font-bold drop-shadow-sm">{toast.message}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="mb-10 flex flex-col md:flex-row justify-between items-center md:items-end gap-5">
          <div className="text-center md:text-left">
            <h1 className="text-4xl md:text-5xl font-extrabold mb-3 tracking-tight drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">
              <span className="text-transparent bg-clip-text bg-gradient-to-b from-teal-700 to-blue-800">Job Tracker</span>
              <span className="ml-3 text-3xl drop-shadow-md">🍏</span>
            </h1>
            <p className="text-slate-600 font-medium text-sm md:text-base drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">จัดการและติดตามทุกสถานะการสมัครงาน</p>
          </div>
          
          <button 
            onClick={handleLogout} 
            className="px-5 py-2.5 bg-white/60 border border-slate-300 text-slate-600 font-bold rounded-full hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all shadow-sm flex items-center gap-2 backdrop-blur-sm"
          >
            <span>ออกจากระบบ</span> <span className="text-lg">🚪</span>
          </button>
        </div>
          
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <div className="relative overflow-hidden bg-gradient-to-b from-white to-slate-100 p-5 rounded-2xl border border-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_2px_5px_rgba(0,0,0,0.05)] transition-all group">
            <p className="text-xs md:text-sm text-slate-500 font-bold uppercase tracking-wider relative z-10 drop-shadow-sm">ยื่นสมัครทั้งหมด</p>
            <p className="text-3xl md:text-4xl font-extrabold text-slate-800 mt-2 relative z-10 drop-shadow-sm">{stats.total}</p>
          </div>
          <div className="relative overflow-hidden bg-gradient-to-b from-sky-400 to-blue-600 p-5 rounded-2xl border border-blue-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_2px_5px_rgba(0,0,0,0.15)] transition-all group text-white">
            <p className="text-xs md:text-sm font-bold uppercase tracking-wider text-blue-100 drop-shadow-sm">รอสัมภาษณ์</p>
            <p className="text-3xl md:text-4xl font-extrabold mt-2 drop-shadow-md">{stats.interview}</p>
          </div>
          <div className="relative overflow-hidden bg-gradient-to-b from-teal-400 to-emerald-600 p-5 rounded-2xl border border-emerald-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_2px_5px_rgba(0,0,0,0.15)] transition-all group text-white">
            <p className="text-xs md:text-sm font-bold uppercase tracking-wider text-emerald-100 drop-shadow-sm">ได้รับ Offer</p>
            <p className="text-3xl md:text-4xl font-extrabold mt-2 drop-shadow-md">{stats.offer}</p>
          </div>
          <div className="relative overflow-hidden bg-gradient-to-b from-white to-slate-100 p-5 rounded-2xl border border-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_2px_5px_rgba(0,0,0,0.05)] transition-all group">
            <p className="text-xs md:text-sm text-slate-500 font-bold uppercase tracking-wider drop-shadow-sm">ไม่ผ่าน / ปฏิเสธ</p>
            <p className="text-3xl md:text-4xl font-extrabold text-rose-600 mt-2 drop-shadow-sm">{stats.rejected}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4">
            <div className="bg-white/90 backdrop-blur-xl p-6 md:p-8 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,1)] border border-slate-200/80 sticky top-8">
              <h2 className="text-xl font-extrabold text-slate-800 mb-6 flex items-center gap-2 drop-shadow-sm">
                {isEditing ? <><span className="text-amber-500">✏️</span> แก้ไขข้อมูล</> : <><span className="text-sky-500">✨</span> เพิ่มประวัติใหม่</>}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 drop-shadow-sm">ชื่อบริษัท <span className="text-rose-500">*</span></label>
                  <input type="text" name="company" value={formData.company} onChange={handleChange} placeholder="เช่น Google, Agoda" className="w-full p-3 bg-slate-50 border border-slate-300 shadow-inner rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-400 focus:border-sky-400 outline-none transition-all text-sm font-medium" required />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 drop-shadow-sm">ตำแหน่งที่สมัคร <span className="text-rose-500">*</span></label>
                  <input type="text" name="position" value={formData.position} onChange={handleChange} placeholder="เช่น Senior Frontend" className="w-full p-3 bg-slate-50 border border-slate-300 shadow-inner rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-400 focus:border-sky-400 outline-none transition-all text-sm font-medium" required />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5 drop-shadow-sm">สถานะ</label>
                    <select name="status" value={formData.status} onChange={handleChange} className={`w-full p-3 border rounded-xl outline-none font-semibold text-sm cursor-pointer ${getStatusStyle(formData.status)}`}>
                      {STATUS_OPTIONS.map(s => <option key={s} value={s} className="bg-white text-slate-800 font-medium">{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5 drop-shadow-sm">รูปแบบงาน</label>
                    <select name="workMode" value={formData.workMode} onChange={handleChange} className="w-full p-3 bg-gradient-to-b from-white to-slate-50 border border-slate-300 shadow-inner rounded-xl outline-none text-sm font-medium cursor-pointer">
                      {WORK_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5 drop-shadow-sm">ช่วงเงินเดือน</label>
                    <select name="salary" value={formData.salary} onChange={handleChange} className="w-full p-3 bg-gradient-to-b from-white to-slate-50 border border-slate-300 shadow-inner rounded-xl outline-none text-sm font-medium cursor-pointer">
                      {SALARY_RANGES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5 drop-shadow-sm">วันที่สมัคร</label>
                    <input type="date" name="date" value={formData.date} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-300 shadow-inner rounded-xl outline-none text-sm font-medium" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 drop-shadow-sm">ลิงก์ประกาศงาน / JD</label>
                  <input type="url" name="link" value={formData.link || ''} onChange={handleChange} placeholder="https://..." className="w-full p-3 bg-slate-50 border border-slate-300 shadow-inner rounded-xl outline-none text-sm font-medium" />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 drop-shadow-sm">บันทึกเพิ่มเติม</label>
                  <textarea name="notes" value={formData.notes || ''} onChange={handleChange} placeholder="เทคโนโลยีที่ใช้, คำถามที่เจอ..." rows="3" className="w-full p-3 bg-slate-50 border border-slate-300 shadow-inner rounded-xl outline-none text-sm font-medium resize-none"></textarea>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-200">
                  <button type="submit" disabled={isLoading} className="flex-1 bg-gradient-to-b from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 border border-blue-600 text-white font-bold py-3.5 px-4 rounded-full shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_2px_4px_rgba(0,0,0,0.15)] disabled:opacity-70 transition-all drop-shadow-sm">
                    {isLoading ? 'กำลังประมวลผล...' : (isEditing ? '💾 บันทึกการแก้ไข' : '+ เพิ่มประวัติ')}
                  </button>
                  {isEditing && (
                    <button type="button" onClick={() => { setIsEditing(false); setFormData(initialForm); }} className="w-full sm:w-auto px-5 py-3.5 bg-gradient-to-b from-white to-slate-100 border border-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_1px_2px_rgba(0,0,0,0.05)] text-slate-700 font-bold rounded-full hover:from-slate-50 hover:to-slate-200 transition-all">ยกเลิก</button>
                  )}
                </div>
              </form>
            </div>
          </div>

          <div className="lg:col-span-8 mt-8 lg:mt-0">
            <div className="bg-white/90 backdrop-blur-md p-3.5 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,1)] border border-slate-200/80 mb-6 flex flex-col md:flex-row gap-3 items-center">
              <div className="relative w-full md:flex-1">
                <span className="absolute left-3.5 top-3 text-slate-400">🔍</span>
                <input type="text" placeholder="ค้นหาบริษัท หรือ ตำแหน่ง..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-11 p-3 bg-slate-50 border border-slate-200 shadow-inner rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-400 focus:border-sky-400 outline-none text-sm font-medium transition-all" />
              </div>
              <div className="w-full md:w-auto flex items-center gap-3">
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-full md:w-36 p-3 bg-gradient-to-b from-white to-slate-50 border border-slate-300 shadow-sm rounded-xl outline-none text-sm font-medium cursor-pointer">
                  <option value="newest">🕒 ล่าสุด</option>
                  <option value="oldest">⏳ เก่าสุด</option>
                  <option value="a-z">🔤 A-Z</option>
                </select>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full md:w-48 p-3 bg-gradient-to-b from-white to-slate-50 border border-slate-300 shadow-sm rounded-xl outline-none text-sm font-medium cursor-pointer">
                  <option value="All">📌 ทุกสถานะ</option>
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {isLoading && jobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24">
                <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-sky-500 mb-4 shadow-sm"></div>
                <p className="text-slate-600 font-bold animate-pulse drop-shadow-sm">กำลังดึงข้อมูลจาก Cloud Database...</p>
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-slate-500 py-24 bg-white/60 backdrop-blur-sm rounded-3xl border border-dashed border-slate-400 shadow-inner">
                <span className="text-6xl mb-5 grayscale opacity-60 drop-shadow-md">☁️</span>
                <h3 className="text-xl font-bold text-slate-700 mb-2 drop-shadow-sm">ยังไม่มีประวัติใน Database ครับ</h3>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {filteredJobs.map((job) => (
                  <div key={job.id} className={`bg-gradient-to-b from-white to-slate-50 p-5 md:p-6 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,1)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,1)] hover:-translate-y-0.5 transition-all duration-300 border-l-[6px] ${getCardBorderColor(job.status)} border-y border-r border-slate-200`}>
                    <div className="flex flex-col md:flex-row justify-between md:items-start gap-5 relative z-10">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3 mb-1.5">
                          <h2 className="text-xl md:text-2xl font-extrabold text-slate-800 drop-shadow-sm">{job.company}</h2>
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-600 uppercase border border-slate-300 shadow-inner">{job.workMode || 'ไม่ระบุ'}</span>
                        </div>
                        <p className="text-base md:text-lg text-sky-700 font-bold mb-4 drop-shadow-sm">{job.position}</p>
                        <div className="flex flex-wrap gap-x-5 gap-y-3 text-sm text-slate-600 font-medium mb-4">
                          <span className="flex items-center gap-1.5 bg-white border border-slate-200 shadow-sm px-2.5 py-1 rounded-md">🗓 {job.date}</span>
                          {job.salary && job.salary !== 'ไม่ระบุ' && <span className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 shadow-sm px-2.5 py-1 rounded-md">💰 {job.salary}</span>}
                          {job.link && <a href={job.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 bg-sky-50 border border-sky-200 text-sky-700 hover:bg-sky-100 shadow-sm px-2.5 py-1 rounded-md transition-colors">🔗 ดูประกาศงาน</a>}
                        </div>
                        {job.notes && <div className="bg-white p-3.5 rounded-xl text-sm text-slate-700 border border-slate-200 shadow-inner mt-2"><span className="font-bold text-slate-800 block mb-1 drop-shadow-sm">📝 บันทึก:</span>{job.notes}</div>}
                      </div>

                      <div className="flex flex-col gap-3 w-full md:w-auto md:min-w-[200px]">
                        <div className="w-full">
                          <label className="text-xs font-bold text-slate-500 block mb-1.5 uppercase drop-shadow-sm">สถานะปัจจุบัน</label>
                          <select value={job.status} onChange={(e) => handleQuickStatusChange(job.id, e.target.value)} className={`w-full p-2.5 border rounded-xl text-sm font-bold outline-none cursor-pointer shadow-sm ${getStatusStyle(job.status)}`}>
                            {STATUS_OPTIONS.map(s => <option key={s} value={s} className="bg-white text-slate-800">{s}</option>)}
                          </select>
                        </div>
                        <div className="flex gap-2 w-full mt-1">
                          <button onClick={() => handleEdit(job)} className="flex-1 px-4 py-2 bg-gradient-to-b from-white to-slate-100 border border-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_1px_2px_rgba(0,0,0,0.05)] text-slate-600 hover:text-sky-700 hover:from-sky-50 hover:to-sky-100 font-bold rounded-full text-sm transition-all">✏️ แก้ไข</button>
                          <button onClick={() => setItemToDelete(job.id)} className="flex-1 px-4 py-2 bg-gradient-to-b from-white to-slate-100 border border-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_1px_2px_rgba(0,0,0,0.05)] text-slate-500 hover:text-rose-600 hover:from-rose-50 hover:to-rose-100 font-bold rounded-full text-sm transition-all">🗑️ ลบ</button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}