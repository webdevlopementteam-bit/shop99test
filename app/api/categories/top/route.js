import Category from "@/lib/models/categoryModel.js";

export async function GET() {
  try {
    const data = await Category.findAll({
      where: { is_top_category: true },
      order: [["id", "DESC"]],
    });

    return Response.json(data);
  } catch (err) {
    return Response.json(err.message, { status: 500 });
  }
}
