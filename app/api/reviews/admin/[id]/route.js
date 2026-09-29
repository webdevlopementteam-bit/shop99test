import { withAdmin } from "@/lib/auth.js";
import "@/lib/models/relations.js";
import ProductReview from "@/lib/models/productReviewModel.js";
import Product from "@/lib/models/productModel.js";
import User from "@/lib/models/userModel.js";
import { parseReviewedAt, resolveImagesForUpdate, parseRating } from "@/lib/reviewHelpers.js";

const reviewIncludeAdmin = [
  { model: User, attributes: ["id", "name", "phone"] },
  { model: Product, attributes: ["id", "name"] },
];

async function handlePUT(request, { params }) {
  try {
    const { id } = await params;
    const formData = await request.formData();
    const body = Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string"));
    const { rating, comment, reviewerName, name } = body;

    const review = await ProductReview.findByPk(id);
    if (!review) {
      return Response.json({ message: "Review not found" }, { status: 404 });
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

    const full = await ProductReview.findByPk(review.id, { include: reviewIncludeAdmin });

    return Response.json(full);
  } catch (error) {
    console.error("adminUpdateReview:", error);
    return Response.json({ message: error.message || "Error updating review" }, { status: 500 });
  }
}

async function handleDELETE(request, { params }) {
  try {
    const { id } = await params;
    const review = await ProductReview.findByPk(id);
    if (!review) {
      return Response.json({ message: "Review not found" }, { status: 404 });
    }
    await review.destroy();
    return Response.json({ message: "Review deleted" });
  } catch (error) {
    console.error("adminDeleteReview:", error);
    return Response.json({ message: error.message || "Error deleting review" }, { status: 500 });
  }
}

export const PUT = withAdmin(handlePUT);

export const DELETE = withAdmin(handleDELETE);
