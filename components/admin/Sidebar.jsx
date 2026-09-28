"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  Boxes,
  ShoppingCart,
  BarChart3,
  Settings,
  ChevronDown,
  ChevronRight,
  Image,
  Menu,
  X,
  Package,
  Tags,
  Layers,
  ClipboardList,
  Ticket,
  Tag,
  BadgePercent,
  Sliders,
  PackageX,
  Search,
  Star,
  TrendingUp,
  Clock3,
  Zap,
  Image as ImageIcon,
  MessageSquare,
  ShieldCheck,
  UserCircle,
  Mail,
  BookOpen,
} from "lucide-react";
import { SlidersHorizontal } from "lucide-react";

const logo = "/admin-assets/logo.svg";

/* ================= MENU SECTION ================= */

const MenuSection = ({ icon: Icon, title, children }) => {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <div
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[#1F2937] rounded-lg transition mx-2"
      >
        <div className="flex items-center gap-3 text-gray-300">
          {/* ICON BOX */}
          <div className="p-2 rounded-md bg-[#1F2937]">
            <Icon size={16} />
          </div>

          <span className="text-sm">{title}</span>
        </div>

        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </div>

      {open && <div className="ml-10 mt-1 flex flex-col text-sm text-gray-400 space-y-1">{children}</div>}
    </div>
  );
};

/* ================= LINK ================= */

const SidebarLink = ({ to, label, icon: Icon, closeSidebar }) => {
  const pathname = usePathname();
  const isActive = pathname === to;

  return (
    <Link
      href={to}
      onClick={closeSidebar}
      className={`flex items-center gap-2 py-2 px-3 rounded-md transition text-sm ${
        isActive ? "bg-[#00C2A8]/20 text-[#00C2A8]" : "hover:bg-[#1F2937] text-gray-400"
      }`}
    >
      {Icon && <Icon size={14} />}
      <span>{label}</span>
    </Link>
  );
};

/* ================= TOP-LEVEL NAV LINK ================= */

const TopNavLink = ({ to, label, icon: Icon, onClick }) => {
  const pathname = usePathname();
  const isActive = pathname === to;

  return (
    <Link
      href={to}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg mx-2 transition ${
        isActive ? "bg-gradient-to-r from-[#00C2A8]/20 to-[#00A8FF]/20 text-[#00C2A8]" : "hover:bg-[#1F2937] text-gray-300"
      }`}
    >
      <div className="p-2 rounded-md bg-[#1F2937]">
        <Icon size={16} />
      </div>
      <span className="text-sm font-medium">{label}</span>
    </Link>
  );
};

/* Same shape as TopNavLink, but SEO/Blogs used a plain (non-gradient) active fill in the original. */
const SimpleTopNavLink = ({ to, label, icon: Icon, onClick }) => {
  const pathname = usePathname();
  const isActive = pathname === to;

  return (
    <Link
      href={to}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg mx-2 transition ${
        isActive ? "bg-[#00C2A8]/20 text-[#00C2A8]" : "hover:bg-[#1F2937] text-gray-300"
      }`}
    >
      <div className="p-2 rounded-md bg-[#1F2937]">
        <Icon size={16} />
      </div>
      <span className="text-sm">{label}</span>
    </Link>
  );
};

