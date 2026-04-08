"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, 
  Package, 
  Truck, 
  Map as MapIcon, 
  ClipboardList, 
  Calendar, 
  CheckSquare, 
  PlusCircle, 
  Upload,
  Warehouse,
  ChevronRight
} from "lucide-react";
import { useUser } from "@/store/User";
import { useDelivery } from "@/store/Delivery";
import css from "./DesktopSidebar.module.css";
import { useState, useEffect } from "react";

export default function DesktopSidebar() {
  const pathname = usePathname();
  const userData = useUser((state) => state.userData);
  const { delivery } = useDelivery();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const deliveryCount = isMounted ? (delivery?.length || 0) : 0;

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  if (pathname === '/login') return null;

  const navItems = [
    { href: "/", label: "Головна", icon: <Home size={22} /> },
    { href: "/remains", label: "Наш склад", icon: <Package size={22} /> },
    { href: "/av_stock", label: "Інші склади", icon: <Warehouse size={22} /> },
    { href: "/orders", label: "Заявки", icon: <ClipboardList size={22} /> },
    { 
      href: "/delivery", 
      label: "Доставка", 
      icon: <Truck size={22} />,
      badge: deliveryCount > 0 ? deliveryCount : null
    },
    { href: "/events", label: "Події", icon: <Calendar size={22} /> },
    { href: "/tasks", label: "Задачі", icon: <CheckSquare size={22} /> },
  ];

  const adminItems = [
    { href: "/bi", label: "Замовити", icon: <PlusCircle size={22} />, condition: !userData?.is_guest },
    { href: "/admin/upload", label: "Завантажити", icon: <Upload size={22} />, condition: !userData?.is_guest },
    { href: "/map", label: "Мапа", icon: <MapIcon size={22} /> },
  ];

  return (
    <aside className={css.sidebar}>
      <nav className={css.nav}>
        <div className={css.section}>
          {navItems.map((item) => (
            <Link 
              key={item.href} 
              href={item.href} 
              className={`${css.navLink} ${isActive(item.href) ? css.active : ""}`}
            >
              <div className={css.iconWrapper}>
                {item.icon}
                {item.badge && <span className={css.badge}>{item.badge}</span>}
              </div>
              <span className={css.label}>{item.label}</span>
              {isActive(item.href) && <ChevronRight className={css.activeIndicator} size={14} />}
            </Link>
          ))}
        </div>

        {userData?.is_admin && (
          <div className={css.section}>
            <div className={css.sectionTitle}>Адмін</div>
            {adminItems.filter(i => i.condition !== false).map((item) => (
              <Link 
                key={item.href} 
                href={item.href} 
                className={`${css.navLink} ${isActive(item.href) ? css.active : ""}`}
              >
                <div className={css.iconWrapper}>
                  {item.icon}
                </div>
                <span className={css.label}>{item.label}</span>
                {isActive(item.href) && <ChevronRight className={css.activeIndicator} size={14} />}
              </Link>
            ))}
          </div>
        )}
      </nav>
    </aside>
  );
}
