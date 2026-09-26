import "@/lib/models/relations.js";
import ProductReview from "@/lib/models/productReviewModel.js";
import Product from "@/lib/models/productModel.js";
import User from "@/lib/models/userModel.js";
import { orderByReviewDate, parseReviewedAt, resolveImagesForCreate, parseRating } from "@/lib/reviewHelpers.js";

const reviewIncludeAdmin = [
  { model: User, attributes: ["id", "name", "phone"] },
  { model: Product, attributes: ["id", "name"] },
];

export async function GET(request) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page"), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit"), 10) || 50));
    const offset = (page - 1) * limit;

    const { rows, count } = await ProductReview.findAndCountAll({
      include: reviewIncludeAdmin,
      order: orderByReviewDate,
      limit,
      offset,
    });

    return Response.json({
      reviews: rows,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit) || 0,
    });
  } catch (error) {
    console.error("adminListReviews:", error);
    return Response.json({ message: error.message || "Error fetching reviews" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const body = Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string"));

    const productIdRaw = body.productId ?? body.product_id;
    const productId = Number(productIdRaw);
    const userIdRaw = body.userId ?? body.user_id;
    const userId = userIdRaw != null && userIdRaw !== "" ? Number(userIdRaw) : null;
    const { rating, comment, reviewerName, name } = body;
    const r = parseRating(rating);
    const manualName = (reviewerName ?? name)?.toString?.().trim() || "";

    if (!Number.isFinite(productId) || productId < 1) {
      return Response.json({ message: "productId or product_id is required" }, { status: 400 });
    }
    if (r === null) {
      return Response.json({ message: "rating must be an integer from 1 to 5" }, { status: 400 });
    }

    const reviewedAt = parseReviewedAt(body) || new Date();
    const imagesVal = await resolveImagesForCreate(formData, body);

    const product = await Product.findByPk(productId);
    if (!product) {
      return Response.json({ message: "Product not found" }, { status: 404 });
    }

    if (userId != null) {
      if (!Number.isInteger(userId) || userId < 1) {
        return Response.json({ message: "Invalid user_id" }, { status: 400 });
      }
      const dbUser = await User.findByPk(userId, { attributes: ["id", "name"] });
      if (!dbUser) {
        return Response.json({ message: "User not found" }, { status: 404 });
      }
      const displayName = manualName || dbUser.name || "User";

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
          { message: "This user already has a review for this product." },
          { status: 409 },
        );
      }

      const full = await ProductReview.findByPk(review.id, { include: reviewIncludeAdmin });
      return Response.json(full, { status: 201 });
    }

    if (!manualName) {
      return Response.json(
        { message: "reviewerName (or name) is required when user_id is not set" },
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
    console.error("adminCreateReview:", error);
    return Response.json({ message: error.message || "Error creating review" }, { status: 500 });
  }
}
