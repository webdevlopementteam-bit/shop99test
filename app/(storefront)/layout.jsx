import { Suspense } from "react";
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
          <Suspense fallback={null}>
            <Header />
          </Suspense>
          {children}
          <Footer />
          <ToastProvider />
        </CartProvider>
      </AuthProvider>
    </div>
  );
}
