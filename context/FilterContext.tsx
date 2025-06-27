// contexts/FilterContext.tsx
"use client"; // Важно: этот контекст будет использоваться на клиенте

import React, { createContext, useState, useContext, ReactNode } from "react";

// Определяем тип для состояния контекста
interface FilterContextType {
  selectedGroup: string | "";
  setSelectedGroup: (group: string | "") => void;
  searchValue: string | "";
  setSearchValue: (value: string | "") => void;
}

// Создаем контекст с дефолтными значениями (или undefined, если он всегда будет инициализирован)
const FilterContext = createContext<FilterContextType | undefined>(undefined);

// Компонент-провайдер, который будет предоставлять состояние
export const FilterProvider = ({ children }: { children: ReactNode }) => {
  const [selectedGroup, setSelectedGroup] = useState<string | "">("");
  const [searchValue, setSearchValue] = useState<string | "">("");

  return (
    <FilterContext.Provider
      value={{ selectedGroup, setSelectedGroup, searchValue, setSearchValue }}
    >
      {children}
    </FilterContext.Provider>
  );
};

// Хук для удобного доступа к контексту
export const useFilter = () => {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error("useFilter must be used within a FilterProvider");
  }
  return context;
};
