import { AdminAuthProvider } from "@/context/AdminAuthContext";
import AdminToastProvider from "@/components/admin/AdminToastProvider";
import "react-toastify/dist/ReactToastify.css";
import "./admin.css";

export const metadata = {
  title: "Shop99 Admin",
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }) {
  return (
    <AdminAuthProvider>
      <AdminToastProvider />
      {children}
    </AdminAuthProvider>
  );
}
