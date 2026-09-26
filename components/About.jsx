import TestimonialSlider from "@/components/TestimonialSlider";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTruckFast, faHeart, faShieldHalved, faCircleCheck } from "@fortawesome/free-solid-svg-icons";

const wheel = "/assets/home/charger.png";
const aboutimg = "/assets/banner/aboutimg.jpeg";

const features = [
  {
    icon: faTruckFast,
    title: "Fast & reliable delivery",
    desc: "We ship across India with care—track your order and get updates so you always know when your gear arrives.",
  },
  {
    icon: faHeart,
    title: "Built for enthusiasts",
    desc: "Loyalty rewards and curated picks for people who care about sound, quality, and value.",
  },
  {
    icon: faShieldHalved,
    title: "Quality you can trust",
    desc: "Easy returns and a money-back mindset—shop with confidence on every order.",
  },
];

const highlights = [
  "Car audio & visual — speakers, amps, woofers & more",
  "GPS, seat covers, security & parking solutions",
  "Home audio & entertainment gear",
];

const AboutUs = () => {
  return (
    <>
      {/* Story + image */}
      <section className="bg-gray-50 py-14 sm:py-20">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 lg:grid-cols-2 lg:gap-16">
          <div className="order-2 lg:order-1">
            <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">Who we are</h2>
            <div className="mt-2 h-1 w-14 rounded-full bg-secondaryColor" />
            <p className="mt-6 text-gray-600 leading-relaxed">
              <span className="font-semibold text-primaryColor">“Shop99”</span> is a proprietorship firm incorporated in 2015. Our core
              business covers car audio and video with a diversified range of products — speakers, amplifiers, and complete car
              audio-visual solutions.
            </p>
            <p className="mt-4 text-gray-600 leading-relaxed">
              We pursue innovation continuously and aim to bring products that turn entertainment into an experience. Having carved a
              niche with excellent quality, we offer car wrapping, Bluetooth kits, audio systems, GPS, seat covers, parking sensors,
              security solutions, home amplifiers, music systems, and more.
            </p>
            <ul className="mt-8 space-y-3">
              {highlights.map((line) => (
                <li key={line} className="flex items-start gap-3 text-sm text-gray-700 sm:text-base">
                  <FontAwesomeIcon icon={faCircleCheck} className="mt-0.5 shrink-0 text-secondaryColor" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-600 shadow-sm">
              We promise quality, durability, responsive support, and fair pricing — so you can shop with confidence.
            </p>
          </div>

          <div className="order-1 lg:order-2">
            <div className="relative mx-auto max-w-lg">
              <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-secondaryColor/15 blur-2xl sm:h-32 sm:w-32" />
              <div className="absolute -bottom-6 -left-6 h-28 w-28 rounded-full bg-primaryColor/20 blur-2xl" />
              <div className="relative overflow-hidden rounded-3xl shadow-2xl ring-1 ring-gray-200/80">
                <img src={aboutimg} alt="Shop99 products" className="aspect-[4/3] w-full object-contain" />
              </div>
              <div className="absolute -bottom-6 left-4 w-[55%] max-w-[220px] overflow-hidden rounded-2xl border-4 border-white shadow-xl sm:-bottom-8 sm:left-6 md:w-1/2" />
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-gray-200 bg-white py-12 sm:py-16">
        <div className="mx-auto grid max-w-7xl gap-6 px-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center gap-4 rounded-2xl bg-gradient-to-br from-gray-50 to-white p-6 shadow-sm ring-1 ring-gray-100">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50">
              <img src={wheel} alt="" className="h-9 w-9 object-contain" />
            </div>
            <div>
              <p className="text-2xl font-bold text-primaryColor sm:text-3xl">8M+</p>
              <p className="text-sm text-gray-500">Parts & SKUs</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-2xl bg-gradient-to-br from-gray-50 to-white p-6 shadow-sm ring-1 ring-gray-100">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-primaryColor">
              <FontAwesomeIcon icon={faHeart} className="text-2xl" />
            </div>
            <div>
              <p className="text-2xl font-bold text-primaryColor sm:text-3xl">10M+</p>
              <p className="text-sm text-gray-500">Happy customers</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-2xl bg-gradient-to-br from-gray-50 to-white p-6 shadow-sm ring-1 ring-gray-100 sm:col-span-2 lg:col-span-1">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <FontAwesomeIcon icon={faShieldHalved} className="text-2xl" />
            </div>
            <div>
              <p className="text-lg font-bold text-primaryColor">Quality first</p>
              <p className="text-sm text-gray-500">Tested & trusted gear</p>
            </div>
          </div>
          <div className="flex items-center justify-center rounded-2xl border-2 border-dashed border-secondaryColor/40 bg-orange-50/50 p-6 sm:col-span-2 lg:col-span-1">
            <p className="text-center text-sm font-medium text-primaryColor">One stop for car & home accessory needs</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-100 py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-5">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">Why shoppers choose us</h2>
            <p className="mt-3 text-gray-600">
              Straightforward benefits—no gimmicks, just service you can feel at checkout and after delivery.
            </p>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {features.map((item) => (
              <div
                key={item.title}
                className="group rounded-2xl border border-gray-200/80 bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 text-secondaryColor transition group-hover:scale-105">
                  <FontAwesomeIcon icon={item.icon} className="text-2xl" />
                </div>
                <h3 className="text-lg font-semibold text-primaryColor">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <TestimonialSlider />
    </>
  );
};

export default AboutUs;
