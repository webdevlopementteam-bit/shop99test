import bcrypt from "bcryptjs";
import Admin from "@/lib/models/adminModel.js";
import { requireAdmin, AuthError, authErrorResponse } from "@/lib/auth.js";

/** GET — Bearer admin JWT */
export async function GET(request) {
  try {
    const user = requireAdmin(request);

    const admin = await Admin.findByPk(user.id, {
      attributes: ["id", "name", "phone", "role", "can_delete_users"],
    });

    if (!admin) {
      return Response.json({ message: "Admin not found" }, { status: 404 });
    }

    return Response.json(admin);
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err);
    return Response.json({ message: err.message }, { status: 500 });
  }
}

/**
 * PUT body: name?, phone?, newPassword?
 * — Bearer admin JWT. `newPassword` optional; if sent, sets password (no current password check).
 */
export async function PUT(request) {
  try {
    const user = requireAdmin(request);
    const adminId = user.id;
    const { name, phone, newPassword } = await request.json();

    const admin = await Admin.findByPk(adminId);
    if (!admin) {
      return Response.json({ message: "Admin not found" }, { status: 404 });
    }

    const np = newPassword != null ? String(newPassword) : "";
    const wantsPassword = np.trim() !== "";

    if (wantsPassword) {
      if (np.length < 6) {
        return Response.json({ message: "New password must be at least 6 characters" }, { status: 400 });
      }
      admin.password = await bcrypt.hash(np, 10);
    }

    if (phone !== undefined) {
      const p = String(phone).trim();
      if (!p) {
        return Response.json({ message: "Phone is required" }, { status: 400 });
      }
      if (p !== admin.phone) {
        const taken = await Admin.findOne({ where: { phone: p } });
        if (taken && taken.id !== admin.id) {
          return Response.json({ message: "Phone already in use" }, { status: 400 });
        }
      }
      admin.phone = p;
    }

    if (name !== undefined) {
      const n = name === null || String(name).trim() === "" ? null : String(name).trim();
      admin.name = n;
    }

    await admin.save();

    return Response.json({
      message: wantsPassword ? "Account and password updated." : "Account details saved.",
      id: admin.id,
      name: admin.name,
      phone: admin.phone,
      role: admin.role,
      can_delete_users: admin.can_delete_users,
    });
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err);
    return Response.json({ message: err.message }, { status: 500 });
  }
}
