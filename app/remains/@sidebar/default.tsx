"use client";
import { useFilter } from "@/context/FilterContext";

const RemainsSidebar = () => {
  const { setSelectedGroup } = useFilter();
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
    <ul>
      {cat.map((item) => (
        <li key={item} onClick={() => handleClick(item)}>
          {item}
        </li>
      ))}
    </ul>
  );
};

export default RemainsSidebar;
