import { withAdmin } from "@/lib/auth.js";
import Footer from "@/lib/models/footerModel.js";
import { saveUploadedFile } from "@/lib/upload.js";
import { getActiveFooter } from "@/lib/storefrontLists.js";

/* ================= GET ================= */
export async function GET() {
  try {
    const footer = await getActiveFooter();

    if (!footer) return Response.json({ message: "Not found" }, { status: 404 });

    return Response.json(footer);
  } catch (err) {
    return Response.json({ message: err.message }, { status: 500 });
  }
}

/* ================= CREATE ================= */
async function handlePOST(request) {
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

export const POST = withAdmin(handlePOST);
