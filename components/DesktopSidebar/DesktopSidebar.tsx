"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, 
  Package, 
  Truck, 
  Map as MapIcon, 
  MapPin,
  ClipboardList, 
  Calendar, 
  CheckSquare, 
  PlusCircle, 
  Upload,
  Warehouse,
  ChevronRight,
  Database,
  RefreshCw,
} from "lucide-react";
import { useUser } from "@/store/User";
import { useInitData } from "@/store/InitData";
import { useDelivery } from "@/store/Delivery";
import { useUnmappedCount } from "@/hooks/useUnmappedCount";
import { requestDataUpdate } from "@/lib/api";
import toast from "react-hot-toast";
import css from "./DesktopSidebar.module.css";
import { useState, useEffect } from "react";

export default function DesktopSidebar() {
  const pathname = usePathname();
  const userData = useUser((state) => state.userData);
  const initData = useInitData((state) => state.initData);
  const { delivery } = useDelivery();
  const unmappedCount = useUnmappedCount();
  const [isMounted, setIsMounted] = useState(false);
  const [isRequestingUpdate, setIsRequestingUpdate] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleRequestUpdate = async () => {
    if (isRequestingUpdate) return;
    if (!initData) {
      toast.error("Помилка авторизації. Спробуйте оновити сторінку.");
      return;
    }
    setIsRequestingUpdate(true);
    try {
      const res = await requestDataUpdate(initData);
      if (res.success) {
        toast.success(res.message || "Запит надіслано адміністраторам!");
      } else {
        toast.error(res.message || "Не вдалося надіслати запит");
      }
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        (err as Error)?.message ||
        "Помилка при надсиланні запиту";
      toast.error(message);
    } finally {
      setIsRequestingUpdate(false);
    }
  };

  const deliveryCount = isMounted ? (delivery?.length || 0) : 0;
  const addressFixCount = isMounted ? unmappedCount : 0;

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
      href: "/address_fix", 
      label: "Уточнення адреси", 
      icon: <MapPin size={22} />,
      badge: addressFixCount > 0 ? addressFixCount : null
    },
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
    { href: `${process.env.NEXT_PUBLIC_URL_API}/admin/`, label: "База даних", icon: <Database size={22} />, external: true, condition: !userData?.is_guest },
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
                {item.badge && (
                  <span className={item.href === '/address_fix' ? css.badgeDanger : css.badge}>
                    {item.badge}
                  </span>
                )}
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
                target={item.external ? "_blank" : undefined}
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

        {!userData?.is_guest && (
          <div className={css.updateSection}>
            <button
              type="button"
              onClick={handleRequestUpdate}
              disabled={isRequestingUpdate}
              className={css.updateBtn}
              title="Потрібне оновлення"
            >
              <div className={css.iconWrapper}>
                <RefreshCw size={22} className={isRequestingUpdate ? css.spinning : ""} />
              </div>
              <span className={css.label}>
                {isRequestingUpdate ? "Надсилаємо..." : "Потрібне оновлення"}
              </span>
            </button>
          </div>
        )}
      </nav>
    </aside>
  );
}
