import { useEffect, useState } from "react";
import { Users, PackageCheck, Search, Clock, ShieldAlert, UserX, Ban, CheckCircle2, Leaf } from "lucide-react";
import { useNavigate } from "react-router-dom";
import adminApi from "../api/adminApi";
import StatTile from "../components/StatTile";

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    adminApi
      .get("/admin/dashboard/stats")
      .then((res) => setStats(res.data.stats))
      .catch((err) => setError(err.response?.data?.message || "โหลดข้อมูลไม่สำเร็จ"));
  }, []);

  return (
    <div>
      {/* Welcome banner */}
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-800 via-emerald-900 to-teal-950 px-6 py-8 sm:px-8 sm:py-10">
        <div className="relative z-10">
          <p className="text-sm text-emerald-200">ยินดีต้อนรับสู่</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">KU Lost&amp;Found</h1>
          <p className="mt-2 max-w-md text-sm text-emerald-100/90">
            พื้นที่กลางสำหรับการแจ้งของหายและพบของ มหาวิทยาลัยเกษตรศาสตร์
          </p>
          <p className="mt-1 text-sm font-medium text-lime-300">"ของหาย...อาจได้คืน"</p>
        </div>
        <Leaf className="absolute -right-6 -top-6 text-emerald-700/40" size={140} />
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatTile
            icon={Users}
            label="จำนวนผู้ใช้งานทั้งหมด"
            sublabel="Total Users"
            value={stats.totalUsers}
            color="blue"
            onClick={() => navigate("/admin/users")}
          />
          <StatTile
            icon={Search}
            label="แจ้งของหาย"
            sublabel="Lost Items"
            value={stats.totalLostItems}
            color="orange"
            onClick={() => navigate("/admin/lost-items")}
          />
          <StatTile
            icon={PackageCheck}
            label="พบของแล้ว"
            sublabel="Found Items"
            value={stats.totalFoundItems}
            color="emerald"
            onClick={() => navigate("/admin/found-items")}
          />
          <StatTile
            icon={Clock}
            label="รายงานที่รอดำเนินการ"
            sublabel="Pending Reports"
            value={stats.pendingReports}
            color="amber"
            onClick={() => navigate("/admin/reports")}
          />
          <StatTile
            icon={ShieldAlert}
            label="อยู่ระหว่างตรวจสอบ"
            sublabel="Under Review"
            value={stats.underReviewReports}
            color="blue"
            onClick={() => navigate("/admin/reports")}
          />
          <StatTile
            icon={CheckCircle2}
            label="รายงานที่ได้รับการแก้ไขแล้ว"
            sublabel="Resolved Reports"
            value={stats.resolvedReports}
            color="emerald"
            onClick={() => navigate("/admin/reports")}
          />
          <StatTile
            icon={UserX}
            label="ผู้ใช้ที่ถูกระงับ"
            sublabel="Suspended Users"
            value={stats.suspendedUsers}
            color="orange"
            onClick={() => navigate("/admin/users")}
          />
          <StatTile
            icon={Ban}
            label="ผู้ใช้ที่ถูกแบน"
            sublabel="Banned Users"
            value={stats.bannedUsers}
            color="red"
            onClick={() => navigate("/admin/users")}
          />
        </div>
      )}

      <div className="mt-8 flex flex-col items-center gap-1 border-t border-slate-100 pt-5 text-center">
        <p className="flex items-center gap-1.5 text-xs text-slate-400">
          <Leaf size={13} className="text-emerald-500" />
          ร่วมกันสร้างสังคมแห่งการแบ่งปัน มหาวิทยาลัยเกษตรศาสตร์
        </p>
        <p className="text-xs font-semibold text-slate-500">Kasetsart University</p>
      </div>
    </div>
  );
};

export default Dashboard;
