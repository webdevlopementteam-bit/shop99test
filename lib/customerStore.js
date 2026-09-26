const CUSTOMERS_STORAGE_KEY = "admin_customers";

const normalizeValue = (value) => (typeof value === "string" ? value.trim() : "");

const normalizePhone = (phone) => normalizeValue(phone).replace(/\D/g, "");

export const getStoredCustomers = () => {
  try {
    const raw = localStorage.getItem(CUSTOMERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Failed to parse customers from storage", error);
    return [];
  }
};

export const upsertCustomer = ({ username = "", phone = "", email = "" }) => {
  const normalizedPhone = normalizePhone(phone);
  const normalizedEmail = normalizeValue(email).toLowerCase();
  const normalizedUsername = normalizeValue(username);

  if (!normalizedUsername && !normalizedPhone && !normalizedEmail) return;

  const customers = getStoredCustomers();
  const existingIndex = customers.findIndex((item) => {
    const phoneMatch =
      normalizedPhone && normalizePhone(item?.phone || "") && normalizePhone(item.phone) === normalizedPhone;
    const emailMatch = normalizedEmail && normalizeValue(item?.email || "").toLowerCase() === normalizedEmail;
    return phoneMatch || emailMatch;
  });

  const now = new Date().toISOString();

  if (existingIndex >= 0) {
    const current = customers[existingIndex];
    customers[existingIndex] = {
      ...current,
      username: normalizedUsername || current.username || "",
      phone: normalizedPhone || current.phone || "",
      email: normalizedEmail || current.email || "",
      lastActiveAt: now,
    };
  } else {
    customers.push({
      id: now,
      username: normalizedUsername,
      phone: normalizedPhone,
      email: normalizedEmail,
      createdAt: now,
      lastActiveAt: now,
    });
  }

  localStorage.setItem(CUSTOMERS_STORAGE_KEY, JSON.stringify(customers));
};
