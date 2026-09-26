"use client";

import { useEffect, useState } from "react";
import {
  getFooterApi,
  createFooterApi,
  updateFooterApi,
  BASE_URL,
} from "@/lib/adminApi";

import {
  Plus,
  Trash2,
  Link as LinkIcon,
  LayoutGrid,
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
} from "lucide-react";

export default function FooterBuilder() {
  const [columns, setColumns] = useState([]);
  const [footerId, setFooterId] = useState(null);
  const [description, setDescription] = useState("");
  const [logo, setLogo] = useState("");
  const [logoFile, setLogoFile] = useState(null);

  // ✅ NEW
  const [contact, setContact] = useState({
    address: "",
    phone: "",
    email: "",
  });

const [socials, setSocials] = useState({
  soundfire: {
    facebook: "",
    instagram: "",
  },
  soundboss: {
    facebook: "",
    instagram: "",
  },
});

  useEffect(() => {
    fetchFooter();
  }, []);

 const fetchFooter = async () => {
  const data = await getFooterApi();
  if (!data) return;

  setFooterId(data.id);

  // ✅ FIX: columns parse
  let parsedColumns = [];
  try {
    parsedColumns =
      typeof data.columns === "string"
        ? JSON.parse(data.columns)
        : data.columns || [];
  } catch {
    parsedColumns = [];
  }
  setColumns(parsedColumns);

  // ✅ FIX: logo & description
  setLogo(data.logo || "");
  setDescription(data.description || "");

  // ✅ FIX: contact parse
  let parsedContact = {};
  try {
    parsedContact =
      typeof data.contact === "string"
        ? JSON.parse(data.contact)
        : data.contact || {};
  } catch {
    parsedContact = {};
  }
  setContact(parsedContact);

  // ✅ FIX: socials parse
let parsedSocials = {};

try {
  parsedSocials =
    typeof data.socials === "string"
      ? JSON.parse(data.socials)
      : data.socials || {};
} catch {
  parsedSocials = {};
}

// ✅ SAFE STRUCTURE (MAIN FIX)
setSocials({
  soundfire: {
    facebook: parsedSocials?.soundfire?.facebook || "",
    instagram: parsedSocials?.soundfire?.instagram || "",
  },
  soundboss: {
    facebook: parsedSocials?.soundboss?.facebook || "",
    instagram: parsedSocials?.soundboss?.instagram || "",
  },
});
};

  const addColumn = () => {
    setColumns([...columns, { title: "", links: [] }]);
  };

  const updateColumnTitle = (i, value) => {
    const updated = [...columns];
    updated[i].title = value;
    setColumns(updated);
  };

  const deleteColumn = (i) => {
    setColumns(columns.filter((_, index) => index !== i));
  };

  const addLink = (colIndex) => {
    const updated = [...columns];
    updated[colIndex].links.push({ name: "", path: "" });
    setColumns(updated);
  };

  const updateLink = (colIndex, linkIndex, field, value) => {
    const updated = [...columns];
    updated[colIndex].links[linkIndex][field] = value;
    setColumns(updated);
  };

  const deleteLink = (colIndex, linkIndex) => {
    const updated = [...columns];
    updated[colIndex].links = updated[colIndex].links.filter(
      (_, i) => i !== linkIndex
    );
    setColumns(updated);
  };

  const handleSave = async () => {
    const formData = new FormData();

    formData.append("columns", JSON.stringify(columns));
    formData.append("contact", JSON.stringify(contact));
    formData.append("socials", JSON.stringify(socials));
    formData.append("description", description);
    formData.append("copyright", "");

    if (logoFile) {
      formData.append("logo", logoFile);
    }

    if (footerId) {
      await updateFooterApi(footerId, formData);
    } else {
      const res = await createFooterApi(formData);
      setFooterId(res?.data?.id);
    }

    alert("Saved ✅");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#020617] to-[#020617]/90 text-white px-10 py-10">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-14">
        <div>
          <h1 className="text-3xl font-semibold flex items-center gap-3 tracking-wide">
            <LayoutGrid size={22} /> Footer Builder
          </h1>
          <p className="text-gray-400 text-sm mt-2">
            Build and manage footer structure easily
          </p>
        </div>

      </div>

      {/* BRANDING SECTION */}
      <div className="bg-[#0B1220]/90 border border-gray-700/50 rounded-2xl p-6 mb-10">

        <h3 className="text-lg font-semibold mb-5">Branding Section</h3>

        {/* LOGO */}
        <div className="mb-4">
          <label className="text-sm text-gray-400">Upload Logo</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files[0];
              if (file) {
                setLogoFile(file);
                setLogo(URL.createObjectURL(file));
              }
            }}
            className="w-full mt-2 p-2 bg-[#020617] border border-gray-700 rounded-lg"
          />

          {logo && (
            <img
              src={
                logo.startsWith("blob")
                  ? logo
                  : `${BASE_URL}/uploads/${logo}`
              }
              className="mt-4 h-16 object-contain"
            />
          )}
        </div>

        {/* DESCRIPTION */}
        <div>
          <label className="text-sm text-gray-400">Description</label>
          <textarea
            placeholder="Enter description..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full mt-2 p-2 bg-[#020617] border border-gray-700 rounded-lg"
          />
        </div>

      </div>


        <div className="mt-10 text-right mb-6 flex justify-end ">
          <button
            onClick={addColumn}
            className=" flex justify-space-between items-center gap-2  bg-[#00C2A8] px-8 py-2 rounded-xl text-sm font-medium transition active:scale-95 shadow-md"
          >
            <Plus size={16} /> Add Column
          </button>
      </div>



       {/* 🔥 ORIGINAL COLUMN UI (UNCHANGED) */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 xl:gap-10">

        {columns.map((col, i) => (
          <div
            key={i}
            className="bg-[#0B1220]/90 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.6)] hover:shadow-[0_10px_40px_rgba(0,0,0,0.8)] transition-all flex flex-col"
          >

            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <input
                placeholder="Column Title"
                value={col.title}
                onChange={(e) => updateColumnTitle(i, e.target.value)}
                className="bg-transparent text-sm font-semibold tracking-wide outline-none w-full placeholder-gray-500"
              />

              <button onClick={() => deleteColumn(i)} className="text-red-400 ml-2">
                <Trash2 size={16} />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4">

              {col.links.map((link, j) => (
                <div key={j} className="flex items-center gap-3 bg-[#020617]/70 border border-gray-800 px-3 py-2.5 rounded-xl w-full">
                  <LinkIcon size={14} />

                  <input
                    placeholder="Name"
                    value={link.name}
                    onChange={(e) =>
                      updateLink(i, j, "name", e.target.value)
                    }
                    className="w-[35%] bg-transparent"
                  />

                  <input
                    placeholder="/path"
                    value={link.path}
                    onChange={(e) =>
                      updateLink(i, j, "path", e.target.value)
                    }
                    className="w-[55%] bg-transparent"
                  />

                  <Trash2 size={14} onClick={() => deleteLink(i, j)} />
                </div>
              ))}


        <div className="mt-10 text-right mb-6 flex justify-center">
          <button
             onClick={() => addLink(i)}
            className="  w-full flex justify-center items-center gap-2  bg-[#00C2A8] px-8 py-2 rounded-xl text-sm font-medium transition active:scale-95 shadow-md"
          >
            <Plus size={16} /> Add Link
          </button>
      </div>



            </div>

          </div>
        ))}

      </div>

      {/* CONTACT */}
      <div className="bg-[#0B1220]/90 border border-gray-700/50 rounded-2xl p-6 mb-10 mt-10">
        <h3 className="text-lg font-semibold mb-5">Contact Details</h3>

        <input
          placeholder="Address"
          value={contact.address}
          onChange={(e) =>
            setContact({ ...contact, address: e.target.value })
          }
          className="w-full mb-3 p-2 bg-[#020617] border border-gray-700 rounded-lg"
        />

        <input
          placeholder="Phone"
          value={contact.phone}
          onChange={(e) =>
            setContact({ ...contact, phone: e.target.value })
          }
          className="w-full mb-3 p-2 bg-[#020617] border border-gray-700 rounded-lg"
        />

        <input
          placeholder="Email"
          value={contact.email}
          onChange={(e) =>
            setContact({ ...contact, email: e.target.value })
          }
          className="w-full p-2 bg-[#020617] border border-gray-700 rounded-lg"
        />
      </div>

    {/* SOCIAL */}
<div className="bg-[#0B1220]/90 border border-gray-700/50 rounded-2xl p-6 mb-10">
  <h3 className="text-lg font-semibold mb-5">Social Media</h3>

  {/* SOUND FIRE */}
  <h4 className="text-sm text-gray-400 mb-2">SoundFire</h4>

  <div className="flex items-center gap-3 mb-3">
    <Facebook size={18} />
    <input
      placeholder="SoundFire Facebook"
      value={socials?.soundfire?.facebook}
      onChange={(e) =>
        setSocials({
          ...socials,
          soundfire: {
            ...socials.soundfire,
            facebook: e.target.value,
          },
        })
      }
      className="w-full p-2 bg-[#020617] border border-gray-700 rounded-lg"
    />
  </div>

  <div className="flex items-center gap-3 mb-4">
    <Instagram size={18} />
    <input
      placeholder="SoundFire Instagram"
      value={socials.soundfire.instagram}
      onChange={(e) =>
        setSocials({
          ...socials,
          soundfire: {
            ...socials.soundfire,
            instagram: e.target.value,
          },
        })
      }
      className="w-full p-2 bg-[#020617] border border-gray-700 rounded-lg"
    />
  </div>

  {/* SOUND BOSS */}
  <h4 className="text-sm text-gray-400 mb-2">SoundBoss</h4>

  <div className="flex items-center gap-3 mb-3">
    <Facebook size={18} />
    <input
      placeholder="SoundBoss Facebook"
      value={socials.soundboss.facebook}
      onChange={(e) =>
        setSocials({
          ...socials,
          soundboss: {
            ...socials.soundboss,
            facebook: e.target.value,
          },
        })
      }
      className="w-full p-2 bg-[#020617] border border-gray-700 rounded-lg"
    />
  </div>

  <div className="flex items-center gap-3">
    <Instagram size={18} />
    <input
      placeholder="SoundBoss Instagram"
      value={socials.soundboss.instagram}
      onChange={(e) =>
        setSocials({
          ...socials,
          soundboss: {
            ...socials.soundboss,
            instagram: e.target.value,
          },
        })
      }
      className="w-full p-2 bg-[#020617] border border-gray-700 rounded-lg"
    />
  </div>
</div>


      {/* SAVE */}
      <div className="mt-10 text-right">
        <button onClick={handleSave} className="bg-[#00C2A8] px-6 py-2 rounded-xl">
          Save Footer
        </button>
      </div>

    </div>
  );
}
