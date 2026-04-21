"use client";

import { useState, useMemo } from "react";
import { getAllProduct, getCategoryTree } from "@/lib/api";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useInitData } from "@/store/InitData";
import type { InitData } from "@/store/InitData";
import { useFilter } from "@/context/FilterContext";
import Link from "next/link";
import { Search, X, ChevronRight, Boxes, FolderOpen, SlidersHorizontal } from "lucide-react";
import BottomSheet from "@/components/UI/BottomSheet/BottomSheet";
import css from "./AvStock.module.css";

function AvStock() {
  const { selectedGroup, setSelectedGroup, setSelectedSubGroup } = useFilter();
  const [searchValue, setSearchValue] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const initData = useInitData((state: InitData) => state.initData);

  const { data: productsData, isLoading } = useQuery({
    queryKey: ["products", selectedGroup, searchValue, initData],
    queryFn: () =>
      getAllProduct({
        group: selectedGroup,
        searchValue: searchValue,
        initData: initData ?? "",
      }),
    placeholderData: keepPreviousData,
    enabled: !!initData,
  });

  const { data: categoriesData } = useQuery({
    queryKey: ["all_categories_tree", initData],
    queryFn: () => getCategoryTree(initData || ""),
    enabled: !!initData,
    staleTime: 1000 * 60 * 10,
  });

  const mainCategories = useMemo(() => {
    const sourceData = categoriesData || [];
    const set = new Set<string>();
    sourceData.forEach(item => {
      if (item.line_of_business) {
        set.add(item.line_of_business);
      }
    });

    const priority = ["ЗЗР", "Насіння", "Власне виробництво насіння", "Позакореневi добрива", "Міндобрива (основні)"];
    
    const sorted = Array.from(set).sort((a, b) => {
        const idxA = priority.indexOf(a);
        const idxB = priority.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.localeCompare(b);
    });

    return sorted;
  }, [categoriesData]);

  const handleGroupSelect = (groupName: string) => {
    setSelectedGroup(groupName);
    setSelectedSubGroup(""); // Reset subgroup entirely when a new category is chosen or cleared
    setIsFilterOpen(false);
  };



  return (
    <div className={css.pageContent}>
      {/* Вбудований пошук — компактний хедер у стилі Apple */}
      <div className={css.headerWrapper}>
        <div className={css.searchInterface}>
          <div className={css.searchWrapper}>
            <Search size={18} className={css.searchIcon} />
            <input
              type="text"
              placeholder="Пошук товару..."
              className={css.searchInput}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
            {searchValue && (
              <button
                className={css.clearBtn}
                onClick={() => setSearchValue("")}
                aria-label="Очистити пошук"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button 
            className={`${css.filterBtn} ${selectedGroup ? css.active : ''}`}
            onClick={() => setIsFilterOpen(true)}
            title="Фільтри"
          >
            <SlidersHorizontal size={20} />
          </button>
        </div>
      </div>

      <ul className={css.listContainer}>
        {productsData?.map((item) => (
          <li key={item.id} className={css.productCard}>
            <Link href={`/av_stock/${item.id}`} className={css.link}>
              <span className={css.productName}>{item.product}</span>
              
              <div className={css.productMeta}>
                {item.line_of_business && (
                  <div className={css.metaItem}>
                    <Boxes size={14} />
                    <span>{item.line_of_business}</span>
                  </div>
                )}
                {item.parent_element && (
                  <div className={css.metaItem}>
                    <FolderOpen size={14} />
                    <span>{item.parent_element}</span>
                  </div>
                )}
              </div>

              <ChevronRight size={18} className={css.chevron} />
            </Link>
          </li>
        ))}

        {!isLoading && productsData?.length === 0 && (
          <div style={{ padding: "40px 20px", textAlign: "center", opacity: 0.5 }}>
            <p>Товарів не знайдено</p>
          </div>
        )}
      </ul>

      {/* Фільтр категорій */}
      <BottomSheet
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        title="Категорії товарів"
      >
        <ul className={css.filterList}>
          <li 
            className={`${css.filterItem} ${!selectedGroup ? css.activeFilterItem : ''}`}
            onClick={() => handleGroupSelect("")}
          >
            Усі товари
          </li>
          {mainCategories.map((groupName) => (
            <li key={groupName} className={css.filterItemWrapper}>
              <div 
                className={`${css.filterItem} ${selectedGroup === groupName ? css.activeFilterItem : ''}`}
                onClick={() => handleGroupSelect(groupName)}
              >
                <span>{groupName}</span>
              </div>
            </li>
          ))}
        </ul>
      </BottomSheet>
    </div>
  );
}

export default AvStock;
