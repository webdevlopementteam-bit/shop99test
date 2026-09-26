import LatestProduct from "@/lib/models/latestProductModel.js";

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await LatestProduct.destroy({ where: { id } });
    return Response.json({ message: "Deleted successfully" });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
