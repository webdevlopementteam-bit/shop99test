import BlogDetail from "@/components/BlogDetail";
import { getBlogByIdApi } from "@/lib/api";

const toText = (value) => (value == null ? "" : String(value).trim());

const getBlogImage = (image) => {
  const raw = toText(image);
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  return `${process.env.FRONTEND_URL || "https://www.shop99.co.in"}/uploads/${raw.replace(/^\/+/, "")}`;
};

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
  const image = getBlogImage(blog.image);
  const canonicalUrl = `https://www.shop99.co.in/blog/${blog.slug || blog.id}`;

  return {
    title: metaTitle,
    description: metaDescription || undefined,
    keywords: blog.meta_keywords || undefined,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: metaTitle,
      description: metaDescription || undefined,
      images: image ? [image] : undefined,
    },
  };
}

export default async function Page({ params }) {
  const { id } = await params;
  const blog = await fetchBlog(id);

  return <BlogDetail id={id} initialBlog={blog} />;
}
