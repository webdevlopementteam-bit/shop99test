import Deal from "@/lib/models/dealModel.js";
import Product from "@/lib/models/productModel.js";

const round2 = (n) => {
  const value = Number(n);
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
};

const discountedPriceForDeal = (basePrice, discountType, discountValue) => {
  const base = Number(basePrice);
  const value = Number(discountValue || 0);

  if (!Number.isFinite(base) || base < 0) return null;
  if (!Number.isFinite(value) || value <= 0) return round2(base);

  let discountAmount = value;
  if (discountType === "percent" || discountType === "percentage") {
    discountAmount = (base * value) / 100;
  }

  return round2(Math.max(base - discountAmount, 0));
};

/* ================= UPDATE ================= */
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const { product_id, discount_type, discount_value } = await request.json();

    const deal = await Deal.findByPk(id);
    if (!deal) {
      return Response.json({ message: "Deal not found" }, { status: 404 });
    }

    const updates = {};

    if (product_id !== undefined) {
      const productId = Number(product_id);
      if (!Number.isInteger(productId) || productId <= 0) {
        return Response.json({ message: "Invalid product_id" }, { status: 400 });
      }

      const duplicate = await Deal.findOne({ where: { product_id: productId } });
      if (duplicate && duplicate.id !== deal.id) {
        return Response.json({ message: "Deal already exists for this product" }, { status: 400 });
      }

      updates.product_id = productId;
    }

    if (discount_type !== undefined) {
      if (!["flat", "percent"].includes(discount_type)) {
        return Response.json({ message: "Invalid discount_type" }, { status: 400 });
      }
      updates.discount_type = discount_type;
    }

    if (discount_value !== undefined) {
      const value = Number(discount_value);
      if (!Number.isFinite(value) || value < 0) {
        return Response.json({ message: "Invalid discount_value" }, { status: 400 });
      }
      updates.discount_value = value;
    }

    await deal.update(updates);

    const updatedDeal = await Deal.findByPk(id, {
      include: [
        { model: Product, attributes: ["id", "name", "slug", "price", "image", "in_stock", "old_price"] },
      ],
    });

    const json = updatedDeal.toJSON();
    const product = json.Product;

    if (product) {
      const basePrice = Number(product.price);
      const discountedPrice = discountedPriceForDeal(basePrice, json.discount_type, json.discount_value);

      if (Number.isFinite(discountedPrice)) {
        product.old_price = basePrice;
        product.price = discountedPrice;
      }
    }

    return Response.json({ message: "Deal updated successfully", data: json });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

/* ================= DELETE ================= */
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    await Deal.destroy({ where: { id } });

    return Response.json({ message: "Deleted successfully" });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
