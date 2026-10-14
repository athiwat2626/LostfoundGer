// FE-HM-xx : หน้าหลัก (page/Home.jsx) — แถบเมนูซ้าย, ค้นหา, แท็บของพบ/ของหาย, ค้นหาด่วน, การ์ด, เลขหน้า
import { act, fireEvent, screen, within } from "@testing-library/react";
import axios from "axios";
import Home from "@app/page/Home";
import { renderAt } from "./utils";

vi.mock("axios", () => ({ default: { get: vi.fn(), post: vi.fn() } }));

const hoursAgo = (h) => new Date(Date.now() - h * 3_600_000).toISOString();

const found = [
  { item_id: 1, item_name: "Apple Watch SE", category: "อุปกรณ์อิเล็กทรอนิกส์", found_location: "ห้องสมุด", found_date: "2026-09-20", created_at: hoursAgo(3), image_url: "/assets/foundUploads/1.png" },
  { item_id: 2, item_name: "กระเป๋าสตางค์หนัง", category: "กระเป๋า", found_location: "สำนักหอสมุด ชั้น 3", found_date: "2026-09-19", created_at: hoursAgo(5) },
  { item_id: 3, item_name: "พวงกุญแจรถ Honda", category: "อื่น ๆ", found_location: "อาคารเรียนรวม 1", found_date: "2026-09-18", created_at: hoursAgo(30) },
  { item_id: 4, item_name: "บัตรนิสิต", category: "เอกสาร", found_location: "โรงอาหาร", found_date: "2026-09-17", created_at: hoursAgo(50) },
  { item_id: 5, item_name: "ร่มพับ", category: "อื่น ๆ", found_location: "SC-2", found_date: "2026-09-16", created_at: hoursAgo(80) },
];
const lost = [
  { item_id: 9, item_name: "iPad Air สีฟ้า", category: "อุปกรณ์อิเล็กทรอนิกส์", lost_location: "SC-9", lost_date: "2026-09-21", created_at: hoursAgo(1) },
];

const mockApi = ({ foundItems = found, lostItems = lost } = {}) =>
  axios.get.mockImplementation(async (url) => {
    if (url.includes("/api/users/")) return { data: { user: { first_name: "Somchai", email: "somchai@ku.th" } } };
    if (url.endsWith("/foundItem")) return { data: foundItems };
    if (url.endsWith("/lostItem")) return { data: lostItems };
    throw new Error(`unexpected ${url}`);
  });

const cards = () => screen.queryAllByRole("button").filter((b) => b.querySelector("p.line-clamp-1"));
const cardTitles = () => cards().map((c) => c.querySelector("p.line-clamp-1").textContent);

const renderHome = async () => {
  renderAt(<Home />, { path: "/home" });
  await screen.findByText("Apple Watch SE");
};

