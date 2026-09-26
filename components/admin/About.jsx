"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  createAboutApi,
  deleteAboutApi,
  getAboutListApi,
  IMAGE_URL,
  updateAboutApi,
} from "@/lib/adminApi";

const EMPTY_CARD = { title: "", description: "" };
const EMPTY_TESTIMONIAL = { name: "", role: "", message: "" };

const createInitialForm = () => ({
  id: null,
  section_label: "",
  company_title: "",
  company_description: "",
  about_image: null,
  banner_image: null,
  highlightsText: "",
  trustBadgesText: "",
  choose_us_title: "",
  choose_us_subtitle: "",
  choose_us_cards: [{ ...EMPTY_CARD }],
  testimonials_title: "",
  testimonials: [{ ...EMPTY_TESTIMONIAL }],
});

const toTextLines = (value) =>
  Array.isArray(value) ? value.filter(Boolean).map(String).join("\n") : "";

const normalizeCards = (value) => {
  if (!Array.isArray(value) || value.length === 0) return [{ ...EMPTY_CARD }];
  const rows = value
    .map((item) => ({
      title: String(item?.title ?? "").trim(),
      description: String(item?.description ?? item?.desc ?? "").trim(),
    }))
    .filter((item) => item.title || item.description);
  return rows.length > 0 ? rows : [{ ...EMPTY_CARD }];
};

const normalizeTestimonials = (value) => {
  if (!Array.isArray(value) || value.length === 0) {
    return [{ ...EMPTY_TESTIMONIAL }];
  }
  const rows = value
    .map((item) => ({
      name: String(item?.name ?? "").trim(),
      role: String(item?.role ?? item?.designation ?? "").trim(),
      message: String(item?.message ?? item?.comment ?? "").trim(),
    }))
    .filter((item) => item.name || item.role || item.message);
  return rows.length > 0 ? rows : [{ ...EMPTY_TESTIMONIAL }];
};

