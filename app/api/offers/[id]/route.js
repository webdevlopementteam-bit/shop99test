import { withAdmin } from "@/lib/auth.js";
import Offer from "@/lib/models/offerModel.js";

/* ================= UPDATE ================= */
async function handlePUT(request, { params }) {
  try {
    const { id } = await params;
    let data = await request.json();
    data = { ...data };

    if (data.apply_on === "product") data.category_id = null;
    if (data.apply_on === "category") data.product_id = null;
    if (data.apply_on === "all") {
      data.product_id = null;
      data.category_id = null;
    }

    const offer = await Offer.findByPk(id);
    if (!offer) return Response.json({ message: "Offer not found" }, { status: 404 });

    await offer.update(data);

    return Response.json({ message: "Offer Updated" });
  } catch (err) {
    return Response.json({ message: err.message }, { status: 500 });
  }
}

/* ================= DELETE ================= */
async function handleDELETE(request, { params }) {
  try {
    const { id } = await params;
    const offer = await Offer.findByPk(id);
    if (!offer) return Response.json({ message: "Offer not found" }, { status: 404 });

    await offer.destroy();

    return Response.json({ message: "Offer deleted successfully" });
  } catch (error) {
    console.error("DELETE OFFER ERROR:", error);
    return Response.json({ message: "Server Error" }, { status: 500 });
  }
}

export const PUT = withAdmin(handlePUT);

export const DELETE = withAdmin(handleDELETE);
