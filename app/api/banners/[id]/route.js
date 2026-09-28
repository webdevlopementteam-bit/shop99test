import { revalidatePath } from "next/cache";
import Banner from "@/lib/models/bannerModel.js";
import { saveUploadedFile } from "@/lib/upload.js";

/* ================= UPDATE ================= */
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const formData = await request.formData();
    const { title, subtitle, product_id } = Object.fromEntries(formData.entries());

    const banner = await Banner.findByPk(id);
    if (!banner) return Response.json({ error: "Banner not found" }, { status: 404 });

    const image = (await saveUploadedFile(formData.get("image"))) || banner.image;
    const background = (await saveUploadedFile(formData.get("background"))) || banner.background;

    await Banner.update(
      { title, subtitle, image, background, product_id: product_id || null },
      { where: { id } },
    );
    // Homepage hero is rendered from banners at build/revalidate time.
    revalidatePath("/");

    return Response.json({ message: "Banner Updated" });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Server Error" }, { status: 500 });
  }
}

/* ================= DELETE ================= */
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const banner = await Banner.findByPk(id);
    if (!banner) return Response.json({ error: "Banner not found" }, { status: 404 });

    await banner.destroy();
    // Homepage hero is rendered from banners at build/revalidate time.
    revalidatePath("/");

    return Response.json({ message: "Banner Deleted" });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Server Error" }, { status: 500 });
  }
}
