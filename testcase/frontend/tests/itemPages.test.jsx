// FE-IP-xx : หน้ารายการของที่พบ (FoundPage) / ของที่หาย (LostPage) — ใช้ ItemListPage ร่วมกัน
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import axios from "axios";
import FoundPage from "@app/page/FoundPage";
import LostPage from "@app/page/LostPage";
import { mockRoutes } from "./axiosMock";
import { loginAsUser, renderAt } from "./utils";

vi.mock("axios", () => import("./axiosMock.js"));

const items = [
  { item_id: 3, item_name: "กระเป๋าเป้สีดำ", category: "กระเป๋า", student_id: "other", found_location: "SC-2", lost_location: "SC-2", status: "open" },
  { item_id: 2, item_name: "พวงกุญแจรถ", category: "กุญแจ", student_id: "me", found_location: "SC-9", lost_location: "SC-9", status: "open" },
  { item_id: 1, item_name: "ร่มพับ", category: "อื่น ๆ", student_id: "other", found_location: "โรงอาหาร", lost_location: "โรงอาหาร", status: "returned" },
];

const cards = () => screen.queryAllByRole("button").filter((b) => b.querySelector("p.line-clamp-1"));
const card = (name) => cards().find((c) => c.textContent.includes(name));

describe.each([
  { name: "FoundPage", Page: FoundPage, path: "/foundPage", endpoint: "/foundItem", type: "found", title: "รายการของที่พบ", search: "ค้นหาของที่พบ เช่น โทรศัพท์ กระเป๋า กุญแจ" },
  { name: "LostPage", Page: LostPage, path: "/lostPage", endpoint: "/lostItem", type: "lost", title: "รายการของที่หาย", search: "ค้นหาของหาย เช่น โทรศัพท์ กระเป๋า กุญแจ" },
])("$name", ({ Page, path, endpoint, type, title, search }) => {
  beforeEach(() => {
    loginAsUser({ student_id: "me" });
    mockRoutes({ [endpoint]: items });
  });

  const renderPage = async () => {
    renderAt(<Page />, { path });
    await screen.findByText("กระเป๋าเป้สีดำ");
  };

  test("FE-IP-01 โหลดรายการจาก API และแสดงจำนวน", async () => {
    await renderPage();
    expect(cards()).toHaveLength(3);
    expect(axios.get).toHaveBeenCalledWith(`http://localhost:3000${endpoint}`);
    expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    expect(screen.getByText(/— 3 รายการ/)).toBeInTheDocument();
  });

  test("FE-IP-02 ค้นหาด้วยชื่อสิ่งของ", async () => {
    await renderPage();
    fireEvent.change(screen.getByPlaceholderText(search), { target: { value: "กุญแจ" } });
    // ช่องค้นหาส่งคำค้นหลังหยุดพิมพ์ 300ms
    await waitFor(() => expect(cards()).toHaveLength(1));
    expect(cards()[0]).toHaveTextContent("พวงกุญแจรถ");
  });

  test("FE-IP-03 กรองหมวดหมู่ 'อื่นๆ' → รวมหมวดที่ไม่อยู่ในรายการหลัก", async () => {
    await renderPage();
    fireEvent.click(screen.getByRole("button", { name: "อื่นๆ" }));
    expect(cards()).toHaveLength(1);
    expect(cards()[0]).toHaveTextContent("ร่มพับ");
  });

  test("FE-IP-04 โพสต์ของตัวเอง → ป๊อปอัพไม่มีปุ่ม 'รายงานโพสต์นี้'", async () => {
    await renderPage();
    fireEvent.click(card("พวงกุญแจรถ"));
    const dialog = screen.getByRole("dialog", { name: "พวงกุญแจรถ" });
    expect(within(dialog).queryByRole("button", { name: /รายงานโพสต์นี้/ })).not.toBeInTheDocument();
  });

  test("FE-IP-05 กด 'รายงานโพสต์นี้' → ไปหน้า /report พร้อมข้อมูลรายการ", async () => {
    await renderPage();
    fireEvent.click(card("กระเป๋าเป้สีดำ"));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: /รายงานโพสต์นี้/ }));

    expect(screen.getByTestId("pathname")).toHaveTextContent("/report");
    expect(JSON.parse(screen.getByTestId("location-state").textContent)).toEqual({
      itemId: 3, itemType: type, itemName: "กระเป๋าเป้สีดำ", reportedUser: "other",
    });
  });

  test("FE-IP-06 รายการที่คืนของแล้ว → การ์ดมีป้าย 'คืนของสำเร็จ' และป๊อปอัพแจ้งว่าปิดโพสต์แล้ว", async () => {
    await renderPage();
    // ป้ายบนรูป + ป้ายสถานะ (มือถือ)
    expect(within(card("ร่มพับ")).getAllByText("คืนของสำเร็จ").length).toBeGreaterThan(0);
    fireEvent.click(card("ร่มพับ"));
    const dialog = screen.getByRole("dialog", { name: "ร่มพับ" });
    expect(within(dialog).getByText(/คืนของสำเร็จแล้ว/)).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: /รายงานโพสต์นี้/ })).not.toBeInTheDocument();
  });

  test("FE-IP-07 API ล้มเหลว → 0 รายการ และหน้าไม่พัง", async () => {
    mockRoutes({ [endpoint]: new Error("Network Error") });
    renderAt(<Page />, { path });
    expect(await screen.findByText(/— 0 รายการ/)).toBeInTheDocument();
    expect(cards()).toHaveLength(0);
  });
});
