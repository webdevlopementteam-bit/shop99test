import { revalidatePath } from "next/cache";
import { withAdmin } from "@/lib/auth.js";
import SEO from "@/lib/models/seoModel.js";

async function handlePATCH(request, { params }) {
  try {
    const { id } = await params;
    const seo = await SEO.findByPk(id);

    if (!seo) {
      return Response.json({ message: "SEO not found" }, { status: 404 });
    }

    // is_active is ENUM("active","inactive") — `!seo.is_active` stored `false`,
    // which isn't a valid value, so the toggle never worked.
    seo.is_active = seo.is_active === "active" ? "inactive" : "active";
    await seo.save();

    // Statically generated pages read SEO at render time — refresh them.
    revalidatePath("/", "layout");

    return Response.json({ message: "Status updated", data: seo });
  } catch (err) {
    console.error("TOGGLE SEO ERROR:", err);
    return Response.json({ message: err.message }, { status: 500 });
  }
}

export const PATCH = withAdmin(handlePATCH);
