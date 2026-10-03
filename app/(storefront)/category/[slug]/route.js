// Old storefront URL /category/<slug> (still indexed by search engines) →
// the shop page for that category. 308 = permanent, so rankings carry over.
import Category from "@/lib/models/categoryModel.js";

export async function GET(request, { params }) {
  const { slug } = await params;
  const category = await Category.findOne({ where: { slug }, attributes: ["name"] });
  if (!category) return new Response("Not found", { status: 404 });
  return new Response(null, {
    status: 308,
    headers: { Location: `/shop?category=${encodeURIComponent(category.name)}` },
  });
}
