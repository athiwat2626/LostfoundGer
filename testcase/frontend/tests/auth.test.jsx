// FE-LG / FE-SU / FE-AL / FE-LD : Login (OTP), SignUp, AdminLogin, Loading
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import adminApi from "@app/admin/api/adminApi";
import Login from "@app/page/Login";
import SignUp from "@app/page/SignUp";
import AdminLogin from "@app/admin/AdminLogin";
import Loading from "@app/page/Loading";
import { LocationProbe, renderAt } from "./utils";

vi.mock("axios", () => ({ default: { post: vi.fn(), get: vi.fn() } }));
vi.mock("@app/admin/api/adminApi", () => ({ default: { post: vi.fn(), get: vi.fn() } }));

const apiError = (status, data) => Object.assign(new Error("Request failed"), { response: { status, data } });

beforeEach(() => {
  axios.post.mockReset();
  // ค่าระบบสาธารณะ (หมวดหมู่, Google Client ID) — โหลดไม่ได้ = ใช้ค่าเริ่มต้น ไม่มีปุ่ม Google
  axios.get.mockReset().mockRejectedValue(new Error("offline"));
  adminApi.post.mockReset();
});

describe("Login (OTP)", () => {
  const typeEmail = (email = "somchai@ku.th") =>
    fireEvent.change(screen.getByLabelText("อีเมล"), { target: { value: email } });
  const submitEmail = () => act(async () => fireEvent.click(screen.getByRole("button", { name: "ลงชื่อเข้าใช้" })));

  // ไปถึงขั้นตอนกรอก OTP (ส่ง OTP สำเร็จก่อน)
  const goToOtpStep = async () => {
    axios.post.mockResolvedValueOnce({ data: { success: true } });
    renderAt(<Login />, { path: "/login" });
    typeEmail();
    await submitEmail();
  };
  const typeOtp = (value) => fireEvent.change(screen.getByLabelText("รหัส OTP 6 หลัก"), { target: { value } });
  const submitOtp = () => act(async () => fireEvent.click(screen.getByRole("button", { name: "ยืนยัน" })));

  test("FE-LG-01 หน้าแรกแสดงโลโก้ ช่องอีเมล และปุ่มลงชื่อเข้าใช้ ตามดีไซน์", () => {
    renderAt(<Login />, { path: "/login" });
    expect(screen.getByAltText("KU FOUND&LOST")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "ลงชื่อเข้าใช้" })).toBeInTheDocument();
    expect(screen.getByLabelText("อีเมล")).toHaveAttribute("placeholder", "example@gmail.com");
    expect(screen.getByRole("button", { name: "ลงชื่อเข้าใช้" })).toBeInTheDocument();
  });

  test("FE-LG-02 ส่ง OTP สำเร็จ → เรียก /api/send-otp แล้วเปลี่ยนเป็นขั้นตอนกรอก OTP", async () => {
    localStorage.setItem("isLoggedIn", "true");
    await goToOtpStep();

    expect(axios.post).toHaveBeenCalledWith("http://localhost:3000/api/send-otp", { email: "somchai@ku.th" });
    expect(localStorage.getItem("isLoggedIn")).toBeNull();
    expect(screen.getByRole("heading", { name: /ยืนยันรหัส OTP/ })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("ส่งรหัส OTP ไปที่ somchai@ku.th แล้ว");
  });

  test("FE-LG-03 ส่ง OTP ไม่สำเร็จ (เช่น บัญชีถูกระงับ) → แสดงข้อความจาก server และอยู่ขั้นตอนอีเมล", async () => {
    axios.post.mockRejectedValue(apiError(403, { message: "บัญชีนี้ถูกระงับถาวร กรุณาติดต่อผู้ดูแลระบบ" }));
    renderAt(<Login />, { path: "/login" });
    typeEmail();
    await submitEmail();
    expect(screen.getByRole("alert")).toHaveTextContent("บัญชีนี้ถูกระงับถาวร กรุณาติดต่อผู้ดูแลระบบ");
    expect(screen.getByLabelText("อีเมล")).toBeInTheDocument();
  });

  test("FE-LG-04 เชื่อมต่อ server ไม่ได้ → 'ไม่สามารถส่ง OTP ได้'", async () => {
    axios.post.mockRejectedValue(new Error("Network Error"));
    renderAt(<Login />, { path: "/login" });
    typeEmail();
    await submitEmail();
    expect(screen.getByRole("alert")).toHaveTextContent("ไม่สามารถส่ง OTP ได้");
  });

  test("FE-LG-05 ช่อง OTP รับเฉพาะตัวเลข และปุ่มยืนยันกดได้เมื่อครบ 6 หลัก", async () => {
    await goToOtpStep();
    typeOtp("12a3");
    expect(screen.getByLabelText("รหัส OTP 6 หลัก")).toHaveValue("123");
    expect(screen.getByRole("button", { name: "ยืนยัน" })).toBeDisabled();
    typeOtp("123456");
    expect(screen.getByRole("button", { name: "ยืนยัน" })).toBeEnabled();
  });

  test("FE-LG-06 OTP ถูกต้อง → เก็บสถานะ login และไป /home หลัง 2 วินาที", async () => {
    await goToOtpStep();
    vi.useFakeTimers();
    axios.post.mockResolvedValueOnce({ data: { success: true, student_id: "6410500001" } });
    typeOtp("123456");
    await submitOtp();

    expect(axios.post).toHaveBeenLastCalledWith("http://localhost:3000/api/verify-otp", { email: "somchai@ku.th", otp: "123456" });
    expect(screen.getByRole("status")).toHaveTextContent("OTP ถูกต้อง");
    expect(localStorage.getItem("isLoggedIn")).toBe("true");
    expect(localStorage.getItem("email")).toBe("somchai@ku.th");
    expect(localStorage.getItem("student_id")).toBe("6410500001");
    expect(screen.getByTestId("pathname")).toHaveTextContent("/login");

    await act(async () => vi.advanceTimersByTime(2000));
    expect(screen.getByTestId("pathname")).toHaveTextContent("/home");
  });

  test("FE-LG-07 OTP ผิดหรือหมดอายุ → 'OTP ไม่ถูกต้องหรือหมดอายุ' และไม่ login", async () => {
    await goToOtpStep();
    axios.post.mockRejectedValueOnce(apiError(400, { message: "Invalid or expired OTP" }));
    typeOtp("000000");
    await submitOtp();
    expect(screen.getByRole("alert")).toHaveTextContent("OTP ไม่ถูกต้องหรือหมดอายุ");
    expect(localStorage.getItem("isLoggedIn")).toBeNull();
  });

  // เดิมเป็นบั๊ก B-01 (อ่านฟิลด์ messageOtp) — แก้แล้วในหน้า Login ใหม่
  test("FE-LG-08 OTP ถูกแต่บัญชีถูกแบน → แสดงข้อความจาก server", async () => {
    await goToOtpStep();
    axios.post.mockRejectedValueOnce(apiError(403, { message: "บัญชีนี้ถูกระงับถาวร กรุณาติดต่อผู้ดูแลระบบ" }));
    typeOtp("123456");
    await submitOtp();
    expect(screen.getByRole("alert")).toHaveTextContent("บัญชีนี้ถูกระงับถาวร กรุณาติดต่อผู้ดูแลระบบ");
  });

  test("FE-LG-09 ปุ่มย้อนกลับในขั้นตอน OTP → กลับไปแก้อีเมล (อีเมลเดิมยังอยู่)", async () => {
    await goToOtpStep();
    fireEvent.click(screen.getByRole("button", { name: "กลับไปแก้อีเมล" }));
    expect(screen.getByLabelText("อีเมล")).toHaveValue("somchai@ku.th");
  });

  test("FE-LG-10 'ส่งรหัสอีกครั้ง' → เรียก /api/send-otp ซ้ำ", async () => {
    await goToOtpStep();
    axios.post.mockResolvedValueOnce({ data: { success: true } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "ส่งรหัสอีกครั้ง" })));
    expect(axios.post).toHaveBeenCalledTimes(2);
    expect(axios.post).toHaveBeenLastCalledWith("http://localhost:3000/api/send-otp", { email: "somchai@ku.th" });
  });

  // ปุ่ม Google แสดงเมื่อตั้ง GOOGLE_CLIENT_ID แล้วเท่านั้น (ทดสอบแบบมีปุ่มใน googleSignIn.test.jsx)
  test("FE-LG-11 ยังไม่ได้ตั้งค่า Google Sign-In → ไม่มีปุ่ม Google", () => {
    renderAt(<Login />, { path: "/login" });
    expect(screen.queryByText("หรือ")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Google/ })).not.toBeInTheDocument();
  });

  test("FE-LG-12 มีข้อความส่งมาจากหน้าก่อน (location.state.message) → แสดงบนหน้า", () => {
    renderAt(<Login />, { path: "/login", route: { pathname: "/login", state: { message: "สมัครสมาชิกสำเร็จ" } } });
    expect(screen.getByText("สมัครสมาชิกสำเร็จ")).toBeInTheDocument();
  });

  test.each([
    ["FE-LG-13", "สมัครสมาชิก", "/signup"],
    ["FE-LG-14", "เข้าสู่ระบบแอดมิน", "/admin/login"],
  ])("%s ลิงก์ '%s' → ไป %s", (_id, label, path) => {
    renderAt(<Login />, { path: "/login" });
    fireEvent.click(screen.getByRole("link", { name: label }));
    expect(screen.getByTestId("pathname")).toHaveTextContent(path);
  });
});

