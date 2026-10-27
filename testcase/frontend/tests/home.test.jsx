// FE-HM-xx : หน้าหลัก (page/Home.jsx) — เมนู, ค้นหา, แท็บประเภท, ค้นหาด่วน, การ์ด, เลขหน้า, ป๊อปอัพรายละเอียด
import { act, fireEvent, screen, within } from "@testing-library/react";
import axios from "axios";
import Home from "@app/page/Home";
import { api, mockRoutes } from "./axiosMock";
import { loginAsUser, renderAt } from "./utils";

vi.mock("axios", () => import("./axiosMock.js"));

const hoursAgo = (h) => new Date(Date.now() - h * 3_600_000).toISOString();

const found = [
  { item_id: 1, item_name: "Apple Watch SE", category: "อุปกรณ์อิเล็กทรอนิกส์", found_location: "ห้องสมุด", found_date: "2026-09-20", created_at: hoursAgo(3), image_url: "/assets/foundUploads/1.png", status: "open", student_id: "other" },
  { item_id: 2, item_name: "กระเป๋าสตางค์หนัง", category: "กระเป๋า", found_location: "สำนักหอสมุด ชั้น 3", found_date: "2026-09-19", created_at: hoursAgo(5), status: "open" },
  { item_id: 3, item_name: "พวงกุญแจรถ Honda", category: "อื่น ๆ", found_location: "อาคารเรียนรวม 1", found_date: "2026-09-18", created_at: hoursAgo(30), status: "open" },
  { item_id: 4, item_name: "บัตรนิสิต", category: "เอกสาร", found_location: "โรงอาหาร", found_date: "2026-09-17", created_at: hoursAgo(50), status: "open" },
  { item_id: 5, item_name: "ร่มพับ", category: "อื่น ๆ", found_location: "SC-2", found_date: "2026-09-16", created_at: hoursAgo(80), status: "open" },
];
const lost = [
  { item_id: 9, item_name: "iPad Air สีฟ้า", category: "อุปกรณ์อิเล็กทรอนิกส์", lost_location: "SC-9", lost_date: "2026-09-21", created_at: hoursAgo(1), status: "open", student_id: "6410500001" },
];

const setItems = ({ foundItems = found, lostItems = lost } = {}) => mockRoutes({ "/foundItem": foundItems, "/lostItem": lostItems });

// การ์ดรายการ = ปุ่มที่มีชื่อสิ่งของ (p.line-clamp-1)
const cards = () => screen.queryAllByRole("button").filter((b) => b.querySelector("p.line-clamp-1"));
const cardTitles = () => cards().map((c) => c.querySelector("p.line-clamp-1").textContent);
const searchBox = () => screen.getByPlaceholderText("ค้นหากุญแจ โทรศัพท์ กระเป๋า หรืออื่นๆ");

const renderHome = async (first = "iPad Air สีฟ้า") => {
  renderAt(<Home />, { path: "/home" });
  await screen.findByText(first);
};

