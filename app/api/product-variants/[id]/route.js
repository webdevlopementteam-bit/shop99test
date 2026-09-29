import { withAdmin } from "@/lib/auth.js";
import sequelize from "@/lib/db.js";
import ProductVariant from "@/lib/models/productVariantModel.js";
import ProductVariantImage from "@/lib/models/productVariantImageModel.js";
import Product from "@/lib/models/productModel.js";

async function syncProductFromVariants(product_id) {
  const list = await ProductVariant.findAll({ where: { product_id } });
  if (list.length === 0) {
    await Product.update({ price: null, old_price: null, in_stock: false }, { where: { id: product_id } });
    return;
  }
  const nums = list.map((v) => Number(v.price)).filter((n) => !Number.isNaN(n));
  const minP = nums.length ? Math.min(...nums) : null;
  const minVar = minP != null ? list.find((v) => Number(v.price) === minP) : null;
  const oldP = minVar && minVar.old_price != null && minVar.old_price !== "" ? Number(minVar.old_price) : null;
  const anyStock = list.some((v) => Number(v.stock) > 0);
  await Product.update(
    { price: minP, old_price: Number.isFinite(oldP) ? oldP : null, in_stock: anyStock },
    { where: { id: product_id } },
  );
}

/**
 * Deletes one variant (and its gallery images).
 * Optional ?product_id= — 400 if it doesn't match.
 */
async function handleDELETE(request, { params }) {
  const { id: idRaw } = await params;
  const id = parseInt(idRaw, 10);
  if (!Number.isFinite(id) || id <= 0) {
    return Response.json({ message: "Invalid variant id" }, { status: 400 });
  }

  const queryPidRaw = request.nextUrl.searchParams.get("product_id");
  const queryPid = queryPidRaw != null ? parseInt(queryPidRaw, 10) : null;

  try {
    const variant = await ProductVariant.findByPk(id);
    if (!variant) {
      return Response.json({ message: "Variant not found" }, { status: 404 });
    }

    if (queryPid != null && Number.isFinite(queryPid) && variant.product_id !== queryPid) {
      return Response.json({ message: "Variant does not belong to the given product" }, { status: 400 });
    }

    const product_id = variant.product_id;

    await sequelize.transaction(async (t) => {
      await ProductVariantImage.destroy({ where: { variant_id: id }, transaction: t });
      await ProductVariant.destroy({ where: { id }, transaction: t });
    });

    await syncProductFromVariants(product_id);

    return Response.json({ success: true, product_id });
  } catch (err) {
    console.error(err);
    return Response.json({ message: err.message }, { status: 500 });
  }
}

export const DELETE = withAdmin(handleDELETE);
