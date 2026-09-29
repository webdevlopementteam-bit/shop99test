import bcrypt from "bcryptjs";
import User from "@/lib/models/userModel.js";
import { signUserToken } from "@/lib/auth.js";

const generateToken = (id, role) => signUserToken({ id, role });

export async function POST(request) {
  try {
    const { name, phone, password } = await request.json();

    const existing = await User.findOne({ where: { phone } });
    if (existing) return Response.json({ message: "User already exists" }, { status: 400 });

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({ name, phone, password: hashed, role: "user" });

    const token = generateToken(user.id, "user");

    return Response.json({ message: "User Registered Successfully", token, role: "user" });
  } catch (err) {
    return Response.json({ message: err.message }, { status: 500 });
  }
}
