"use client";
import css from "../BackBtn/BackBtn.module.css";
import { useRouter } from "next/navigation";
export default function OrdersByProduct({ product }: { product: string }) {
  const router = useRouter();
  const handleClick = () => {
    router.push(`/orders/filters/${product}`);
    // Здесь можно добавить логику для получения заказов по продукту
    // Например, router.push(`/orders/filters/${product}`);
  };

  return (
    <button className={css.backButton} onClick={handleClick}>
      У кого під заявками
    </button>
  );
}
