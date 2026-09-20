const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const text = (value, field, { required = false, maxLength }) => {
  if (value === undefined || value === null || value === "") {
    if (required) {
      return { error: `${field} is required` };
    }
    return { value: null };
  }

  if (typeof value !== "string") {
    return { error: `${field} must be text` };
  }

  const normalized = value.trim();
  if (required && !normalized) {
    return { error: `${field} is required` };
  }
  if (normalized.length > maxLength) {
    return { error: `${field} must not exceed ${maxLength} characters` };
  }

  return { value: normalized || null };
};

const date = (value, field) => {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) {
    return { error: `${field} must use YYYY-MM-DD format` };
  }

  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    return { error: `${field} is not a valid date` };
  }

  return { value };
};

const validateItem = (body, dateField, locationField) => {
  const fields = [
    [dateField, date(body[dateField], dateField)],
    ["item_name", text(body.item_name, "item_name", { required: true, maxLength: 255 })],
    ["category", text(body.category, "category", { maxLength: 100 })],
    ["item_color", text(body.item_color, "item_color", { maxLength: 100 })],
    [locationField, text(body[locationField], locationField, { required: true, maxLength: 255 })],
    ["description", text(body.description, "description", { maxLength: 5_000 })],
    ["deposit_location", text(body.deposit_location, "deposit_location", { maxLength: 255 })],
  ];

  const invalid = fields.find(([, result]) => result.error);
  if (invalid) {
    return { error: invalid[1].error };
  }

  return { value: Object.fromEntries(fields.map(([field, result]) => [field, result.value])) };
};

const validateEmail = (email) =>
  typeof email === "string" && email.length <= 255 && EMAIL_PATTERN.test(email.trim());

module.exports = { validateEmail, validateItem };