export default function AboutAdminPage() {
  const [form, setForm] = useState(createInitialForm);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState(null);

  const isEditing = useMemo(() => Boolean(form.id), [form.id]);

  const fetchList = async () => {
    try {
      setLoading(true);
      const data = await getAboutListApi();
      setList(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load About content");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const resetForm = () => setForm(createInitialForm());

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (field, file) => {
    setForm((prev) => ({ ...prev, [field]: file || null }));
  };

  const updateCard = (idx, key, value) => {
    setForm((prev) => ({
      ...prev,
      choose_us_cards: prev.choose_us_cards.map((row, i) =>
        i === idx ? { ...row, [key]: value } : row
      ),
    }));
  };

  const addCard = () => {
    setForm((prev) => ({
      ...prev,
      choose_us_cards: [...prev.choose_us_cards, { ...EMPTY_CARD }],
    }));
  };

  const removeCard = (idx) => {
    setForm((prev) => {
      const next = prev.choose_us_cards.filter((_, i) => i !== idx);
      return {
        ...prev,
        choose_us_cards: next.length ? next : [{ ...EMPTY_CARD }],
      };
    });
  };

  const updateTestimonial = (idx, key, value) => {
    setForm((prev) => ({
      ...prev,
      testimonials: prev.testimonials.map((row, i) =>
        i === idx ? { ...row, [key]: value } : row
      ),
    }));
  };

  const addTestimonial = () => {
    setForm((prev) => ({
      ...prev,
      testimonials: [...prev.testimonials, { ...EMPTY_TESTIMONIAL }],
    }));
  };

  const removeTestimonial = (idx) => {
    setForm((prev) => {
      const next = prev.testimonials.filter((_, i) => i !== idx);
      return {
        ...prev,
        testimonials: next.length ? next : [{ ...EMPTY_TESTIMONIAL }],
      };
    });
  };

  const buildPayload = () => {
    const highlights = form.highlightsText
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);

    const trustBadges = form.trustBadgesText
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);

    const chooseUsCards = form.choose_us_cards
      .map((item) => ({
        title: String(item.title || "").trim(),
        description: String(item.description || "").trim(),
      }))
      .filter((item) => item.title || item.description);

    const testimonials = form.testimonials
      .map((item) => ({
        name: String(item.name || "").trim(),
        role: String(item.role || "").trim(),
        message: String(item.message || "").trim(),
      }))
      .filter((item) => item.name || item.role || item.message);

    const fd = new FormData();
    fd.append("section_label", form.section_label.trim());
    fd.append("company_title", form.company_title.trim());
    fd.append("company_description", form.company_description.trim());
    fd.append("highlights", JSON.stringify(highlights));
    fd.append("trust_badges", JSON.stringify(trustBadges));
    fd.append("choose_us_title", form.choose_us_title.trim());
    fd.append("choose_us_subtitle", form.choose_us_subtitle.trim());
    fd.append("choose_us_cards", JSON.stringify(chooseUsCards));
    fd.append("testimonials_title", form.testimonials_title.trim());
    fd.append("testimonials", JSON.stringify(testimonials));

    if (form.about_image instanceof File) {
      fd.append("about_image", form.about_image);
    }
    if (form.banner_image instanceof File) {
      fd.append("banner_image", form.banner_image);
    }

    return fd;
  };

  const handleSave = async () => {
    if (!form.company_title.trim()) {
      toast.error("Company title is required");
      return;
    }

    try {
      setSaving(true);
      const payload = buildPayload();
      if (form.id) {
        await updateAboutApi(form.id, payload);
        toast.success("About content updated");
      } else {
        await createAboutApi(payload);
        toast.success("About content created");
      }
      resetForm();
      fetchList();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to save About content");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item) => {
    setForm({
      id: item.id,
      section_label: item.section_label || "",
      company_title: item.company_title || "",
      company_description: item.company_description || "",
      about_image: item.about_image || null,
      banner_image: item.banner_image || null,
      highlightsText: toTextLines(item.highlights),
      trustBadgesText: toTextLines(item.trust_badges),
      choose_us_title: item.choose_us_title || "",
      choose_us_subtitle: item.choose_us_subtitle || "",
      choose_us_cards: normalizeCards(item.choose_us_cards),
      testimonials_title: item.testimonials_title || "",
      testimonials: normalizeTestimonials(item.testimonials),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    const ok = window.confirm("Delete this About content?");
    if (!ok) return;
    try {
      setIsDeletingId(id);
      await deleteAboutApi(id);
      toast.success("About content deleted");
      if (form.id === id) {
        resetForm();
      }
      fetchList();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to delete About content");
    } finally {
      setIsDeletingId(null);
    }
  };

  return (
    <div className="text-white space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">About Us Management</h1>
          <p className="text-sm text-gray-400">
            Manage About page content, cards, testimonials, and images.
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
            <label className="text-xs text-gray-400">Section Label</label>
            <input
              name="section_label"
              value={form.section_label}
              onChange={handleChange}
              className="w-full mt-1 bg-[#0B0F19] border border-gray-700 p-3 rounded-lg text-sm"
              placeholder="Who we are"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400">Company Title *</label>
            <input
              name="company_title"
              value={form.company_title}
              onChange={handleChange}
              className="w-full mt-1 bg-[#0B0F19] border border-gray-700 p-3 rounded-lg text-sm"
              placeholder=" Shop99"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-400">Company Description</label>
          <textarea
            name="company_description"
            value={form.company_description}
            onChange={handleChange}
            rows={4}
            className="w-full mt-1 bg-[#0B0F19] border border-gray-700 p-3 rounded-lg text-sm"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-400">About Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleImageChange("about_image", e.target.files?.[0])}
              className="w-full mt-1 bg-[#0B0F19] border border-gray-700 p-2 rounded-lg text-sm"
            />
            {form.about_image && (
              <img
                src={
                  form.about_image instanceof File
                    ? URL.createObjectURL(form.about_image)
                    : `${IMAGE_URL}${form.about_image}`
                }
                alt="About"
                className="mt-2 h-20 rounded border border-gray-700 object-cover"
              />
            )}
          </div>

          <div>
            <label className="text-xs text-gray-400">Banner Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleImageChange("banner_image", e.target.files?.[0])}
              className="w-full mt-1 bg-[#0B0F19] border border-gray-700 p-2 rounded-lg text-sm"
            />
            {form.banner_image && (
              <img
                src={
                  form.banner_image instanceof File
                    ? URL.createObjectURL(form.banner_image)
                    : `${IMAGE_URL}${form.banner_image}`
                }
                alt="Banner"
                className="mt-2 h-20 rounded border border-gray-700 object-cover"
              />
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-400">
              Highlights (one line = one item)
            </label>
            <textarea
              name="highlightsText"
              value={form.highlightsText}
              onChange={handleChange}
              rows={5}
              className="w-full mt-1 bg-[#0B0F19] border border-gray-700 p-3 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400">
              Trust Badges (one line = one item)
            </label>
            <textarea
              name="trustBadgesText"
              value={form.trustBadgesText}
              onChange={handleChange}
              rows={5}
              className="w-full mt-1 bg-[#0B0F19] border border-gray-700 p-3 rounded-lg text-sm"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-400">Choose Us Title</label>
            <input
              name="choose_us_title"
              value={form.choose_us_title}
              onChange={handleChange}
              className="w-full mt-1 bg-[#0B0F19] border border-gray-700 p-3 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400">Testimonials Title</label>
            <input
              name="testimonials_title"
              value={form.testimonials_title}
              onChange={handleChange}
              className="w-full mt-1 bg-[#0B0F19] border border-gray-700 p-3 rounded-lg text-sm"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-400">Choose Us Subtitle</label>
          <textarea
            name="choose_us_subtitle"
            value={form.choose_us_subtitle}
            onChange={handleChange}
            rows={3}
            className="w-full mt-1 bg-[#0B0F19] border border-gray-700 p-3 rounded-lg text-sm"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs text-gray-400">Choose Us Cards</label>
            <button
              type="button"
              onClick={addCard}
              className="text-xs bg-[#00C2A8]/20 text-[#00C2A8] px-2 py-1 rounded"
            >
              Add Card
            </button>
          </div>
          {form.choose_us_cards.map((row, idx) => (
            <div key={idx} className="grid md:grid-cols-2 gap-3">
              <input
                value={row.title}
                onChange={(e) => updateCard(idx, "title", e.target.value)}
                placeholder="Card title"
                className="bg-[#0B0F19] border border-gray-700 p-3 rounded-lg text-sm"
              />
              <div className="flex gap-2">
                <input
                  value={row.description}
                  onChange={(e) => updateCard(idx, "description", e.target.value)}
                  placeholder="Card description"
                  className="flex-1 bg-[#0B0F19] border border-gray-700 p-3 rounded-lg text-sm"
                />
                <button
                  type="button"
                  onClick={() => removeCard(idx)}
                  className="px-3 bg-red-500/20 text-red-400 rounded-lg"
                >
                  X
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs text-gray-400">Testimonials</label>
            <button
              type="button"
              onClick={addTestimonial}
              className="text-xs bg-[#00C2A8]/20 text-[#00C2A8] px-2 py-1 rounded"
            >
              Add Testimonial
            </button>
          </div>
          {form.testimonials.map((row, idx) => (
            <div key={idx} className="grid md:grid-cols-3 gap-3">
              <input
                value={row.name}
                onChange={(e) => updateTestimonial(idx, "name", e.target.value)}
                placeholder="Name"
                className="bg-[#0B0F19] border border-gray-700 p-3 rounded-lg text-sm"
              />
              <input
                value={row.role}
                onChange={(e) => updateTestimonial(idx, "role", e.target.value)}
                placeholder="Role / Designation"
                className="bg-[#0B0F19] border border-gray-700 p-3 rounded-lg text-sm"
              />
              <div className="flex gap-2">
                <input
                  value={row.message}
                  onChange={(e) => updateTestimonial(idx, "message", e.target.value)}
                  placeholder="Message"
                  className="flex-1 bg-[#0B0F19] border border-gray-700 p-3 rounded-lg text-sm"
                />
                <button
                  type="button"
                  onClick={() => removeTestimonial(idx)}
                  className="px-3 bg-red-500/20 text-red-400 rounded-lg"
                >
                  X
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-gradient-to-r from-[#00C2A8] to-[#00A8FF] py-3 rounded-lg font-medium hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Saving..." : isEditing ? "Update About" : "Create About"}
          </button>
          {isEditing && (
            <button
              type="button"
              onClick={resetForm}
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
              <th className="p-3 text-left">Title</th>
              <th className="p-3 text-left">Active</th>
              <th className="p-3 text-left">Updated</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading && list.length === 0 && (
              <tr>
                <td className="p-4 text-center text-gray-500" colSpan={4}>
                  No About records found
                </td>
              </tr>
            )}
            {list.map((item) => (
              <tr key={item.id} className="border-t border-gray-800">
                <td className="p-3">{item.company_title || "-"}</td>
                <td className="p-3">
                  {item.is_active ? (
                    <span className="text-green-400">Yes</span>
                  ) : (
                    <span className="text-gray-500">No</span>
                  )}
                </td>
                <td className="p-3">
                  {item.updated_at ? new Date(item.updated_at).toLocaleString() : "-"}
                </td>
                <td className="p-3 text-center space-x-4">
                  <button
                    type="button"
                    onClick={() => handleEdit(item)}
                    className="text-blue-400"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="text-red-400 disabled:opacity-50"
                    disabled={isDeletingId === item.id}
                  >
                    {isDeletingId === item.id ? "Deleting..." : "Delete"}
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
