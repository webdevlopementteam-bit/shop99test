import bcrypt from "bcryptjs";
import Admin from "@/lib/models/adminModel.js";
import { requireAdmin, AuthError, authErrorResponse } from "@/lib/auth.js";

/** PATCH body: newPassword — Bearer admin JWT (no current password) */
export async function PATCH(request) {
  try {
    const user = requireAdmin(request);
    const { newPassword } = await request.json();
    const adminId = user?.id;

    if (!newPassword || String(newPassword).trim() === "") {
      return Response.json({ message: "newPassword is required" }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return Response.json({ message: "New password must be at least 6 characters" }, { status: 400 });
    }

    const admin = await Admin.findByPk(adminId);
    if (!admin) {
      return Response.json({ message: "Admin not found" }, { status: 404 });
    }

    admin.password = await bcrypt.hash(newPassword, 10);
    await admin.save();

    return Response.json({ message: "Password updated successfully" });
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err);
    return Response.json({ message: err.message }, { status: 500 });
  }
}
