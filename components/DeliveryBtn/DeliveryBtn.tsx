"use client";
import { useRouter } from "next/navigation";
import css from "./DeliveryBtn.module.css";
const DeliveryBtn = () => {
  const router = useRouter();
  return (
    <button className={css.backButton} onClick={() => router.push("/delivery")}>
      Доставка
    </button>
  );
};
export default DeliveryBtn;
