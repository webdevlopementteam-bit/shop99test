import Footer from "@/lib/models/footerModel.js";
import { saveUploadedFile, deleteUploadedFile } from "@/lib/upload.js";

const safeParse = (data) => {
  try {
    return typeof data === "string" ? JSON.parse(data) : data;
  } catch {
    return [];
  }
};

/* ================= UPDATE ================= */
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const footer = await Footer.findByPk(id);
    if (!footer) return Response.json({ message: "Not found" }, { status: 404 });

    const formData = await request.formData();
    const { columns, contact, socials, description, copyright } = Object.fromEntries(formData.entries());

    let logo = footer.logo;
    const uploadedLogo = await saveUploadedFile(formData.get("logo"));
    if (uploadedLogo) {
      logo = uploadedLogo;
      if (footer.logo) await deleteUploadedFile(footer.logo);
    }

    await footer.update({
      columns: JSON.stringify(columns || safeParse(footer.columns)),
      contact: JSON.stringify(contact || safeParse(footer.contact)),
      socials: JSON.stringify(socials || safeParse(footer.socials)),
      description: description ?? footer.description,
      logo,
      copyright: copyright ?? footer.copyright,
    });

    return Response.json({ success: true, data: footer });
  } catch (err) {
    return Response.json({ message: err.message }, { status: 500 });
  }
}

/* ================= DELETE ================= */
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const footer = await Footer.findByPk(id);
    if (!footer) return Response.json({ message: "Not found" }, { status: 404 });

    if (footer.logo) await deleteUploadedFile(footer.logo);

    await footer.destroy();

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ message: err.message }, { status: 500 });
  }
}
