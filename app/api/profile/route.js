import { Op } from "sequelize";
import User from "@/lib/models/userModel.js";
import { requireUser, AuthError, authErrorResponse } from "@/lib/auth.js";
import { saveUploadedFile } from "@/lib/upload.js";

/* ================= GET PROFILE ================= */
export async function GET(request) {
  try {
    const user = requireUser(request);

    const dbUser = await User.findByPk(user.id, {
      attributes: ["id", "name", "phone", "email", "city", "image", "role"],
    });

    // Valid signature but the account is gone — the session is no longer valid.
    if (!dbUser) {
      return Response.json({ message: "Session expired" }, { status: 401 });
    }

    return Response.json(dbUser);
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    console.log("GET PROFILE ERROR:", error);
    return Response.json({ message: "Server error" }, { status: 500 });
  }
}

/* ================= UPDATE PROFILE ================= */
export async function PUT(request) {
  try {
    const authUser = requireUser(request);
    const formData = await request.formData();
    const { name, email, city } = Object.fromEntries(formData.entries());

    const user = await User.findByPk(authUser.id);

    if (!user) {
      return Response.json({ message: "User not found" }, { status: 404 });
    }

    if (email && email !== user.email) {
      const existingEmail = await User.findOne({
        where: { email, id: { [Op.ne]: user.id } },
      });

      if (existingEmail) {
        return Response.json({ message: "Email already exists" }, { status: 400 });
      }
    }

    user.name = name ?? user.name;
    user.email = email ?? user.email;
    user.city = city ?? user.city;

    const image = await saveUploadedFile(formData.get("image"));
    if (image) {
      user.image = image;
    }

    await user.save();

    return Response.json({
      message: "Profile updated successfully",
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        city: user.city,
        image: user.image,
        role: user.role,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    console.log("UPDATE PROFILE ERROR:", error);
    return Response.json({ message: "Update failed" }, { status: 500 });
  }
}
