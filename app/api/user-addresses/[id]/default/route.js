import UserAddress from "@/lib/models/userAddressModel.js";
import { requireAuth, AuthError, authErrorResponse } from "@/lib/auth.js";
import { clearOtherDefaults } from "@/lib/userAddressHelpers.js";

export async function PATCH(request, { params }) {
  try {
    const user = requireAuth(request);
    const { id } = await params;

    const address = await UserAddress.findOne({ where: { id, user_id: user.id } });
    if (!address) {
      return Response.json({ message: "Address not found" }, { status: 404 });
    }

    await clearOtherDefaults(user.id, address.id);
    await address.update({ is_default: true });

    return Response.json({ success: true, address });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    return Response.json({ message: "Failed to set default address" }, { status: 500 });
  }
}
