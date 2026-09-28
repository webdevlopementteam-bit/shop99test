"use client";

import { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination, EffectFade } from "swiper/modules";
import { getBannersApi } from "@/lib/api";

import "swiper/css";
import "swiper/css/effect-fade";
import "swiper/css/pagination";

import "@/styles/hero.css";

import { useRouter } from "next/navigation";

const HeroCarousel = ({ initialBanners = null }) => {
  const router = useRouter();
  // Server-rendered banners (app/(storefront)/page.jsx) so the hero is in the
  // first HTML; the client fetch below is only a fallback.
  const [banners, setBanners] = useState(initialBanners ?? []);
  // The first slide shows immediately — its entrance animation (up to ~2s of
  // delay in hero.css) only plays once the carousel starts moving.
  const [introDone, setIntroDone] = useState(false);

  useEffect(() => {
    if (initialBanners) return;
    const fetchBanners = async () => {
      try {
        const data = await getBannersApi();

        setBanners(data);

        // Fix for Swiper rendering issue
        setTimeout(() => {
          window.dispatchEvent(new Event("resize"));
        }, 100);
      } catch (err) {
        console.error(err);
      }
    };

    fetchBanners();
  }, [initialBanners]);

  return (
    <div className={`relative ${introDone ? "" : "hero-intro"}`}>
      <Swiper
        key={banners.length}
        modules={[Autoplay, Pagination, EffectFade]}
        effect="fade"
        fadeEffect={{ crossFade: true }}
        autoplay={{ delay: 4000 }}
        speed={1200}
        pagination={{ clickable: true }}
        loop
        observer={true}
        observeParents={true}
        // realIndex, not activeIndex: loop mode can shift activeIndex during init.
        onSlideChange={(swiper) => {
          if (swiper.realIndex !== 0) setIntroDone(true);
        }}
      >
        {banners.map((banner, i) => {
          // Relative on purpose: BASE_URL is http://localhost:3000 during server render.
          const bg = banner?.background ? `/uploads/${banner.background}` : "";

          return (
            <SwiperSlide key={banner.id}>
              <div
                data-first={i === 0 ? "" : undefined}
                className="hero-slide min-h-[420px] sm:min-h-[480px] md:h-[550px] lg:h-[600px] bg-cover bg-center flex items-center px-4 sm:px-8 lg:px-24 relative z-0 overflow-visible"
                style={{
                  backgroundImage: `url(${bg})`,
                }}
              >
                {/* overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-white/90 to-transparent"></div>

                {/* TEXT */}
                <div className="hero-text relative z-10 max-w-xl w-full">
                  <span className="bg-orange-500 text-white px-4 py-1 rounded text-sm">New Brand</span>

                  <h2 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-bold mt-4 md:mt-6 leading-tight">
                    {banner.title}
                  </h2>

                  <p className="text-gray-600 mt-3 md:mt-4 text-sm sm:text-base max-w-lg">{banner.subtitle}</p>

                  <button
                    onClick={() => {
                      if (banner.product?.slug) {
                        router.push(`/productPage/${banner.product.slug}`);
                      } else if (banner.product_id) {
                        router.push(`/productPage/${banner.product_id}`);
                      }
                    }}
                    className="mt-5 md:mt-6 bg-white px-5 md:px-6 py-2 md:py-3 rounded shadow hover:bg-orange-500 hover:text-white font-semibold transition"
                  >
                    Read More
                  </button>
                </div>

                {/* PRODUCT IMAGE */}
                <div
                  className="
                hero-product
                absolute
                bottom-0
                right-2
                sm:right-6
                md:right-12
                lg:right-24
                w-[160px]
                h-[160px]
                sm:w-[260px]
                sm:h-[260px]
                md:w-[360px]
                md:h-[360px]
                lg:w-[650px]
                lg:h-[650px]
                flex
                items-center
                justify-center
              "
                >
                  <img
                    src={`/uploads/${banner.image}`}
                    alt={banner.title}
                    // First slide is above the fold (and preloaded) — load it now.
                    loading={i === 0 ? "eager" : "lazy"}
                    fetchPriority={i === 0 ? "high" : "auto"}
                    className="max-h-[90%] w-auto object-contain"
                  />
                </div>
              </div>
            </SwiperSlide>
          );
        })}
      </Swiper>
    </div>
  );
};

export default HeroCarousel;
