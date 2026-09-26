import UserAddress from "@/lib/models/userAddressModel.js";
import { requireAuth, AuthError, authErrorResponse } from "@/lib/auth.js";
import { pickAddressPayload, hasRequiredAddressFields, clearOtherDefaults } from "@/lib/userAddressHelpers.js";

export async function GET(request) {
  try {
    const user = requireAuth(request);
    const rows = await UserAddress.findAll({
      where: { user_id: user.id },
      order: [
        ["is_default", "DESC"],
        ["updated_at", "DESC"],
      ],
    });
    return Response.json({ addresses: rows });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    return Response.json({ message: "Failed to fetch addresses" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = requireAuth(request);
    const body = await request.json();
    const payload = pickAddressPayload(body);
    if (!hasRequiredAddressFields(payload)) {
      return Response.json({ message: "All address fields are required" }, { status: 400 });
    }

    const existingCount = await UserAddress.count({ where: { user_id: user.id } });
    const shouldDefault = payload.is_default || existingCount === 0;

    const address = await UserAddress.create({
      user_id: user.id,
      ...payload,
      is_default: shouldDefault,
    });

    if (shouldDefault) {
      await clearOtherDefaults(user.id, address.id);
    }

    return Response.json({ success: true, address }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    return Response.json({ message: "Failed to save address" }, { status: 500 });
  }
}
