import React, { useState, useEffect, useMemo } from 'react';

// รายการสถานะทั้งหมด
const STATUS_OPTIONS = [
  'รอติดต่อกลับ', 
  'มีการติดต่อมา', 
  'ทำแบบทดสอบ',
  'นัดสัมภาษณ์', 
  'ได้รับ Offer', 
  'ปฏิเสธ Offer',
  'ไม่ผ่าน'
];

const WORK_MODES = ['On-site', 'Hybrid', 'Remote'];

// เพิ่มตัวเลือกช่วงเงินเดือนสำหรับ Dropdown
const SALARY_RANGES = [
  'ไม่ระบุ',
  'น้อยกว่า 15,000 ฿',
  '15,000 - 18,000 ฿',
  '18,000 - 20,000 ฿',
  '20,000 - 25,000 ฿',
  '25,000 - 30,000 ฿',
  '30,000 - 35,000 ฿',
  '35,000 - 40,000 ฿',
  '40,000 - 45,000 ฿',
  '45,000 - 50,000 ฿',
  '50,000 - 60,000 ฿',
  '60,000 - 70,000 ฿',
  '70,000 - 80,000 ฿',
  '80,000 - 100,000 ฿',
  'มากกว่า 100,000 ฿'
];

export default function App() {
  // 1. States
  const [jobs, setJobs] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  
  // ลบ errorMsg เดิมออก เปลี่ยนมาใช้ Toast และเพิ่ม State สำหรับการจัดเรียง
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [sortBy, setSortBy] = useState('newest'); 
  const [itemToDelete, setItemToDelete] = useState(null); // เพิ่ม State สำหรับ Modal ยืนยันการลบ
  
  const initialForm = {
    company: '', position: '', status: 'รอติดต่อกลับ', 
    date: new Date().toISOString().split('T')[0], 
    salary: 'ไม่ระบุ', workMode: 'Hybrid', link: '', notes: ''
  };
  const [formData, setFormData] = useState(initialForm);

  // State สำหรับค้นหาและกรอง
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  // Helper สำหรับโชว์ข้อความแจ้งเตือน (Toast)
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message, type: 'success' }), 3000);
  };

  // 2. Load / Save LocalStorage
  useEffect(() => {
    const savedJobs = localStorage.getItem('proJobTracker');
    if (savedJobs) setJobs(JSON.parse(savedJobs));
  }, []);

  useEffect(() => {
    localStorage.setItem('proJobTracker', JSON.stringify(jobs));
  }, [jobs]);

  // 3. Handlers
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.company || !formData.position) {
      showToast('กรุณากรอกชื่อบริษัทและตำแหน่งให้ครบถ้วนครับ ✌️', 'error');
      return;
    }

    if (isEditing) {
      setJobs(jobs.map(job => job.id === editId ? { ...formData, id: editId } : job));
      setIsEditing(false);
      setEditId(null);
      showToast('อัปเดตข้อมูลสำเร็จ! ✨');
    } else {
      const newJob = { id: Date.now(), ...formData };
      setJobs([newJob, ...jobs]);
      showToast('เพิ่มประวัติการสมัครใหม่แล้ว! 🚀');
    }
    setFormData(initialForm);
  };

  const handleEdit = (job) => {
    setFormData(job);
    setIsEditing(true);
    setEditId(job.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const promptDelete = (id) => {
    setItemToDelete(id); // เปิด Modal เพื่อยืนยันการลบ แทนการใช้ window.confirm ที่โดนบล็อก
  };

  const executeDelete = () => {
    if(itemToDelete) {
      setJobs(jobs.filter(job => job.id !== itemToDelete));
      if (isEditing && editId === itemToDelete) {
        setIsEditing(false);
        setFormData(initialForm);
      }
      showToast('ลบข้อมูลเรียบร้อยแล้ว 🗑️', 'error');
      setItemToDelete(null); // ปิด Modal หลังจากลบเสร็จ
    }
  };

  const handleQuickStatusChange = (id, newStatus) => {
    setJobs(jobs.map(job => job.id === id ? { ...job, status: newStatus } : job));
    
    // ลูกเล่นแสดงข้อความตอนเปลี่ยนสถานะด่วน
    if(newStatus === 'ได้รับ Offer') {
      showToast('ยินดีด้วยครับ! ได้รับ Offer แล้ว 🎉', 'success');
    } else {
      showToast(`อัปเดตสถานะเป็น ${newStatus} แล้ว`, 'success');
    }
  };

  // 4. Derived Data
  const filteredJobs = useMemo(() => {
    let result = jobs.filter(job => {
      const matchSearch = job.company.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          job.position.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = filterStatus === 'All' || job.status === filterStatus;
      return matchSearch && matchStatus;
    });

    // ระบบจัดเรียงข้อมูล (Sorting)
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

  // 5. Helpers สำหรับความสวยงาม
  const getStatusStyle = (status) => {
    switch (status) {
      case 'รอติดต่อกลับ': return 'bg-slate-100 text-slate-600 border-slate-200';
      case 'มีการติดต่อมา': return 'bg-amber-50 text-amber-600 border-amber-200';
      case 'ทำแบบทดสอบ': return 'bg-violet-50 text-violet-600 border-violet-200';
      case 'นัดสัมภาษณ์': return 'bg-blue-50 text-blue-600 border-blue-200';
      case 'ได้รับ Offer': return 'bg-emerald-50 text-emerald-600 border-emerald-200';
      case 'ปฏิเสธ Offer': return 'bg-orange-50 text-orange-600 border-orange-200';
      case 'ไม่ผ่าน': return 'bg-rose-50 text-rose-600 border-rose-200';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  const getCardBorderColor = (status) => {
    switch (status) {
      case 'ได้รับ Offer': return 'border-l-emerald-400';
      case 'นัดสัมภาษณ์': return 'border-l-blue-400';
      case 'ทำแบบทดสอบ': return 'border-l-violet-400';
      case 'มีการติดต่อมา': return 'border-l-amber-400';
      case 'ไม่ผ่าน': return 'border-l-rose-400';
      case 'ปฏิเสธ Offer': return 'border-l-orange-400';
      default: return 'border-l-slate-300';
    }
  };

  return (
    // พื้นหลังอัปเกรดเป็น Gradient อ่อนๆ ดูพรีเมียม
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-indigo-50/30 p-4 md:p-8 font-sans pb-20 text-slate-800 selection:bg-indigo-100 selection:text-indigo-900 relative overflow-hidden">
      
      {/* Custom Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl">
            <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center text-3xl mb-5 mx-auto">
              🗑️
            </div>
            <h3 className="text-xl font-bold text-center text-slate-800 mb-2">ยืนยันการลบ</h3>
            <p className="text-center text-slate-500 mb-8 font-medium">แน่ใจหรือไม่ว่าต้องการลบข้อมูลนี้? ข้อมูลจะถูกลบอย่างถาวร</p>
            <div className="flex gap-3">
              <button onClick={() => setItemToDelete(null)} className="flex-1 py-3 px-4 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors">
                ยกเลิก
              </button>
              <button onClick={executeDelete} className="flex-1 py-3 px-4 bg-rose-500 text-white font-bold rounded-xl hover:bg-rose-600 transition-colors shadow-md shadow-rose-200">
                ใช่, ลบเลย
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification (ลูกเล่นแจ้งเตือนมุมขวาบน) */}
      <div className={`fixed top-5 right-5 z-50 transition-all duration-500 transform ${toast.show ? 'translate-y-0 opacity-100' : '-translate-y-20 opacity-0 pointer-events-none'}`}>
        <div className={`px-6 py-4 rounded-2xl shadow-xl border flex items-center gap-3 backdrop-blur-md ${toast.type === 'error' ? 'bg-rose-50/90 border-rose-200 text-rose-700' : 'bg-white/90 border-emerald-200 text-emerald-700'}`}>
          <span className="text-2xl">{toast.type === 'error' ? '⚠️' : '✅'}</span>
          <p className="font-bold">{toast.message}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Header Section */}
        <div className="mb-10 text-center md:text-left">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-3 tracking-tight">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
              Job Tracker
            </span>
            <span className="ml-3 text-3xl">🚀</span>
          </h1>
          <p className="text-slate-500 font-medium text-sm md:text-base">
            จัดการและติดตามทุกสถานะการสมัครงานของคุณอย่างมืออาชีพ
          </p>
        </div>
          
        {/* Stats Section - ดีไซน์การ์ดแบบมีลูกเล่นสีสัน */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <div className="relative overflow-hidden bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all group">
            <div className="absolute -right-4 -top-4 w-16 h-16 bg-slate-50 rounded-full group-hover:scale-150 transition-transform duration-500 ease-out"></div>
            <p className="text-xs md:text-sm text-slate-500 font-bold uppercase tracking-wider relative z-10">ยื่นสมัครทั้งหมด</p>
            <p className="text-3xl md:text-4xl font-extrabold text-slate-800 mt-2 relative z-10">{stats.total}</p>
          </div>
          
          <div className="relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 p-5 rounded-2xl shadow-md shadow-blue-200 hover:-translate-y-1 transition-all group text-white">
            <div className="absolute right-0 bottom-0 opacity-20 text-5xl transform translate-x-2 translate-y-2 group-hover:scale-110 transition-transform">💬</div>
            <p className="text-xs md:text-sm font-bold uppercase tracking-wider text-blue-100">รอสัมภาษณ์</p>
            <p className="text-3xl md:text-4xl font-extrabold mt-2">{stats.interview}</p>
          </div>

          <div className="relative overflow-hidden bg-gradient-to-br from-emerald-400 to-emerald-600 p-5 rounded-2xl shadow-md shadow-emerald-200 hover:-translate-y-1 transition-all group text-white">
            <div className="absolute right-0 bottom-0 opacity-20 text-5xl transform translate-x-2 translate-y-2 group-hover:scale-110 transition-transform">🎉</div>
            <p className="text-xs md:text-sm font-bold uppercase tracking-wider text-emerald-100">ได้รับ Offer</p>
            <p className="text-3xl md:text-4xl font-extrabold mt-2">{stats.offer}</p>
          </div>

          <div className="relative overflow-hidden bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all group">
            <div className="absolute right-0 bottom-0 opacity-5 text-5xl transform translate-x-2 translate-y-2">📉</div>
            <p className="text-xs md:text-sm text-slate-500 font-bold uppercase tracking-wider">ไม่ผ่าน / ปฏิเสธ</p>
            <p className="text-3xl md:text-4xl font-extrabold text-rose-500 mt-2">{stats.rejected}</p>
          </div>
        </div>

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Form */}
          <div className="lg:col-span-4">
            <div className="bg-white/80 backdrop-blur-xl p-6 md:p-8 rounded-3xl shadow-xl shadow-slate-200/40 border border-white sticky top-8">
              <h2 className="text-xl font-extrabold text-slate-800 mb-6 flex items-center gap-2">
                {isEditing ? <><span className="text-amber-500">✏️</span> แก้ไขข้อมูล</> : <><span className="text-indigo-500">✨</span> เพิ่มประวัติใหม่</>}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">ชื่อบริษัท <span className="text-rose-500">*</span></label>
                  <input type="text" name="company" value={formData.company} onChange={handleChange} placeholder="เช่น Google, Agoda" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-200 text-sm font-medium" required />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">ตำแหน่งที่สมัคร <span className="text-rose-500">*</span></label>
                  <input type="text" name="position" value={formData.position} onChange={handleChange} placeholder="เช่น Senior Frontend Developer" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-200 text-sm font-medium" required />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">สถานะ</label>
                    <select 
                      name="status" 
                      value={formData.status} 
                      onChange={handleChange} 
                      className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-colors font-semibold text-sm cursor-pointer ${getStatusStyle(formData.status)}`}
                    >
                      {STATUS_OPTIONS.map(status => <option key={status} value={status} className="bg-white text-slate-800 font-medium">{status}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">รูปแบบงาน</label>
                    <select name="workMode" value={formData.workMode} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all duration-200 text-sm font-medium cursor-pointer">
                      {WORK_MODES.map(mode => <option key={mode} value={mode}>{mode}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">ช่วงเงินเดือน</label>
                    <select name="salary" value={formData.salary} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all duration-200 text-sm font-medium cursor-pointer">
                      {SALARY_RANGES.map(range => <option key={range} value={range}>{range}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">วันที่สมัคร</label>
                    <input type="date" name="date" value={formData.date} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all duration-200 text-sm font-medium" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">ลิงก์ประกาศงาน / JD</label>
                  <input type="url" name="link" value={formData.link || ''} onChange={handleChange} placeholder="https://..." className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all duration-200 text-sm font-medium" />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">บันทึกเพิ่มเติม</label>
                  <textarea name="notes" value={formData.notes || ''} onChange={handleChange} placeholder="เทคโนโลยีที่ใช้, คำถามที่เจอ..." rows="3" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all duration-200 text-sm font-medium resize-none"></textarea>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100">
                  <button type="submit" className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-md shadow-indigo-200 hover:shadow-lg transition-all duration-300 transform active:scale-95">
                    {isEditing ? '💾 บันทึกการแก้ไข' : '+ เพิ่มประวัติ'}
                  </button>
                  {isEditing && (
                    <button type="button" onClick={() => { setIsEditing(false); setFormData(initialForm); }} className="w-full sm:w-auto px-5 py-3.5 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors">
                      ยกเลิก
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* Right Column: List & Filter */}
          <div className="lg:col-span-8 mt-8 lg:mt-0">
            
            {/* Search & Filter Bar */}
            <div className="bg-white/80 backdrop-blur-md p-3.5 rounded-2xl shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row gap-3 items-center">
              <div className="relative w-full md:flex-1">
                <span className="absolute left-3.5 top-3 text-slate-400">🔍</span>
                <input 
                  type="text" 
                  placeholder="ค้นหาบริษัท หรือ ตำแหน่ง..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 p-3 bg-slate-50 border border-transparent rounded-xl focus:bg-white focus:border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium transition-all"
                />
              </div>
              <div className="w-full md:w-auto flex items-center gap-3">
                <div className="h-8 w-px bg-slate-200 hidden md:block"></div>
                
                {/* เพิ่ม Dropdown เรียงลำดับ */}
                <select 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full md:w-36 p-3 bg-slate-50 border border-transparent rounded-xl focus:bg-white focus:border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium cursor-pointer transition-all"
                >
                  <option value="newest">🕒 ล่าสุด</option>
                  <option value="oldest">⏳ เก่าสุด</option>
                  <option value="a-z">🔤 A-Z</option>
                </select>

                <select 
                  value={filterStatus} 
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full md:w-48 p-3 bg-slate-50 border border-transparent rounded-xl focus:bg-white focus:border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium cursor-pointer transition-all"
                >
                  <option value="All">📌 ทุกสถานะ</option>
                  {STATUS_OPTIONS.map(status => <option key={status} value={status}>{status}</option>)}
                </select>
              </div>
            </div>

            {/* List */}
            {filteredJobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-slate-400 py-24 bg-white/50 backdrop-blur-sm rounded-3xl border border-dashed border-slate-300 px-4">
                <span className="text-6xl mb-5 block grayscale opacity-50">📂</span>
                <h3 className="text-xl font-bold text-slate-700 mb-2">ยังไม่มีประวัติในหมวดหมู่นี้</h3>
                <p className="text-sm font-medium">เพิ่มข้อมูลการสมัครงานจากฟอร์มด้านซ้ายได้เลยครับ</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {filteredJobs.map((job) => (
                  <div key={job.id} className={`bg-white p-5 md:p-6 rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group relative border-l-[6px] ${getCardBorderColor(job.status)} border-y border-r border-slate-100 ${job.status === 'ได้รับ Offer' ? 'ring-2 ring-emerald-400/50 shadow-emerald-100/50 overflow-hidden' : ''}`}>
                    
                    {/* เอฟเฟกต์พิเศษตอนได้ Offer */}
                    {job.status === 'ได้รับ Offer' && (
                      <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl pointer-events-none transform rotate-12 transition-transform group-hover:scale-110 group-hover:rotate-6">🎉</div>
                    )}

                    <div className="flex flex-col md:flex-row justify-between md:items-start gap-5 relative z-10">
                      
                      {/* Job Info */}
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3 mb-1.5">
                          <h2 className="text-xl md:text-2xl font-extrabold text-slate-800">{job.company}</h2>
                          <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-500 tracking-wide uppercase">
                            {job.workMode || 'ไม่ระบุ'}
                          </span>
                        </div>
                        <p className="text-base md:text-lg text-indigo-600 font-bold mb-4">{job.position}</p>
                        
                        <div className="flex flex-wrap gap-x-5 gap-y-3 text-sm text-slate-500 font-medium mb-4">
                          <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg"><span className="opacity-70">🗓</span> {job.date}</span>
                          {job.salary && job.salary !== 'ไม่ระบุ' && (
                            <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg"><span className="opacity-70">💰</span> {job.salary}</span>
                          )}
                          {job.link && (
                            <a href={job.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 bg-blue-50 text-blue-600 px-2.5 py-1 rounded-lg hover:bg-blue-100 transition-colors">
                              <span className="opacity-70">🔗</span> ดูประกาศงาน
                            </a>
                          )}
                        </div>
                        
                        {job.notes && (
                          <div className="bg-slate-50/80 p-3.5 rounded-xl text-sm text-slate-600 border border-slate-100 mt-2 leading-relaxed">
                            <span className="font-bold text-slate-700 block mb-1">📝 บันทึก:</span>
                            {job.notes}
                          </div>
                        )}
                      </div>

                      {/* Controls (Status Update & Actions) */}
                      <div className="flex flex-col gap-3 w-full md:w-auto md:min-w-[200px] border-t md:border-t-0 pt-4 md:pt-0 border-slate-100">
                        <div className="w-full">
                          <label className="text-xs font-bold text-slate-400 block mb-1.5 uppercase tracking-wide">สถานะปัจจุบัน</label>
                          <select 
                            value={job.status} 
                            onChange={(e) => handleQuickStatusChange(job.id, e.target.value)}
                            className={`w-full p-2.5 border rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-colors cursor-pointer ${getStatusStyle(job.status)}`}
                          >
                            {STATUS_OPTIONS.map(status => <option key={status} value={status} className="bg-white text-slate-800 font-medium">{status}</option>)}
                          </select>
                        </div>
                        
                        <div className="flex gap-2 w-full justify-end opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                          <button onClick={() => handleEdit(job)} className="flex-1 md:flex-none px-4 py-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 font-bold rounded-xl transition-colors text-sm border border-transparent hover:border-indigo-100">
                            ✏️ แก้ไข
                          </button>
                          <button onClick={() => promptDelete(job.id)} className="flex-1 md:flex-none px-4 py-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 font-bold rounded-xl transition-colors text-sm border border-transparent hover:border-rose-100">
                            🗑️ ลบ
                          </button>
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