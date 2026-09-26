import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Admin from "@/lib/models/adminModel.js";

const generateToken = (id, role) => jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "7d" });

/** POST body: phone, password */
export async function POST(request) {
  try {
    const { phone, password } = await request.json();

    if (!phone || !password) {
      return Response.json({ message: "Phone and password are required" }, { status: 400 });
    }

    const admin = await Admin.findOne({ where: { phone } });
    if (!admin) {
      return Response.json({ message: "Admin not found" }, { status: 400 });
    }

    if (!admin.password) {
      return Response.json({ message: "Password not set for this account" }, { status: 400 });
    }

    const match = await bcrypt.compare(password, admin.password);
    if (!match) {
      return Response.json({ message: "Invalid password" }, { status: 400 });
    }

    const token = generateToken(admin.id, "admin");

    return Response.json({
      message: "Admin login successful",
      token,
      role: "admin",
      admin: {
        id: admin.id,
        name: admin.name,
        phone: admin.phone,
        role: admin.role,
        can_delete_users: admin.can_delete_users,
      },
    });
  } catch (err) {
    return Response.json({ message: err.message }, { status: 500 });
  }
}