/* ================= MAIN ================= */

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* MOBILE BUTTON */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button onClick={() => setIsOpen(true)} className="bg-[#00C2A8] text-white p-2 rounded-md">
          <Menu size={22} />
        </button>
      </div>

      {/* OVERLAY */}
      {isOpen && <div onClick={() => setIsOpen(false)} className="fixed inset-0 bg-black/40 z-40 lg:hidden" />}

      {/* SIDEBAR */}
      <div
        className={`fixed top-0 left-0 h-full w-64 bg-[#0B0F19] text-white flex flex-col z-50 transform transition-transform duration-300
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0 lg:static`}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800">
          <img src={logo} className="w-28" alt="logo" />

          <button onClick={() => setIsOpen(false)} className="lg:hidden">
            <X size={20} />
          </button>
        </div>

        {/* MENU */}
        <div className="flex-1 overflow-y-auto py-4 space-y-1 pr-2 custom-scrollbar">
          {/* DASHBOARD */}
          <TopNavLink to="/admin" label="Dashboard" icon={LayoutDashboard} onClick={() => setIsOpen(false)} />

          {/* Admin profile — not related to store customers */}
          <TopNavLink to="/admin/adminUser" label="My account" icon={UserCircle} onClick={() => setIsOpen(false)} />

          {/* USERS (store customers only) */}
          <MenuSection icon={Users} title="Users">
            <SidebarLink to="/admin/customers" label="Customers" closeSidebar={() => setIsOpen(false)} />
            <SidebarLink to="/admin/newsletter-subscriptions" label="Newsletter" icon={Mail} closeSidebar={() => setIsOpen(false)} />
          </MenuSection>

          {/* CATALOG */}
          <MenuSection icon={Boxes} title="Catalog">
            <SidebarLink to="/admin/products" label="Products" icon={Package} closeSidebar={() => setIsOpen(false)} />

            <SidebarLink to="/admin/out-of-stock" label="Out of Stock" icon={PackageX} closeSidebar={() => setIsOpen(false)} />

            <SidebarLink to="/admin/categories" label="Categories" icon={Layers} closeSidebar={() => setIsOpen(false)} />

            <SidebarLink to="/admin/brands" label="Brands" icon={Tags} closeSidebar={() => setIsOpen(false)} />

            <SidebarLink to="/admin/attribute" label="Attributes" icon={SlidersHorizontal} closeSidebar={() => setIsOpen(false)} />
          </MenuSection>

          {/* Attribute Mapping */}

          <MenuSection icon={Sliders} title="Attributes Mapping">
            <SidebarLink to="/admin/category-attributes" label="Category Attributes" icon={Layers} closeSidebar={() => setIsOpen(false)} />
          </MenuSection>

          {/* SALES */}
          <MenuSection icon={ShoppingCart} title="Sales">
            <SidebarLink to="/admin/orders" label="Orders" icon={ClipboardList} closeSidebar={() => setIsOpen(false)} />
            <SidebarLink to="/admin/all-orders" label="All Orders" icon={ClipboardList} closeSidebar={() => setIsOpen(false)} />
            <SidebarLink to="/admin/warranty" label="Warranty Register" icon={ShieldCheck} closeSidebar={() => setIsOpen(false)} />
          </MenuSection>

          {/* REPORTS */}
          <MenuSection icon={BarChart3} title="Reports">
            <SidebarLink to="/admin/inventory" label="Inventory Ledger" closeSidebar={() => setIsOpen(false)} />
            <SidebarLink to="/admin" label="Payments" closeSidebar={() => setIsOpen(false)} />
          </MenuSection>

          {/* CONTENT */}
          <MenuSection icon={Image} title="Content">
            <SidebarLink to="/admin/top-banner" label="Top Banner" icon={ImageIcon} closeSidebar={() => setIsOpen(false)} />
            <SidebarLink to="/admin/reviews" label="Reviews" icon={MessageSquare} closeSidebar={() => setIsOpen(false)} />
          </MenuSection>

          {/* PROMOTIONS */}
          <MenuSection icon={BadgePercent} title="Promotions">
            <SidebarLink to="/admin/offers" label="Offers" icon={Ticket} closeSidebar={() => setIsOpen(false)} />

            <SidebarLink to="/admin/coupons" label="Coupons" icon={Tag} closeSidebar={() => setIsOpen(false)} />

            <SidebarLink to="/admin/popular-products" label="Popular Products" icon={Star} closeSidebar={() => setIsOpen(false)} />

            <SidebarLink to="/admin/most-selling-products" label="Most Selling Products" icon={TrendingUp} closeSidebar={() => setIsOpen(false)} />

            <SidebarLink to="/admin/latest-products" label="Latest Products" icon={Clock3} closeSidebar={() => setIsOpen(false)} />

            <SidebarLink to="/admin/deals-products" label="Deals Products" icon={Zap} closeSidebar={() => setIsOpen(false)} />
          </MenuSection>

          {/* SEO */}

          <SimpleTopNavLink to="/admin/seo" label="SEO" icon={Search} onClick={() => setIsOpen(false)} />

          <SimpleTopNavLink to="/admin/blogs" label="Blogs" icon={BookOpen} onClick={() => setIsOpen(false)} />

          <MenuSection icon={Settings} title="Settings">
            <SidebarLink to="/admin/footer" label="Footer Settings" icon={Ticket} closeSidebar={() => setIsOpen(false)} />

            <SidebarLink to="/admin/about" label="About us" icon={Tag} closeSidebar={() => setIsOpen(false)} />
          </MenuSection>
        </div>
      </div>
    </>
  );
}
