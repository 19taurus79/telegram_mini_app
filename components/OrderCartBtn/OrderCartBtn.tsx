"use client";
import { useRouter } from "next/navigation";
import css from "./OrderCartBtn.module.css";
import { useOrderCart } from "@/store/OrderCart";
import { useDelivery } from "@/store/Delivery";
import { useEffect, useState } from "react";
import { PlusCircle, ShoppingCart } from "lucide-react";
import clsx from "clsx";

const OrderCartBtn = () => {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const { selectedItems } = useOrderCart();
  const { delivery } = useDelivery();

  const totalCount = selectedItems.length;
  const isDeliveryActive = delivery.length > 0;

  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (totalCount > 0) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [totalCount]);

  if (!mounted || totalCount === 0) return null;

  return (
    <div 
      className={clsx(css.floatingContainer, isDeliveryActive && css.shifted)}
    >
      <button 
        className={clsx(css.cartButton, isAnimating && css.bump)} 
        onClick={() => router.push("/bi?showSelected=true")}
      >
        <div className={css.iconWrapper}>
          <ShoppingCart size={20} />
          <span className={css.badge}>{totalCount}</span>
        </div>
        <div className={css.infoWrapper}>
          <span className={css.label}>Замовити</span>
          <span className={css.subLabel}>у вкладку Замовити (BI)</span>
        </div>
        <PlusCircle size={20} className={css.plusIcon} />
      </button>
    </div>
  );
};

export default OrderCartBtn;
