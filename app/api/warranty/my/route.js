import Warranty from "@/lib/models/warrantyModel.js";
import { requireUser, AuthError, authErrorResponse } from "@/lib/auth.js";

export async function GET(request) {
  try {
    const user = requireUser(request);
    const rows = await Warranty.findAll({
      where: { user_id: user.id },
      order: [["id", "DESC"]],
    });
    return Response.json({ data: rows });
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err);
    return Response.json({ message: err.message }, { status: 500 });
  }
}
