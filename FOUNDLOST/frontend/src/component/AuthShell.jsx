import logo from "../assets/images/logo.png";

// รูปพื้นหลังหน้าเข้าสู่ระบบ: วางไฟล์ชื่อ login-bg.(jpg|jpeg|png|webp) ไว้ใน assets/images แล้วจะถูกใช้อัตโนมัติ
// ถ้ายังไม่มีไฟล์ จะใช้พื้นหลังไล่สีโทนเขียวมิ้นต์แทน
const bgImage = Object.values(
  import.meta.glob("../assets/images/login-bg.{jpg,jpeg,png,webp}", { eager: true, import: "default" })
)[0];

// โครงหน้าเข้าสู่ระบบ/สมัครสมาชิก: พื้นหลังเบลอ + การ์ดกระจกฝ้ากลางจอ + โลโก้คร่อมขอบบนการ์ด
const AuthShell = ({ children }) => (
  <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#d6ebe6] px-4 py-16">
    {bgImage ? (
      <>
        <img src={bgImage} alt="" className="absolute inset-0 h-full w-full scale-105 object-cover blur-[3px]" />
        <div className="absolute inset-0 bg-teal-50/30" />
      </>
    ) : (
      <>
        <div className="absolute inset-0 bg-linear-to-br from-[#eef7f5] via-[#d3ebe6] to-[#b7dad3]" />
        <div className="absolute -left-24 top-1/4 h-96 w-96 rounded-full bg-white/60 blur-3xl" />
        <div className="absolute -right-24 bottom-0 h-112 w-md rounded-full bg-teal-300/40 blur-3xl" />
        <div className="absolute left-[30%] -top-16 h-48 w-48 rounded-full bg-white/80 blur-3xl" />
        <div className="absolute right-[30%] -top-16 h-48 w-48 rounded-full bg-white/80 blur-3xl" />
      </>
    )}

    <div className="relative w-full max-w-md">
      <img src={logo} alt="KU FOUND&LOST" className="relative z-10 mx-auto -mb-16 w-48 drop-shadow-sm" />
      <section className="rounded-3xl border border-white/70 bg-white/65 px-8 pb-10 pt-16 shadow-2xl backdrop-blur-xl sm:px-10">
        {children}
      </section>
    </div>
  </main>
);

export default AuthShell;
