import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getActiveFooter } from "@/lib/storefrontLists";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";
import ToastProvider from "@/components/ToastProvider";
// toastify, slick and swiper CSS — one file (see styles/vendor.css).
import "@/styles/vendor.css";

export default async function StorefrontLayout({ children }) {
  // Server-side so the footer's contact details are in the HTML; null → the
  // Footer fetches it in the browser as before.
  const footer = await getActiveFooter().catch((err) => {
    console.error("Footer:", err);
    return null;
  });

  return (
    <div className="site-scope">
      <AuthProvider>
        <CartProvider>
          {/* No <Suspense> here: Header renders with the page, so nothing
              jumps when it appears. Its useSearchParams() part has its own. */}
          <Header />
          <main>{children}</main>
          <Footer initialFooter={footer} />
          <ToastProvider />
        </CartProvider>
      </AuthProvider>
    </div>
  );
}
