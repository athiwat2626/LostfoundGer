import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

// URL.createObjectURL ของ Node ใช้กับ File ของ jsdom ไม่ได้ จึงแทนด้วยค่าจำลอง
URL.createObjectURL = () => "blob:preview";
URL.revokeObjectURL = () => {};

// ปิด log ของหน้าเว็บระหว่างรันเทส
vi.spyOn(console, "log").mockImplementation(() => {});
