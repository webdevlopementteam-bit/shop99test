import { withAdmin } from "@/lib/auth.js";
import User from "@/lib/models/userModel.js";

async function handleGET() {
  try {
    const users = await User.findAll({ order: [["createdAt", "DESC"]] });
    return Response.json(users);
  } catch (err) {
    console.error("GET USERS ERROR:", err);
    return Response.json({ message: "Failed to fetch users" }, { status: 500 });
  }
}

export const GET = withAdmin(handleGET);
