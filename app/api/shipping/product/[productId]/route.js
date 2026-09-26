import Product from "@/lib/models/productModel.js";
import { syncProductShipping, getShippingStateRatesObject } from "@/lib/services/shippingSync.js";

export async function GET(request, { params }) {
  try {
    const { productId: productIdRaw } = await params;
    const productId = parseInt(productIdRaw, 10);
    if (!Number.isFinite(productId)) {
      return Response.json({ message: "Invalid product id" }, { status: 400 });
    }

    const product = await Product.findByPk(productId, {
      attributes: ["id", "shipping_mode", "shipping_flat_fee"],
    });

    if (!product) {
      return Response.json({ message: "Product not found" }, { status: 404 });
    }

    const j = product.toJSON();
    const shipping_state_rates = await getShippingStateRatesObject(productId);

    return Response.json({
      product_id: productId,
      shipping_mode: j.shipping_mode || "free",
      shipping_flat_fee: Number(j.shipping_flat_fee) || 0,
      shipping_state_rates,
    });
  } catch (err) {
    console.error(err);
    return Response.json({ message: "Failed to load shipping" }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { productId: productIdRaw } = await params;
    const productId = parseInt(productIdRaw, 10);
    if (!Number.isFinite(productId)) {
      return Response.json({ message: "Invalid product id" }, { status: 400 });
    }

    const exists = await Product.findByPk(productId, { attributes: ["id"] });
    if (!exists) {
      return Response.json({ message: "Product not found" }, { status: 404 });
    }

    const body = await request.json();
    await syncProductShipping(productId, body);

    const shipping_state_rates = await getShippingStateRatesObject(productId);
    const updated = await Product.findByPk(productId, {
      attributes: ["shipping_mode", "shipping_flat_fee"],
    });
    const j = updated.toJSON();

    return Response.json({
      success: true,
      product_id: productId,
      shipping_mode: j.shipping_mode || "free",
      shipping_flat_fee: Number(j.shipping_flat_fee) || 0,
      shipping_state_rates,
    });
  } catch (err) {
    console.error(err);
    return Response.json({ message: err.message || "Failed to save shipping" }, { status: 500 });
  }
}
