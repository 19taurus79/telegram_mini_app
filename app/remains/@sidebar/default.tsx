"use client";
import { useFilter } from "@/context/FilterContext";
import css from "./RemainsSidebar.module.css";
import clsx from "clsx";

const RemainsSidebar = () => {
  const { setSelectedGroup, selectedGroup } = useFilter();
  const cat = [
    "ЗЗР",
    "Насіння",
    "Власне виробництво насіння",
    "Позакореневi добрива",
    "Міндобрива (основні)",
    "Всі",
  ];

  const handleClick = (item: string) => {
    if (item === "Всі") item = "";
    setSelectedGroup(item);
    console.log(item);
  };
  return (
    <ul className={css.sidebarList}>
      {cat.map((item) => {
        // Определяем, является ли текущий элемент активным
        // "Всі" соответствует пустой строке в selectedGroup
        const isActive =
          (item === "Всі" && selectedGroup === "") || item === selectedGroup;

        return (
          <li
            key={item}
            // Используем библиотеку clsx для условного добавления классов
            className={clsx(css.sidebarItem, {
              [css.active]: isActive,
            })}
            onClick={() => handleClick(item)}
          >
            {item}
          </li>
        );
      })}
    </ul>
  );
};

export default RemainsSidebar;
