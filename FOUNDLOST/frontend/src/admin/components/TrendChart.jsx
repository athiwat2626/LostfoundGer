import { useEffect, useMemo, useRef, useState } from "react";

// สีชุดเดียวกับจานสีที่ผ่านการตรวจการมองเห็นสี (ส้ม = ของหาย, ฟ้า = ของพบ)
const SERIES = [
  { key: "lost", label: "ของหาย", color: "#eb6834" },
  { key: "found", label: "ของพบ", color: "#2a78d6" },
];

const HEIGHT_DESKTOP = 260;
const HEIGHT_MOBILE = 200;
const PAD = { top: 16, right: 16, bottom: 30, left: 40 };

const TZ = "Asia/Bangkok";
const formatTick = (iso, range) => {
  const d = new Date(iso);
  if (range === "24h") return d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
  if (range === "7d") return d.toLocaleDateString("th-TH", { weekday: "short", day: "numeric", timeZone: TZ });
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "short", timeZone: TZ });
};
const formatFull = (iso, range) => {
  const d = new Date(iso);
  const date = d.toLocaleDateString("th-TH", { weekday: "short", day: "numeric", month: "short", timeZone: TZ });
  if (range !== "24h") return date;
  const time = d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
  return `${date} ${time} น.`;
};
const TICK_EVERY = { "24h": 3, "7d": 1, "30d": 5 };

// ค่าสูงสุดของแกน Y ที่เป็นเลขกลม ๆ (อย่างน้อย 4 เพื่อให้เส้นกริดเป็นจำนวนเต็ม)
const niceMax = (value) => {
  if (value <= 4) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * magnitude >= value / 4) * magnitude;
  return Math.ceil(value / step) * step;
};

// เส้นโค้งแบบ monotone (Fritsch–Carlson): โค้งนุ่มแต่ไม่พุ่งเกินข้อมูลจริง / ไม่ติดลบ
const monotonePath = (pts) => {
  if (pts.length < 2) return pts.length ? `M${pts[0][0]},${pts[0][1]}` : "";
  const n = pts.length;
  const dx = [];
  const slope = [];
  for (let i = 0; i < n - 1; i += 1) {
    dx.push(pts[i + 1][0] - pts[i][0]);
    slope.push((pts[i + 1][1] - pts[i][1]) / dx[i]);
  }
  const tangent = [slope[0]];
  for (let i = 1; i < n - 1; i += 1) {
    tangent.push(slope[i - 1] * slope[i] <= 0 ? 0 : (3 * (dx[i - 1] + dx[i])) /
      ((2 * dx[i] + dx[i - 1]) / slope[i - 1] + (dx[i] + 2 * dx[i - 1]) / slope[i]));
  }
  tangent.push(slope[n - 2]);

  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < n - 1; i += 1) {
    const h = dx[i] / 3;
    d += ` C${pts[i][0] + h},${pts[i][1] + h * tangent[i]} ${pts[i + 1][0] - h},${pts[i + 1][1] - h * tangent[i + 1]} ${pts[i + 1][0]},${pts[i + 1][1]}`;
  }
  return d;
};

// ความกว้างของกล่องกราฟ (วาดใหม่เมื่อขนาดจอเปลี่ยน ตัวอักษรจึงคมเสมอ)
const useWidth = (ref) => {
  const [width, setWidth] = useState(720);
  useEffect(() => {
    if (!ref.current || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(260, entry.contentRect.width)));
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref]);
  return width;
};

