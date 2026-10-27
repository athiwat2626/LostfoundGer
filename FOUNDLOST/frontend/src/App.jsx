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
import Ranking from "./page/Ranking";
import ReportPage from "./page/ReportPage";
import ReportSuccess from "./page/ReportSuccess";
import UserSettings from "./page/UserSettings";
import MyPosts from "./page/MyPosts";
import Notifications from "./page/Notifications";
import SearchPage from "./page/SearchPage";
import Profile from "./page/Profile";
import LineLink from "./page/LineLink";
import LineAddFriend from "./page/LineAddFriend";
import AdminLogin from "./admin/AdminLogin";
import AdminProtectedRoute from "./admin/AdminProtectedRoute";
import AdminLayout from "./admin/AdminLayout";
import AdminDashboard from "./admin/pages/Dashboard";
import AdminLostItems from "./admin/pages/LostItems";
import AdminFoundItems from "./admin/pages/FoundItems";
import AdminReviewCenter from "./admin/pages/ReviewCenter";
import AdminUsers from "./admin/pages/Users";
import AdminSettings from "./admin/pages/Settings";
import AdminMatches from "./admin/pages/Matches";
import AdminAuditLog from "./admin/pages/AuditLog";
import MaintenanceGate from "./component/MaintenanceGate";

// หน้าฝั่งผู้ใช้ทุกหน้าใช้ UserLayout (แถบเมนูซ้าย) ภายในตัวหน้าเอง
const protectedPage = (element) => <ProtectedRoute>{element}</ProtectedRoute>;

function App() {
  return (
    <BrowserRouter>
      <MaintenanceGate>
      <Routes>
        <Route path="/" element={<Loading />} />
        <Route path="/home" element={protectedPage(<Home />)} />
        <Route path="/foundItem" element={protectedPage(<FoundItem />)} />
        <Route path="/lostItem" element={protectedPage(<LostItem />)} />
        <Route path="/foundPage" element={protectedPage(<FoundPage />)} />
        <Route path="/lostPage" element={protectedPage(<LostPage />)} />
        <Route path="/ranking" element={protectedPage(<Ranking />)} />
        <Route path="/ranking/locations" element={protectedPage(<Ranking />)} />
        <Route path="/report" element={protectedPage(<ReportPage />)} />
        <Route path="/report/success" element={protectedPage(<ReportSuccess />)} />
        <Route path="/settings" element={protectedPage(<UserSettings />)} />
        <Route path="/my-posts" element={protectedPage(<MyPosts />)} />
        <Route path="/notifications" element={protectedPage(<Notifications />)} />
        <Route path="/search" element={protectedPage(<SearchPage />)} />
        <Route path="/profile" element={protectedPage(<Profile />)} />
        <Route path="/line/link" element={protectedPage(<LineLink />)} />
        <Route path="/line/add" element={<LineAddFriend />} />
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
          <Route path="matches" element={<AdminMatches />} />
          <Route path="reports" element={<AdminReviewCenter />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="audit" element={<AdminAuditLog />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>
      </Routes>
      </MaintenanceGate>
    </BrowserRouter>
  );
}

export default App;
