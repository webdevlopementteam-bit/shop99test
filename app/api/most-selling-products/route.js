import { withAdmin } from "@/lib/auth.js";
import { listCuratedProducts } from "@/lib/storefrontLists.js";
import MostSellingProduct from "@/lib/models/mostSellingProductModel.js";

/* ================= ADD ================= */
async function handlePOST(request) {
  try {
    const { productIds } = await request.json();

    if (!productIds || !productIds.length) {
      return Response.json({ message: "No products selected" }, { status: 400 });
    }

    const created = [];

    for (const id of productIds) {
      const exists = await MostSellingProduct.findOne({ where: { product_id: id } });

      if (!exists) {
        const item = await MostSellingProduct.create({ product_id: id });
        created.push(item);
      }
    }

    return Response.json({ message: "Most selling products added", data: created });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

/* ================= GET ================= */
export async function GET() {
  try {
    return Response.json(await listCuratedProducts(MostSellingProduct));
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export const POST = withAdmin(handlePOST);
