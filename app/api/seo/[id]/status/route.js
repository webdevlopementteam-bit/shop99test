import SEO from "@/lib/models/seoModel.js";

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const seo = await SEO.findByPk(id);

    if (!seo) {
      return Response.json({ message: "SEO not found" }, { status: 404 });
    }

    seo.is_active = !seo.is_active;
    await seo.save();

    return Response.json({ message: "Status updated", data: seo });
  } catch (err) {
    console.error("TOGGLE SEO ERROR:", err);
    return Response.json({ message: err.message }, { status: 500 });
  }
}
