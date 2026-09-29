import { withAdmin } from "@/lib/auth.js";
import PopularProduct from "@/lib/models/popularProductModel.js";

async function handleDELETE(request, { params }) {
  try {
    const { id } = await params;
    await PopularProduct.destroy({ where: { id } });
    return Response.json({ message: "Deleted successfully" });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export const DELETE = withAdmin(handleDELETE);
