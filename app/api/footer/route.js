import Footer from "@/lib/models/footerModel.js";
import { saveUploadedFile } from "@/lib/upload.js";

const safeParse = (data) => {
  try {
    return typeof data === "string" ? JSON.parse(data) : data;
  } catch {
    return [];
  }
};

/* ================= GET ================= */
export async function GET() {
  try {
    const footer = await Footer.findOne({ where: { is_active: true }, order: [["id", "DESC"]] });

    if (!footer) return Response.json({ message: "Not found" }, { status: 404 });

    return Response.json({
      ...footer.toJSON(),
      columns: safeParse(footer.columns),
      contact: safeParse(footer.contact),
      socials: safeParse(footer.socials),
    });
  } catch (err) {
    return Response.json({ message: err.message }, { status: 500 });
  }
}

/* ================= CREATE ================= */
export async function POST(request) {
  try {
    const formData = await request.formData();
    const { columns, contact, socials, description, copyright } = Object.fromEntries(formData.entries());

    const logo = await saveUploadedFile(formData.get("logo"));

    await Footer.update({ is_active: false }, { where: {} });

    const footer = await Footer.create({
      columns: JSON.stringify(columns || []),
      contact: JSON.stringify(contact || {}),
      socials: JSON.stringify(socials || {}),
      description,
      logo,
      copyright,
      is_active: true,
    });

    return Response.json({ success: true, data: footer });
  } catch (err) {
    return Response.json({ message: err.message }, { status: 500 });
  }
}
