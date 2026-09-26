import About from "@/lib/models/aboutModel.js";
import { saveUploadedFile, deleteUploadedFile } from "@/lib/upload.js";

const parseJsonField = (value, fallback = []) => {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const buildAboutPayload = (body, oldData, aboutImage, bannerImage) => {
  const payload = {
    section_label: body.section_label !== undefined ? body.section_label : oldData?.section_label ?? null,
    company_title: body.company_title !== undefined ? body.company_title : oldData?.company_title ?? null,
    company_description:
      body.company_description !== undefined ? body.company_description : oldData?.company_description ?? null,
    highlights:
      body.highlights !== undefined
        ? parseJsonField(body.highlights, oldData?.highlights || [])
        : oldData?.highlights || [],
    trust_badges:
      body.trust_badges !== undefined
        ? parseJsonField(body.trust_badges, oldData?.trust_badges || [])
        : oldData?.trust_badges || [],
    choose_us_title: body.choose_us_title !== undefined ? body.choose_us_title : oldData?.choose_us_title ?? null,
    choose_us_subtitle:
      body.choose_us_subtitle !== undefined ? body.choose_us_subtitle : oldData?.choose_us_subtitle ?? null,
    choose_us_cards:
      body.choose_us_cards !== undefined
        ? parseJsonField(body.choose_us_cards, oldData?.choose_us_cards || [])
        : oldData?.choose_us_cards || [],
    testimonials_title:
      body.testimonials_title !== undefined ? body.testimonials_title : oldData?.testimonials_title ?? null,
    testimonials:
      body.testimonials !== undefined
        ? parseJsonField(body.testimonials, oldData?.testimonials || [])
        : oldData?.testimonials || [],
  };

  if (aboutImage) payload.about_image = aboutImage;
  else if (!oldData) payload.about_image = null;

  if (bannerImage) payload.banner_image = bannerImage;
  else if (!oldData) payload.banner_image = null;

  return payload;
};

/* ================= GET ABOUT BY ID ================= */
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const about = await About.findByPk(id);
    if (!about) return Response.json({ message: "About content not found" }, { status: 404 });
    return Response.json(about);
  } catch (error) {
    console.error("GET ABOUT BY ID ERROR:", error);
    return Response.json({ message: "Server Error" }, { status: 500 });
  }
}

/* ================= UPDATE ABOUT ================= */
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const about = await About.findByPk(id);
    if (!about) return Response.json({ message: "About content not found" }, { status: 404 });

    const formData = await request.formData();
    const body = Object.fromEntries(formData.entries());
    const aboutImage = await saveUploadedFile(formData.get("about_image"));
    const bannerImage = await saveUploadedFile(formData.get("banner_image"));

    const payload = buildAboutPayload(body, about, aboutImage, bannerImage);

    if (aboutImage && about.about_image) await deleteUploadedFile(about.about_image);
    if (bannerImage && about.banner_image) await deleteUploadedFile(about.banner_image);

    await about.update(payload);

    return Response.json({ message: "About content updated successfully", data: about });
  } catch (error) {
    console.error("UPDATE ABOUT ERROR:", error);
    return Response.json({ message: "Server Error" }, { status: 500 });
  }
}

/* ================= DELETE ABOUT ================= */
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const about = await About.findByPk(id);
    if (!about) return Response.json({ message: "About content not found" }, { status: 404 });

    if (about.about_image) await deleteUploadedFile(about.about_image);
    if (about.banner_image) await deleteUploadedFile(about.banner_image);

    await about.destroy();

    return Response.json({ message: "About content deleted successfully" });
  } catch (error) {
    console.error("DELETE ABOUT ERROR:", error);
    return Response.json({ message: "Server Error" }, { status: 500 });
  }
}
