import Order from "@/lib/models/orderModel.js";
import { requireAdmin, AuthError, authErrorResponse } from "@/lib/auth.js";

// Admin-only: every customer's orders. Storefront uses /api/orders/my.
export async function GET(request) {
  try {
    requireAdmin(request);
    const data = await Order.findAll({ order: [["id", "DESC"]] });

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
