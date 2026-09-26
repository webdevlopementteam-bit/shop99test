import "@/lib/models/relations.js";
import ProductReview from "@/lib/models/productReviewModel.js";
import Product from "@/lib/models/productModel.js";
import User from "@/lib/models/userModel.js";
import { orderByReviewDate } from "@/lib/reviewHelpers.js";

export async function GET(request, { params }) {
  try {
    const { productId: productIdRaw } = await params;
    const productId = Number(productIdRaw);
    if (!Number.isInteger(productId) || productId < 1) {
      return Response.json({ message: "Invalid product id" }, { status: 400 });
    }

    const product = await Product.findByPk(productId);
    if (!product) {
      return Response.json({ message: "Product not found" }, { status: 404 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page"), 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit"), 10) || 10));
    const offset = (page - 1) * limit;

    const { rows, count } = await ProductReview.findAndCountAll({
      where: { product_id: productId },
      include: [{ model: User, attributes: ["id", "name"] }],
      order: orderByReviewDate,
      limit,
      offset,
    });

    const totalReviews = await ProductReview.count({ where: { product_id: productId } });
    const sumRating = await ProductReview.sum("rating", { where: { product_id: productId } });
    const averageRating =
      totalReviews && sumRating != null ? Number((Number(sumRating) / totalReviews).toFixed(2)) : 0;

    return Response.json({
      summary: { averageRating, totalReviews },
      page,
      limit,
      totalPages: Math.ceil(count / limit) || 0,
      reviews: rows,
    });
  } catch (error) {
    console.error("getReviewsByProduct:", error);
    return Response.json({ message: error.message || "Error fetching reviews" }, { status: 500 });
  }
}
