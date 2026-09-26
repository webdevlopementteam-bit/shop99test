import NewsletterSubscription from "@/lib/models/newsletterSubscriptionModel.js";
import User from "@/lib/models/userModel.js";
import { optionalAuth, AuthError, authErrorResponse } from "@/lib/auth.js";

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export async function POST(request) {
  try {
    const user = optionalAuth(request);
    const body = await request.json();
    const email = String(body?.email || "").trim().toLowerCase();
    const bodyName = String(body?.name || "").trim();

    if (!email) {
      return Response.json({ message: "Email is required" }, { status: 400 });
    }

    if (!isValidEmail(email)) {
      return Response.json({ message: "Invalid email" }, { status: 400 });
    }

    let resolvedName = bodyName || null;

    if (!resolvedName && user?.id) {
      const dbUser = await User.findByPk(user.id, { attributes: ["name"] });
      resolvedName = String(dbUser?.name || "").trim() || null;
    }

    const [record, created] = await NewsletterSubscription.findOrCreate({
      where: { email },
      defaults: { email, name: resolvedName },
    });

    if (!created) {
      if (!record.name && resolvedName) {
        await record.update({ name: resolvedName });
      }
      return Response.json({ success: true, message: "Email already subscribed", data: record });
    }

    return Response.json({ success: true, message: "Subscribed successfully", data: record }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err);
    console.error(err);
    return Response.json({ message: "Subscription failed" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const data = await NewsletterSubscription.findAll({ order: [["id", "DESC"]] });
    return Response.json(data);
  } catch (err) {
    console.error(err);
    return Response.json({ message: "Failed to fetch subscriptions" }, { status: 500 });
  }
}
