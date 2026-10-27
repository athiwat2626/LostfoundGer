// FE-FF-xx : ฟอร์มแจ้งของหาย / แจ้งพบของ (component/ReportItemForm.jsx) — ส่งผ่าน userApi (แนบ token)
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ReportItemForm from "@app/component/ReportItemForm";
import { api, mockRoutes } from "./axiosMock";
import { loginAsUser } from "./utils";

vi.mock("axios", () => import("./axiosMock.js"));
// แผนที่ Leaflet วาดใน jsdom ไม่ได้ → แทนด้วยกล่องเปล่า (ทดสอบเฉพาะฟอร์ม)
vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }) => <div data-testid="map">{children}</div>,
  TileLayer: () => null,
  Marker: () => null,
  CircleMarker: () => null,
  Tooltip: () => null,
  useMapEvents: () => null,
}));

const today = () => new Date().toLocaleDateString("sv-SE");
const tomorrow = () => new Date(Date.now() + 86_400_000).toLocaleDateString("sv-SE");
const imageInput = () => document.querySelectorAll('input[type="file"]')[1];
const submit = () => act(async () => fireEvent.submit(document.querySelector("form")));
const posts = (endpoint) => api.post.mock.calls.filter(([url]) => url === endpoint);

const renderForm = (type) =>
  render(
    <MemoryRouter>
      <ReportItemForm type={type} />
    </MemoryRouter>
  );

const fillRequired = ({ dateLabel, locationLabel, depositLabel }, overrides = {}) => {
  const values = { name: "กระเป๋าสตางค์", date: today(), location: "SC-2", deposit: "กองกิจการนิสิต", ...overrides };
  fireEvent.change(screen.getByLabelText("ชื่อสิ่งของ"), { target: { value: values.name } });
  fireEvent.click(screen.getByRole("button", { name: "กระเป๋า" }));
  fireEvent.change(screen.getByLabelText(dateLabel), { target: { value: values.date } });
  fireEvent.change(screen.getByLabelText(locationLabel), { target: { value: values.location } });
  fireEvent.change(screen.getByLabelText(depositLabel), { target: { value: values.deposit } });
  const file = new File(["img"], "wallet.png", { type: "image/png" });
  fireEvent.change(imageInput(), { target: { files: [file] } });
  return file;
};

