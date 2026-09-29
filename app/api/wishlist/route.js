import "@/lib/models/relations.js";
import Wishlist from "@/lib/models/Wishlist.js";
import Product from "@/lib/models/productModel.js";
import { requireUser, AuthError, authErrorResponse } from "@/lib/auth.js";

export async function POST(request) {
  try {
    const user = requireUser(request);
    const { productId } = await request.json();

    await Wishlist.create({ UserId: user.id, ProductId: productId });

    return Response.json({ message: "Added to wishlist" });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    return Response.json({ message: "Error adding to wishlist" }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const user = requireUser(request);

    const items = await Wishlist.findAll({
      where: { UserId: user.id },
      include: [{ model: Product }],
    });

    return Response.json(items);
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    console.error("GET WISHLIST ERROR:", error);
    return Response.json({ message: error.message }, { status: 500 });
  }
}
