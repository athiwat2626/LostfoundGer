import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const AdminProtectedRoute = ({ children }) => {
  const hasToken = Boolean(localStorage.getItem("adminToken"));
  const navigate = useNavigate();

  useEffect(() => {
    if (!hasToken) {
      navigate("/admin/login", { replace: true });
    }
  }, [hasToken, navigate]);

  if (!hasToken) return null;

  return children;
};

export default AdminProtectedRoute;
