// Вказує, що цей файл є Клієнтським Компонентом в Next.js.
"use client";

import { useState } from "react";
import css from "./FilterPanel.module.css";

interface FilterOptions {
  document_status: string[];
  delivery_status: string[];
}

interface FilterPanelProps {
  options: FilterOptions;
  onApply: (filters: {
    document_status: string[];
    delivery_status: string[];
  }) => void;
  isSubmitting: boolean; // Новий пропс для стану завантаження
}

const FilterPanel = ({
  options,
  onApply,
  isSubmitting,
}: FilterPanelProps) => {
  const [selectedDocStatuses, setSelectedDocStatuses] = useState<string[]>([]);
  const [selectedDeliveryStatuses, setSelectedDeliveryStatuses] = useState<
    string[]
  >([]);

  const handleCheckboxChange = (
    value: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    currentValues: string[]
  ) => {
    // Блокуємо зміну чекбоксів під час завантаження
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
                disabled={isSubmitting} // Блокуємо чекбокс
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
                disabled={isSubmitting} // Блокуємо чекбокс
              />
              {status}
            </label>
          ))}
        </div>
        <div className={css.buttonGroup}>
          <button
            onClick={handleApplyClick}
            className={css.applyButton}
            disabled={isSubmitting} // Блокуємо кнопку
          >
            {isSubmitting ? "Завантаження..." : "Застосувати"}
          </button>
          {hasActiveFilters && (
            <button
              onClick={handleClearClick}
              className={css.clearButton}
              disabled={isSubmitting} // Блокуємо кнопку
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
