import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "@/lib/models/userModel.js";

const generateToken = (id, role) => jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "7d" });

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
