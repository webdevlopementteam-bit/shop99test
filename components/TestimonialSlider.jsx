"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import { UserRound } from "lucide-react";
import "swiper/css";
import "swiper/css/pagination";

const testimonials = [
  {
    name: "Rahul Verma",
    role: "Verified Customer",
    text: "Shop99  se maine apni car ke liye multiple auto parts order kiye hain. Product quality bahut achhi hai aur jo product website par show hota hai, wahi receive hota hai. Genuine products aur reliable service ke liye highly recommended!",
  },
  {
    name: "Amit Kumar",
    role: "Car Owner",
    text: "Shop99 par auto parts ki range kaafi achhi hai. Mujhe apni car ke liye required part easily mil gaya. Product quality bhi excellent thi aur packaging bhi proper thi. Auto parts purchase karne ke liye trusted website hai.",
  },
  {
    name: "Priya Sharma",
    role: "Verified Customer",
    text: "Maine Shop99 se car accessories purchase ki thi aur overall experience bahut achha raha. Product quality expected se better thi aur delivery bhi time par mil gayi. Shop99 ki service se main kaafi satisfied hoon.",
  },
  {
    name: "Sandeep Singh",
    role: "Automobile Enthusiast",
    text: "Shop99  par products ki variety aur quality dono impressive hain. Car maintenance ke liye mujhe jo parts chahiye the, woh easily mil gaye. Pricing bhi reasonable hai aur product quality genuine lagti hai. Definitely recommended!",
  },
];

const TestimonialSlider = () => {
  return (
    <section className="bg-gray-100 py-20 px-5">
      <div className="max-w-7xl mx-auto">
        {/* Title */}
        <h2 className="text-3xl lg:text-4xl font-bold text-center mb-14">Love from Clients</h2>

        <Swiper
          modules={[Autoplay, Pagination]}
          spaceBetween={30}
          slidesPerView={3}
          loop
          speed={900}
          grabCursor={true}
          autoplay={{
            delay: 2500,
            disableOnInteraction: false,
          }}
          pagination={{ clickable: true }}
          breakpoints={{
            0: { slidesPerView: 1 },
            768: { slidesPerView: 2 },
            1024: { slidesPerView: 3 },
          }}
        >
          {testimonials.map((item, index) => (
            <SwiperSlide key={index} className="h-auto">
              {/* CARD */}
              <div
                className="
                bg-white rounded-2xl shadow-md
                p-8
                h-full min-h-[320px]
                flex flex-col justify-between
                transition hover:shadow-xl
              "
              >
                {/* Top Content */}
                <div>
                  <div className="text-orange-400 mb-4 text-lg">★ ★ ★ ★ ☆</div>

                  <p className="text-gray-600 leading-relaxed">“{item.text}”</p>
                </div>

                {/* Bottom User */}
                <div className="flex items-center gap-4 mt-8">
                  <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                    <UserRound className="w-6 h-6 text-orange-500" />
                  </div>

                  <div>
                    <h4 className="font-semibold">{item.name}</h4>
                    <p className="text-sm text-gray-500">{item.role}</p>
                  </div>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
};

export default TestimonialSlider;
