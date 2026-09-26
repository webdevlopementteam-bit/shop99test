import { Op } from "sequelize";
import UserAddress from "@/lib/models/userAddressModel.js";

export function pickAddressPayload(body = {}) {
  const fullName = String(body.full_name || body.fullName || "").trim();
  const recipientName = String(body.recipient_name || body.recipientName || "").trim();
  const resolvedName = fullName || recipientName;

  return {
    label: String(body.label || "Home").trim() || "Home",
    full_name: resolvedName,
    recipient_name: resolvedName,
    phone: String(body.phone || "").trim(),
    address_line: String(body.address_line || body.address || "").trim(),
    city: String(body.city || "").trim(),
    state: String(body.state || "").trim(),
    postcode: String(body.postcode || body.pincode || "").trim(),
    is_default:
      body.is_default === true ||
      body.is_default === 1 ||
      body.is_default === "1" ||
      body.is_default === "true",
  };
}

export function hasRequiredAddressFields(payload) {
  return Boolean(
    payload.full_name &&
      payload.recipient_name &&
      payload.phone &&
      payload.address_line &&
      payload.city &&
      payload.state &&
      payload.postcode,
  );
}

export async function clearOtherDefaults(userId, keepAddressId = null) {
  const where = { user_id: userId, is_default: true };
  if (keepAddressId) {
    where.id = { [Op.ne]: keepAddressId };
  }
  await UserAddress.update({ is_default: false }, { where });
}
