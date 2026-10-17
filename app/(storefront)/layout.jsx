import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";
import ToastProvider from "@/components/ToastProvider";
import "react-toastify/dist/ReactToastify.css";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

export default function StorefrontLayout({ children }) {
  return (
    <div className="site-scope">
      <AuthProvider>
        <CartProvider>
          {/* No <Suspense> here: Header renders with the page, so nothing
              jumps when it appears. Its useSearchParams() part has its own. */}
          <Header />
          <main>{children}</main>
          <Footer />
          <ToastProvider />
        </CartProvider>
      </AuthProvider>
    </div>
  );
}
