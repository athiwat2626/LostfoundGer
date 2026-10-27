// FE-GG-xx : ปุ่ม Google ในหน้าเข้าสู่ระบบ/สมัคร (GoogleSignInButton) — ยืนยัน Google แล้วต้องกรอก OTP ต่อ (2 ขั้น)
// window.google จำลองแทนสคริปต์ของ Google: renderButton วาดปุ่มที่กดแล้วส่ง credential ปลอมกลับมา
import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import axios from "axios";
import Login from "@app/page/Login";
import SignUp from "@app/page/SignUp";
import { refreshSiteSettings } from "@app/component/siteSettings";
import { mockRoutes } from "./axiosMock";
import { renderAt } from "./utils";

vi.mock("axios", () => import("./axiosMock.js"));

const CLIENT_ID = "1234567890-test.apps.googleusercontent.com";
const CREDENTIAL = "google.id.token";

let gsi;
const installFakeGoogle = () => {
  gsi = { callback: null, initialize: vi.fn((opts) => (gsi.callback = opts.callback)), renderButton: vi.fn() };
  gsi.renderButton.mockImplementation((el, opts) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = opts.text === "signup_with" ? "สมัครด้วย Google" : "ลงชื่อเข้าใช้ด้วย Google";
    button.addEventListener("click", () => gsi.callback({ credential: CREDENTIAL }));
    el.appendChild(button);
  });
  window.google = { accounts: { id: gsi } };
};

const serveSettings = async (clientId = CLIENT_ID) => {
  mockRoutes({ "/api/settings/public": { categories: ["อื่น ๆ"], deposit_points: [], announcement: null, maintenance: { enabled: false }, google_client_id: clientId } });
  await act(() => refreshSiteSettings());
};

const googleButton = (name) => screen.findByRole("button", { name });
const clickGoogle = async (name = "ลงชื่อเข้าใช้ด้วย Google") => {
  const button = await googleButton(name);
  await act(async () => fireEvent.click(button));
};

beforeEach(() => installFakeGoogle());
afterEach(() => delete window.google);

