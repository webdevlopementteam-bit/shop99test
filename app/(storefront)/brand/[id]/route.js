// Old storefront URL /brand/<id> → the shop filtered by that brand (308).
import Brand from "@/lib/models/brandModel.js";

export async function GET(request, { params }) {
  const { id } = await params;
  const brand = /^\d+$/.test(String(id)) ? await Brand.findByPk(id, { attributes: ["id"] }) : null;
  if (!brand) return new Response("Not found", { status: 404 });
  return new Response(null, { status: 308, headers: { Location: `/shop?brand=${brand.id}` } });
}