const TrendChart = ({ points, range }) => {
  const boxRef = useRef(null);
  const width = useWidth(boxRef);
  const [hover, setHover] = useState(null);
  const HEIGHT = width < 480 ? HEIGHT_MOBILE : HEIGHT_DESKTOP;
  // เว้นระยะป้ายแกน X ให้ไม่ชนกันบนจอแคบ (อย่างน้อย ~56px ต่อป้าย)
  const tickEvery = Math.max(
    TICK_EVERY[range],
    Math.ceil(points.length / Math.max(2, Math.floor((width - PAD.left - PAD.right) / 56)))
  );

  const geo = useMemo(() => {
    const innerW = width - PAD.left - PAD.right;
    const innerH = HEIGHT - PAD.top - PAD.bottom;
    const max = niceMax(Math.max(0, ...points.flatMap((p) => [p.lost, p.found])));
    const x = (i) => PAD.left + (points.length <= 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
    const y = (v) => PAD.top + innerH - (v / max) * innerH;
    const series = SERIES.map((s) => {
      const pts = points.map((p, i) => [x(i), y(p[s.key])]);
      const line = monotonePath(pts);
      const area = pts.length ? `${line} L${pts[pts.length - 1][0]},${y(0)} L${pts[0][0]},${y(0)} Z` : "";
      return { ...s, line, area };
    });
    const gridValues = [0, 1, 2, 3, 4].map((k) => (max / 4) * k);
    return { innerW, max, x, y, series, gridValues };
  }, [points, width, HEIGHT]);

  const handleMove = (event) => {
    if (!points.length) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width) * width;
    const ratio = (px - PAD.left) / geo.innerW;
    const index = Math.round(Math.min(1, Math.max(0, ratio)) * (points.length - 1));
    setHover(index);
  };

  const hovered = hover !== null ? points[hover] : null;
  const tipLeft = hovered ? Math.min(Math.max(geo.x(hover), 90), width - 90) : 0;

  return (
    // min-w-0 + max-w-full: กราฟต้องไม่ดันกล่องให้กว้างเกินจอ (ไม่งั้นจอมือถือเลื่อนออกข้างได้)
    <div ref={boxRef} className="relative w-full min-w-0">
      <svg
        width={width}
        height={HEIGHT}
        viewBox={`0 0 ${width} ${HEIGHT}`}
        role="img"
        aria-label="กราฟจำนวนการแจ้งของหายและของพบตามช่วงเวลา"
        className="block max-w-full"
      >
        {/* เส้นกริดและแกน Y */}
        {geo.gridValues.map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={width - PAD.right} y1={geo.y(v)} y2={geo.y(v)} stroke="#e2e8f0" strokeWidth="1" />
            <text x={PAD.left - 8} y={geo.y(v)} dy="0.32em" textAnchor="end" fontSize="11" fill="#64748b">
              {Number.isInteger(v) ? v : v.toFixed(1)}
            </text>
          </g>
        ))}

        {/* แกน X */}
        {points.map((p, i) =>
          i % tickEvery === 0 ? (
            <text key={p.bucket} x={geo.x(i)} y={HEIGHT - 8} textAnchor="middle" fontSize="11" fill="#64748b">
              {formatTick(p.bucket, range)}
            </text>
          ) : null
        )}

        {/* พื้นที่ใต้เส้น (จาง ๆ) แล้วตามด้วยเส้น */}
        {geo.series.map((s) => (
          <path key={`area-${s.key}`} d={s.area} fill={s.color} fillOpacity="0.1" />
        ))}
        {geo.series.map((s) => (
          <path key={`line-${s.key}`} d={s.line} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        ))}

        {/* crosshair + จุดของช่วงเวลาที่ชี้ */}
        {hovered && (
          <g pointerEvents="none">
            <line x1={geo.x(hover)} x2={geo.x(hover)} y1={PAD.top} y2={geo.y(0)} stroke="#94a3b8" strokeWidth="1" />
            {SERIES.map((s) => (
              <circle key={s.key} cx={geo.x(hover)} cy={geo.y(hovered[s.key])} r="5" fill={s.color} stroke="#ffffff" strokeWidth="2" />
            ))}
          </g>
        )}

        {/* พื้นที่รับเมาส์ (ใหญ่กว่าเส้น) */}
        <rect
          x={PAD.left}
          y={PAD.top}
          width={geo.innerW}
          height={HEIGHT - PAD.top - PAD.bottom}
          fill="transparent"
          onPointerMove={handleMove}
          onPointerDown={handleMove}
          onPointerLeave={() => setHover(null)}
          style={{ touchAction: "pan-y" }}
        />
      </svg>

      {hovered && (
        <div
          className="pointer-events-none absolute top-2 z-10 w-44 -translate-x-1/2 rounded-xl border border-slate-100 bg-white/95 px-3 py-2 text-xs shadow-lg"
          style={{ left: tipLeft }}
        >
          <p className="mb-1 font-semibold text-slate-800">{formatFull(hovered.bucket, range)}</p>
          {SERIES.map((s) => (
            <p key={s.key} className="flex items-center justify-between gap-2 text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-3 rounded-full" style={{ backgroundColor: s.color }} />
                {s.label}
              </span>
              <span className="font-semibold text-slate-900">{hovered[s.key]}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
};

// คำอธิบายเส้น (มีเสมอเมื่อมีมากกว่า 1 เส้น)
export const TrendLegend = () => (
  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
    {SERIES.map((s) => (
      <span key={s.key} className="flex items-center gap-1.5">
        <span className="h-0.5 w-4 rounded-full" style={{ backgroundColor: s.color }} />
        {s.label}
      </span>
    ))}
  </div>
);

// ตารางข้อมูลเดียวกับกราฟ (อ่านได้โดยไม่ต้องพึ่งสี)
export const TrendTable = ({ points, range }) => (
  <div className="max-h-64 overflow-auto rounded-xl border border-slate-100">
    <table className="w-full text-sm">
      <thead className="sticky top-0 bg-slate-50 text-left text-xs text-slate-500">
        <tr>
          <th className="px-3 py-2 font-medium">ช่วงเวลา</th>
          {SERIES.map((s) => (
            <th key={s.key} className="px-3 py-2 text-right font-medium">{s.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {points.map((p) => (
          <tr key={p.bucket} className="border-t border-slate-50">
            <td className="px-3 py-1.5 text-slate-600">{formatFull(p.bucket, range)}</td>
            {SERIES.map((s) => (
              <td key={s.key} className="px-3 py-1.5 text-right font-medium text-slate-800">{p[s.key]}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default TrendChart;
