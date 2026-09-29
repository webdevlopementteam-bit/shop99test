import Wishlist from "@/lib/models/Wishlist.js";
import { requireUser, AuthError, authErrorResponse } from "@/lib/auth.js";

export async function DELETE(request, { params }) {
  try {
    const user = requireUser(request);
    const { productId } = await params;

    await Wishlist.destroy({ where: { UserId: user.id, ProductId: productId } });

    return Response.json({ message: "Removed from wishlist" });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    return Response.json({ message: "Error removing" }, { status: 500 });
  }
}
