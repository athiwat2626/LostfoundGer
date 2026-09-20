import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Info, Heart, MapPin, Crown, Star, User } from "lucide-react";
import { campusLocations } from "../data/campusLocations";

const AVATAR_COLORS = [
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-sky-100 text-sky-700",
  "bg-rose-100 text-rose-700",
  "bg-violet-100 text-violet-700",
];

const avatarColor = (name) => {
  const code = (name || "?").charCodeAt(0) || 0;
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
};

const findLocationCoords = (name) => {
  if (!name) return null;
  const normalized = name.trim().toLowerCase();
  const exact = campusLocations.find((l) => l.name.toLowerCase() === normalized);
  if (exact) return exact.position;
  const partial = campusLocations.find(
    (l) => l.name.toLowerCase().includes(normalized) || normalized.includes(l.name.toLowerCase())
  );
  return partial ? partial.position : null;
};

const Avatar = ({ person, className }) => {
  if (person.profile_image) {
    return (
      <img
        src={`http://localhost:3000${person.profile_image}`}
        alt=""
        className={`${className} rounded-full object-cover border-2 border-white shadow`}
      />
    );
  }
  return (
    <div className={`${className} rounded-full flex items-center justify-center border-2 border-white shadow ${avatarColor(person.first_name)}`}>
      <User className="h-[55%] w-[55%]" strokeWidth={2} />
    </div>
  );
};

const PodiumSlot = ({ person, rank }) => {
  if (!person) return <div className="flex-1" />;
  const badgeColor = rank === 1 ? "bg-amber-400" : rank === 2 ? "bg-slate-300" : "bg-orange-300";
  const avatarSize = rank === 1 ? "h-20 w-20 text-2xl" : "h-14 w-14 text-lg";

  return (
    <div className={`flex flex-1 flex-col items-center min-w-0 ${rank === 1 ? "" : "mt-6"}`}>
      <div className="relative">
        {rank === 1 && (
          <Crown size={22} className="absolute -top-6 left-1/2 -translate-x-1/2 text-amber-400" fill="currentColor" />
        )}
        <Avatar person={person} className={`${avatarSize} border-4`} />
        <span className={`absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white border-2 border-white ${badgeColor}`}>
          {rank}
        </span>
      </div>
      <p className="mt-2 max-w-[6.5rem] truncate text-center text-sm font-semibold text-slate-800">
        {person.first_name} {person.last_name}
      </p>
      {person.student_id && <p className="text-[11px] text-slate-400">ID: {person.student_id}</p>}
      <span className="mt-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
        {person.successful_returns} ครั้ง
      </span>
    </div>
  );
};