describe("SignUp", () => {
  const fill = async (user) => {
    await user.type(screen.getByPlaceholderText("ชื่อ"), "สมชาย");
    await user.type(screen.getByPlaceholderText("นามสกุล"), "ใจดี");
    await user.type(screen.getByPlaceholderText("อีเมล"), "somchai@ku.th");
  };

  test("FE-SU-01 สมัครสำเร็จ → ไป /login พร้อมข้อความสำเร็จ", async () => {
    const user = userEvent.setup();
    axios.post.mockResolvedValue({ data: { success: true } });
    renderAt(<SignUp />, { path: "/signup" });

    await fill(user);
    await user.click(screen.getByRole("button", { name: "สมัครสมาชิก" }));

    expect(axios.post).toHaveBeenCalledWith("http://localhost:3000/api/register", {
      first_name: "สมชาย",
      last_name: "ใจดี",
      email: "somchai@ku.th",
    });
    await waitFor(() => expect(screen.getByTestId("pathname")).toHaveTextContent("/login"));
    expect(screen.getByTestId("location-state")).toHaveTextContent("สมัครสมาชิกสำเร็จ");
  });

  test("FE-SU-02 อีเมลซ้ำ → แสดงข้อความจาก server และอยู่หน้าเดิม", async () => {
    const user = userEvent.setup();
    axios.post.mockRejectedValue(apiError(409, { message: "รหัสนิสิตหรืออีเมลนี้มีอยู่ในระบบแล้ว" }));
    renderAt(<SignUp />, { path: "/signup" });

    await fill(user);
    await user.click(screen.getByRole("button", { name: "สมัครสมาชิก" }));

    expect(await screen.findByText("รหัสนิสิตหรืออีเมลนี้มีอยู่ในระบบแล้ว")).toBeInTheDocument();
    expect(screen.getByTestId("pathname")).toHaveTextContent("/signup");
    expect(screen.getByRole("button", { name: "สมัครสมาชิก" })).toBeEnabled();
  });

  test("FE-SU-03 ช่องที่ต้องกรอกว่าง → form ไม่ถูกส่ง (HTML required)", async () => {
    const user = userEvent.setup();
    renderAt(<SignUp />, { path: "/signup" });
    await user.click(screen.getByRole("button", { name: "สมัครสมาชิก" }));
    expect(axios.post).not.toHaveBeenCalled();
    expect(screen.getByPlaceholderText("ชื่อ")).toBeRequired();
    expect(screen.getByPlaceholderText("ชื่อ")).toHaveAttribute("maxLength", "100");
  });

  test("FE-SU-04 ลิงก์ 'เข้าสู่ระบบ' → ไป /login", () => {
    renderAt(<SignUp />, { path: "/signup" });
    fireEvent.click(screen.getByRole("link", { name: "เข้าสู่ระบบ" }));
    expect(screen.getByTestId("pathname")).toHaveTextContent("/login");
  });
});

