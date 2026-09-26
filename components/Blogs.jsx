"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BASE_URL, getBlogsApi } from "@/lib/api";

const toText = (value) => {
  if (value == null) return "";
  return String(value).trim();
};

const getBlogExcerpt = (blog) => {
  const description = toText(blog?.meta_description);
  if (description) return description;
  const content = toText(blog?.content).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (content) return content.slice(0, 160);
  return "Read more about this blog.";
};

const getBlogImage = (image) => {
  const raw = toText(image);
  if (!raw) return "/no-image.png";
  if (/^https?:\/\//i.test(raw)) return raw;
  return `${BASE_URL}/uploads/${raw.replace(/^\/+/, "")}`;
};

function formatBlogDate(value) {
  if (!value) return "";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function blogPath(blog) {
  return `/blog/${blog.slug || blog.id}`;
}

export default function Blogs() {
  const router = useRouter();
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await getBlogsApi();
        if (!cancelled) {
          setBlogs(Array.isArray(rows) ? rows : []);
        }
      } catch {
        if (!cancelled) setBlogs([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleBlogs = useMemo(() => blogs.filter((b) => b && b.id != null), [blogs]);

  return (
    <div className="px-4 sm:px-8 lg:px-24 py-10 sm:py-14">
      <div className="mb-8 sm:mb-10">
        <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">Shop99 Blogs</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-2">Latest updates, guides, and insights from Shop99.</p>
      </div>

      {loading ? (
        <div className="text-gray-600">Loading blogs...</div>
      ) : visibleBlogs.length === 0 ? (
        <div className="text-gray-600">No blogs found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {visibleBlogs.map((blog) => (
            <article
              key={blog.id}
              onClick={() => router.push(blogPath(blog))}
              className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden cursor-pointer transition hover:-translate-y-1 hover:shadow-lg"
            >
              <img
                src={getBlogImage(blog.image)}
                alt={toText(blog.title) || "Blog image"}
                className="w-full h-52 object-cover"
                onError={(e) => {
                  e.currentTarget.src = "/no-image.png";
                }}
              />

              <div className="p-5">
                <p className="text-xs text-orange-600 font-semibold uppercase tracking-wide">Blog</p>
                <h2 className="mt-2 text-lg font-semibold text-gray-900 line-clamp-2">{toText(blog.title) || "Untitled Blog"}</h2>
                <p className="mt-3 text-sm text-gray-600 line-clamp-3">{getBlogExcerpt(blog)}</p>
                <p className="mt-4 text-xs text-gray-500">{formatBlogDate(blog.created_at || blog.createdAt)}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
