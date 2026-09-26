"use client";

import { useState, useEffect } from "react";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { getTopCategoriesApi, BASE_URL } from "@/lib/api";
import { useRouter } from "next/navigation";

const CategorySlider = () => {
  const [slidesToShow, setSlidesToShow] = useState(5);
  const [categories, setCategories] = useState([]);
  const router = useRouter();

  // Load Categories
  useEffect(() => {
    const loadTopCategories = async () => {
      try {
        const data = await getTopCategoriesApi();
        setCategories(data);
      } catch (err) {
        console.log(err);
      }
    };

    loadTopCategories();
  }, []);

  // Handle Responsive Slides
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;

      if (width < 576) {
        setSlidesToShow(1);
      } else if (width < 768) {
        setSlidesToShow(2);
      } else if (width < 1200) {
        setSlidesToShow(3);
      } else {
        setSlidesToShow(5);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const settings = {
    dots: false,
    infinite: true,
    autoplay: true,
    autoplaySpeed: 2000,
    speed: 500,
    slidesToShow: slidesToShow,
    slidesToScroll: 1,
    arrows: false,
  };

  return (
    <section className="shop-section pb_100 mt-20">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 w-full">
        <h2 className="text-2xl font-semibold mb-8">Popular Categories</h2>

        <Slider {...settings}>
          {categories.length > 0 ? (
            categories.map((item) => (
              <div
                key={item.id}
                className="px-3 cursor-pointer"
                onClick={() => router.push(`/shop?category=${item.name}`)}
              >
                <div className="bg-white rounded-xl shadow p-5 text-center hover:shadow-lg transition-all min-h-[200px] flex flex-col items-center justify-center">
                  {item?.image && String(item.image).trim() !== "" ? (
                    <img
                      src={`${BASE_URL}/uploads/${item.image}`}
                      alt={item?.name || "Category"}
                      className="h-32 mx-auto mb-4 object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : null}

                  <h4
                    className={`font-semibold ${
                      !item?.image || String(item.image).trim() === "" ? "text-lg py-4" : ""
                    }`}
                  >
                    {item.name}
                  </h4>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center w-full py-10">No Top Categories Found</div>
          )}
        </Slider>
      </div>
    </section>
  );
};

export default CategorySlider;
