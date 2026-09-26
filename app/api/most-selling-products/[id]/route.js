import MostSellingProduct from "@/lib/models/mostSellingProductModel.js";

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await MostSellingProduct.destroy({ where: { id } });
    return Response.json({ message: "Deleted successfully" });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
