"use client";
import { useRouter } from "next/navigation";
import css from "./DeliveryBtn.module.css";
import { useDelivery } from "@/store/Delivery";
const DeliveryBtn = () => {
  const router = useRouter();
  const { delivery } = useDelivery();
  if (!delivery || delivery.length === 0) return null;
  return (
    <button className={css.backButton} onClick={() => router.push("/delivery")}>
      Доставка
    </button>
  );
};
export default DeliveryBtn;
