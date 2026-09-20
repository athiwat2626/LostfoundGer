import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import Loading from "./page/Loading";
import FoundItem from "./page/FoundItem";
import LostItem from "./page/LostItem";
import LostPage from "./page/LostPage";
import FoundPage from "./page/FoundPage";
import Login from "./page/Login";
import SignUp from "./page/SignUp";
import Home from "./page/Home";
import ProtectedRoute from "./page/ProtectedRoute";
import Navbar from "./component/Navbar";
import Ranking from "./page/Ranking";
import ReportPage from "./page/ReportPage";
import ReportSuccess from "./page/ReportSuccess";
import AdminLogin from "./admin/AdminLogin";
import AdminProtectedRoute from "./admin/AdminProtectedRoute";
import AdminLayout from "./admin/AdminLayout";
import AdminDashboard from "./admin/pages/Dashboard";
import AdminLostItems from "./admin/pages/LostItems";
import AdminFoundItems from "./admin/pages/FoundItems";
import AdminReviewCenter from "./admin/pages/ReviewCenter";
import AdminUsers from "./admin/pages/Users";
import AdminSettings from "./admin/pages/Settings";

const withNavbar = (element) => (
  <ProtectedRoute>
    <Navbar />
    {element}
  </ProtectedRoute>
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Loading />} />
        <Route path="/home" element={withNavbar(<Home />)} />
        <Route path="/foundItem" element={withNavbar(<FoundItem />)} />
        <Route path="/lostItem" element={withNavbar(<LostItem />)} />
        <Route path="/foundPage" element={withNavbar(<FoundPage />)} />
        <Route path="/lostPage" element={withNavbar(<LostPage />)} />
        <Route path="/ranking" element={withNavbar(<Ranking />)} />
        <Route path="/ranking/locations" element={withNavbar(<Ranking />)} />
        <Route path="/report" element={withNavbar(<ReportPage />)} />
        <Route path="/report/success" element={withNavbar(<ReportSuccess />)} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />

        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin"
          element={
            <AdminProtectedRoute>
              <AdminLayout />
            </AdminProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="lost-items" element={<AdminLostItems />} />
          <Route path="found-items" element={<AdminFoundItems />} />
          <Route path="reports" element={<AdminReviewCenter />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
