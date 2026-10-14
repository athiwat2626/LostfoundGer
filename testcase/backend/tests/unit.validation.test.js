// VAL-xx : validation.js
const { backendPath } = require("./helpers");
const { validateEmail, validateItem } = require(backendPath("validation.js"));

const validFound = {
  found_date: "2026-09-01",
  item_name: "กระเป๋าสตางค์",
  category: "กระเป๋า",
  item_color: "สีดำ",
  found_location: "โรงอาหารกลาง 1",
  description: "มีบัตรนิสิตอยู่ข้างใน",
  deposit_location: "กองกิจการนิสิต",
};

describe("validateEmail", () => {
  test.each([
    ["VAL-01", "user@ku.th", true],
    ["VAL-02", "  user@ku.th  ", true],
    ["VAL-03", "user@ku", false],
    ["VAL-04", "userku.th", false],
    ["VAL-05", "us er@ku.th", false],
    ["VAL-06", "", false],
    ["VAL-07", undefined, false],
    ["VAL-08", 12345, false],
  ])("%s validateEmail(%p) === %p", (_id, input, expected) => {
    expect(validateEmail(input)).toBe(expected);
  });

  test("VAL-09 อีเมลยาวเกิน 255 ตัวอักษรไม่ผ่าน", () => {
    expect(validateEmail(`${"a".repeat(250)}@ku.th`)).toBe(false);
  });
});

describe("validateItem", () => {
  test("VAL-10 ข้อมูลครบถ้วน → คืนค่าที่ trim แล้ว", () => {
    const result = validateItem({ ...validFound, item_name: "  กระเป๋า  " }, "found_date", "found_location");
    expect(result.error).toBeUndefined();
    expect(result.value.item_name).toBe("กระเป๋า");
    expect(result.value.found_date).toBe("2026-09-01");
  });

  test("VAL-11 ฟิลด์ที่ไม่บังคับว่าง → null", () => {
    const result = validateItem(
      { found_date: "2026-09-01", item_name: "ร่ม", found_location: "SC-2" },
      "found_date",
      "found_location"
    );
    expect(result.value).toMatchObject({ category: null, item_color: null, description: null, deposit_location: null });
  });

  test.each([
    ["VAL-12", { found_date: "01/09/2026" }, "found_date must use YYYY-MM-DD format"],
    ["VAL-13", { found_date: "2026-02-30" }, "found_date is not a valid date"],
    ["VAL-14", { found_date: undefined }, "found_date must use YYYY-MM-DD format"],
    ["VAL-15", { item_name: "" }, "item_name is required"],
    ["VAL-16", { item_name: "   " }, "item_name is required"],
    ["VAL-17", { item_name: "x".repeat(256) }, "item_name must not exceed 255 characters"],
    ["VAL-18", { item_name: 123 }, "item_name must be text"],
    ["VAL-19", { found_location: "" }, "found_location is required"],
    ["VAL-20", { category: "x".repeat(101) }, "category must not exceed 100 characters"],
    ["VAL-21", { description: "x".repeat(5001) }, "description must not exceed 5000 characters"],
  ])("%s ข้อมูลไม่ถูกต้อง %p → error", (_id, override, message) => {
    expect(validateItem({ ...validFound, ...override }, "found_date", "found_location")).toEqual({ error: message });
  });

  test("VAL-22 ใช้กับ lost item (lost_date / lost_location) ได้", () => {
    const result = validateItem(
      { lost_date: "2026-09-01", item_name: "กุญแจ", lost_location: "SC-9" },
      "lost_date",
      "lost_location"
    );
    expect(result.value).toMatchObject({ lost_date: "2026-09-01", lost_location: "SC-9" });
  });
});
