import { withAdmin } from "@/lib/auth.js";
import Blogs from "@/lib/models/blogsModel.js";
import { saveUploadedFile } from "@/lib/upload.js";
import { buildMetaDescription } from "@/lib/utils/slugify.js";
import { resolveBlogSlug } from "@/lib/blogHelpers.js";

/* ================= GET BY ID OR SLUG ================= */
export async function GET(request, { params }) {
  try {
    const { id: identifier } = await params;
    // Admin panel passes the numeric id; storefront links by slug
    // (SEO-friendly URLs) — this endpoint transparently supports both.
    const lookupWhere = /^\d+$/.test(String(identifier)) ? { id: identifier } : { slug: identifier };

    const blog = await Blogs.findOne({ where: lookupWhere });

    if (!blog) {
      return Response.json({ message: "Blog not found" }, { status: 404 });
    }

    return Response.json(blog);
  } catch (error) {
    console.error("GET BLOG BY ID ERROR:", error);
    return Response.json({ message: "Server Error" }, { status: 500 });
  }
}

/* ================= UPDATE ================= */
async function handlePUT(request, { params }) {
  try {
    const { id } = await params;
    const blog = await Blogs.findByPk(id);

    if (!blog) {
      return Response.json({ message: "Blog not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const { title, content, slug, meta_title, meta_description, meta_keywords } = Object.fromEntries(
      formData.entries(),
    );

    const nextTitle = title !== undefined ? title : blog.title;

    const slugResult = await resolveBlogSlug({
      title: nextTitle,
      requestedSlug: slug,
      currentSlug: blog.slug,
      excludeId: blog.id,
    });
    if (slugResult.error) {
      return Response.json({ message: slugResult.error }, { status: 400 });
    }

    const image = await saveUploadedFile(formData.get("image"));

    const updatedData = {
      title: nextTitle,
      slug: slugResult.slug,
      content: content !== undefined ? String(content).trim() || null : blog.content,
      meta_title: meta_title !== undefined ? String(meta_title).trim() || nextTitle : blog.meta_title,
      meta_description:
        meta_description !== undefined
          ? String(meta_description).trim() ||
            buildMetaDescription((content !== undefined ? content : blog.content) || nextTitle)
          : blog.meta_description,
      meta_keywords: meta_keywords !== undefined ? String(meta_keywords).trim() || null : blog.meta_keywords,
      image: image || blog.image,
    };

    await blog.update(updatedData);

    return Response.json({ message: "Blog updated successfully", data: blog });
  } catch (error) {
    console.error("UPDATE BLOG ERROR:", error);
    return Response.json({ message: "Server Error" }, { status: 500 });
  }
}

/* ================= DELETE ================= */
async function handleDELETE(request, { params }) {
  try {
    const { id } = await params;
    const blog = await Blogs.findByPk(id);

    if (!blog) {
      return Response.json({ message: "Blog not found" }, { status: 404 });
    }

    await blog.destroy();

    return Response.json({ message: "Blog deleted successfully" });
  } catch (error) {
    console.error("DELETE BLOG ERROR:", error);
    return Response.json({ message: "Server Error" }, { status: 500 });
  }
}

export const PUT = withAdmin(handlePUT);

export const DELETE = withAdmin(handleDELETE);
