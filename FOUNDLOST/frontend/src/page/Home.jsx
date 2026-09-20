import React from 'react';
import { Link } from 'react-router-dom';
import logo from '../assets/images/logo.png';

const PillButton = ({ children, tone }) => {
  const tones = {
    red: "bg-gradient-to-r from-red-600 to-rose-600 text-white",
    emerald: "bg-gradient-to-r from-emerald-600 to-teal-600 text-white",
    white: "bg-white text-red-600",
    whiteEmerald: "bg-white text-emerald-700",
  };
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold shadow-sm ${tones[tone]}`}>
      {children}
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black/10 text-xs">+</span>
    </span>
  );
};

const Home = () => {
  return (
    <div className="min-h-screen bg-[#f7f3ea] bg-dot-pattern">

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-14">
          <img src={logo} alt="KU Lost&Found" className="mx-auto mb-4 h-20 w-auto object-contain" />
          <p className="text-lg text-slate-600">
            ระบบค้นหาและรายงานของหายภายในมหาวิทยาลัยเกษตรศาสตร์
          </p>
        </div>

        {/* Main Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Lost Items Card */}
          <Link to="/lostPage">
            <div className="bg-white rounded-3xl shadow-sm p-8 hover:shadow-md transition h-full border border-slate-100">
              <div className="text-5xl mb-4">📋</div>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">ของหาย</h2>
              <p className="text-slate-500 mb-6">
                ดูรายการของที่มีคนรายงานว่ากำลังหาของ อาจจะเป็นของของคุณก็ได้
              </p>
              <PillButton tone="red">ดูรายการของหาย</PillButton>
            </div>
          </Link>

          {/* Found Items Card */}
          <Link to="/foundPage">
            <div className="bg-white rounded-3xl shadow-sm p-8 hover:shadow-md transition h-full border border-slate-100">
              <div className="text-5xl mb-4">✨</div>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">พบของ</h2>
              <p className="text-slate-500 mb-6">
                ดูรายการของที่ผู้อื่นพบ หากเป็นของของคุณ สามารถติดต่อขอคืนได้
              </p>
              <PillButton tone="emerald">ดูรายการพบของ</PillButton>
            </div>
          </Link>
        </div>

        {/* Action Buttons */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Report Lost Item */}
          <Link to="/lostItem">
            <div className="bg-gradient-to-br from-red-600 to-rose-700 rounded-3xl shadow-md p-8 hover:shadow-lg transition text-white h-full">
              <div className="text-5xl mb-4">🎈</div>
              <h2 className="text-2xl font-bold mb-3">รายงานของหาย</h2>
              <p className="mb-6 text-red-50">
                คุณสูญเสียของไป? รายงานของหายของคุณเพื่อให้ผู้อื่นช่วยค้นหา
              </p>
              <PillButton tone="white">สร้างรายงานของหาย</PillButton>
            </div>
          </Link>

          {/* Report Found Item */}
          <Link to="/foundItem">
            <div className="bg-gradient-to-br from-orange-500 to-amber-600 rounded-3xl shadow-md p-8 hover:shadow-lg transition text-white h-full">
              <div className="text-5xl mb-4">🎁</div>
              <h2 className="text-2xl font-bold mb-3">รายงานของพบ</h2>
              <p className="mb-6 text-orange-50">
                คุณพบของที่ไม่ใช่ของคุณ? รายงานเพื่อช่วยเจ้าของกลับคืน
              </p>
              <PillButton tone="white">สร้างรายงานของพบ</PillButton>
            </div>
          </Link>
        </div>

        {/* Features */}
        <div className="mt-14 bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-8 text-center">ฟีเจอร์หลัก</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-4xl mb-4">📸</div>
              <h3 className="font-bold text-lg mb-2 text-slate-800">อัปโหลดรูปภาพ</h3>
              <p className="text-slate-500">
                อัปโหลดรูปภาพของชัดเจน เพื่อให้ผู้อื่นช่วยค้นหาได้อย่างแม่นยำ
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">📍</div>
              <h3 className="font-bold text-lg mb-2 text-slate-800">ระบุสถานที่</h3>
              <p className="text-slate-500">
                ระบุสถานที่ที่พบหรือสูญเสีย ผ่านแผนที่อินเตอร์แอกทีฟ
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">💬</div>
              <h3 className="font-bold text-lg mb-2 text-slate-800">ติดต่อสื่อสาร</h3>
              <p className="text-slate-500">
                ติดต่อเจ้าของของโดยตรง เพื่อหารือการคืนของ
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
