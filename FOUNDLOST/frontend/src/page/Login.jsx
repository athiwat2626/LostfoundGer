import React, { useState } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";

const Login = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [message, setMessage] = useState(location.state?.message || "");
    const [messageOtp, setMessageOtp] = useState("");

    // ส่ง OTP
    const sendOTP = async () => {
        try {
            localStorage.removeItem("isLoggedIn");
            const response = await axios.post(
                "http://localhost:3000/api/send-otp",
                {
                    email: email
                },
            );
            if (response.data.success) {
                setMessage("ส่ง OTP สำเร็จแล้ว");
            }
            console.log(response.data);

        } catch (error) {
            console.log(error.response?.data || error.message);
            setMessage(
                error.response?.data?.message || "ไม่สามารถส่ง OTP ได้"
            );
        }
    };

    // Verify OTP
    const verifyOTP = async () => {
        try {
            const response = await axios.post(
                "http://localhost:3000/api/verify-otp",
                {
                    email: email,
                    otp: otp
                }
            );
            console.log(response.data);
            localStorage.setItem("isLoggedIn", "true");
            localStorage.setItem("email", email);
            localStorage.setItem("student_id", response.data.student_id || "unknown");
            setMessageOtp("OTP ถูกต้อง");

            setTimeout(() => {
              navigate("/home");
            }, 2000);
        } catch (error) {
            console.log(error.response?.data || error.messageOtp);
            setMessageOtp(
                error.response?.data?.messageOtp || " OTP ไม่ถูกต้อง"
            );
        }
    };


    return (
        <main className="grid min-h-screen place-items-center bg-[#f7f3ea] bg-dot-pattern p-6">
            <section className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg">
                <h1 className="mb-2 text-2xl font-bold text-slate-800">Login</h1>
                <p className="mb-5 text-slate-500">Enter your email to receive an OTP.</p>
                <input
                    className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-3 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200"
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />

                <button onClick={sendOTP} className="w-full rounded-lg bg-emerald-600 px-4 py-3 font-medium text-white transition hover:bg-emerald-700">
                    Send OTP
                </button>
                {message && (
                    <p>{message}</p>
                )}

                <input
                    className="mb-3 mt-5 w-full rounded-lg border border-slate-300 px-3 py-3 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200"
                    type="text"
                    placeholder="OTP 6 หลัก"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                />

                <button onClick={verifyOTP} className="w-full rounded-lg border border-emerald-600 px-4 py-3 font-medium text-emerald-600 transition hover:bg-emerald-50">
                    Verify OTP
                </button>
                {messageOtp && (
                    <p>{messageOtp}</p>
                )}
                <p className="mt-5 text-center text-sm text-slate-500">
                    ยังไม่มีบัญชี?{" "}
                    <button type="button" onClick={() => navigate("/signup")} className="font-medium text-emerald-600 hover:underline">
                        สมัครสมาชิก
                    </button>
                </p>
                <p className="mt-2 text-center text-sm text-slate-500">
                    เป็นแอดมิน?{" "}
                    <button type="button" onClick={() => navigate("/admin/login")} className="font-medium text-emerald-600 hover:underline">
                        เข้าสู่ระบบแอดมิน
                    </button>
                </p>
            </section>
        </main>
    );
};

export default Login;
