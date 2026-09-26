import "@/lib/models/relations.js";
import ProductReview from "@/lib/models/productReviewModel.js";
import Product from "@/lib/models/productModel.js";
import User from "@/lib/models/userModel.js";
import { optionalAuth, AuthError, authErrorResponse } from "@/lib/auth.js";
import { parseReviewedAt, resolveImagesForCreate, parseRating } from "@/lib/reviewHelpers.js";

export async function POST(request) {
  try {
    const authUser = optionalAuth(request);
    const formData = await request.formData();
    const body = Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string"));

    const productIdRaw = body.productId ?? body.product_id;
    const productId = Number(productIdRaw);
    const { rating, comment, reviewerName, name } = body;
    const r = parseRating(rating);
    const manualName = (reviewerName ?? name)?.toString?.().trim() || "";

    if (!Number.isFinite(productId) || productId < 1) {
      return Response.json({ message: "productId is required" }, { status: 400 });
    }
    if (r === null) {
      return Response.json({ message: "rating must be an integer from 1 to 5" }, { status: 400 });
    }

    const product = await Product.findByPk(productId);
    if (!product) {
      return Response.json({ message: "Product not found" }, { status: 404 });
    }

    const reviewedAt = parseReviewedAt(body) || new Date();
    const imagesVal = await resolveImagesForCreate(formData, body);

    const loggedIn = authUser && authUser.id != null;

    if (loggedIn) {
      const userId = authUser.id;
      const dbUser = await User.findByPk(userId, { attributes: ["id", "name"] });
      const displayName = manualName || dbUser?.name || "User";

      const [review, created] = await ProductReview.findOrCreate({
        where: { user_id: userId, product_id: productId },
        defaults: {
          rating: r,
          comment: comment ?? null,
          reviewer_name: displayName,
          reviewed_at: reviewedAt,
          images: imagesVal,
        },
      });

      if (!created) {
        return Response.json(
          { message: "You already reviewed this product. Use update to change it." },
          { status: 409 },
        );
      }

      const full = await ProductReview.findByPk(review.id, {
        include: [
          { model: User, attributes: ["id", "name"] },
          { model: Product, attributes: ["id", "name"] },
        ],
      });

      return Response.json(full, { status: 201 });
    }

    if (!manualName) {
      return Response.json(
        { message: "reviewerName (or name) is required when not logged in" },
        { status: 400 },
      );
    }

    const review = await ProductReview.create({
      product_id: productId,
      user_id: null,
      rating: r,
      comment: comment ?? null,
      reviewer_name: manualName,
      reviewed_at: reviewedAt,
      images: imagesVal,
    });

    const full = await ProductReview.findByPk(review.id, {
      include: [{ model: Product, attributes: ["id", "name"] }],
    });

    return Response.json(full, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    console.error("createReview:", error);
    return Response.json({ message: error.message || "Error creating review" }, { status: 500 });
  }
}
