// components/ScrollToTopButton.tsx
"use client";
import { useEffect, useState, useRef } from "react";
import { ArrowUp } from "lucide-react"; // Или любая иконка
import css from "./ScrollToTopButton.module.css";

export function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);
  // Используем useRef для хранения последней позиции скролла между рендерами
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollThreshold = 300;

      // Скрываем кнопку, если мы у самого верха страницы
      if (currentScrollY < scrollThreshold) {
        setVisible(false);
        lastScrollY.current = currentScrollY;
        return;
      }

      // Если прокручиваем вверх, показываем кнопку
      if (currentScrollY < lastScrollY.current) {
        setVisible(true);
      } 
      // Если прокручиваем вниз, скрываем кнопку
      else if (currentScrollY > lastScrollY.current) {
        setVisible(false);
      }

      // Обновляем последнюю позицию для следующего события
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []); // Пустой массив зависимостей, чтобы эффект выполнился один раз

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!visible) return null;

  return (
    <button
      onClick={scrollToTop}
      className={css.scrollToTopButton}
      aria-label="Вверх"
    >
      <ArrowUp size={20} />
    </button>
  );
}
