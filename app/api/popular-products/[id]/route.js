import PopularProduct from "@/lib/models/popularProductModel.js";

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await PopularProduct.destroy({ where: { id } });
    return Response.json({ message: "Deleted successfully" });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
