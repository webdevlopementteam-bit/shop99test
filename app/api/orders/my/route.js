import Order from "@/lib/models/orderModel.js";
import { requireUser, AuthError, authErrorResponse } from "@/lib/auth.js";
import { userOrdersWhere } from "@/lib/orderAccess.js";

/* ================= GET LOGGED-IN USER'S ORDERS ================= */
export async function GET(request) {
  try {
    const authUser = requireUser(request);

    const where = await userOrdersWhere(authUser.id);
    if (!where) return Response.json([]);

    const data = await Order.findAll({ where, order: [["id", "DESC"]] });

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
