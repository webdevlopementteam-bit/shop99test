import { withAdmin } from "@/lib/auth.js";
import MostSellingProduct from "@/lib/models/mostSellingProductModel.js";

async function handleDELETE(request, { params }) {
  try {
    const { id } = await params;
    await MostSellingProduct.destroy({ where: { id } });
    return Response.json({ message: "Deleted successfully" });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export const DELETE = withAdmin(handleDELETE);
