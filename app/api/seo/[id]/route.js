import { Op } from "sequelize";
import SEO from "@/lib/models/seoModel.js";
import { saveUploadedFile, deleteUploadedFile } from "@/lib/upload.js";

/* ================= GET BY PAGE (:id here is actually the page_name, per original :page route) ================= */
export async function GET(request, { params }) {
  try {
    const { id: page } = await params;

    const seo = await SEO.findOne({ where: { page_name: page, is_active: true } });

    if (!seo) {
      return Response.json({ message: "SEO not found" }, { status: 404 });
    }

    return Response.json(seo);
  } catch (err) {
    console.error("GET SEO BY PAGE ERROR:", err);
    return Response.json({ message: err.message }, { status: 500 });
  }
}

/* ================= UPDATE ================= */
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const formData = await request.formData();
    const body = Object.fromEntries(formData.entries());
    const { page_name } = body;

    const seo = await SEO.findByPk(id);

    if (!seo) {
      return Response.json({ success: false, message: "SEO not found" }, { status: 404 });
    }

    if (page_name) {
      const existing = await SEO.findOne({ where: { page_name, id: { [Op.ne]: id } } });

      if (existing) {
        return Response.json({ success: false, message: "page_name already exists" }, { status: 400 });
      }
    }

    const updatedData = { ...body };

    if (body.is_active !== undefined) {
      updatedData.is_active = body.is_active === "inactive" ? "inactive" : "active";
    }

    const og_image = await saveUploadedFile(formData.get("og_image"));
    if (og_image) {
      updatedData.og_image = og_image;

      if (seo.og_image) {
        await deleteUploadedFile(seo.og_image);
      }
    }

    await seo.update(updatedData);

    return Response.json({ success: true, message: "SEO updated successfully", data: seo });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") {
      return Response.json({ success: false, message: "page_name must be unique" }, { status: 400 });
    }
    return Response.json({ success: false, message: error.message }, { status: 500 });
  }
}

/* ================= DELETE ================= */
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    const seo = await SEO.findByPk(id);

    if (!seo) {
      return Response.json({ message: "SEO not found" }, { status: 404 });
    }

    await seo.destroy();

    return Response.json({ message: "SEO deleted successfully" });
  } catch (error) {
    console.error("DELETE SEO ERROR:", error);
    return Response.json({ message: "Server Error" }, { status: 500 });
  }
}
