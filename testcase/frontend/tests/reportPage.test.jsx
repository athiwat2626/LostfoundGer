// FE-RP-xx : หน้ารายงานโพสต์ (page/ReportPage.jsx)
import { act, fireEvent, screen } from "@testing-library/react";
import axios from "axios";
import ReportPage from "@app/page/ReportPage";
import { renderAt } from "./utils";

vi.mock("axios", () => ({ default: { get: vi.fn(), post: vi.fn() } }));

const route = { pathname: "/report", state: { itemId: 10, itemType: "lost", itemName: "กระเป๋าเป้", reportedUser: "6410500099" } };
const submit = () => act(async () => fireEvent.click(screen.getByRole("button", { name: "ส่งรายงาน" })));

describe("ReportPage", () => {
  beforeEach(() => {
    axios.post.mockReset();
    localStorage.setItem("student_id", "6410500001");
  });

  test("FE-RP-01 แสดงข้อมูลรายการที่ถูกรายงาน และเหตุผลให้เลือก 7 ข้อ", () => {
    renderAt(<ReportPage />, { path: "/report", route });
    expect(screen.getByText("รายการ: กระเป๋าเป้")).toBeInTheDocument();
    expect(screen.getByText("6410500099")).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(7);
  });

  test("FE-RP-02 ไม่เลือกเหตุผล → แจ้งเตือนและไม่ส่งข้อมูล", async () => {
    renderAt(<ReportPage />, { path: "/report", route });
    await submit();
    expect(screen.getByText("กรุณาเลือกเหตุผลในการรายงาน")).toBeInTheDocument();
    expect(axios.post).not.toHaveBeenCalled();
  });

  test("FE-RP-03 ส่งรายงานสำเร็จ → POST /report แล้วไปหน้า /report/success พร้อมเลขรายงาน", async () => {
    axios.post.mockResolvedValue({ data: { report_id: "RPT-2026-000123", created_at: "2026-09-01T10:00:00Z" } });
    renderAt(<ReportPage />, { path: "/report", route });

    fireEvent.click(screen.getByRole("radio", { name: /สแปม/ }));
    fireEvent.change(screen.getByPlaceholderText("อธิบายรายละเอียดเพิ่มเติม..."), { target: { value: "โพสต์ซ้ำหลายครั้ง" } });
    const image = new File(["x"], "proof.png", { type: "image/png" });
    fireEvent.change(document.querySelector('input[type="file"]'), { target: { files: [image] } });
    await submit();

    const [url, formData] = axios.post.mock.calls[0];
    expect(url).toBe("http://localhost:3000/report");
    expect(formData.get("reported_item_id")).toBe("10");
    expect(formData.get("item_type")).toBe("lost");
    expect(formData.get("reason")).toBe("สแปม");
    expect(formData.get("detail")).toBe("โพสต์ซ้ำหลายครั้ง");
    expect(formData.get("reporter_student_id")).toBe("6410500001");
    expect(formData.get("evidence").name).toBe("proof.png");

    expect(screen.getByTestId("pathname")).toHaveTextContent("/report/success");
    expect(screen.getByTestId("location-state")).toHaveTextContent("RPT-2026-000123");
  });

  test("FE-RP-04 server ปฏิเสธ (รายงานโพสต์ตัวเอง) → แสดงข้อความ error", async () => {
    axios.post.mockRejectedValue(Object.assign(new Error("400"), { response: { data: { error: "ไม่สามารถรายงานโพสต์ของตัวเองได้" } } }));
    renderAt(<ReportPage />, { path: "/report", route });
    fireEvent.click(screen.getByRole("radio", { name: /สแปม/ }));
    await submit();
    expect(screen.getByText("ไม่สามารถรายงานโพสต์ของตัวเองได้")).toBeInTheDocument();
    expect(screen.getByTestId("pathname")).toHaveTextContent(/^\/report$/);
  });

  test("FE-RP-05 แนบรูปได้สูงสุด 3 รูป", () => {
    renderAt(<ReportPage />, { path: "/report", route });
    const files = [1, 2, 3, 4].map((n) => new File(["x"], `p${n}.png`, { type: "image/png" }));
    fireEvent.change(document.querySelector('input[type="file"]'), { target: { files } });
    expect(document.querySelectorAll('img[src="blob:preview"]')).toHaveLength(3);
  });

  // ข้อจำกัดที่พบ: หน้าให้แนบได้ 3 รูป แต่ส่งไป backend แค่รูปแรก (backend รับ upload.single("evidence"))
  test("FE-RP-06 แนบ 3 รูป → ส่งไปเพียงรูปแรก (พฤติกรรมปัจจุบัน)", async () => {
    axios.post.mockResolvedValue({ data: { report_id: "RPT-2026-000001" } });
    renderAt(<ReportPage />, { path: "/report", route });
    const files = [1, 2, 3].map((n) => new File(["x"], `p${n}.png`, { type: "image/png" }));
    fireEvent.change(document.querySelector('input[type="file"]'), { target: { files } });
    fireEvent.click(screen.getByRole("radio", { name: /สแปม/ }));
    await submit();

    const formData = axios.post.mock.calls[0][1];
    expect(formData.getAll("evidence").map((f) => f.name)).toEqual(["p1.png"]);
  });
});