describe("Home", () => {
  beforeEach(() => {
    loginAsUser();
    setItems();
  });

  test("FE-HM-01 แสดงหัวข้อ ช่องค้นหา คำทักทายจากโปรไฟล์ และเมนูหลัก", async () => {
    await renderHome();
    expect(screen.getByRole("heading", { name: "ค้นพบรายการต่างๆ" })).toBeInTheDocument();
    expect(searchBox()).toBeInTheDocument();
    expect(await screen.findByText("สวัสดี, Somchai")).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith("/api/me");
    expect(screen.getByRole("link", { name: "โพสต์ของฉัน" })).toHaveAttribute("href", "/my-posts");
    expect(screen.getByRole("link", { name: "จัดอันดับ" })).toHaveAttribute("href", "/ranking");
    expect(screen.getByRole("link", { name: /ค้นหาขั้นสูง/ })).toHaveAttribute("href", "/search");
  });

  test("FE-HM-02 โหลดโปรไฟล์ไม่ได้ → ทักทายด้วยชื่อจากอีเมล", async () => {
    mockRoutes({ "/foundItem": found, "/lostItem": lost, "/api/me": new Error("500") });
    await renderHome();
    expect(screen.getByText("สวัสดี, somchai")).toBeInTheDocument();
  });

  test("FE-HM-03 รวมของพบและของหาย เรียงจากใหม่ไปเก่า การ์ดมีป้าย เวลา หมวด สถานที่ และรูป", async () => {
    await renderHome();
    expect(axios.get).toHaveBeenCalledWith("http://localhost:3000/foundItem");
    expect(axios.get).toHaveBeenCalledWith("http://localhost:3000/lostItem");
    expect(cardTitles()).toEqual(["iPad Air สีฟ้า", "Apple Watch SE", "กระเป๋าสตางค์หนัง", "พวงกุญแจรถ Honda", "บัตรนิสิต", "ร่มพับ"]);

    const watch = cards()[1];
    expect(within(watch).getByText("ของที่พบ")).toBeInTheDocument();
    expect(within(watch).getByText("3 ชม. ที่แล้ว")).toBeInTheDocument();
    expect(within(watch).getByText("อุปกรณ์อิเล็กทรอนิกส์")).toBeInTheDocument();
    expect(within(watch).getByText("ห้องสมุด")).toBeInTheDocument();
    expect(within(watch).getByRole("img")).toHaveAttribute("src", "http://localhost:3000/assets/foundUploads/1.png");
    expect(within(cards()[0]).getByText("ของหาย")).toBeInTheDocument();
  });

  test("FE-HM-04 แท็บประเภท: ของหาย / ของที่พบ พร้อมจำนวน", async () => {
    await renderHome();
    expect(screen.getByRole("tab", { name: /ทั้งหมด/ })).toHaveTextContent("6");
    fireEvent.click(screen.getByRole("tab", { name: /^ของหาย/ }));
    expect(cardTitles()).toEqual(["iPad Air สีฟ้า"]);
    fireEvent.click(screen.getByRole("tab", { name: /^ของที่พบ/ }));
    expect(cardTitles()).toHaveLength(5);
    expect(screen.getByRole("tab", { name: /^ของที่พบ/ })).toHaveAttribute("aria-selected", "true");
  });

  test.each([
    ["กระเป๋า", ["กระเป๋าสตางค์หนัง"]],
    ["Key", ["พวงกุญแจรถ Honda"]],
    ["อิเล็กทรอนิกส์", ["iPad Air สีฟ้า", "Apple Watch SE"]],
    ["เอกสาร", ["บัตรนิสิต"]],
    ["อื่นๆ", ["ร่มพับ"]],
  ])("FE-HM-05 ค้นหาด่วน '%s' → กรองตามหมวด/ชื่อ", async (chip, expected) => {
    await renderHome();
    fireEvent.click(screen.getByRole("button", { name: chip }));
    expect(cardTitles()).toEqual(expected);
    expect(screen.getByRole("button", { name: chip })).toHaveAttribute("aria-pressed", "true");
  });

  test("FE-HM-06 พิมพ์ค้นหา → กรองตามชื่อ/สถานที่ ไม่พบแสดงข้อความ", async () => {
    await renderHome();
    fireEvent.change(searchBox(), { target: { value: "หอสมุด" } });
    expect(cardTitles()).toEqual(["กระเป๋าสตางค์หนัง"]);

    fireEvent.change(searchBox(), { target: { value: "ไม่มีแน่นอน" } });
    expect(screen.getByText("ไม่พบรายการที่ตรงกับการค้นหา")).toBeInTheDocument();
  });

  test("FE-HM-07 เกิน 8 รายการ → แบ่งหน้า กดถัดไป/เลขหน้าได้ และปุ่มก่อนหน้าปิดในหน้าแรก", async () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      item_id: i + 1, item_name: `ของชิ้นที่ ${i + 1}`, found_date: "2026-09-01", created_at: hoursAgo(i + 1),
    }));
    setItems({ foundItems: many, lostItems: [] });
    await renderHome("ของชิ้นที่ 1");

    expect(cards()).toHaveLength(8);
    expect(screen.getByRole("button", { name: "หน้าก่อนหน้า" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "1" })).toHaveAttribute("aria-current", "page");

    fireEvent.click(screen.getByRole("button", { name: "หน้าถัดไป" }));
    expect(cardTitles()[0]).toBe("ของชิ้นที่ 9");

    fireEvent.click(screen.getByRole("button", { name: "3" }));
    expect(cards()).toHaveLength(4);
    expect(screen.getByRole("button", { name: "หน้าถัดไป" })).toBeDisabled();
  });

  test("FE-HM-08 เปลี่ยนตัวกรองขณะอยู่หน้า 2 → กลับไปหน้า 1", async () => {
    const many = Array.from({ length: 10 }, (_, i) => ({
      item_id: i + 1, item_name: `กระเป๋า ${i + 1}`, category: "กระเป๋า", found_date: "2026-09-01", created_at: hoursAgo(i + 1),
    }));
    setItems({ foundItems: many, lostItems: [] });
    await renderHome("กระเป๋า 1");

    fireEvent.click(screen.getByRole("button", { name: "2" }));
    fireEvent.click(screen.getByRole("button", { name: "กระเป๋า" }));
    expect(screen.getByRole("button", { name: "1" })).toHaveAttribute("aria-current", "page");
    expect(cardTitles()[0]).toBe("กระเป๋า 1");
  });

  test("FE-HM-09 ไม่เกิน 8 รายการ → ไม่แสดงเลขหน้า", async () => {
    await renderHome();
    expect(screen.queryByRole("navigation", { name: "เลขหน้า" })).not.toBeInTheDocument();
  });

  test("FE-HM-10 กดการ์ดของคนอื่น → ป๊อปอัพรายละเอียด มีปุ่ม 'นี่ของฉัน' และ 'รายงานโพสต์นี้'", async () => {
    await renderHome();
    fireEvent.click(cards()[1]);
    const dialog = screen.getByRole("dialog", { name: "Apple Watch SE" });
    expect(within(dialog).getByText("ห้องสมุด")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /นี่ของฉัน/ })).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: /รายงานโพสต์นี้/ }));
    expect(screen.getByTestId("pathname")).toHaveTextContent("/report");
    expect(screen.getByTestId("location-state")).toHaveTextContent('"itemId":1');
  });

  test("FE-HM-15 กดการ์ดโพสต์ของตัวเอง → แสดงลิงก์จัดการโพสต์ ไม่มีปุ่มรายงาน", async () => {
    await renderHome();
    fireEvent.click(cards()[0]);
    const dialog = screen.getByRole("dialog", { name: "iPad Air สีฟ้า" });
    expect(within(dialog).getByRole("link", { name: /นี่คือโพสต์ของคุณ/ })).toHaveAttribute("href", "/my-posts");
    expect(within(dialog).queryByRole("button", { name: /รายงานโพสต์นี้/ })).not.toBeInTheDocument();
  });

  test("FE-HM-16 ติดต่อเจ้าของ ('นี่ของฉัน') → POST /api/claims แล้วแสดงช่องทางติดต่อ", async () => {
    await renderHome();
    api.post.mockResolvedValue({ data: { success: true, owner: { name: "Ann B", email: "ann@ku.th", preferred_contact: "email" } } });
    fireEvent.click(cards()[1]);
    const dialog = screen.getByRole("dialog", { name: "Apple Watch SE" });
    fireEvent.click(within(dialog).getByRole("button", { name: /นี่ของฉัน/ }));
    fireEvent.change(within(dialog).getByRole("textbox"), { target: { value: "มีสติกเกอร์ด้านหลัง" } });
    await act(async () => fireEvent.click(within(dialog).getByRole("button", { name: "ส่งและดูช่องทางติดต่อ" })));

    expect(api.post).toHaveBeenCalledWith("/api/claims", { item_type: "found", item_id: 1, message: "มีสติกเกอร์ด้านหลัง" });
    expect(within(dialog).getByText("ann@ku.th")).toBeInTheDocument();
  });

  test("FE-HM-11 ปุ่มแจ้งสิ่งของ → ป๊อปอัพ มีการ์ดของหาย / ของที่พบ ไปหน้าฟอร์มที่ถูกต้อง", async () => {
    await renderHome();
    fireEvent.click(screen.getByRole("button", { name: "แจ้งสิ่งของ" }));

    const dialog = screen.getByRole("dialog", { name: "แจ้งสิ่งของ" });
    expect(within(dialog).getByRole("link", { name: /ของหาย\s*แจ้งของหาย/ })).toHaveAttribute("href", "/lostItem");
    expect(within(dialog).getByRole("link", { name: /ของที่พบ\s*รายงานสิ่งของที่พบ/ })).toHaveAttribute("href", "/foundItem");

    fireEvent.click(within(dialog).getByRole("link", { name: /ของที่พบ/ }));
    expect(screen.getByTestId("pathname")).toHaveTextContent("/foundItem");
  });

  test.each([
    ["ปุ่ม X", () => fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "ปิด" }))],
    ["กด Esc", () => fireEvent.keyDown(window, { key: "Escape" })],
    ["คลิกพื้นหลัง", () => fireEvent.click(screen.getByRole("dialog").parentElement)],
  ])("FE-HM-14 ปิดป๊อปอัพแจ้งสิ่งของด้วย%s → อยู่หน้าหลักเหมือนเดิม", async (_name, close) => {
    await renderHome();
    fireEvent.click(screen.getByRole("button", { name: "แจ้งสิ่งของ" }));
    close();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByTestId("pathname")).toHaveTextContent("/home");
  });

  test("FE-HM-12 API ล้มเหลว → แสดง 'ยังไม่มีรายการ' หน้าไม่พัง", async () => {
    mockRoutes({ "/foundItem": new Error("Network Error"), "/lostItem": new Error("Network Error") });
    renderAt(<Home />, { path: "/home" });
    expect(await screen.findByText("ยังไม่มีรายการ")).toBeInTheDocument();
  });

  test("FE-HM-13 ออกจากระบบ → ถามยืนยันก่อน, ยืนยันแล้วล้าง session และไป /login", async () => {
    await renderHome();

    fireEvent.click(screen.getByRole("button", { name: "ออกจากระบบ" }));
    const dialog = screen.getByRole("dialog", { name: "ออกจากระบบ?" });
    expect(localStorage.getItem("userToken")).not.toBeNull();

    await act(async () => fireEvent.click(within(dialog).getByRole("button", { name: "ออกจากระบบ" })));
    expect(screen.getByTestId("pathname")).toHaveTextContent("/login");
    expect(localStorage.getItem("userToken")).toBeNull();
    expect(localStorage.getItem("student_id")).toBeNull();
  });
});
