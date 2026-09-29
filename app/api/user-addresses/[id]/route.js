import UserAddress from "@/lib/models/userAddressModel.js";
import { requireUser, AuthError, authErrorResponse } from "@/lib/auth.js";
import { pickAddressPayload, hasRequiredAddressFields, clearOtherDefaults } from "@/lib/userAddressHelpers.js";

export async function PUT(request, { params }) {
  try {
    const user = requireUser(request);
    const { id } = await params;

    const address = await UserAddress.findOne({ where: { id, user_id: user.id } });
    if (!address) {
      return Response.json({ message: "Address not found" }, { status: 404 });
    }

    const body = await request.json();
    const payload = pickAddressPayload(body);
    if (!hasRequiredAddressFields(payload)) {
      return Response.json({ message: "All address fields are required" }, { status: 400 });
    }

    await address.update(payload);
    if (payload.is_default) {
      await clearOtherDefaults(user.id, address.id);
    }

    return Response.json({ success: true, address });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    return Response.json({ message: "Failed to update address" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = requireUser(request);
    const { id } = await params;

    const address = await UserAddress.findOne({ where: { id, user_id: user.id } });
    if (!address) {
      return Response.json({ message: "Address not found" }, { status: 404 });
    }

    const wasDefault = Boolean(address.is_default);
    await address.destroy();

    if (wasDefault) {
      const latest = await UserAddress.findOne({
        where: { user_id: user.id },
        order: [["updated_at", "DESC"]],
      });
      if (latest) await latest.update({ is_default: true });
    }

    return Response.json({ success: true, message: "Address deleted" });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    return Response.json({ message: "Failed to delete address" }, { status: 500 });
  }
}
