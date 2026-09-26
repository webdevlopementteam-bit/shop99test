import fs from "fs";
import Order from "@/lib/models/orderModel.js";
import { createLabelPDF } from "@/lib/services/pdfService.js";
import { ensureLabelPdf } from "@/lib/orderHelpers.js";

/* ================= GENERATE LABEL ================= */
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const orderInstance = await Order.findByPk(id);

    if (!orderInstance) {
      return Response.json({ message: "Order not found" }, { status: 404 });
    }

    const order = orderInstance.get({ plain: true });

    const url = await createLabelPDF(order);

    await orderInstance.update({ shipping_label_url: url });
    await orderInstance.reload();

    return Response.json({ success: true, url, shipping_label_url: url, data: orderInstance });
  } catch (err) {
    console.error("LABEL ERROR:", err);
    return Response.json({ message: err.message }, { status: 500 });
  }
}

/* ================= DOWNLOAD LABEL ================= */
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const orderInstance = await Order.findByPk(id);

    if (!orderInstance) {
      return Response.json({ message: "Order not found" }, { status: 404 });
    }

    const filePath = await ensureLabelPdf(orderInstance);

    console.log("LABEL PATH:", filePath);

    if (!fs.existsSync(filePath)) {
      return Response.json({ message: "Label file not found" }, { status: 404 });
    }

    const buffer = await fs.promises.readFile(filePath);

    return new Response(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="label-${orderInstance.order_id}.pdf"`,
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
        "Surrogate-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("LABEL ERROR:", err);
    return Response.json({ message: err.message }, { status: 500 });
  }
}
