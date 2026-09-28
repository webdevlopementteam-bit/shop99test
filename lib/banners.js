// Server-only: homepage hero banners, read straight from the DB so the hero
// is in the initial HTML (the page is statically generated — there's no
// server to self-fetch /api/banners from at build time). Same query as
// GET /api/banners.
import "@/lib/models/relations.js";
import Banner from "@/lib/models/bannerModel.js";
import Product from "@/lib/models/productModel.js";

export async function getBanners() {
  const rows = await Banner.findAll({
    include: [{ model: Product, as: "product", attributes: ["id", "name", "slug"] }],
    order: [["id", "DESC"]],
  });
  // Plain JSON (dates → strings) so it can be passed to a Client Component.
  return JSON.parse(JSON.stringify(rows));
}