describe("AdminLogin", () => {
  const submit = async (user) => {
    await user.type(screen.getByLabelText("Username"), "admin@ku.th");
    await user.type(screen.getByLabelText("Password"), "secret-password");
    await user.click(screen.getByRole("button", { name: "Login to Console" }));
  };

  test("FE-AL-01 login สำเร็จ → เก็บ adminToken/adminEmail และไป /admin/dashboard", async () => {
    const user = userEvent.setup();
    adminApi.post.mockResolvedValue({ data: { token: "jwt-token", admin: { email: "admin@ku.th" } } });
    renderAt(<AdminLogin />, { path: "/admin/login" });

    await submit(user);

    expect(adminApi.post).toHaveBeenCalledWith("/admin/auth/login", { email: "admin@ku.th", password: "secret-password" });
    await waitFor(() => expect(screen.getByTestId("pathname")).toHaveTextContent("/admin/dashboard"));
    expect(localStorage.getItem("adminToken")).toBe("jwt-token");
    expect(localStorage.getItem("adminEmail")).toBe("admin@ku.th");
  });

  test("FE-AL-02 รหัสผ่านผิด → แสดงข้อความ error", async () => {
    const user = userEvent.setup();
    adminApi.post.mockRejectedValue(apiError(401, { message: "Invalid email or password" }));
    renderAt(<AdminLogin />, { path: "/admin/login" });

    await submit(user);

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid email or password");
    expect(localStorage.getItem("adminToken")).toBeNull();
  });

  test("FE-AL-03 ลิงก์ 'กลับสู่หน้าหลัก' → ไป /login", () => {
    renderAt(<AdminLogin />, { path: "/admin/login" });
    fireEvent.click(screen.getByRole("link", { name: /กลับสู่หน้าหลัก/ }));
    expect(screen.getByTestId("pathname")).toHaveTextContent("/login");
  });

  test("FE-AL-04 แสดงโลโก้ หัวข้อ 'KU Lost & Found' และช่อง Username/Password ที่จำเป็นต้องกรอก", () => {
    renderAt(<AdminLogin />, { path: "/admin/login" });
    expect(screen.getByAltText("KU FOUND&LOST")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "KU Lost & Found" })).toBeInTheDocument();
    expect(screen.getByLabelText("Username")).toHaveAttribute("placeholder", "Administrative Email");
    expect(screen.getByLabelText("Username")).toBeRequired();
    expect(screen.getByLabelText("Password")).toBeRequired();
  });

  test("FE-AL-05 ปุ่มรูปตา → สลับแสดง/ซ่อนรหัสผ่าน", () => {
    renderAt(<AdminLogin />, { path: "/admin/login" });
    const password = screen.getByLabelText("Password");
    expect(password).toHaveAttribute("type", "password");
    fireEvent.click(screen.getByRole("button", { name: "แสดงรหัสผ่าน" }));
    expect(password).toHaveAttribute("type", "text");
    fireEvent.click(screen.getByRole("button", { name: "ซ่อนรหัสผ่าน" }));
    expect(password).toHaveAttribute("type", "password");
  });

  test("FE-AL-06 ระหว่างส่ง → ปุ่มแสดง 'กำลังเข้าสู่ระบบ...' และกดซ้ำไม่ได้", async () => {
    const user = userEvent.setup();
    adminApi.post.mockReturnValue(new Promise(() => {}));
    renderAt(<AdminLogin />, { path: "/admin/login" });
    await submit(user);
    expect(screen.getByRole("button", { name: "กำลังเข้าสู่ระบบ..." })).toBeDisabled();
  });
});

describe("Loading", () => {
  test("FE-LD-01 แสดงโลโก้ และพาไป /login อัตโนมัติหลัง 5 วินาที", () => {
    vi.useFakeTimers();
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Loading />
        <LocationProbe />
      </MemoryRouter>
    );
    expect(screen.getByAltText("Logo")).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(4999));
    expect(screen.getByTestId("pathname")).toHaveTextContent(/^\/$/);
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByTestId("pathname")).toHaveTextContent("/login");
  });
});
