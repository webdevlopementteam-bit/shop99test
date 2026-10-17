import { withAdmin } from "@/lib/auth.js";
import { listCuratedProducts } from "@/lib/storefrontLists.js";
import LatestProduct from "@/lib/models/latestProductModel.js";

/* ================= ADD ================= */
async function handlePOST(request) {
  try {
    const { productIds } = await request.json();

    if (!productIds || !productIds.length) {
      return Response.json({ message: "No products selected" }, { status: 400 });
    }

    const created = [];

    for (const id of productIds) {
      const exists = await LatestProduct.findOne({ where: { product_id: id } });

      if (!exists) {
        const item = await LatestProduct.create({ product_id: id });
        created.push(item);
      }
    }

    return Response.json({ message: "Latest products added", data: created });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

/* ================= GET ================= */
export async function GET() {
  try {
    return Response.json(await listCuratedProducts(LatestProduct));
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export const POST = withAdmin(handlePOST);
