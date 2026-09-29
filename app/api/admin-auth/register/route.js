import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Admin from "@/lib/models/adminModel.js";
import { requireAdmin, AuthError, authErrorResponse } from "@/lib/auth.js";

const generateToken = (id, role) => jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "7d" });

/** POST body: name?, phone, password */
export async function POST(request) {
  try {
    // Open only for first-time setup (no admin yet). After that, only an
    // existing admin may create another — otherwise anyone could make
    // themselves an admin.
    if ((await Admin.count()) > 0) {
      try {
        requireAdmin(request);
      } catch (err) {
        if (err instanceof AuthError) {
          return Response.json({ message: "Admin registration is closed. Ask an existing admin." }, { status: 403 });
        }
        throw err;
      }
    }

    const { name, phone, password } = await request.json();

    if (!phone || !password) {
      return Response.json({ message: "Phone and password are required" }, { status: 400 });
    }

    const existing = await Admin.findOne({ where: { phone } });
    if (existing) {
      return Response.json({ message: "Admin with this phone already exists" }, { status: 400 });
    }

    const hashed = await bcrypt.hash(password, 10);

    const admin = await Admin.create({ name: name || null, phone, password: hashed, role: "admin" });

    const token = generateToken(admin.id, "admin");

    return Response.json({
      message: "Admin registered successfully",
      token,
      role: "admin",
      admin: { id: admin.id, name: admin.name, phone: admin.phone, role: admin.role },
    });
  } catch (err) {
    return Response.json({ message: err.message }, { status: 500 });
  }
}