const Ranking = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [returners, setReturners] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showInfo, setShowInfo] = useState(true);
  const activeTab = location.pathname.endsWith("/locations") ? "locations" : "returners";

  useEffect(() => {
    const loadRankings = async () => {
      try {
        const [returnerResponse, locationResponse] = await Promise.all([
          axios.get("http://localhost:3000/api/rankings/returners"),
          axios.get("http://localhost:3000/api/rankings/lost-locations"),
        ]);
        setReturners(returnerResponse.data);
        setLocations(locationResponse.data);
      } catch (requestError) {
        setError(requestError.response?.data?.message || "ไม่สามารถโหลดข้อมูลจัดอันดับได้");
      } finally {
        setLoading(false);
      }
    };

    loadRankings();
  }, []);

  const matchedLocations = useMemo(
    () =>
      locations
        .map((l) => ({ ...l, coords: findLocationCoords(l.location) }))
        .filter((l) => l.coords),
    [locations]
  );
  const maxLostCount = Math.max(...locations.map((l) => l.lost_count), 1);

  return (
    <main className="min-h-screen bg-[#f7f3ea] px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-lg">
        {/* Header */}
        <header className="mb-4 flex items-center justify-between">
          <div className="h-9 w-9" />
          <div className="text-center">
            <h1 className="text-lg font-bold text-slate-900">จัดอันดับ</h1>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              Statistics &amp; Rankings
            </p>
          </div>
          <button
            onClick={() => setShowInfo((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm hover:bg-slate-50"
          >
            <Info size={16} />
          </button>
        </header>

        {/* Tabs */}
        <div className="mb-4 grid grid-cols-2 gap-1 rounded-2xl border border-slate-100 bg-white p-1.5 shadow-sm">
          <button
            type="button"
            onClick={() => navigate("/ranking")}
            className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
              activeTab === "returners" ? "bg-emerald-700 text-white shadow" : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            <Heart size={15} fill={activeTab === "returners" ? "currentColor" : "none"} />
            คนทำความดี
          </button>
          <button
            type="button"
            onClick={() => navigate("/ranking/locations")}
            className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
              activeTab === "locations" ? "bg-emerald-700 text-white shadow" : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            <MapPin size={15} />
            จุดที่ทำของหายบ่อย
          </button>
        </div>

        {/* Info banner */}
        {showInfo && (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-emerald-500 shadow-sm">
              <Star size={16} fill="currentColor" />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-800">
                {activeTab === "returners"
                  ? "อันดับคำนวณจากจำนวนครั้งที่คืนของสำเร็จ"
                  : "อันดับคำนวณจากจำนวนครั้งที่มีการแจ้งของหายในแต่ละสถานที่"}
              </p>
              <p className="mt-0.5 text-xs text-emerald-700/80">
                {activeTab === "returners"
                  ? "ยิ่งช่วยคืนของให้เจ้าของสำเร็จมาก อันดับก็ยิ่งสูงขึ้น"
                  : "ข้อมูลนี้ช่วยให้ทุกคนระมัดระวังของหายในจุดที่เกิดขึ้นบ่อย"}
              </p>
            </div>
          </div>
        )}

        {loading && <p className="py-12 text-center text-slate-400">กำลังโหลดข้อมูล...</p>}
        {error && <p className="rounded-2xl bg-red-50 p-4 text-center text-red-600">{error}</p>}

        {!loading && !error && activeTab === "returners" && (
          <>
            {returners.length === 0 ? (
              <p className="rounded-2xl border border-slate-100 bg-white p-10 text-center text-slate-400 shadow-sm">
                ยังไม่มีข้อมูลสำหรับจัดอันดับ
              </p>
            ) : (
              <>
                <div className="mb-4 rounded-2xl border border-slate-100 bg-white px-4 pb-4 pt-8 shadow-sm">
                  <div className="flex items-end justify-center gap-3">
                    <PodiumSlot person={returners[1]} rank={2} />
                    <PodiumSlot person={returners[0]} rank={1} />
                    <PodiumSlot person={returners[2]} rank={3} />
                  </div>
                </div>

                {returners.length > 3 && (
                  <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-50 px-4 py-3">
                      <h2 className="text-sm font-bold text-slate-800">อันดับทั้งหมด</h2>
                      <span className="text-xs text-slate-400">
                        อัปเดตล่าสุด: {new Date().toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
                      </span>
                    </div>
                    {returners.slice(3).map((person, idx) => (
                      <div
                        key={person.student_id || idx}
                        className="flex items-center gap-3.5 border-b border-slate-50 px-4 py-3.5 last:border-0"
                      >
                        <span className="w-4 shrink-0 text-center text-sm font-bold text-slate-400">{idx + 4}</span>
                        <Avatar person={person} className="h-11 w-11 text-sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-800">
                            {person.first_name} {person.last_name}
                          </p>
                          <p className="truncate text-xs text-slate-400">
                            คืนของสำเร็จ {person.successful_returns} ครั้ง
                          </p>
                        </div>
                        <span className="shrink-0 text-lg font-extrabold text-emerald-600">
                          {person.successful_returns}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {!loading && !error && activeTab === "locations" && (
          <>
            {locations.length === 0 ? (
              <p className="rounded-2xl border border-slate-100 bg-white p-10 text-center text-slate-400 shadow-sm">
                ยังไม่มีข้อมูลสำหรับจัดอันดับ
              </p>
            ) : (
              <>
                <div className="mb-4 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                  <div className="px-4 pb-2 pt-4">
                    <h2 className="text-sm font-bold text-slate-800">แผนที่จุดที่ทำของหายบ่อย</h2>
                    <p className="text-xs text-slate-400">แสดงเฉพาะจุดที่ระบุตำแหน่งตรงกับแผนที่ได้</p>
                  </div>
                  {matchedLocations.length > 0 ? (
                    <MapContainer
                      center={[14.022788, 99.978337]}
                      zoom={15}
                      scrollWheelZoom={false}
                      className="h-56 w-full"
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      {matchedLocations.map((l) => {
                        const ratio = l.lost_count / maxLostCount;
                        return (
                          <CircleMarker
                            key={l.location}
                            center={l.coords}
                            radius={8 + ratio * 14}
                            pathOptions={{ color: "#dc2626", fillColor: "#f87171", fillOpacity: 0.55, weight: 2 }}
                          >
                            <Tooltip direction="top" offset={[0, -6]}>
                              {l.location} · {l.lost_count} ครั้ง
                            </Tooltip>
                          </CircleMarker>
                        );
                      })}
                    </MapContainer>
                  ) : (
                    <p className="px-4 pb-4 text-sm text-slate-400">ยังไม่มีจุดที่ระบุตำแหน่งตรงกับแผนที่</p>
                  )}
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-50 px-4 py-3">
                    <h2 className="text-sm font-bold text-slate-800">อันดับสถานที่ที่ทำของหายบ่อย</h2>
                    <span className="text-xs text-slate-400">ทั้งหมด {locations.length} จุด</span>
                  </div>
                  {locations.map((item, idx) => {
                    const rank = idx + 1;
                    const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;
                    const ratio = (item.lost_count / maxLostCount) * 100;
                    return (
                      <div
                        key={item.location}
                        className="flex items-center gap-3 border-b border-slate-50 px-4 py-3 last:border-0"
                      >
                        <span className="w-7 shrink-0 text-center">
                          {medal || <span className="text-sm font-bold text-slate-400">{rank}</span>}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-800">{item.location}</p>
                          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-orange-400 to-red-500"
                              style={{ width: `${ratio}%` }}
                            />
                          </div>
                        </div>
                        <span className="shrink-0 text-sm font-bold text-slate-700">{item.lost_count} ครั้ง</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
};

export default Ranking;
