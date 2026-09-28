import { Op } from "sequelize";
import Order from "@/lib/models/orderModel.js";
import User from "@/lib/models/userModel.js";
import UserAddress from "@/lib/models/userAddressModel.js";
import { requireAuth, AuthError, authErrorResponse } from "@/lib/auth.js";

// Orders have no user_id column — create-payment stores the checkout phone
// (the saved address's phone when one is picked) and the typed email, or
// `<phone>@customer.invalid` when no email was given. So a user's orders are
// the ones matching their account phone/email or any of their saved
// addresses' phones, in the formats those phones may have been stored in.
function phoneVariants(raw) {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.length < 10) return [];
  const d10 = digits.slice(-10);
  return [d10, `91${d10}`, `+91${d10}`, `+91 ${d10}`, `0${d10}`];
}

/* ================= GET LOGGED-IN USER'S ORDERS ================= */
export async function GET(request) {
  try {
    const authUser = requireAuth(request);

    const user = await User.findByPk(authUser.id, { attributes: ["id", "phone", "email"] });
    if (!user) {
      return Response.json({ message: "User not found" }, { status: 404 });
    }

    const addresses = await UserAddress.findAll({
      where: { user_id: user.id },
      attributes: ["phone"],
    });

    const phones = [
      ...new Set([user.phone, ...addresses.map((a) => a.phone)].flatMap(phoneVariants)),
    ];
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
    if (!or.length) return Response.json([]);

    const data = await Order.findAll({ where: { [Op.or]: or }, order: [["id", "DESC"]] });

    const normalized = data.map((row) => {
      const plain = row.get ? row.get({ plain: true }) : row;
      return { ...plain, delivery_date: "3-7 days", status: plain.status };
    });

    return Response.json(normalized);
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err);
    console.error(err);
    return Response.json({ message: "Failed to fetch orders" }, { status: 500 });
  }
}
