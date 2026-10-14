// FE-FF-xx : ฟอร์มแจ้งพบของ (component/FormFoundItem.jsx)
import { act, fireEvent, render, screen } from "@testing-library/react";
import FormFoundItem from "@app/component/FormFoundItem";

const fillRequired = () => {
  const file = new File(["img"], "wallet.png", { type: "image/png" });
  fireEvent.change(document.querySelector('input[type="file"]'), { target: { files: [file] } });
  fireEvent.change(screen.getByLabelText("ชื่อสิ่งของ"), { target: { value: "กระเป๋าสตางค์" } });
  fireEvent.change(screen.getByLabelText("หมวดหมู่สิ่งของ"), { target: { value: "กระเป๋า" } });
  fireEvent.change(screen.getByLabelText("วันที่พบ"), { target: { value: "2026-09-01" } });
  fireEvent.change(screen.getByLabelText("ตำแหน่งที่พบ"), { target: { value: "SC-2" } });
  fireEvent.change(screen.getByLabelText("จุดรับของ (จุดรับฝาก)"), { target: { value: "กองกิจการนิสิต" } });
  return file;
};

const submit = () => act(async () => fireEvent.submit(document.querySelector("form")));

describe("FormFoundItem", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  test("FE-FF-01 พิมพ์ตำแหน่ง → แสดงรายการสถานที่ที่ตรงกัน และเลือกได้", () => {
    render(<FormFoundItem />);
    fireEvent.change(screen.getByLabelText("ตำแหน่งที่พบ"), { target: { value: "ศูนย์เรียนรวม" } });

    const options = screen.getAllByRole("listitem");
    expect(options).toHaveLength(4);
    fireEvent.click(screen.getByText("อาคารศูนย์เรียนรวม.2"));

    expect(screen.getByLabelText("ตำแหน่งที่พบ")).toHaveValue("อาคารศูนย์เรียนรวม.2");
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });

  test("FE-FF-02 ลบข้อความตำแหน่งจนว่าง → ซ่อนรายการแนะนำ", () => {
    render(<FormFoundItem />);
    fireEvent.change(screen.getByLabelText("ตำแหน่งที่พบ"), { target: { value: "SC" } });
    fireEvent.change(screen.getByLabelText("ตำแหน่งที่พบ"), { target: { value: "  " } });
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });

  test("FE-FF-03 เลือกรูป → แสดงชื่อไฟล์และภาพตัวอย่าง", () => {
    render(<FormFoundItem />);
    fillRequired();
    expect(screen.getByText("เลือกไฟล์: wallet.png")).toBeInTheDocument();
    expect(screen.getByAltText("preview")).toBeInTheDocument();
  });

  test("FE-FF-04 ส่งฟอร์มสำเร็จ → POST /foundItem แบบ FormData, แสดงหมายเลขรายการ และล้างฟอร์ม", async () => {
    localStorage.setItem("student_id", "6410500001");
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ item_id: 77 }) });
    render(<FormFoundItem />);
    const file = fillRequired();
    fireEvent.click(screen.getByRole("button", { name: "สีดำ" }));

    await submit();

    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe("http://localhost:3000/foundItem");
    expect(options.method).toBe("POST");
    const body = options.body;
    expect(body.get("item_name")).toBe("กระเป๋าสตางค์");
    expect(body.get("found_location")).toBe("SC-2");
    expect(body.get("item_color")).toBe("สีดำ");
    expect(body.get("student_id")).toBe("6410500001");
    expect(body.get("image").name).toBe(file.name);

    expect(screen.getByText("บันทึกสำเร็จ หมายเลขรายการ 77")).toBeInTheDocument();
    expect(screen.getByLabelText("ชื่อสิ่งของ")).toHaveValue("");
  });

  test("FE-FF-05 server ตอบ error → แสดงข้อความและคงข้อมูลเดิม", async () => {
    global.fetch.mockResolvedValue({ ok: false, json: async () => ({ error: "found_date is not a valid date" }) });
    render(<FormFoundItem />);
    fillRequired();

    await submit();

    expect(screen.getByText("เกิดข้อผิดพลาด: found_date is not a valid date")).toBeInTheDocument();
    expect(screen.getByLabelText("ชื่อสิ่งของ")).toHaveValue("กระเป๋าสตางค์");
  });

  test("FE-FF-06 เชื่อมต่อ server ไม่ได้ → แสดงข้อความผิดพลาด", async () => {
    global.fetch.mockRejectedValue(new Error("Failed to fetch"));
    render(<FormFoundItem />);
    fillRequired();
    await submit();
    expect(screen.getByText("เกิดข้อผิดพลาด: Failed to fetch")).toBeInTheDocument();
  });

  test("FE-FF-07 ช่องบังคับตั้งค่า required ครบ (รูป, ชื่อ, หมวดหมู่, วันที่, ตำแหน่ง, จุดรับของ)", () => {
    render(<FormFoundItem />);
    expect(document.querySelector('input[type="file"]')).toBeRequired();
    ["ชื่อสิ่งของ", "หมวดหมู่สิ่งของ", "วันที่พบ", "ตำแหน่งที่พบ", "จุดรับของ (จุดรับฝาก)"].forEach((label) =>
      expect(screen.getByLabelText(label)).toBeRequired()
    );
    expect(document.querySelector('input[type="file"]')).toHaveAttribute("accept", "image/*");
  });
});
