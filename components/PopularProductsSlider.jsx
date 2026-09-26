"use client";

import { useRef, useState, useEffect } from "react";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { BASE_URL } from "@/lib/api";
import { useRouter } from "next/navigation";
import { getProductDisplayPricing } from "@/lib/productPricing";
import { setNavState } from "@/lib/navState";

const popularDesktop = "/assets/home/popular-picks.jpeg";
const popularMobile = "/assets/home/popularpick-mobile.jpeg";

const PopularProductsSlider = ({ popularProducts, toggleWishlist, wishlistIds, handleAddToCart, setPreviewImage }) => {
  const sliderRef = useRef(null);
  const router = useRouter();

  const [slidesToShow, setSlidesToShow] = useState(4);

  useEffect(() => {
    const updateSlides = () => {
      const width = window.innerWidth;

      if (width < 576) setSlidesToShow(1);
      else if (width < 992) setSlidesToShow(2);
      else if (width < 1200) setSlidesToShow(3);
      else setSlidesToShow(4);
    };

    updateSlides();

    window.addEventListener("resize", updateSlides);
    return () => window.removeEventListener("resize", updateSlides);
  }, []);

  const settings = {
    dots: false,
    infinite: true,
    autoplay: true,
    autoplaySpeed: 2500,
    speed: 500,
    arrows: false,
    slidesToShow,
    slidesToScroll: 1,
  };

  const renderProducts = () =>
    popularProducts?.length > 0 ? (
      popularProducts.map((item) => {
        const pricing = getProductDisplayPricing(item);

        /* =============================================== */

        return (
          <div key={item.id} className="px-2">
            <div
              onClick={() => router.push(`/productPage/${item.slug || item.id}`)}
              className="group cursor-pointer bg-white p-4 flex flex-col justify-between h-full rounded-xl border hover:shadow-xl transition duration-300"
            >
              {/* IMAGE */}

              <div className="relative">
                <img
                  src={item?.image ? `${BASE_URL}/uploads/${item.image}` : "/no-image.png"}
                  alt={item?.name || "Product"}
                  className="h-44 mx-auto object-contain transition duration-300 group-hover:opacity-30"
                  onError={(e) => {
                    e.target.src = "/no-image.png";
                  }}
                />

                {/* Hover Icons */}

                <div className="absolute left-1/2 -translate-x-1/2 bottom-6 flex gap-3 opacity-0 translate-y-6 group-hover:opacity-100 group-hover:translate-y-0 transition duration-300">
                  <button
                    className="w-9 h-9 bg-white rounded-full shadow flex items-center justify-center hover:bg-orange-500 hover:text-white"
                    onClick={(e) => {
                      e.stopPropagation(); // ✅ ADD THIS
                      setPreviewImage(item?.image ? `${BASE_URL}/uploads/${item.image}` : "/no-image.png");
                    }}
                  >
                    <i className="fa-solid fa-eye"></i>
                  </button>

                  <button
                    className="w-9 h-9 bg-white rounded-full shadow flex items-center justify-center hover:bg-orange-500 hover:text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleWishlist(item.id);
                    }}
                  >
                    <i className={`fa-heart ${wishlistIds.includes(item.id) ? "fa-solid text-red-500" : "fa-regular"}`}></i>
                  </button>
                </div>
              </div>

              {/* CATEGORY */}

              <p className="text-gray-500 text-sm mt-4">{item.Category?.name || "Category"}</p>

              {/* TITLE */}

              <h4 className="font-semibold my-2 line-clamp-2 min-h-[48px]">{item.name}</h4>

              {/* PRICE */}

              <div className="flex items-center gap-2 mb-2">
                {pricing.hasDiscount && pricing.oldPrice != null && (
                  <span className="line-through text-gray-400 text-sm">₹{pricing.oldPrice.toFixed(2)}</span>
                )}

                <span className="text-red-500 font-bold">₹{pricing.finalPrice.toFixed(2)}</span>

                {pricing.hasDiscount && pricing.discountPercent > 0 && (
                  <span className="text-xs font-medium text-green-600">{pricing.discountPercent}% OFF</span>
                )}
              </div>

              {/* STOCK */}

              <div className="text-sm mb-3">
                {item.in_stock ? <span className="text-green-600">In Stock</span> : <span className="text-red-500">Out of Stock</span>}
              </div>

              {/* BUTTON */}

              <div className="flex gap-2">
                {/* ADD TO CART */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleAddToCart({ ...item, price: pricing.finalPrice });
                  }}
                  disabled={!item.in_stock}
                  className={`w-1/2 py-2 text-sm rounded-lg font-semibold transition ${
                    item.in_stock ? "bg-orange-500 text-white hover:bg-orange-600" : "bg-gray-400 text-white cursor-not-allowed"
                  }`}
                >
                  Add to Cart
                </button>

                {/* BUY NOW */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const productData = {
                      id: item.id,
                      name: item.name,
                      price: pricing.finalPrice,
                      image: item?.image ? `${BASE_URL}/uploads/${item.image}` : "/no-image.png",
                      qty: 1,
                    };
                    localStorage.setItem("buyNow", JSON.stringify(productData));
                    setNavState("checkout", { type: "buyNow", product: productData });
                    router.push("/checkout");
                  }}
                  disabled={!item.in_stock}
                  className={`w-1/2 py-2 text-sm rounded-lg font-semibold border transition ${
                    item.in_stock
                      ? "bg-white text-orange-500 border-orange-500 hover:bg-orange-50"
                      : "bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed"
                  }`}
                >
                  Buy Now
                </button>
              </div>
            </div>
          </div>
        );
      })
    ) : (
      <div className="p-6 text-center w-full">No Popular Products Found</div>
    );

  return (
    <section className="mt-16 px-4 sm:px-8 lg:px-24">
      {/* HEADER */}

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl sm:text-2xl font-semibold">Today’s popular picks</h2>

        <div className="flex gap-2">
          <button
            onClick={() => sliderRef.current?.slickPrev()}
            className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center"
          >
            <i className="fa-solid fa-angle-left"></i>
          </button>

          <button
            onClick={() => sliderRef.current?.slickNext()}
            className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center"
          >
            <i className="fa-solid fa-angle-right text-orange-500"></i>
          </button>
        </div>
      </div>

      {/* MOBILE */}

      <div className="block lg:hidden border rounded-2xl bg-white overflow-hidden">
        <button type="button" onClick={() => router.push("/shop")} className="w-full">
          <img src={popularMobile} alt="Popular Picks Banner" className="w-full h-[310px] object-cover" />
        </button>

        <div className="p-4">
          <Slider ref={sliderRef} {...settings}>
            {renderProducts()}
          </Slider>
        </div>
      </div>

      {/* DESKTOP */}

      <div className="hidden lg:grid lg:grid-cols-5 border rounded-2xl bg-white overflow-hidden">
        <button type="button" onClick={() => router.push("/shop")} className="w-full h-full">
          <img src={popularDesktop} alt="Popular Picks Banner" className="w-full h-full object-cover" />
        </button>

        <div className="col-span-4 p-4 min-w-0">
          <Slider ref={sliderRef} {...settings}>
            {renderProducts()}
          </Slider>
        </div>
      </div>
    </section>
  );
};

export default PopularProductsSlider;
