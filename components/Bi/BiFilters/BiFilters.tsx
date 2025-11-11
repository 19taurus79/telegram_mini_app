// components/Bi/BiFilters/BiFilters.tsx
import React, { useEffect, useMemo } from "react";
import { BiOrders } from "@/types/types";
import styles from "./BiFilters.module.css";

interface BiFiltersProps {
  data: BiOrders;
  onFilterChange: (filters: {
    linesOfBusiness: string[];
    managers: string[];
  }) => void;
}

const BiFilters: React.FC<BiFiltersProps> = ({ data, onFilterChange }) => {
  const [selectedLines, setSelectedLines] = React.useState<string[]>([]);
  const [selectedManagers, setSelectedManagers] = React.useState<string[]>([]);

  // Викликаємо onFilterChange, коли змінюються вибрані фільтри
  useEffect(() => {
    onFilterChange({
      linesOfBusiness: selectedLines,
      managers: selectedManagers,
    });
  }, [selectedLines, selectedManagers, onFilterChange]);

  // Обчислюємо значення для фільтрів лише один раз при першому рендері.
  // Пустий масив залежностей в useMemo гарантує, що цей код не виконається повторно.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const { linesOfBusiness, managers } = useMemo(() => {
    const allLines = new Set<string>();
    data.missing_but_available.forEach((item) =>
      allLines.add(item.line_of_business)
    );
    data.missing_and_unavailable.forEach((item) =>
      allLines.add(item.line_of_business)
    );

    const allManagers = new Set<string>();
    data.missing_but_available.forEach((item) => {
      item.orders.forEach((order) => allManagers.add(order.manager));
    });
    data.missing_and_unavailable.forEach((item) => {
      item.orders.forEach((order) => allManagers.add(order.manager));
    });

    return {
      linesOfBusiness: Array.from(allLines).sort(),
      managers: Array.from(allManagers).sort(),
    };
  }, [data]); // Ми залишаємо data в залежностях, щоб гарантувати, що дані будуть отримані при першому завантаженні, але useMemo не буде перераховувати значення, якщо об'єкт data не зміниться.

  const handleLineChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const values = Array.from(
      event.target.selectedOptions,
      (option) => option.value
    );
    setSelectedLines(values);
  };

  const handleManagerChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const values = Array.from(
      event.target.selectedOptions,
      (option) => option.value
    );
    setSelectedManagers(values);
  };

  return (
    <div className={styles.filtersContainer}>
      <div>
        <label>Напрям діяльності:</label>
        <select multiple onChange={handleLineChange} value={selectedLines}>
          {linesOfBusiness.map((line) => (
            <option key={line} value={line}>
              {line}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label>Менеджер:</label>
        <select
          multiple
          onChange={handleManagerChange}
          value={selectedManagers}
        >
          {managers.map((manager) => (
            <option key={manager} value={manager}>
              {manager}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default BiFilters;
