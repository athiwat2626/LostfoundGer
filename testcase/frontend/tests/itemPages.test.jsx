// FE-IP-xx : หน้ารายการของที่พบ (FoundPage) / ของที่หาย (LostPage)
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import axios from "axios";
import FoundPage from "@app/page/FoundPage";
import LostPage from "@app/page/LostPage";
import { renderAt } from "./utils";

vi.mock("axios", () => ({ default: { get: vi.fn(), post: vi.fn() } }));

const items = [
  { item_id: 3, item_name: "กระเป๋าเป้สีดำ", category: "กระเป๋า", student_id: "other", found_location: "SC-2", lost_location: "SC-2" },
  { item_id: 2, item_name: "พวงกุญแจรถ", category: "กุญแจ", student_id: "me", found_location: "SC-9", lost_location: "SC-9" },
  { item_id: 1, item_name: "ร่มพับ", category: "อุปกรณ์อิเล็กทรอนิกส์", student_id: "other", found_location: "โรงอาหาร", lost_location: "โรงอาหาร" },
];

describe.each([
  { name: "FoundPage", Page: FoundPage, path: "/foundPage", api: "http://localhost:3000/foundItem", type: "found", other: "/lostPage", title: "รายการของที่พบ", search: "ค้นหาของ โทรศัพท์ กระเป๋า..." },
  { name: "LostPage", Page: LostPage, path: "/lostPage", api: "http://localhost:3000/lostItem", type: "lost", other: "/foundPage", title: "รายการของที่หาย", search: "ค้นหาของหาย โทรศัพท์ กระเป๋า..." },
])("$name", ({ Page, path, api, type, title, search }) => {
  beforeEach(() => {
    axios.get.mockReset().mockResolvedValue({ data: items });
    localStorage.setItem("student_id", "me");
  });

  const visibleNames = () => screen.getAllByRole("article").map((card) => card.textContent);

  test("FE-IP-01 โหลดรายการจาก API และแสดงจำนวน", async () => {
    renderAt(<Page />, { path });
    await waitFor(() => expect(screen.getAllByRole("article")).toHaveLength(3));
    expect(axios.get).toHaveBeenCalledWith(api);
    expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    expect(screen.getAllByText(/3 รายการ/).length).toBeGreaterThan(0);
  });

  test("FE-IP-02 ค้นหาด้วยชื่อสิ่งของ (ไม่สนตัวพิมพ์)", async () => {
    renderAt(<Page />, { path });
    await waitFor(() => expect(screen.getAllByRole("article")).toHaveLength(3));
    fireEvent.change(screen.getByPlaceholderText(search), { target: { value: "กุญแจ" } });
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(visibleNames()[0]).toContain("พวงกุญแจรถ");
  });

  test("FE-IP-03 กรองหมวดหมู่ 'อื่นๆ' → รวมหมวดที่ไม่อยู่ในรายการหลัก", async () => {
    renderAt(<Page />, { path });
    await waitFor(() => expect(screen.getAllByRole("article")).toHaveLength(3));
    fireEvent.click(screen.getAllByRole("button", { name: "อื่นๆ" })[0]);
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(visibleNames()[0]).toContain("ร่มพับ");
  });

  test("FE-IP-04 โพสต์ของตัวเองไม่มีปุ่ม 'รายงาน'", async () => {
    renderAt(<Page />, { path });
    await waitFor(() => expect(screen.getAllByRole("article")).toHaveLength(3));
    const ownCard = screen.getAllByRole("article").find((card) => card.textContent.includes("พวงกุญแจรถ"));
    expect(within(ownCard).queryByRole("button", { name: "รายงาน" })).not.toBeInTheDocument();
  });

  test("FE-IP-05 กด 'รายงาน' → ไปหน้า /report พร้อมข้อมูลรายการ", async () => {
    renderAt(<Page />, { path });
    await waitFor(() => expect(screen.getAllByRole("article")).toHaveLength(3));
    const card = screen.getAllByRole("article").find((c) => c.textContent.includes("กระเป๋าเป้สีดำ"));
    fireEvent.click(within(card).getByRole("button", { name: "รายงาน" }));

    expect(screen.getByTestId("pathname")).toHaveTextContent("/report");
    expect(JSON.parse(screen.getByTestId("location-state").textContent)).toEqual({
      itemId: 3, itemType: type, itemName: "กระเป๋าเป้สีดำ", reportedUser: "other",
    });
  });

  test("FE-IP-06 กด 'รายละเอียด' → เปิดหน้าต่างรายละเอียด", async () => {
    renderAt(<Page />, { path });
    await waitFor(() => expect(screen.getAllByRole("article")).toHaveLength(3));
    const card = screen.getAllByRole("article").find((c) => c.textContent.includes("ร่มพับ"));
    expect(screen.queryByText("รายงานเมื่อ")).not.toBeInTheDocument();
    fireEvent.click(within(card).getByRole("button", { name: "รายละเอียด" }));
    // หัวข้อชื่อสิ่งของปรากฏทั้งในการ์ดและในหน้าต่างรายละเอียด
    expect(screen.getAllByRole("heading", { level: 2, name: "ร่มพับ" })).toHaveLength(2);
    expect(screen.getByText("รายงานเมื่อ")).toBeInTheDocument();
  });

  test("FE-IP-07 API ล้มเหลว → ไม่มีรายการ (0 รายการ) และหน้าไม่พัง", async () => {
    axios.get.mockRejectedValue(new Error("Network Error"));
    renderAt(<Page />, { path });
    await waitFor(() => expect(screen.getByText(/0 รายการ/)).toBeInTheDocument());
    expect(screen.queryAllByRole("article")).toHaveLength(0);
  });
});
