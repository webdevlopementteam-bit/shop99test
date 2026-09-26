import "@/lib/models/relations.js";
import ProductReview from "@/lib/models/productReviewModel.js";
import Product from "@/lib/models/productModel.js";
import User from "@/lib/models/userModel.js";
import { requireAuth, AuthError, authErrorResponse } from "@/lib/auth.js";
import { parseReviewedAt, resolveImagesForUpdate, parseRating } from "@/lib/reviewHelpers.js";

export async function PUT(request, { params }) {
  try {
    const authUser = requireAuth(request);
    const userId = authUser.id;
    const { id } = await params;

    const formData = await request.formData();
    const body = Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string"));
    const { rating, comment } = body;

    const review = await ProductReview.findByPk(id);
    if (!review) {
      return Response.json({ message: "Review not found" }, { status: 404 });
    }
    if (review.user_id !== userId) {
      return Response.json({ message: "Not allowed to edit this review" }, { status: 403 });
    }

    if (rating !== undefined) {
      const r = parseRating(rating);
      if (r === null) {
        return Response.json({ message: "rating must be an integer from 1 to 5" }, { status: 400 });
      }
      review.rating = r;
    }
    if (comment !== undefined) {
      review.comment = comment;
    }
    const { reviewerName, name } = body;
    const manualName = (reviewerName ?? name)?.toString?.().trim();
    if (manualName) {
      review.reviewer_name = manualName;
    }

    const nextReviewed = parseReviewedAt(body);
    if (nextReviewed != null) {
      review.reviewed_at = nextReviewed;
    }

    const nextImages = await resolveImagesForUpdate(formData, body);
    if (nextImages !== undefined) {
      review.images = nextImages;
    }

    await review.save();

    const full = await ProductReview.findByPk(review.id, {
      include: [
        { model: User, attributes: ["id", "name"] },
        { model: Product, attributes: ["id", "name"] },
      ],
    });

    return Response.json(full);
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    console.error("updateReview:", error);
    return Response.json({ message: error.message || "Error updating review" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const authUser = requireAuth(request);
    const userId = authUser.id;
    const { id } = await params;

    const review = await ProductReview.findByPk(id);
    if (!review) {
      return Response.json({ message: "Review not found" }, { status: 404 });
    }
    if (review.user_id !== userId) {
      return Response.json({ message: "Not allowed to delete this review" }, { status: 403 });
    }

    await review.destroy();
    return Response.json({ message: "Review deleted" });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    console.error("deleteReview:", error);
    return Response.json({ message: error.message || "Error deleting review" }, { status: 500 });
  }
}
