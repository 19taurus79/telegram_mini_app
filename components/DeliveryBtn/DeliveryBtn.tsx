"use client";
import { useRouter } from "next/navigation";
import css from "./DeliveryBtn.module.css";
import { useDelivery } from "@/store/Delivery";
import { useEffect, useState, useMemo } from "react";
import { Truck, ShoppingBag } from "lucide-react";
import clsx from "clsx";
const DeliveryBtn = () => {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const { delivery } = useDelivery();
  
  const { totalCount, totalWeight } = useMemo(() => {
    return {
      totalCount: delivery.length,
      totalWeight: delivery.reduce((acc, item) => acc + (item.weight || 0), 0)
    };
  }, [delivery]);

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
    <div className={css.floatingContainer}>
      <button 
        className={clsx(css.cartButton, isAnimating && css.bump)} 
        onClick={() => router.push("/delivery")}
      >
        <div className={css.iconWrapper}>
          <ShoppingBag size={20} />
          <span className={css.badge}>{totalCount}</span>
        </div>
        <div className={css.infoWrapper}>
          <span className={css.label}>Доставка</span>
          <span className={css.weight}>{totalWeight.toFixed(1)} кг</span>
        </div>
        <Truck size={20} className={css.truckIcon} />
      </button>
    </div>
  );
};
export default DeliveryBtn;
