"use client";

import { useRouter } from "next/navigation";
import css from "./BackBtn.module.css";

interface BackBtnProps {
  isClose?: boolean; // Необязательный пропс, определяющий тип кнопки
}

const BackBtn: React.FC<BackBtnProps> = ({ isClose }) => {
  const router = useRouter();

  const handleAction = () => {
    // Если пропс isClose передан (и равен true)
    if (isClose) {
      // Закрываем окно Telegram
      window.Telegram?.WebApp?.close();
    } else {
      // Поведение по умолчанию: вернуться на предыдущую страницу
      router.back();
    }
  };

  return (
    <button className={css.backButton} onClick={handleAction}>
      {/* Текст на кнопке меняется в зависимости от пропса */}
      {isClose ? "Закрити" : "Назад"}
    </button>
  );
};

export default BackBtn;
