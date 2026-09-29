import OTP from "@/lib/models/otpModel.js";
import User from "@/lib/models/userModel.js";
import { signUserToken } from "@/lib/auth.js";

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

    // Valid for USER_SESSION_TTL (7 days); the storefront logs out when it ends.
    const token = signUserToken({ id: user.id, phone: user.phone });

    return Response.json({
      success: true,
      message: "OTP verified successfully",
      token,
      // Only what the client uses — never the password hash or other columns.
      user: { id: user.id, name: user.name, phone: user.phone, email: user.email },
      role: user.role || null,
      isNewUser,
    });
  } catch (error) {
    console.error("VERIFY OTP ERROR:", error);
    return Response.json({ success: false, message: "Verification failed" }, { status: 500 });
  }
}