describe("Home", () => {
  beforeEach(() => {
    axios.get.mockReset();
    localStorage.setItem("email", "somchai@ku.th");
    mockApi();
  });

  test("FE-HM-01 แสดงแถบเมนูซ้าย หัวข้อ ช่องค้นหา และคำทักทายชื่อผู้ใช้", async () => {
    await renderHome();
    expect(screen.getByRole("heading", { name: "ค้นพบรายการต่างๆ" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("ค้นหากุญแจ โทรศัพท์ กระเป๋า หรืออื่นๆ")).toBeInTheDocument();
    expect(screen.getByText("สวัสดี, Somchai")).toBeInTheDocument();
    expect(axios.get).toHaveBeenCalledWith("http://localhost:3000/api/users/somchai%40ku.th");
    expect(screen.getByRole("link", { name: "หน้าหลัก" })).toHaveAttribute("href", "/home");
    expect(screen.getByRole("link", { name: "แผนที่จุดของหาย" })).toHaveAttribute("href", "/ranking/locations");
    expect(screen.getByRole("link", { name: "จัดอันดับ" })).toHaveAttribute("href", "/ranking");
  });

  test("FE-HM-02 โหลดโปรไฟล์ไม่ได้ → ทักทายด้วยชื่อจากอีเมล", async () => {
    axios.get.mockImplementation(async (url) => {
      if (url.includes("/api/users/")) throw new Error("404");
      return { data: url.endsWith("/foundItem") ? found : lost };
    });
    await renderHome();
    expect(screen.getByText("สวัสดี, somchai")).toBeInTheDocument();
  });

  test("FE-HM-03 แท็บเริ่มต้นคือของที่พบ เรียงจากใหม่ไปเก่า การ์ดมีป้าย เวลา หมวด สถานที่ วันที่ และรูป", async () => {
    await renderHome();
    expect(cardTitles()).toEqual(["Apple Watch SE", "กระเป๋าสตางค์หนัง", "พวงกุญแจรถ Honda", "บัตรนิสิต", "ร่มพับ"]);

    const first = cards()[0];
    expect(within(first).getByText("ของที่พบ")).toBeInTheDocument();
    expect(within(first).getByText("3 ชม. ที่แล้ว")).toBeInTheDocument();
    expect(within(first).getByText("อุปกรณ์อิเล็กทรอนิกส์")).toBeInTheDocument();
    expect(within(first).getByText("ห้องสมุด")).toBeInTheDocument();
    expect(within(first).getByRole("img")).toHaveAttribute("src", "http://localhost:3000/assets/foundUploads/1.png");
  });

  test("FE-HM-04 สลับแท็บเป็น 'รายการของที่หายล่าสุด' → แสดงของหาย พร้อมป้าย 'ของหาย'", async () => {
    await renderHome();
    fireEvent.click(screen.getByRole("button", { name: "รายการของที่หายล่าสุด" }));
    expect(cardTitles()).toEqual(["iPad Air สีฟ้า"]);
    expect(within(cards()[0]).getByText("ของหาย")).toBeInTheDocument();
  });

  test.each([
    ["กระเป๋า", ["กระเป๋าสตางค์หนัง"]],
    ["Key", ["พวงกุญแจรถ Honda"]],
    ["อิเล็กทรอนิกส์", ["Apple Watch SE"]],
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
    fireEvent.change(screen.getByPlaceholderText("ค้นหากุญแจ โทรศัพท์ กระเป๋า หรืออื่นๆ"), { target: { value: "หอสมุด" } });
    expect(cardTitles()).toEqual(["กระเป๋าสตางค์หนัง"]);

    fireEvent.change(screen.getByPlaceholderText("ค้นหากุญแจ โทรศัพท์ กระเป๋า หรืออื่นๆ"), { target: { value: "ไม่มีแน่นอน" } });
    expect(screen.getByText("ไม่พบรายการที่ตรงกับการค้นหา")).toBeInTheDocument();
  });

  test("FE-HM-07 เกิน 8 รายการ → แบ่งหน้า กดถัดไป/เลขหน้าได้ และปุ่มก่อนหน้าปิดในหน้าแรก", async () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      item_id: i + 1, item_name: `ของชิ้นที่ ${i + 1}`, found_date: "2026-09-01", created_at: hoursAgo(i + 1),
    }));
    mockApi({ foundItems: many });
    renderAt(<Home />, { path: "/home" });
    await screen.findByText("ของชิ้นที่ 1");

    expect(cards()).toHaveLength(8);
    expect(screen.getByRole("button", { name: /ก่อนหน้า/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "1" })).toHaveAttribute("aria-current", "page");

    fireEvent.click(screen.getByRole("button", { name: /ถัดไป/ }));
    expect(cardTitles()[0]).toBe("ของชิ้นที่ 9");

    fireEvent.click(screen.getByRole("button", { name: "3" }));
    expect(cards()).toHaveLength(4);
    expect(screen.getByRole("button", { name: /ถัดไป/ })).toBeDisabled();
  });

  test("FE-HM-08 เปลี่ยนตัวกรองขณะอยู่หน้า 2 → กลับไปหน้า 1", async () => {
    const many = Array.from({ length: 10 }, (_, i) => ({
      item_id: i + 1, item_name: `กระเป๋า ${i + 1}`, category: "กระเป๋า", found_date: "2026-09-01", created_at: hoursAgo(i + 1),
    }));
    mockApi({ foundItems: many });
    renderAt(<Home />, { path: "/home" });
    await screen.findByText("กระเป๋า 1");

    fireEvent.click(screen.getByRole("button", { name: "2" }));
    fireEvent.click(screen.getByRole("button", { name: "กระเป๋า" }));
    expect(screen.getByRole("button", { name: "1" })).toHaveAttribute("aria-current", "page");
    expect(cardTitles()[0]).toBe("กระเป๋า 1");
  });

  test("FE-HM-09 ไม่เกิน 8 รายการ → ไม่แสดงเลขหน้า", async () => {
    await renderHome();
    expect(screen.queryByRole("navigation", { name: "เลขหน้า" })).not.toBeInTheDocument();
  });

  test("FE-HM-10 กดการ์ด → ไปหน้ารายการตามประเภท", async () => {
    await renderHome();
    fireEvent.click(cards()[0]);
    expect(screen.getByTestId("pathname")).toHaveTextContent("/foundPage");
  });

  test("FE-HM-11 ปุ่ม + → ป๊อปอัพ 'แจ้งสิ่งของ' มีการ์ดของหาย / ของที่พบ ไปหน้าฟอร์มที่ถูกต้อง", async () => {
    await renderHome();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
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
    axios.get.mockRejectedValue(new Error("Network Error"));
    renderAt(<Home />, { path: "/home" });
    expect(await screen.findByText("ยังไม่มีรายการ")).toBeInTheDocument();
  });

  test("FE-HM-13 ออกจากระบบ → ถามยืนยันก่อน, ยืนยันแล้วล้างสถานะ login และไป /login", async () => {
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("student_id", "641");
    await renderHome();

    fireEvent.click(screen.getByRole("button", { name: "ออกจากระบบ" }));
    const dialog = screen.getByRole("dialog", { name: "ออกจากระบบ?" });
    expect(localStorage.getItem("isLoggedIn")).toBe("true");

    await act(async () => fireEvent.click(within(dialog).getByRole("button", { name: "ออกจากระบบ" })));
    expect(screen.getByTestId("pathname")).toHaveTextContent("/login");
    expect(localStorage.getItem("isLoggedIn")).toBeNull();
    expect(localStorage.getItem("student_id")).toBeNull();
  });
});
