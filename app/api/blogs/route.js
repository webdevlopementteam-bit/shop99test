import { withAdmin } from "@/lib/auth.js";
import Blogs from "@/lib/models/blogsModel.js";
import { saveUploadedFile } from "@/lib/upload.js";
import { buildMetaDescription } from "@/lib/utils/slugify.js";
import { resolveBlogSlug } from "@/lib/blogHelpers.js";

/* ================= GET ALL ================= */
export async function GET() {
  try {
    const blogs = await Blogs.findAll({ order: [["id", "DESC"]] });
    return Response.json(blogs);
  } catch (error) {
    console.error("GET BLOGS ERROR:", error);
    return Response.json({ message: "Server Error" }, { status: 500 });
  }
}

/* ================= CREATE ================= */
async function handlePOST(request) {
  try {
    const formData = await request.formData();
    const { title, content, slug, meta_title, meta_description, meta_keywords } = Object.fromEntries(
      formData.entries(),
    );

    if (!title) {
      return Response.json({ message: "title is required" }, { status: 400 });
    }

    const slugResult = await resolveBlogSlug({ title, requestedSlug: slug });
    if (slugResult.error) {
      return Response.json({ message: slugResult.error }, { status: 400 });
    }

    const trimmedContent = content != null ? String(content).trim() : "";
    const trimmedMetaTitle = meta_title != null ? String(meta_title).trim() : "";
    const trimmedMetaDescription = meta_description != null ? String(meta_description).trim() : "";

    const image = await saveUploadedFile(formData.get("image"));

    const blog = await Blogs.create({
      image,
      title,
      slug: slugResult.slug,
      content: trimmedContent || null,
      meta_title: trimmedMetaTitle || title,
      meta_description: trimmedMetaDescription || buildMetaDescription(trimmedContent || title),
      meta_keywords: meta_keywords != null ? String(meta_keywords).trim() || null : null,
    });

    return Response.json({ message: "Blog created successfully", data: blog }, { status: 201 });
  } catch (error) {
    console.error("CREATE BLOG ERROR:", error);
    return Response.json({ message: "Server Error" }, { status: 500 });
  }
}

export const POST = withAdmin(handlePOST);
