// "use client";
//
// import { useRouter } from "next/navigation";
// import css from "./BackBtn.module.css";
//
// interface BackBtnProps {
//   isClose?: boolean; // Необязательный пропс, определяющий тип кнопки
// }
//
// const BackBtn: React.FC<BackBtnProps> = ({ isClose }) => {
//   const router = useRouter();
//
//   const handleAction = () => {
//     // Если пропс isClose передан (и равен true)
//     if (isClose) {
//       // Закрываем окно Telegram
//       window.Telegram?.WebApp?.close();
//     } else {
//       // Поведение по умолчанию: вернуться на предыдущую страницу
//       router.back();
//     }
//   };
//
//   return (
//     <button className={css.backButton} onClick={handleAction}>
//       {/* Текст на кнопке меняется в зависимости от пропса */}
//       {isClose ? "Закрити" : "Назад"}
//     </button>
//   );
// };
//
// export default BackBtn;

"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface BackBtnProps {
  isClose?: boolean;
}

const BackBtn: React.FC<BackBtnProps> = ({ isClose }) => {
  const router = useRouter();

  useEffect(() => {
    // If this is a "close" button, do nothing with the BackButton.
    // We can handle this case differently later if needed.
    if (isClose) {
      return;
    }

    const handleBack = () => {
      router.back();
    };

    const tg = window.Telegram?.WebApp;

    if (tg) {
      tg.BackButton.onClick(handleBack);
      tg.BackButton.show();
    }

    return () => {
      // The cleanup function will only run for the "back" case
      if (tg && !isClose) {
        tg.BackButton.hide();
      }
    };
  }, [isClose, router]); // Add isClose to dependency array

  // This component doesn't render any visible UI
  return null;
};

export default BackBtn;
