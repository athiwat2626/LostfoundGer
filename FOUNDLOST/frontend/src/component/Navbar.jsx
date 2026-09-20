import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

function Navbar() {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const email = localStorage.getItem('email');

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('email');
    navigate('/login');
  };

  return (
    <nav className="bg-white/95 backdrop-blur border-b border-slate-100 shadow-sm text-slate-700">
      <div className="w-full px-4">
        <div className="flex items-center h-16 gap-2 justify-between">
          {/* Logo */}
          <Link to="/foundPage" className="flex items-center gap-1.5 shrink-0 hover:opacity-80">
            <span className="text-lg font-extrabold text-emerald-800">KU</span>
            <span className="hidden sm:block text-xs font-semibold text-lime-600 leading-tight">
              Lost&amp;Found
            </span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-1">
            <Link to="/home" className="text-slate-600 hover:bg-slate-100 px-3 py-2 rounded-full transition whitespace-nowrap text-sm font-medium">
              หน้าหลัก
            </Link>
            <Link to="/foundPage" className="text-slate-600 hover:bg-slate-100 px-3 py-2 rounded-full transition whitespace-nowrap text-sm font-medium">
              พบของ
            </Link>
            <Link to="/lostPage" className="text-slate-600 hover:bg-slate-100 px-3 py-2 rounded-full transition whitespace-nowrap text-sm font-medium">
              ของหาย
            </Link>
            <Link to="/lostItem" className="flex items-center gap-1.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white px-4 py-2 rounded-full transition whitespace-nowrap text-sm font-semibold shadow-sm">
              📍 รายงานของหาย
            </Link>
            <Link to="/foundItem" className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-4 py-2 rounded-full transition whitespace-nowrap text-sm font-semibold shadow-sm">
              🎁 รายงานของพบ
            </Link>
            <Link to="/ranking" className="flex items-center gap-1.5 bg-amber-100 hover:bg-amber-200 text-amber-700 px-3 py-2 rounded-full transition whitespace-nowrap text-sm font-semibold">
              🏆 จัดอันดับ
            </Link>
          </div>

          {/* User Info and Logout */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            <p className="text-sm font-medium text-slate-500 whitespace-nowrap">👤 {email || 'Guest'}</p>
            <button
              onClick={handleLogout}
              className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-full transition font-semibold text-sm whitespace-nowrap"
            >
              ออกจากระบบ
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-2xl text-emerald-800"
            >
              ☰
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t border-slate-100 px-4 py-4 space-y-2">
          <Link
            to="/home"
            className="block text-slate-600 hover:bg-slate-100 px-3 py-2 rounded-xl font-medium"
            onClick={() => setIsMenuOpen(false)}
          >
            หน้าหลัก
          </Link>
          <Link
            to="/foundPage"
            className="block text-slate-600 hover:bg-slate-100 px-3 py-2 rounded-xl font-medium"
            onClick={() => setIsMenuOpen(false)}
          >
            พบของ
          </Link>
          <Link
            to="/lostPage"
            className="block text-slate-600 hover:bg-slate-100 px-3 py-2 rounded-xl font-medium"
            onClick={() => setIsMenuOpen(false)}
          >
            ของหาย
          </Link>
          <Link
            to="/lostItem"
            className="block bg-gradient-to-r from-red-600 to-rose-600 text-white px-3 py-2 rounded-xl font-semibold"
            onClick={() => setIsMenuOpen(false)}
          >
            📍 รายงานของหาย
          </Link>
          <Link
            to="/foundItem"
            className="block bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-3 py-2 rounded-xl font-semibold"
            onClick={() => setIsMenuOpen(false)}
          >
            🎁 รายงานของพบ
          </Link>
          <Link
            to="/ranking"
            className="block bg-amber-100 text-amber-700 px-3 py-2 rounded-xl font-semibold"
            onClick={() => setIsMenuOpen(false)}
          >
            🏆 จัดอันดับ
          </Link>
          <hr className="border-slate-100 my-2" />
          <p className="px-3 py-2 text-sm text-slate-500">👤 {email || 'Guest'}</p>
          <button
            onClick={() => {
              handleLogout();
              setIsMenuOpen(false);
            }}
            className="w-full bg-red-50 text-red-600 px-3 py-2 rounded-xl text-left font-semibold"
          >
            ออกจากระบบ
          </button>
        </div>
      )}
    </nav>
  );
}

export default Navbar;
