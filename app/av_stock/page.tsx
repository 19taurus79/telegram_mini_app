"use client";

import { useState, useMemo, useEffect } from "react";
import { getAllProduct, getAvRemainsById, getCategoryTree } from "@/lib/api";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useInitData } from "@/store/InitData";
import type { InitData } from "@/store/InitData";
import { useFilter } from "@/context/FilterContext";
import Link from "next/link";
import {
  Search,
  X,
  ChevronRight,
  Boxes,
  FolderOpen,
  SlidersHorizontal,
  Warehouse,
  Package,
  MapPin,
} from "lucide-react";
import BottomSheet from "@/components/UI/BottomSheet/BottomSheet";
import css from "./AvStock.module.css";
import type { Product } from "@/types/types";

function AvStock() {
  const { selectedGroup, setSelectedGroup, setSelectedSubGroup } = useFilter();
  const [searchValue, setSearchValue] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  // For desktop detail sub-level: which division is selected
  const [selectedDivId, setSelectedDivId] = useState<string | null>(null);

  const initData = useInitData((state: InitData) => state.initData);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 900px)");
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => {
      setIsDesktop(e.matches);
      if (!e.matches) setSelectedProduct(null);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

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

  // Detail query — only when a product is selected on desktop
  const {
    data: detailData,
    isLoading: isDetailLoading,
    isFetching: isDetailFetching,
  } = useQuery({
    queryKey: ["av_stock_detail", selectedProduct?.id, initData],
    queryFn: () =>
      getAvRemainsById({
        productId: selectedProduct!.id,
        initData: initData ?? "",
      }),
    enabled: !!selectedProduct && !!initData && isDesktop,
    staleTime: 1000 * 60 * 2,
  });

  // Auto-select first division with warehouses when detail loads
  useEffect(() => {
    if (detailData && detailData.length > 0) {
      const first = detailData.find((r) => r.warehouses && r.warehouses.length > 0);
      setSelectedDivId(first?.id ?? detailData[0].id);
    } else {
      setSelectedDivId(null);
    }
  }, [detailData]);

  const mainCategories = useMemo(() => {
    const sourceData = categoriesData || [];
    const set = new Set<string>();
    sourceData.forEach((item) => {
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

  const handleProductClick = (item: Product) => {
    if (isDesktop) {
      setSelectedProduct(item);
      setSelectedDivId(null);
    }
    // On mobile — Link handles the navigation
  };

  const selectedDiv = detailData?.find((r) => r.id === selectedDivId);
  const totalSelectedQty =
    selectedDiv?.warehouses?.reduce((sum, w) => sum + w.available, 0) ?? 0;

  return (
    <div className={`${css.pageContent} ${isDesktop ? css.pageDesktop : ""}`}>
      {/* === LEFT: Product List === */}
      <div className={css.leftPanel}>
        {/* Search Header */}
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
              className={`${css.filterBtn} ${selectedGroup ? css.active : ""}`}
              onClick={() => setIsFilterOpen(true)}
              title="Фільтри"
            >
              <SlidersHorizontal size={20} />
            </button>
          </div>
        </div>

        <ul className={css.listContainer}>
          {productsData?.map((item) => {
            const isActive = isDesktop && selectedProduct?.id === item.id;
            const cardClass = `${css.productCard} ${isActive ? css.productCardActive : ""}`;

            // Desktop: no navigation, just select
            if (isDesktop) {
              return (
                <li key={item.id} className={cardClass}>
                  <div
                    className={css.link}
                    onClick={() => handleProductClick(item)}
                    role="button"
                    tabIndex={0}
                  >
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
                  </div>
                </li>
              );
            }

            // Mobile: navigate to detail page
            return (
              <li key={item.id} className={cardClass}>
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
            );
          })}

          {!isLoading && productsData?.length === 0 && (
            <div style={{ padding: "40px 20px", textAlign: "center", opacity: 0.5 }}>
              <p>Товарів не знайдено</p>
            </div>
          )}
        </ul>
      </div>

      {/* === RIGHT: Detail Panel (desktop only) === */}
      {isDesktop && (
        <div className={css.rightPanel}>
          {!selectedProduct ? (
            <div className={css.emptyState}>
              <Package size={48} strokeWidth={1} className={css.emptyIcon} />
              <p className={css.emptyTitle}>Оберіть товар</p>
              <p className={css.emptySubtitle}>Натисніть на товар зі списку, щоб побачити залишки по підрозділах</p>
            </div>
          ) : isDetailLoading ? (
            <div className={css.emptyState}>
              <div className={css.spinner} />
              <p className={css.emptyTitle}>Завантаження...</p>
            </div>
          ) : detailData && detailData.length > 0 ? (
            <div className={css.detailContent}>
              {/* Product heading */}
              <div className={css.detailProductHeader}>
                <h2 className={css.detailProductName}>
                  {detailData[0].nomenclature}
                </h2>
                <span className={css.detailProductBadge}>
                  вільно по РУ
                </span>
                {isDetailFetching && <div className={css.miniSpinner} />}
              </div>

              {/* Master-Detail for divisions/warehouses */}
              <div className={css.detailSplit}>
                {/* Divisions list */}
                <div className={css.divisionPanel}>
                  <div className={css.divPanelHeader}>
                    <MapPin size={14} className={css.divPanelIcon} />
                    <span>Підрозділи</span>
                  </div>
                  <ul className={css.divisionList}>
                    {detailData.map((item) => {
                      const hasWh = item.warehouses && item.warehouses.length > 0;
                      const isActive = selectedDivId === item.id;
                      return (
                        <li
                          key={item.id}
                          className={`${css.divisionItem} ${isActive ? css.divisionItemActive : ""} ${hasWh ? css.divisionItemClickable : ""}`}
                          onClick={() => hasWh && setSelectedDivId(item.id)}
                        >
                          <span className={css.divisionName}>{item.division}</span>
                          <span className={css.divisionQty}>{item.available}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {/* Warehouse detail */}
                <div className={css.warehousePanel}>
                  {selectedDiv && selectedDiv.warehouses && selectedDiv.warehouses.length > 0 ? (
                    <>
                      <div className={css.whHeader}>
                        <div className={css.whHeaderTop}>
                          <Warehouse size={16} className={css.divPanelIcon} />
                          <span className={css.whTitle}>{selectedDiv.division}</span>
                        </div>
                        <div className={css.whSummary}>
                          <span className={css.whSummaryLabel}>Разом:</span>
                          <span className={css.whSummaryValue}>{totalSelectedQty}</span>
                        </div>
                      </div>
                      <ul className={css.warehouseList}>
                        {selectedDiv.warehouses.map((wh, idx) => (
                          <li key={idx} className={css.warehouseItem}>
                            <div className={css.whIcon}>
                              <Package size={13} />
                            </div>
                            <span className={css.whName}>{wh.warehouse}</span>
                            <span className={css.whQty}>{wh.available}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <div className={css.whEmpty}>
                      <Warehouse size={36} strokeWidth={1} className={css.emptyIcon} />
                      <p className={css.whEmptyText}>
                        {selectedDiv ? "Немає деталізації по складах" : "Оберіть підрозділ"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className={css.emptyState}>
              <Package size={48} strokeWidth={1} className={css.emptyIcon} />
              <p className={css.emptyTitle}>Немає даних</p>
              <p className={css.emptySubtitle}>Для цього товару немає залишків по підрозділах</p>
            </div>
          )}
        </div>
      )}

      {/* Filter Bottom Sheet */}
      <BottomSheet
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        title="Категорії товарів"
      >
        <ul className={css.filterList}>
          <li
            className={`${css.filterItem} ${!selectedGroup ? css.activeFilterItem : ""}`}
            onClick={() => handleGroupSelect("")}
          >
            Усі товари
          </li>
          {mainCategories.map((groupName) => (
            <li key={groupName} className={css.filterItemWrapper}>
              <div
                className={`${css.filterItem} ${selectedGroup === groupName ? css.activeFilterItem : ""}`}
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
