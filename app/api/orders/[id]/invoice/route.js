import fs from "fs";
import Order from "@/lib/models/orderModel.js";
import { createInvoicePDF } from "@/lib/services/pdfService.js";
import { ensureInvoicePdf } from "@/lib/orderHelpers.js";
import { requireOrderAccess } from "@/lib/orderAccess.js";
import { AuthError, authErrorResponse } from "@/lib/auth.js";

/* ================= GENERATE INVOICE ================= */
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const orderInstance = await Order.findByPk(id);

    if (!orderInstance) {
      return Response.json({ message: "Order not found" }, { status: 404 });
    }
    await requireOrderAccess(request, orderInstance);

    const order = orderInstance.get({ plain: true });

    const url = await createInvoicePDF(order);

    await orderInstance.update({ invoice_url: url });
    await orderInstance.reload();

    return Response.json({ success: true, url, invoice_url: url, data: orderInstance });
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err);
    console.error("INVOICE ERROR:", err);
    return Response.json({ message: err.message }, { status: 500 });
  }
}

/* ================= DOWNLOAD INVOICE ================= */
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const orderInstance = await Order.findByPk(id);

    if (!orderInstance) {
      return Response.json({ message: "Order not found" }, { status: 404 });
    }
    await requireOrderAccess(request, orderInstance);

    const filePath = await ensureInvoicePdf(orderInstance);

    if (!fs.existsSync(filePath)) {
      return Response.json({ message: "File not found" }, { status: 404 });
    }

    const buffer = await fs.promises.readFile(filePath);

    return new Response(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoice-${orderInstance.order_id}.pdf"`,
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
        "Surrogate-Control": "no-store",
      },
    });
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err);
    console.error("INVOICE ERROR:", err);
    return Response.json({ message: err.message }, { status: 500 });
  }
}
