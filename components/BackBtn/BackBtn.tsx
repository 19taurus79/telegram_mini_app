"use client";
import { useRouter } from "next/navigation";
import css from "./BackBtn.module.css";
const BackBtn = () => {
  const router = useRouter();
  return (
    <button className={css.backButton} onClick={() => router.back()}>
      Назад
    </button>
  );
};
export default BackBtn;
