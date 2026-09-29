import Warranty from "@/lib/models/warrantyModel.js";
import Order from "@/lib/models/orderModel.js";
import { optionalAuth, AuthError, authErrorResponse, withAdmin } from "@/lib/auth.js";
import { saveUploadedFile } from "@/lib/upload.js";

const ALLOWED_PURCHASE_SOURCES = ["shop99", "other"];

/* Logged-in users get user_id attached; logged-out users can still register
 * a warranty for a product bought elsewhere. */
export async function POST(request) {
  try {
    const authUser = optionalAuth(request);
    const formData = await request.formData();
    const body = Object.fromEntries(formData.entries());
    const { order_id, name, mobile, email } = body;

    const purchaseSource = ALLOWED_PURCHASE_SOURCES.includes(body.purchase_source)
      ? body.purchase_source
      : "shop99";

    const trimmedName = String(name || "").trim();
    const trimmedMobile = String(mobile || "").trim();
    const trimmedEmail = String(email || "").trim();

    if (!trimmedName || !trimmedMobile || !trimmedEmail) {
      return Response.json({ message: "All fields are required" }, { status: 400 });
    }

    let orderPk = null;
    let orderNumber = null;
    let productName = null;

    if (purchaseSource === "shop99") {
      orderPk = Number(order_id);
      if (!Number.isFinite(orderPk)) {
        return Response.json({ message: "Please select an order" }, { status: 400 });
      }

      const order = await Order.findByPk(orderPk);
      if (!order) {
        return Response.json({ message: "Order not found" }, { status: 404 });
      }

      orderNumber = order.order_id;
      productName = order.product_name;
    }

    const invoiceFilename = await saveUploadedFile(formData.get("invoice"));
    const invoice_url = invoiceFilename ? `uploads/${invoiceFilename}` : null;

    const warranty = await Warranty.create({
      user_id: authUser?.id || null,
      purchase_source: purchaseSource,
      order_pk: orderPk,
      order_number: orderNumber,
      product_name: productName,
      name: trimmedName,
      mobile: trimmedMobile,
      email: trimmedEmail,
      invoice_url,
      status: "pending",
    });

    return Response.json({ success: true, data: warranty }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err);
    return Response.json({ message: err.message }, { status: 500 });
  }
}

/* admin panel */
async function handleGET() {
  try {
    const rows = await Warranty.findAll({ order: [["id", "DESC"]] });
    return Response.json({ data: rows });
  } catch (err) {
    return Response.json({ message: err.message }, { status: 500 });
  }
}

export const GET = withAdmin(handleGET);
