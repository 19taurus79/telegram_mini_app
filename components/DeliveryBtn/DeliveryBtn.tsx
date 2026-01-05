"use client";
import { useRouter } from "next/navigation";
import css from "./DeliveryBtn.module.css";
import { useDelivery } from "@/store/Delivery";
import { useEffect, useState } from "react";
const DeliveryBtn = () => {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const { delivery } = useDelivery();
  
  if (!mounted || !delivery || delivery.length === 0) return null;
  return (
    <button className={css.backButton} onClick={() => router.push("/delivery")}>
      Доставка
    </button>
  );
};
export default DeliveryBtn;
