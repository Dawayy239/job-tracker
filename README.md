# 🍏 Job Tracker

แอปพลิเคชันสำหรับจัดการและติดตามสถานะการสมัครงาน พัฒนาด้วย React และเชื่อมต่อฐานข้อมูลบน Cloud แบบ Real-time เพื่อช่วยให้คนหางานสามารถจัดการข้อมูลได้อย่างเป็นระบบและปลอดภัย

<img width="1734" height="906" alt="image" src="https://github.com/user-attachments/assets/92974c55-30fc-43c7-99ae-44221d812de4" />

## ✨ ฟีเจอร์หลัก (Features)
- **🔐 Secure Login:** ระบบ Authentication ปกป้องข้อมูลส่วนตัว (มีแค่เจ้าของบัญชีที่เข้าถึงได้)
- **☁️ Cloud Database:** ซิงค์ข้อมูลแบบ Real-time ด้วย Supabase ไม่ว่าเปิดเครื่องไหนข้อมูลก็อัปเดตตรงกัน
- **📊 Dashboard & Stats:** สรุปสถิติการยื่นสมัครงาน, รอสัมภาษณ์ และผลลัพธ์แบบอัตโนมัติ
- **📱 Responsive Design:** UI/UX ทันสมัย ใช้งานได้ลื่นไหลทั้งบนคอมพิวเตอร์และโทรศัพท์มือถือ

## 🛠️ เทคโนโลยีที่ใช้ (Tech Stack)
- **Frontend:** React.js (Vite)
- **Styling:** Tailwind CSS
- **Backend & Database:** Supabase (PostgreSQL)
- **Deployment:** GitHub Pages

## 🚀 วิธีการติดตั้งและรันโปรเจกต์ในเครื่อง (Local Setup)

1. Clone โปรเจกต์นี้ลงเครื่อง
git clone [https://github.com/](https://github.com/)dawayy239/Job-Tracker.git

2.ติดตั้ง Dependencies
npm install

3.ตั้งค่า Environment Variables (สร้างไฟล์ .env.local)
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

4.รันเซิร์ฟเวอร์
npm run dev
