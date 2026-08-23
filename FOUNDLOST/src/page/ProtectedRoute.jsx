import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const ProtectedRoute = ({ children }) => {
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    const navigate = useNavigate();

    useEffect(() => {
        if (isLoggedIn !== "true") {
            const message = "ยังไม่ได้เข้าสู่ระบบ กรุณาเข้าสู่ระบบก่อนเข้าใช้งาน";
            window.alert(message);
            navigate("/login", {
                replace: true,
                state: { message },
            });
        }
    }, [isLoggedIn, navigate]);

    if (isLoggedIn !== "true") return null;

    return children;
};

export default ProtectedRoute;