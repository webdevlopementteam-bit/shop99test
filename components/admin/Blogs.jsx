"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { toast } from "react-toastify";
import {
  createBlogApi,
  deleteBlogApi,
  getBlogsApi,
  IMAGE_URL,
  updateBlogApi,
} from "@/lib/adminApi";

const JoditEditor = dynamic(() => import("jodit-react"), { ssr: false });

const createInitialForm = () => ({
  id: null,
  image: null,
  title: "",
  slug: "",
  content: "",
  meta_title: "",
  meta_description: "",
  meta_keywords: "",
});

export default function Blogs() {
  const [form, setForm] = useState(createInitialForm);
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const isEditing = useMemo(() => Boolean(form.id), [form.id]);

  const joditConfig = useMemo(
    () => ({
      readonly: false,
      height: 420,
      placeholder: "Write the blog content here...",
      toolbarAdaptive: false,
      buttons: [
        "bold",
        "italic",
        "underline",
        "strikethrough",
        "|",
        "ul",
        "ol",
        "|",
        "paragraph",
        "|",
        "link",
        "image",
        "table",
        "|",
        "align",
        "|",
        "undo",
        "redo",
      ],
    }),
    [],
  );

  const fetchBlogs = async () => {
    try {
      setLoading(true);
      const data = await getBlogsApi();
      setBlogs(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load blogs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlogs();
  }, []);

  const resetForm = () => {
    setForm(createInitialForm());
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0] || null;
    setForm((prev) => ({ ...prev, image: file }));
  };

  const buildPayload = () => {
    const fd = new FormData();
    fd.append("title", form.title.trim());
    fd.append("slug", form.slug.trim());
    fd.append("content", form.content || "");
    fd.append("meta_title", form.meta_title.trim());
    fd.append("meta_description", form.meta_description.trim());
    fd.append("meta_keywords", form.meta_keywords.trim());

    if (form.image instanceof File) {
      fd.append("image", form.image);
    }

    return fd;
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }

    try {
      setSaving(true);
      const payload = buildPayload();

      if (form.id) {
        await updateBlogApi(form.id, payload);
        toast.success("Blog updated");
      } else {
        await createBlogApi(payload);
        toast.success("Blog created");
      }

      resetForm();
      fetchBlogs();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to save blog");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (blog) => {
    setForm({
      id: blog.id,
      image: blog.image || null,
      title: blog.title || "",
      slug: blog.slug || "",
      content: blog.content || "",
      meta_title: blog.meta_title || "",
      meta_description: blog.meta_description || "",
      meta_keywords: blog.meta_keywords || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    const ok = window.confirm("Delete this blog?");
    if (!ok) return;

    try {
      await deleteBlogApi(id);
      toast.success("Blog deleted");
      if (form.id === id) {
        resetForm();
      }
      fetchBlogs();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to delete blog");
    }
  };

  return (
    <div className="text-white space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Blogs Management</h1>
          <p className="text-sm text-gray-400">
            Create and manage blog content for website pages.
          </p>
        </div>
        {isEditing && (
          <span className="bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full text-xs">
            Editing
          </span>
        )}
      </div>

      <div className="bg-[#111827] p-6 rounded-2xl border border-gray-800 shadow-md space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-400">Title *</label>
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              className="w-full mt-1 bg-[#0B0F19] border border-gray-700 p-3 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400">Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="w-full mt-1 bg-[#0B0F19] border border-gray-700 p-2 rounded-lg text-sm"
            />
          </div>
        </div>

        {form.image && (
          <div>
            <img
              src={
                form.image instanceof File
                  ? URL.createObjectURL(form.image)
                  : `${IMAGE_URL}${form.image}`
              }
              alt="Blog preview"
              className="h-24 rounded border border-gray-700"
            />
          </div>
        )}

        <div>
          <label className="text-xs text-gray-400">Content</label>
          <div className="mt-1">
            <JoditEditor
              value={form.content}
              config={joditConfig}
              onBlur={(newContent) =>
                setForm((prev) => ({ ...prev, content: newContent }))
              }
            />
          </div>
        </div>

        <div className="rounded-xl border border-gray-800 bg-[#0B0F19] p-4 space-y-4">
          <h3 className="text-sm font-semibold text-gray-200">SEO</h3>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400">Custom Slug</label>
              <input
                name="slug"
                value={form.slug}
                onChange={handleChange}
                placeholder="e.g. how-to-choose-a-laptop"
                className="w-full mt-1 bg-[#111827] border border-gray-700 p-3 rounded-lg text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">
                Leave blank to auto-generate from the title.
              </p>
            </div>

            <div>
              <label className="text-xs text-gray-400">Meta Title</label>
              <input
                name="meta_title"
                value={form.meta_title}
                onChange={handleChange}
                placeholder="Leave blank to use the blog title"
                className="w-full mt-1 bg-[#111827] border border-gray-700 p-3 rounded-lg text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400">Meta Description</label>
            <textarea
              name="meta_description"
              value={form.meta_description}
              onChange={handleChange}
              rows={3}
              placeholder="Leave blank to auto-generate from the content"
              className="w-full mt-1 bg-[#111827] border border-gray-700 p-3 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400">Meta Keywords</label>
            <input
              name="meta_keywords"
              value={form.meta_keywords}
              onChange={handleChange}
              placeholder="comma, separated, keywords"
              className="w-full mt-1 bg-[#111827] border border-gray-700 p-3 rounded-lg text-sm"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-gradient-to-r from-[#00C2A8] to-[#00A8FF] py-3 rounded-lg font-medium hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Saving..." : isEditing ? "Update Blog" : "Create Blog"}
          </button>
          {isEditing && (
            <button
              onClick={resetForm}
              type="button"
              className="px-6 bg-gray-700 rounded-lg"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className="bg-[#111827] rounded-2xl border border-gray-800 shadow-md overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#0B0F19] text-gray-400">
            <tr>
              <th className="p-3 text-left">Image</th>
              <th className="p-3 text-left">Title</th>
              <th className="p-3 text-left">Slug</th>
              <th className="p-3 text-left">Created</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading && blogs.length === 0 && (
              <tr>
                <td className="p-4 text-center text-gray-500" colSpan={5}>
                  No blogs found
                </td>
              </tr>
            )}
            {blogs.map((item) => (
              <tr key={item.id} className="border-t border-gray-800">
                <td className="p-3">
                  {item.image ? (
                    <img
                      src={`${IMAGE_URL}${item.image}`}
                      alt={item.title}
                      className="h-12 w-16 object-cover rounded border border-gray-700"
                    />
                  ) : (
                    <span className="text-gray-500">-</span>
                  )}
                </td>
                <td className="p-3">{item.title}</td>
                <td className="p-3 text-gray-400 font-mono text-xs">
                  {item.slug || "-"}
                </td>
                <td className="p-3">
                  {item.created_at
                    ? new Date(item.created_at).toLocaleDateString()
                    : "-"}
                </td>
                <td className="p-3 text-center space-x-4">
                  <button
                    onClick={() => handleEdit(item)}
                    className="text-blue-400"
                    type="button"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-red-400"
                    type="button"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
