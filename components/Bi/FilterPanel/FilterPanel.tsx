// Вказує, що цей файл є Клієнтським Компонентом в Next.js.
"use client";

import { useState, useEffect } from "react"; // Імпортуємо useEffect
import css from "./FilterPanel.module.css";
import { FiltersState } from "@/types/types"; // Імпортуємо FiltersState

interface FilterOptions {
  document_status: string[];
  delivery_status: string[];
}

interface FilterPanelProps {
  options: FilterOptions;
  onApply: (filters: FiltersState) => void;
  isSubmitting: boolean;
  appliedFilters: FiltersState; // Новий пропс для синхронізації
}

const FilterPanel = ({
  options,
  onApply,
  isSubmitting,
  appliedFilters, // Отримуємо новий пропс
}: FilterPanelProps) => {
  const [selectedDocStatuses, setSelectedDocStatuses] = useState<string[]>([]);
  const [selectedDeliveryStatuses, setSelectedDeliveryStatuses] = useState<
    string[]
  >([]);

  // Цей useEffect синхронізує внутрішній стан панелі з глобальним станом фільтрів
  useEffect(() => {
    setSelectedDocStatuses(appliedFilters.document_status);
    setSelectedDeliveryStatuses(appliedFilters.delivery_status);
  }, [appliedFilters]); // Запускається щоразу, коли змінюються застосовані фільтри

  const handleCheckboxChange = (
    value: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    currentValues: string[]
  ) => {
    if (isSubmitting) return;
    if (currentValues.includes(value)) {
      setter(currentValues.filter((item) => item !== value));
    } else {
      setter([...currentValues, value]);
    }
  };

  const handleApplyClick = () => {
    onApply({
      document_status: selectedDocStatuses,
      delivery_status: selectedDeliveryStatuses,
    });
  };

  const handleClearClick = () => {
    setSelectedDocStatuses([]);
    setSelectedDeliveryStatuses([]);
    onApply({
      document_status: [],
      delivery_status: [],
    });
  };

  // Тепер ця логіка буде працювати коректно, оскільки стан синхронізовано
  const hasActiveFilters =
    selectedDocStatuses.length > 0 || selectedDeliveryStatuses.length > 0;

  return (
    <div className={css.filterPanel}>
      <h3 className={css.title}>Фільтри</h3>
      <div className={css.wrapper}>
        <div className={css.filterGroup}>
          <h4>Статус документа</h4>
          {options.document_status.map((status) => (
            <label key={status} className={css.checkboxLabel}>
              <input
                type="checkbox"
                value={status}
                checked={selectedDocStatuses.includes(status)}
                onChange={() =>
                  handleCheckboxChange(
                    status,
                    setSelectedDocStatuses,
                    selectedDocStatuses
                  )
                }
                disabled={isSubmitting}
              />
              {status}
            </label>
          ))}
        </div>
        <div className={css.filterGroup}>
          <h4>Статус до постачання</h4>
          {options.delivery_status.map((status) => (
            <label key={status} className={css.checkboxLabel}>
              <input
                type="checkbox"
                value={status}
                checked={selectedDeliveryStatuses.includes(status)}
                onChange={() =>
                  handleCheckboxChange(
                    status,
                    setSelectedDeliveryStatuses,
                    selectedDeliveryStatuses
                  )
                }
                disabled={isSubmitting}
              />
              {status}
            </label>
          ))}
        </div>
        <div className={css.buttonGroup}>
          <button
            onClick={handleApplyClick}
            className={css.applyButton}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Завантаження..." : "Застосувати"}
          </button>
          {hasActiveFilters && (
            <button
              onClick={handleClearClick}
              className={css.clearButton}
              disabled={isSubmitting}
            >
              Очистити
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FilterPanel;
