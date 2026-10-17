import { withAdmin } from "@/lib/auth.js";
import { listDeals } from "@/lib/storefrontLists.js";
import Deal from "@/lib/models/dealModel.js";

/* ================= ADD ================= */
async function handlePOST(request) {
  try {
    const body = await request.json();
    const { deals, productIds, discount_type, discount_value } = body;

    const normalizedDeals = Array.isArray(deals)
      ? deals
      : Array.isArray(productIds)
        ? productIds.map((productId) => ({
            product_id: productId,
            discount_type: discount_type || "percent",
            discount_value: discount_value !== undefined ? Number(discount_value) : 0,
          }))
        : [];

    if (!normalizedDeals.length) {
      return Response.json({ message: "No deals selected" }, { status: 400 });
    }

    const created = [];

    for (const item of normalizedDeals) {
      const productId = Number(item.product_id);
      const type = item.discount_type;
      const value = Number(item.discount_value);

      if (!Number.isInteger(productId) || productId <= 0) continue;
      if (!["flat", "percent"].includes(type)) continue;
      if (!Number.isFinite(value) || value < 0) continue;

      const exists = await Deal.findOne({ where: { product_id: productId } });

      if (!exists) {
        const newDeal = await Deal.create({
          product_id: productId,
          discount_type: type,
          discount_value: value,
        });
        created.push(newDeal);
      } else {
        await exists.update({ discount_type: type, discount_value: value });
      }
    }

    return Response.json({ message: "Deals added", data: created });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

/* ================= GET ================= */
export async function GET() {
  try {
    return Response.json(await listDeals());
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export const POST = withAdmin(handlePOST);
