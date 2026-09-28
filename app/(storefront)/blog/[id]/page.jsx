import BlogDetail from "@/components/BlogDetail";
import { getBlogByIdApi } from "@/lib/api";
import { SITE_URL, uploadUrl, findSeoEntry, applySeoEntry } from "@/lib/seo";

const toText = (value) => (value == null ? "" : String(value).trim());

async function fetchBlog(id) {
  try {
    return await getBlogByIdApi(id);
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const blog = await fetchBlog(id);

  if (!blog) return {};

  const title = toText(blog.title) || "Untitled Blog";
  const metaTitle = toText(blog.meta_title) || title;
  const metaDescription = toText(blog.meta_description);
  const image = uploadUrl(blog.image);
  const canonicalUrl = `${SITE_URL}/blog/${blog.slug || blog.id}`;
  const seo = await findSeoEntry(null, `/blog/${blog.slug || blog.id}`);

  return applySeoEntry(
    {
      title: metaTitle,
      description: metaDescription || undefined,
      keywords: blog.meta_keywords || undefined,
      alternates: { canonical: canonicalUrl },
      openGraph: {
        title: metaTitle,
        description: metaDescription || undefined,
        url: canonicalUrl,
        images: image ? [image] : undefined,
      },
    },
    seo,
  );
}

export default async function Page({ params }) {
  const { id } = await params;
  const blog = await fetchBlog(id);

  return <BlogDetail id={id} initialBlog={blog} />;
}
