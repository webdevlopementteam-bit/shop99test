import { withAdmin } from "@/lib/auth.js";
import "@/lib/models/relations.js";
import Product from "@/lib/models/productModel.js";
import Category from "@/lib/models/categoryModel.js";
import Brand from "@/lib/models/brandModel.js";

async function handleGET() {
  try {
    const productCount = await Product.count();
    const categoryCount = await Category.count();
    const brandCount = await Brand.count();

    return Response.json({
      products: productCount,
      categories: categoryCount,
      orders: 0,
      revenue: 0,
    });
  } catch (err) {
    return Response.json({ message: "Dashboard fetch failed" }, { status: 500 });
  }
}

export const GET = withAdmin(handleGET);
