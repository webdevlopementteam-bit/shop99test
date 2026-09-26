"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getFooterApi,
  getProfileApi,
  subscribeNewsletterApi,
  updateProfileApi,
  IMAGE_URL,
} from "@/lib/api";
import { toast } from "react-toastify";

export default function Footer() {
  const [footer, setFooter] = useState(null);
  const [subscriberEmail, setSubscriberEmail] = useState("");
  const [submittingEmail, setSubmittingEmail] = useState(false);

  useEffect(() => {
    fetchFooter();
  }, []);

  const fetchFooter = async () => {
    const data = await getFooterApi();
    if (!data) return;

    let parsedColumns = [];
    let parsedContact = {};
    let parsedSocials = {};

    try {
      parsedColumns = typeof data.columns === "string" ? JSON.parse(data.columns) : data.columns || [];
    } catch {
      console.log("Error parsing footer columns:", data.columns);
    }

    try {
      parsedContact = typeof data.contact === "string" ? JSON.parse(data.contact) : data.contact || {};
    } catch {
      console.log("Error parsing footer contact:", data.contact);
    }

    try {
      parsedSocials = typeof data.socials === "string" ? JSON.parse(data.socials) : data.socials || {};
    } catch {
      console.log("Error parsing footer socials:", data.socials);
    }

    setFooter({
      ...data,
      columns: parsedColumns,
      contact: parsedContact,
      socials: parsedSocials,
    });
  };

  // ✅ loader
  if (!footer) return null;

  // 🔥 dynamic total columns (logo + admin columns + contact + social)
  const totalCols = (footer.columns?.length || 0) + 3;

  const getGridClass = () => {
    if (totalCols <= 2) return "grid-cols-1 md:grid-cols-2";
    if (totalCols === 3) return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
    if (totalCols === 4) return "grid-cols-1 md:grid-cols-2 lg:grid-cols-4";
    return "grid-cols-1 md:grid-cols-2 lg:grid-cols-5";
  };

  const email = String(footer.contact?.email || "").trim();
  const phoneDisplay = String(footer.contact?.phone || "").trim();
  const phoneHref = phoneDisplay.replace(/\s+/g, "");

  const pickDisplayName = (source) => {
    if (!source || typeof source !== "object") return "";
    const first = String(
      source.name || source.full_name || source.customer_name || source.username || "",
    ).trim();
    if (first) return first;

    const f = String(source.first_name || source.firstname || "").trim();
    const l = String(source.last_name || source.lastname || "").trim();
    return `${f} ${l}`.trim();
  };

  const handleNewsletterSubmit = async (e) => {
    e.preventDefault();

    const emailValue = String(subscriberEmail || "").trim().toLowerCase();
    const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue);

    if (!isEmailValid) {
      toast.error("Please enter a valid email address");
      return;
    }

    try {
      setSubmittingEmail(true);
      const token = localStorage.getItem("token");
      let subscriberName = "";
      const localUserRaw = localStorage.getItem("user");
      let localUser = null;

      if (localUserRaw) {
        try {
          localUser = JSON.parse(localUserRaw);
          subscriberName = pickDisplayName(localUser);
        } catch {
          localUser = null;
        }
      }

      // If customer is logged in, keep account email in sync.
      if (token) {
        const profile = await getProfileApi().catch(() => null);
        if (profile && typeof profile === "object") {
          const profileObj = profile?.data && typeof profile.data === "object" ? profile.data : profile;
          subscriberName = pickDisplayName(profileObj) || subscriberName;
          const payload = { ...profile, email: emailValue };
          await updateProfileApi(payload);

          if (localUser) {
            try {
              localStorage.setItem("user", JSON.stringify({ ...localUser, email: emailValue }));
            } catch {
              // ignore invalid local user payload
            }
          }
        }
      }

      await subscribeNewsletterApi({
        email: emailValue,
        name: subscriberName || "Customer",
      });
      setSubscriberEmail("");
      toast.success(token ? "Email saved to your account and subscribed" : "Email subscribed successfully");
    } catch (err) {
      const message = err?.response?.data?.message || err?.response?.data?.error || "Subscription failed";
      toast.error(message);
    } finally {
      setSubmittingEmail(false);
    }
  };

  return (
    <footer className="bg-[#0b0b0b] text-white pt-16 font-bold">
      {/* TOP LINE */}
      <div className="h-1 bg-orange-500 w-full mb-14" />

      <div className="px-4 sm:px-8 lg:px-24">
        {/* 🔥 DYNAMIC GRID */}
        <div className={`grid ${getGridClass()} gap-12`}>
          {/* LOGO + DESC */}
          <div>
            <Link href="/">
              <img
                src={`${IMAGE_URL}${footer.logo}`}
                alt="logo"
                className="h-14 mb-5 object-contain"
              />
            </Link>

            <p className="mb-6 leading-relaxed text-white">{footer.description}</p>

            <form
              onSubmit={handleNewsletterSubmit}
              className="flex items-stretch bg-[#1a1a1a] rounded-lg overflow-hidden h-12 max-w-xs"
            >
              <input
                type="email"
                placeholder="Email Address"
                value={subscriberEmail}
                onChange={(e) => setSubscriberEmail(e.target.value)}
                className="bg-transparent flex-1 min-w-0 px-4 text-white outline-none placeholder:text-gray-400"
              />
              <button
                type="submit"
                disabled={submittingEmail}
                className="bg-orange-500 min-w-[44px] px-4 text-white text-lg leading-none flex items-center justify-center disabled:opacity-70"
                aria-label="Subscribe to newsletter"
              >
                →
              </button>
            </form>
          </div>

          {/* 🔥 ADMIN COLUMNS */}
          {footer.columns.map((col, i) => (
            <FooterColumn key={i} title={col.title} links={col.links} />
          ))}

          {/* CONTACT */}
          <div>
            <h4 className="text-white font-semibold mb-5 text-lg">Contact Info</h4>

            <p className="mb-4 text-white">{footer.contact?.address}</p>

            <p className="text-white font-semibold">
              Mail:-{" "}
              {email ? (
                <a href={`mailto:${email}`} className="hover:text-orange-500 transition underline-offset-2 hover:underline">
                  {email}
                </a>
              ) : (
                "-"
              )}
            </p>

            <p className="text-white font-semibold">
              Phone:-{" "}
              {phoneDisplay ? (
                <a href={`tel:${phoneHref}`} className="hover:text-orange-500 transition underline-offset-2 hover:underline">
                  {phoneDisplay}
                </a>
              ) : (
                "-"
              )}
            </p>
          </div>

          {/* SOCIAL */}
          <div>
            <h4 className="text-white font-semibold mb-5 text-lg">Social Media</h4>
            <div className="space-y-3">
              {/* SOUND BOSS */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-white font-semibold">Sound Boss</p>

                <div className="flex gap-4">
                  {footer.socials?.soundboss?.instagram && (
                    <a
                      href={footer.socials.soundboss.instagram}
                      target="_blank"
                      rel="noreferrer"
                      className="w-10 h-10 rounded-full border border-white-600 flex items-center justify-center hover:bg-orange-500 transition"
                    >
                      <i className="fa-brands fa-instagram text-white"></i>
                    </a>
                  )}

                  {footer.socials?.soundboss?.facebook && (
                    <a
                      href={footer.socials.soundboss.facebook}
                      target="_blank"
                      rel="noreferrer"
                      className="w-10 h-10 rounded-full border border-gray-600 flex items-center justify-center hover:bg-orange-500 transition"
                    >
                      <i className="fa-brands fa-facebook-f text-white"></i>
                    </a>
                  )}
                </div>
              </div>

              {/* SOUND FIRE */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-white font-semibold">Sound Fire</p>

                <div className="flex gap-4">
                  {footer.socials?.soundfire?.instagram && (
                    <a
                      href={footer.socials.soundfire.instagram}
                      target="_blank"
                      rel="noreferrer"
                      className="w-10 h-10 rounded-full border border-gray-600 flex items-center justify-center hover:bg-orange-500 transition"
                    >
                      <i className="fa-brands fa-instagram text-white"></i>
                    </a>
                  )}

                  {footer.socials?.soundfire?.facebook && (
                    <a
                      href={footer.socials.soundfire.facebook}
                      target="_blank"
                      rel="noreferrer"
                      className="w-10 h-10 rounded-full border border-gray-600 flex items-center justify-center hover:bg-orange-500 transition"
                    >
                      <i className="fa-brands fa-facebook-f text-white"></i>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM */}
        <div className="border-t border-gray-800 mt-14 pt-6 pb-8 text-center">
          <p className="text-sm text-white">
            © 2026{" "}
            <span className="text-orange-500 font-semibold">SHOP99 | ALL RIGHTS RESERVED </span>
            <span className="text-orange-500 font-semibold">| POWERED BY SHOP99</span>
          </p>
        </div>
      </div>
    </footer>
  );
}

/* COLUMN */
function FooterColumn({ title, links }) {
  return (
    <div>
      <h4 className="text-white font-semibold mb-5 text-lg">{title}</h4>

      <ul className="space-y-3">
        {links?.map((link, index) => (
          <li key={index}>
            <Link href={link.path} className="text-white hover:text-orange-500 transition">
              {link.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
