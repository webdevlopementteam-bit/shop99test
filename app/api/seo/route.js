import SEO from "@/lib/models/seoModel.js";
import { saveUploadedFile } from "@/lib/upload.js";

/* ================= GET ALL SEO ================= */
export async function GET() {
  try {
    const seoList = await SEO.findAll({ order: [["id", "DESC"]] });
    return Response.json(seoList);
  } catch (err) {
    console.error("GET SEO ERROR:", err);
    return Response.json({ message: err.message }, { status: 500 });
  }
}

/* ================= CREATE ================= */
export async function POST(request) {
  try {
    const formData = await request.formData();
    const body = Object.fromEntries(formData.entries());
    const { page_name } = body;

    const existing = await SEO.findOne({ where: { page_name } });

    if (existing) {
      return Response.json(
        { success: false, message: "SEO already exists for this page_name" },
        { status: 400 },
      );
    }

    const is_active = body.is_active === "inactive" ? "inactive" : "active";
    const og_image = await saveUploadedFile(formData.get("og_image"));

    const data = await SEO.create({ ...body, is_active, og_image });

    return Response.json(
      { success: true, message: "SEO created successfully", data },
      { status: 201 },
    );
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") {
      return Response.json({ success: false, message: "page_name must be unique" }, { status: 400 });
    }
    return Response.json({ success: false, message: error.message }, { status: 500 });
  }
}
