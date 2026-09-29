// Who may see / act on an order.
//
// Orders have no user_id column — create-payment stores the checkout phone
// (the saved address's phone when one is picked) and the typed email, or
// `<phone>@customer.invalid` when no email was given. So a user's orders are
// the ones matching their account phone/email or any of their saved
// addresses' phones, in the formats those phones may have been stored in.

import { Op } from "sequelize";
import User from "@/lib/models/userModel.js";
import UserAddress from "@/lib/models/userAddressModel.js";
import { requireAuth, AuthError } from "@/lib/auth.js";

function phoneVariants(raw) {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.length < 10) return [];
  const d10 = digits.slice(-10);
  return [d10, `91${d10}`, `+91${d10}`, `+91 ${d10}`, `0${d10}`];
}

/** Sequelize `where` matching the user's orders, or null if the user has no
 * phone/email to match on (or doesn't exist). */
export async function userOrdersWhere(userId) {
  const user = await User.findByPk(userId, { attributes: ["id", "phone", "email"] });
  if (!user) return null;

  const addresses = await UserAddress.findAll({ where: { user_id: user.id }, attributes: ["phone"] });

  const phones = [...new Set([user.phone, ...addresses.map((a) => a.phone)].flatMap(phoneVariants))];
  const emails = [
    ...new Set(
      [
        String(user.email ?? "").trim(),
        ...phones.filter((p) => /^\d{10}$/.test(p)).map((p) => `${p}@customer.invalid`),
      ].filter(Boolean),
    ),
  ];

  const or = [];
  if (phones.length) or.push({ phone: { [Op.in]: phones } });
  if (emails.length) or.push({ email: { [Op.in]: emails } });
  return or.length ? { [Op.or]: or } : null;
}

/**
 * Admin, or the customer the order belongs to. Returns { isAdmin, userId };
 * throws AuthError (401 no/invalid token, 403 someone else's order).
 */
export async function requireOrderAccess(request, order) {
  const auth = requireAuth(request);
  if (auth.role === "admin") return { isAdmin: true, userId: null };

  const where = await userOrdersWhere(auth.id);
  const Order = order.constructor;
  const owned = where && (await Order.count({ where: { [Op.and]: [{ id: order.id }, where] } }));
  if (!owned) throw new AuthError("Not allowed to access this order", 403);
  return { isAdmin: false, userId: auth.id };
}
