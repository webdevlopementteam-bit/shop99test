import "@/lib/models/relations.js";
import ProductReview from "@/lib/models/productReviewModel.js";
import Product from "@/lib/models/productModel.js";
import { requireAuth, AuthError, authErrorResponse } from "@/lib/auth.js";
import { orderByReviewDate } from "@/lib/reviewHelpers.js";

export async function GET(request) {
  try {
    const authUser = requireAuth(request);
    const userId = authUser.id;

    const reviews = await ProductReview.findAll({
      where: { user_id: userId },
      include: [{ model: Product, attributes: ["id", "name", "image", "price"] }],
      order: orderByReviewDate,
    });

    return Response.json(reviews);
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    console.error("getMyReviews:", error);
    return Response.json({ message: error.message || "Error fetching reviews" }, { status: 500 });
  }
}
