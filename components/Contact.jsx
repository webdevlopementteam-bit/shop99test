"use client";

import { useState } from "react";

export default function ContactUs() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    alert("Message Sent Successfully 🚀");
    console.log(form);
  };

  return (
    <section className="bg-gradient-to-br from-[#fff7ed] to-[#f3f4f6] py-16">
      <div className="max-w-6xl mx-auto px-4">
        {/* HEADER */}
        <div className="text-center mb-14">
          <h2 className="text-4xl font-bold mb-3">Contact Us</h2>
          <p className="text-gray-500">We’d love to hear from you. Reach out anytime.</p>
        </div>

        {/* MAIN GRID */}
        <div className="grid md:grid-cols-2 gap-10 items-start">
          {/* LEFT SIDE - CONTACT CARDS */}
          <div className="grid grid-cols-1 gap-6">
            <InfoCard
              icon="fa-location-dot"
              title="Our Location"
              text="GROUND FLOOR, 804/24-26,940/23,939/23, GT KARNAL ROAD, DDA SANGAM PARK MARKET, SIDHORAN KALAN, Delhi, India, Delhi"
            />

            <a href="mailto:support@shop99.co.in" className="block">
              <InfoCard icon="fa-envelope" title="Email" text="support@shop99.co.in" />
            </a>

            <a href="tel:+918920114845" className="block">
              <InfoCard icon="fa-phone" title="Phone" text="+91-8920114845" />
            </a>
          </div>

          {/* RIGHT SIDE - FORM */}
          <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow space-y-4">
            <h3 className="text-xl font-semibold mb-2">Send Message</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input name="name" placeholder="Your Name" value={form.name} onChange={handleChange} />
              <Input name="email" type="email" placeholder="Your Email" value={form.email} onChange={handleChange} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input name="phone" placeholder="Phone" value={form.phone} onChange={handleChange} />
              <Input name="subject" placeholder="Subject" value={form.subject} onChange={handleChange} />
            </div>

            <textarea
              name="message"
              rows="5"
              placeholder="Your Message"
              value={form.message}
              onChange={handleChange}
              className="input-style w-full resize-none"
              required
            />

            <button className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-medium transition">
              Send Message
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

function InfoCard({ icon, title, text }) {
  return (
    <div className="group bg-white rounded-2xl p-6 flex flex-col justify-between h-full min-h-[140px] shadow hover:shadow-xl transition cursor-pointer">
      <div className="w-14 h-14 mb-3 rounded-full bg-orange-100 flex items-center justify-center text-orange-500 text-xl group-hover:scale-110 transition">
        <i className={`fa-solid ${icon}`}></i>
      </div>

      <div className="flex-1 flex flex-col justify-center">
        <h4 className="font-semibold text-lg mb-1">{title}</h4>
        <p className="text-gray-500 text-sm leading-relaxed">{text}</p>
      </div>
    </div>
  );
}

function Input({ name, type = "text", placeholder, value, onChange }) {
  return (
    <input
      type={type}
      name={name}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className="input-style w-full"
      required
    />
  );
}
