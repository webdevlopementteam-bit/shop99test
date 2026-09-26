import jwt from "jsonwebtoken";
import OTP from "@/lib/models/otpModel.js";
import User from "@/lib/models/userModel.js";

export async function POST(request) {
  try {
    const { phone, otp, name, email } = await request.json();

    if (!phone || !otp) {
      return Response.json({ message: "Phone & OTP required" }, { status: 400 });
    }

    const record = await OTP.findOne({ where: { phone } });

    if (!record) {
      return Response.json({ message: "OTP not found" }, { status: 400 });
    }

    if (new Date() > record.expires_at) {
      await OTP.destroy({ where: { phone } });
      return Response.json({ message: "OTP expired" }, { status: 400 });
    }

    if (record.otp !== otp) {
      return Response.json({ message: "Invalid OTP" }, { status: 400 });
    }

    await OTP.destroy({ where: { phone } });

    let user = await User.findOne({ where: { phone } });
    const isNewUser = !user;

    if (!user) {
      user = await User.create({ phone, name: name || "User", email: email || null });
    } else {
      if (name) user.name = name;
      if (email) user.email = email;
      await user.save();
    }

    const token = jwt.sign({ id: user.id, phone: user.phone }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    return Response.json({
      success: true,
      message: "OTP verified successfully",
      token,
      user,
      role: user.role || null,
      isNewUser,
    });
  } catch (error) {
    console.error("VERIFY OTP ERROR:", error);
    return Response.json({ success: false, message: "Verification failed" }, { status: 500 });
  }
}
