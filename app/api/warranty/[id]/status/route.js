import { withAdmin } from "@/lib/auth.js";
import Warranty from "@/lib/models/warrantyModel.js";

const ALLOWED_STATUSES = ["pending", "approved", "rejected", "completed"];

async function handlePUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const status = String(body?.status || "").trim().toLowerCase();

    if (!ALLOWED_STATUSES.includes(status)) {
      return Response.json({ message: "Invalid status" }, { status: 400 });
    }

    const warranty = await Warranty.findByPk(id);
    if (!warranty) {
      return Response.json({ message: "Warranty request not found" }, { status: 404 });
    }

    await warranty.update({ status });

    return Response.json({ success: true, data: warranty });
  } catch (err) {
    return Response.json({ message: err.message }, { status: 500 });
  }
}

export const PUT = withAdmin(handlePUT);
