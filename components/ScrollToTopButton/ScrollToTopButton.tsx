// components/ScrollToTopButton.tsx
"use client";
import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react"; // Или любая иконка
import css from "./ScrollToTopButton.module.css";
export function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // const scrolled = window.scrollY;
      // console.log("Текущая позиция прокрутки:", scrolled, "px");
      setVisible(window.scrollY > 300); // показывать кнопку после 300px прокрутки
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