describe("GoogleSignInButton ในหน้าเข้าสู่ระบบ", () => {
  test("FE-GG-01 ยังไม่ได้ตั้ง GOOGLE_CLIENT_ID → ไม่แสดงปุ่ม Google และคำว่า 'หรือ'", async () => {
    await serveSettings(null);
    renderAt(<Login />, { path: "/login" });
    expect(screen.getByRole("button", { name: "ลงชื่อเข้าใช้" })).toBeInTheDocument();
    expect(screen.queryByText("หรือ")).not.toBeInTheDocument();
    expect(gsi.initialize).not.toHaveBeenCalled();
  });

  test("FE-GG-02 ตั้งค่าแล้ว → สร้างปุ่มด้วย Client ID จากค่าระบบ แบบ popup ภาษาไทย", async () => {
    await serveSettings();
    renderAt(<Login />, { path: "/login" });
    await googleButton("ลงชื่อเข้าใช้ด้วย Google");
    expect(screen.getByText("หรือ")).toBeInTheDocument();
    expect(gsi.initialize).toHaveBeenCalledWith(expect.objectContaining({ client_id: CLIENT_ID, ux_mode: "popup" }));
    expect(gsi.renderButton.mock.calls[0][1]).toMatchObject({ text: "signin_with", locale: "th", shape: "pill" });
  });

  test("FE-GG-03 ยืนยัน Google สำเร็จ → ส่ง credential ไป backend แล้วเปลี่ยนเป็นขั้นตอนกรอก OTP (ยังไม่เข้าสู่ระบบ)", async () => {
    await serveSettings();
    axios.post.mockResolvedValue({ data: { success: true, created: false, otp_required: true, email: "somchai@ku.th" } });
    renderAt(<Login />, { path: "/login" });
    await clickGoogle();

    expect(axios.post).toHaveBeenCalledWith("http://localhost:3000/api/auth/google", { credential: CREDENTIAL });
    expect(screen.getByRole("heading", { name: /ยืนยันรหัส OTP/ })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("ยืนยันบัญชี Google แล้ว ส่งรหัส OTP ไปที่ somchai@ku.th แล้ว");
    expect(localStorage.getItem("userToken")).toBeNull();
    expect(screen.getByTestId("pathname")).toHaveTextContent("/login");
  });

  test("FE-GG-04 ขั้นที่ 2 กรอก OTP ถูก → verify-otp ด้วยอีเมล Google, บันทึก session และไปหน้าหลัก", async () => {
    await serveSettings();
    axios.post.mockResolvedValueOnce({ data: { success: true, otp_required: true, email: "somchai@ku.th" } });
    renderAt(<Login />, { path: "/login" });
    await clickGoogle();

    axios.post.mockResolvedValueOnce({ data: { success: true, token: "user.jwt.token", student_id: "6410500001" } });
    fireEvent.change(screen.getByLabelText("รหัส OTP 6 หลัก"), { target: { value: "123456" } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "ยืนยัน" })));

    expect(axios.post).toHaveBeenLastCalledWith("http://localhost:3000/api/verify-otp", { email: "somchai@ku.th", otp: "123456" });
    expect(localStorage.getItem("userToken")).toBe("user.jwt.token");
    expect(localStorage.getItem("email")).toBe("somchai@ku.th");
    await waitFor(() => expect(screen.getByTestId("pathname")).toHaveTextContent("/home"), { timeout: 3000 });
  });

  test("FE-GG-05 ขอรหัสซ้ำเร็วเกินไป (retry_after) → แจ้งให้ใช้รหัสล่าสุดในอีเมล", async () => {
    await serveSettings();
    axios.post.mockResolvedValue({ data: { success: true, otp_required: true, email: "somchai@ku.th", retry_after: 40 } });
    renderAt(<Login />, { path: "/login" });
    await clickGoogle();
    expect(screen.getByRole("status")).toHaveTextContent("กรุณาใช้รหัสล่าสุดในอีเมล");
  });

  test("FE-GG-06 backend ปฏิเสธ (เช่น บัญชีถูกแบน) → แสดงข้อความ และอยู่ขั้นตอนอีเมล", async () => {
    await serveSettings();
    axios.post.mockRejectedValue(Object.assign(new Error("403"), { response: { data: { message: "บัญชีนี้ถูกระงับถาวร กรุณาติดต่อผู้ดูแลระบบ" } } }));
    renderAt(<Login />, { path: "/login" });
    await clickGoogle();
    expect(screen.getByRole("alert")).toHaveTextContent("บัญชีนี้ถูกระงับถาวร");
    expect(screen.getByRole("heading", { name: "ลงชื่อเข้าใช้" })).toBeInTheDocument();
  });

  test("FE-GG-07 เปิดหน้าเข้าสู่ระบบพร้อม otpEmail (มาจากหน้าสมัคร) → เริ่มที่ขั้นตอนกรอก OTP", async () => {
    await serveSettings();
    renderAt(<Login />, { path: "/login", route: { pathname: "/login", state: { otpEmail: "new@ku.th", message: "สมัครสมาชิกด้วย Google สำเร็จ" } } });
    expect(screen.getByRole("heading", { name: /ยืนยันรหัส OTP/ })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("สมัครสมาชิกด้วย Google สำเร็จ");
  });
});

describe("GoogleSignInButton ในหน้าสมัครสมาชิก", () => {
  test.each([
    [true, "สมัครสมาชิกด้วย Google สำเร็จ ส่งรหัส OTP ไปที่ new@ku.th แล้ว"],
    [false, "มีบัญชีนี้อยู่แล้ว ส่งรหัส OTP ไปที่ new@ku.th แล้ว"],
  ])("FE-GG-08 สมัครด้วย Google (created=%s) → ไปหน้าเข้าสู่ระบบขั้นตอน OTP พร้อมข้อความ", async (created, message) => {
    await serveSettings();
    axios.post.mockResolvedValue({ data: { success: true, created, otp_required: true, email: "new@ku.th" } });
    renderAt(<SignUp />, { path: "/signup" });
    await clickGoogle("สมัครด้วย Google");

    expect(gsi.renderButton.mock.calls[0][1].text).toBe("signup_with");
    expect(screen.getByTestId("pathname")).toHaveTextContent("/login");
    expect(JSON.parse(screen.getByTestId("location-state").textContent)).toEqual({ otpEmail: "new@ku.th", message });
    expect(localStorage.getItem("userToken")).toBeNull();
  });
});
