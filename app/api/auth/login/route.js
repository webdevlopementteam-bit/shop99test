import bcrypt from "bcryptjs";
import User from "@/lib/models/userModel.js";
import { signUserToken } from "@/lib/auth.js";

const generateToken = (id, role) => signUserToken({ id, role });

export async function POST(request) {
  try {
    const { phone, password } = await request.json();

    const user = await User.findOne({ where: { phone } });
    if (!user) return Response.json({ message: "User not found" }, { status: 400 });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return Response.json({ message: "Invalid password" }, { status: 400 });

    const token = generateToken(user.id, "user");

    return Response.json({ message: "Login Successful", token, role: "user" });
  } catch (err) {
    return Response.json({ message: err.message }, { status: 500 });
  }
}
