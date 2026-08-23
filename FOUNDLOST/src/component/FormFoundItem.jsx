import React, { useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { campusLocations } from "../data/campusLocations";
import { colorOptions } from "../data/colorOptions";

const markerIcon = L.icon({
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [20, 31],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const selectedMarkerIcon = L.icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  iconRetinaUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [20, 31],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = markerIcon;

const categories = [
  "กระเป๋า",
  "เครื่องประดับ",
  "อุปกรณ์อิเล็กทรอนิกส์",
  "เอกสาร",
  "อื่น ๆ",
];

const FormFoundItem = () => {
  const mapRef = useRef(null);
  const markerRefs = useRef({});
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    image: null,
    found_date: "",
    item_name: "",
    category: "",
    item_color: "",
    found_location: "",
    description: "",
    deposit_location: "",
  });
  const [status, setStatus] = useState("");
  const [foundSearchText, setFoundSearchText] = useState("สนามกีฬากลาง");
  const [depositSearchText, setDepositSearchText] = useState("");
  const [foundSuggestions, setFoundSuggestions] = useState([]);
  const [depositSuggestions, setDepositSuggestions] = useState([]);
  const [selectedFoundLocation, setSelectedFoundLocation] =
    useState("สนามกีฬากลาง");

  const getLocationSuggestions = (value) => {
    const query = value.trim().toLowerCase();
    if (!query) return [];

    if (query.includes("มหาวิทยาลัย") || query.includes("เกษตรศาสตร์")) {
      return campusLocations;
    }

    return campusLocations.filter((location) =>
      location.name.toLowerCase().includes(query),
    );
  };

  const openMarkerPopup = (location) => {
    const marker = markerRefs.current[location.name];
    if (marker && typeof marker.openPopup === "function") {
      marker.openPopup();
    }
  };

  const handleFoundLocationSelect = (location) => {
    setFormData((prev) => ({ ...prev, found_location: location.name }));
    setStatus(`เลือกสถานที่: ${location.name}`);
    setFoundSearchText(location.name);
    setFoundSuggestions([]);
    setSelectedFoundLocation(location.name);

    if (mapRef.current) {
      mapRef.current.flyTo(location.position, 17, {
        duration: 1.2,
      });
    }
    openMarkerPopup(location);
  };

  const handleDepositLocationSelect = (location) => {
    setFormData((prev) => ({ ...prev, deposit_location: location.name }));
    setDepositSearchText(location.name);
    setDepositSuggestions([]);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === "found_location") {
      setFoundSearchText(value);
      setFoundSuggestions(getLocationSuggestions(value));
    }
    if (name === "deposit_location") {
      setDepositSearchText(value);
      setDepositSuggestions(getLocationSuggestions(value));
    }
  };

  const handleFileChange = (e) => {
    setFormData((prev) => ({ ...prev, image: e.target.files?.[0] || null }));
  };

  const resetForm = () => {
    setFormData({
      image: null,
      found_date: "",
      item_name: "",
      category: "",
      item_color: "",
      found_location: "",
      description: "",
      deposit_location: "",
    });
    setFoundSearchText("");
    setDepositSearchText("");
    setFoundSuggestions([]);
    setDepositSuggestions([]);
    setSelectedFoundLocation("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("กำลังส่งข้อมูล...");

    const data = new FormData();
    data.append("image", formData.image);
    data.append("found_date", formData.found_date);
    data.append("item_name", formData.item_name);
    data.append("category", formData.category);
    data.append("item_color", formData.item_color);
    data.append("found_location", formData.found_location);
    data.append("description", formData.description);
    data.append("deposit_location", formData.deposit_location);

    try {
      const response = await fetch("http://localhost:3000/foundItem", {
        method: "POST",
        body: data,
      });

      if (response.ok) {
        const result = await response.json();
        setStatus(`บันทึกสำเร็จ หมายเลขรายการ ${result.item_id}`);
        resetForm();
      } else {
        const error = await response.json();
        setStatus(`เกิดข้อผิดพลาด: ${error.error || response.statusText}`);
      }
    } catch (error) {
      setStatus(`เกิดข้อผิดพลาด: ${error.message}`);
    }
  };
  return (
    <div>
      <h3 className="text-2xl font-semibold mb-6">แจ้งพบสิ่งของ</h3>

      <div className="mb-6">
        <p className="mb-3 text-sm text-slate-600">
          คลิกบนแผนที่เพื่อเลือกสถานที่พบของใน ม.เกษตร กำแพงแสน
        </p>
        {/* แผนที่แสดงพื้นที่มหาวิทยาลัยเกษตรศาสตร์ กำแพงแสน */}
        <MapContainer
          // กำหนดตำแหน่งตรงกลางของแผนที่ (lat, lng) สนามกีฬากลาง
          center={[14.022788, 99.978337]}
          // ระดับการซูม: 16 = มุมมองใกล้ชิด
          zoom={16}
          // ขีดจำกัดการซูม - ขยายได้ขั้นต่ำ 15 ขั้นสูง 19
          minZoom={15}
          maxZoom={19}
          // บันทึกอ้างอิง map object เพื่อใช้ในการ animate เมื่อคลิกมาร์กเกอร์
          whenCreated={(mapInstance) => {
            mapRef.current = mapInstance;
          }}
          // เปิดใช้งานการเลื่อนด้วยล้อเมาส์
          scrollWheelZoom={true}
          className="w-full h-155 rounded-lg border"
        >
          {/* ชั้นแผนที่พื้นฐาน - ใช้ Esri Satellite imagery เพื่อให้เห็นรูปแบบพื้นที่ชัดเจน */}
          <TileLayer
            attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
          {/* แสดงมาร์กเกอร์สำหรับทุกตำแหน่งในห้องเรียน */}
          {campusLocations.map((location) => (
            <Marker
              key={location.name}
              position={location.position}
              // เปลี่ยนสีมาร์กเกอร์เป็นแดงเมื่อเลือก ปกติสีน้ำเงิน
              icon={
                location.name === selectedFoundLocation
                  ? selectedMarkerIcon
                  : markerIcon
              }
              // จัดการเมื่อคลิกมาร์กเกอร์
              eventHandlers={{
                click: () => handleFoundLocationSelect(location),
              }}
              // เก็บอ้างอิง marker เพื่อเปิด popup เมื่อจำเป็น
              ref={(ref) => {
                if (ref) {
                  markerRefs.current[location.name] = ref;
                }
              }}
            >
              {/* แสดงชื่อตำแหน่งเมื่อคลิกมาร์กเกอร์ */}
              <Popup>{location.name}</Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <form onSubmit={handleSubmit} encType="multipart/form-data">
        <div className="mb-4">
          <label className="block mb-2 font-medium">รูปภาพสิ่งของ</label>
          <input
            ref={fileInputRef}
            type="file"
            name="image"
            accept="image/*"
            onChange={handleFileChange}
            required
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="mb-4">
            <label className="block mb-2 font-medium">วันที่พบ</label>
            <input
              type="date"
              name="found_date"
              value={formData.found_date}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block mb-2 font-medium">ชื่อสิ่งของ</label>
            <input
              type="text"
              name="item_name"
              value={formData.item_name}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block mb-2 font-medium">หมวดหมู่</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
              required
            >
              <option value="">เลือกหมวดหมู่</option>
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4 md:col-span-2">
            <label className="block mb-2 font-medium">สีสิ่งของ</label>
            <div className="flex items-center gap-3 flex-wrap">
              {colorOptions.map((color) => {
                const isSelected = formData.item_color === color.name;
                const isWhite = color.value === "#ffffff";

                return (
                  <button
                    key={color.value}
                    type="button"
                    title={color.name}
                    aria-label={color.name}
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        item_color: color.name,
                      }))
                    }
                    className={`w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? "scale-110 ring-2 ring-slate-300"
                        : "border-white"
                    }`}
                    style={{ backgroundColor: color.value }}
                  >
                    {isSelected && (
                      <span
                        className={`text-xs font-bold ${
                          isWhite ? "text-slate-800" : "text-white"
                        }`}
                      >
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mb-4 relative">
            <label className="block mb-2 font-medium">สถานที่พบ</label>
            <input
              type="text"
              name="lost_location"
              value={foundSearchText}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
              placeholder="เลือกสถานที่จากแผนที่ หรือพิมพ์เอง"
              autoComplete="off"
              required
            />
            {foundSuggestions.length > 0 && (
              <ul className="absolute z-10 w-full mt-1 max-h-60 overflow-auto rounded border bg-white shadow-lg">
                {foundSuggestions.map((location) => (
                  <li
                    key={location.name}
                    className="cursor-pointer px-3 py-2 hover:bg-slate-100"
                    onClick={() => handleFoundLocationSelect(location)}
                  >
                    {location.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="mb-4">
          <label className="block mb-2 font-medium">รายละเอียดเพิ่มเติม</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2 h-28"
            placeholder="เช่น สี รูปแบบ หรือลักษณะพิเศษ"
          />
        </div>

        <div className="mb-6 relative">
          <label className="block mb-2 font-medium">สถานที่ฝากของ</label>
          <input
            type="text"
            name="deposit_location"
            value={depositSearchText}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
            placeholder="พิมพ์เพื่อเลือกสถานที่ฝากของ"
            autoComplete="off"
            required
          />
          {depositSuggestions.length > 0 && (
            <ul className="absolute z-10 w-full mt-1 max-h-60 overflow-auto rounded border bg-white shadow-lg">
              {depositSuggestions.map((location) => (
                <li
                  key={location.name}
                  className="cursor-pointer px-3 py-2 hover:bg-slate-100"
                  onClick={() => handleDepositLocationSelect(location)}
                >
                  {location.name}
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          type="submit"
          className="bg-teal-600 text-white px-5 py-2 rounded hover:bg-teal-700"
        >
          บันทึกข้อมูล
        </button>
      </form>

      {status && <p className="mt-4 text-sm text-slate-700">{status}</p>}
    </div>
  );
};

export default FormFoundItem;