describe.each([
  { type: "found", title: "แจ้งพบของ", endpoint: "/foundItem", dateField: "found_date", locationField: "found_location", dateLabel: "วันที่พบ", locationLabel: "สถานที่ที่พบ", depositLabel: "จุดรับของ (จุดรับฝาก)" },
  { type: "lost", title: "แจ้งของหาย", endpoint: "/lostItem", dateField: "lost_date", locationField: "lost_location", dateLabel: "วันที่หาย", locationLabel: "สถานที่ที่หาย", depositLabel: "สถานที่ที่รับฝากของ" },
])("ReportItemForm type=$type", (c) => {
  beforeEach(() => {
    loginAsUser();
    mockRoutes();
    Element.prototype.scrollIntoView = vi.fn();
    window.scrollTo = vi.fn();
  });

  test("FE-FF-01 แสดงหัวข้อ และช่องที่จำเป็นต้องกรอก", () => {
    renderForm(c.type);
    expect(screen.getByRole("heading", { name: c.title })).toBeInTheDocument();
    [c.dateLabel, c.locationLabel, c.depositLabel, "ชื่อสิ่งของ"].forEach((label) => expect(screen.getByLabelText(label)).toBeRequired());
    expect(screen.getByLabelText(c.dateLabel)).toHaveAttribute("max", today());
  });

  test("FE-FF-02 พิมพ์สถานที่ → แสดงสถานที่ในมหาวิทยาลัยที่ตรงกัน และเลือกได้", () => {
    renderForm(c.type);
    fireEvent.change(screen.getByLabelText(c.locationLabel), { target: { value: "ศูนย์เรียนรวม" } });
    const list = screen.getByLabelText(c.locationLabel).parentElement.querySelector("ul");
    const options = within(list).getAllByRole("button");
    expect(options.length).toBeGreaterThan(0);
    options.forEach((o) => expect(o.textContent).toMatch(/ศูนย์เรียนรวม/));

    fireEvent.click(options[0]);
    expect(screen.getByLabelText(c.locationLabel)).toHaveValue(options[0].textContent);
  });

  test("FE-FF-03 ข้อมูลครบ → POST แบบ multipart พร้อมรูป แล้วแสดงหมายเลขรายการ", async () => {
    api.post.mockResolvedValue({ data: { item_id: 42 } });
    renderForm(c.type);
    const file = fillRequired(c);
    fireEvent.change(screen.getByLabelText(/สี/), { target: { value: "ดำ" } });
    await submit();

    const [[, data, options]] = posts(c.endpoint);
    expect(data.get("item_name")).toBe("กระเป๋าสตางค์");
    expect(data.get("category")).toBe("กระเป๋า");
    expect(data.get(c.dateField)).toBe(today());
    expect(data.get(c.locationField)).toBe("SC-2");
    expect(data.get("deposit_location")).toBe("กองกิจการนิสิต");
    expect(data.get("item_color")).toBe("ดำ");
    expect(data.get("image")).toBe(file);
    // ไม่ส่งรหัสนิสิตจากหน้าเว็บ (server ใช้รหัสจาก token)
    expect(data.get("student_id")).toBeNull();
    expect(options).toEqual({ timeout: 30_000 });
    expect(screen.getByRole("status")).toHaveTextContent("หมายเลขรายการ 42");
    // ฟอร์มถูกล้างหลังบันทึก
    expect(screen.getByLabelText("ชื่อสิ่งของ")).toHaveValue("");
  });

  test.each([
    ["ไม่มีชื่อสิ่งของ", { name: "  " }, "กรุณากรอกชื่อสิ่งของ"],
    ["วันที่ในอนาคต", { date: "future" }, "ต้องไม่เป็นวันในอนาคต"],
    ["ไม่มีสถานที่", { location: " " }, "กรุณาระบุ"],
  ])("FE-FF-04 %s → แจ้งเตือนและไม่ส่งข้อมูล", async (_name, overrides, message) => {
    renderForm(c.type);
    fillRequired(c, { ...overrides, date: overrides.date === "future" ? tomorrow() : overrides.date ?? today() });
    await submit();
    expect(screen.getByRole("alert")).toHaveTextContent(message);
    expect(posts(c.endpoint)).toHaveLength(0);
  });

  test("FE-FF-05 ไม่แนบรูป → แจ้งให้เลือกรูป", async () => {
    renderForm(c.type);
    fillRequired(c);
    fireEvent.click(screen.getByRole("button", { name: "ลบรูป" }));
    await submit();
    expect(screen.getByRole("alert")).toHaveTextContent("กรุณาเลือกหรือถ่ายรูปภาพสิ่งของ");
  });

  test.each([
    ["ไฟล์ไม่ใช่รูป", new File(["%PDF"], "doc.pdf", { type: "application/pdf" }), "รองรับเฉพาะไฟล์รูปภาพ"],
    ["รูปใหญ่เกิน 5 MB", new File([new Uint8Array(5 * 1024 * 1024 + 1)], "big.png", { type: "image/png" }), "ไม่เกิน 5 MB"],
  ])("FE-FF-06 %s → แจ้งเตือน", async (_name, file, message) => {
    renderForm(c.type);
    fireEvent.change(imageInput(), { target: { files: [file] } });
    expect(screen.getByRole("alert")).toHaveTextContent(message);
  });

  test("FE-FF-07 server ตอบ error → แสดงข้อความจาก server", async () => {
    api.post.mockRejectedValue(Object.assign(new Error("400"), { response: { data: { error: "found_date must use YYYY-MM-DD format" } } }));
    renderForm(c.type);
    fillRequired(c);
    await submit();
    expect(screen.getByRole("alert")).toHaveTextContent("found_date must use YYYY-MM-DD format");
  });

  test("FE-FF-08 เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ / หมดเวลา → ข้อความที่ผู้ใช้เข้าใจ", async () => {
    api.post.mockRejectedValueOnce(new Error("Network Error"));
    renderForm(c.type);
    fillRequired(c);
    await submit();
    expect(screen.getByRole("alert")).toHaveTextContent("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้");

    api.post.mockRejectedValueOnce(Object.assign(new Error("timeout"), { code: "ECONNABORTED" }));
    await submit();
    expect(screen.getByRole("alert")).toHaveTextContent("หมดเวลาการเชื่อมต่อ");
  });
});
