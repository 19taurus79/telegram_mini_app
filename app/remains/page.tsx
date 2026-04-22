"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { getProductOnWarehouse, getAllProductByGuide, getRemainsById, getTotalSumOrderByProduct, getCategoryTree } from "@/lib/api";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFilter } from "@/context/FilterContext";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, Search, X, SlidersHorizontal, ChevronRight, Layers, FolderOpen } from "lucide-react";
import css from "./Remains.module.css";
import DetailsRemains from "@/components/DetailsRemains/DetailsRemains";
import DetailsOrdersByProduct from "@/components/DetailsOrdersByProduct/DetailsOrdersByProduct";
import DetailsMovedProducts from "@/components/DetailsMovedProduts/DetailsMovedProducts";
import { useInitData } from "@/store/InitData";
import type { InitData } from "@/store/InitData";
import RemainsDashboard from "@/components/Remains/RemainsDashboard/RemainsDashboard";
import DataSourceSwitch from "@/components/DataSourceSwitch/DataSourceSwitch";
import BottomSheet from "@/components/UI/BottomSheet/BottomSheet";
import RemainsFiltersDesktop from "./RemainsFiltersDesktop";

const DESKTOP_BREAKPOINT = 768;

function RemainsContent() {
  const { 
    selectedGroup, setSelectedGroup, 
    selectedSubGroup, setSelectedSubGroup,
    searchValue, setSearchValue 
  } = useFilter();
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [dataSourceType, setDataSourceType] = useState<'warehouse' | 'all'>('warehouse');
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const initData = useInitData((state: InitData) => state.initData);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["products", dataSourceType, selectedGroup, selectedSubGroup, searchValue, initData],
    queryFn: () => {
        const params = {
            group: selectedGroup || null,
            parentGroup: selectedSubGroup || null,
            searchValue: searchValue || null,
            initData: initData || "",
        };
        if (dataSourceType === 'warehouse') {
            return getProductOnWarehouse(params);
        } else {
            return getAllProductByGuide(params);
        }
    },
    enabled: !!initData,
    placeholderData: keepPreviousData,
  });

  // Запит для отримання дерева категорій (для побудови меню фільтрів)
  const { data: categoriesData } = useQuery({
    queryKey: ["all_categories_tree", initData],
    queryFn: () => getCategoryTree(initData || ""),
    enabled: !!initData,
    staleTime: 1000 * 60 * 10,
  });

  const [isMobile, setIsMobile] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);



  // Синхронізація URL search параметра з контекстом фільтра
  useEffect(() => {
      const searchParam = searchParams.get('search');
      if (searchParam && searchParam !== searchValue) {
          setSearchValue(searchParam);
      }
  }, [searchParams, setSearchValue, searchValue]);

  // Автовибір елемента, який відповідає пошуку
  useEffect(() => {
      const searchParam = searchParams.get('search');
      // Прибираємо умову !selectedProductId, щоб дозволити перемикання при зміні пошуку
      if (searchParam && data && data.length > 0) {
           // Шукаємо збіг (точний або входження)
           // Припускаємо, що searchParam = "Nomenclature Party Season", а item.product це "Nomenclature Party Season ..."
           // Або навпаки, якщо item.product коротший.
           const searchLower = searchParam.toLowerCase();
           
           // Спробуємо знайти елемент, ім'я якого містить пошуковий запит
           // Або пошуковий запит міститься в імені елемента (на випадок якщо запит довгий)
           const match = data.find(item => {
               const productLower = item.product.toLowerCase();
               return productLower.includes(searchLower) || searchLower.includes(productLower);
           });
           
           if (match) {
                // Встановлюємо ID тільки якщо він відрізняється від поточного, щоб уникнути циклів
                if (selectedProductId !== match.id) {
                    setSelectedProductId(match.id);
                }
           } else {
               // Якщо точного збігу немає, беремо перший як фолбек (тільки якщо нічого не вибрано або це новий пошук)
                // Але щоб не стрибало при кожному рендері, краще робити це тільки якщо це явно новий пошук
                // Поки залишимо логіку "якщо нічого не знайдено - вибираємо перший"
                if (!selectedProductId || !data.find(d => d.id === selectedProductId)) {
                     setSelectedProductId(data[0].id);
                }
           }
      }
  }, [data, searchParams, selectedProductId]);

  // Check generic mobile state for dashboard layout
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleProductClick = (
    event: React.MouseEvent<HTMLAnchorElement>,
    productId: string
  ) => {
    // На мобілці також блокуємо перехід і встановлюємо вибраний товар
    event.preventDefault();

    // Попередньо завантажуємо дані для деталей, щоб уникнути невірних проміжних станів
    if (initData && productId) {
      queryClient.prefetchQuery({
        queryKey: ["remainsById", productId, initData],
        queryFn: () => getRemainsById({ productId, initData }),
      });
      queryClient.prefetchQuery({
        queryKey: ["ordersSumByProduct", productId, initData],
        queryFn: () => getTotalSumOrderByProduct({ product: productId, initData }),
      });
    }

    setSelectedProductId(productId);
    
    // На мобілці прокручуємо до початку для перегляду деталей
    if (window.innerWidth < DESKTOP_BREAKPOINT) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleClearFilter = () => {
    setSelectedProductId(null);
  };

  const handleBackToOrders = () => {
    setSearchValue("");
    setSelectedProductId(null);
    router.push("/orders");
  };

  const groupsWithParents = useMemo(() => {
    // Використовуємо ТІЛЬКИ categoriesData для побудови повного списку
    // Не використовуємо data, бо він відфільтрований і звужує перелік у меню
    const sourceData = categoriesData || [];
    const map = new Map<string, Set<string>>();
    sourceData.forEach(item => {
      if (item.line_of_business) {
        if (!map.has(item.line_of_business)) {
          map.set(item.line_of_business, new Set());
        }
        if (item.parent_element) {
          map.get(item.line_of_business)!.add(item.parent_element);
        }
      }
    });
    
    // Пріоритетний список груп
    const priority = ["ЗЗР", "Насіння", "Власне виробництво насіння", "Позакореневi добрива", "Міндобрива (основні)"];
    const allGroups = Array.from(map.entries()).map(([name, parents]) => ({ 
        name, 
        subGroups: Array.from(parents).sort() 
    }));
    
    const sorted = [...allGroups].sort((a, b) => {
        const idxA = priority.indexOf(a.name);
        const idxB = priority.indexOf(b.name);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.name.localeCompare(b.name);
    });

    return [{ name: "Всі", subGroups: [] }, ...sorted];
  }, [categoriesData]);

  const renderProductList = () => {
    const filteredData = selectedProductId && typeof window !== "undefined" && window.innerWidth < DESKTOP_BREAKPOINT
      ? (data || []).filter(item => item.id === selectedProductId)
      : (data || []);



    return (
      <div className={css.pageContent}>
        {/* Стан завантаження / помилки / пустого списку */}
        {isLoading && <p style={{ padding: "10px" }}>Завантаження продуктів...</p>}
        {isError && <p style={{ padding: "10px" }}>Помилка завантаження: {error.message}</p>}
        {!isLoading && !isError && filteredData.length === 0 && (
          <p style={{ padding: "10px", opacity: 0.6 }}>Продуктів не знайдено.</p>
        )}

        {!isLoading && !isError && filteredData.length > 0 && (
          <div className={css.listContainerUl}>
            {/* Кнопка скидання фільтра на мобілці */}
            {selectedProductId && typeof window !== "undefined" && window.innerWidth < DESKTOP_BREAKPOINT && (
              <button
                className={css.clearFilterButton}
                onClick={handleClearFilter}
              >
                ← Показати всі товари
              </button>
            )}

            {searchParams.get('search') && (
              <button
                className={css.backButton}
                onClick={handleBackToOrders}
              >
                <ArrowLeft size={16} />
                Назад до заявок
              </button>
            )}
            <ul className={css.listContainerUl} style={{ padding: 0 }}>
              {filteredData.map((item) => (
                <li className={css.productCard} key={item.id}>
                  <Link
                    href={`/remains/${item.id}`}
                    className={css.link}
                    onClick={(e) => handleProductClick(e, item.id)}
                  >
                    <span className={css.productName}>{item.product}</span>
                    <div className={css.productMeta}>
                      <span className={css.metaTag}>
                        <Layers size={11} />
                        {item.line_of_business || 'Без групи'}
                      </span>
                      {item.parent_element && (
                        <span className={css.metaTag}>
                          <FolderOpen size={11} />
                          {item.parent_element}
                        </span>
                      )}
                    </div>
                    {typeof window !== "undefined" && window.innerWidth < DESKTOP_BREAKPOINT && (
                      <ChevronRight size={18} className={css.chevron} />
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <BottomSheet
          isOpen={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="Категорії товару"
        >
          <ul className={css.filterList}>
            {groupsWithParents.map((group) => {
              const isActive = (group.name === "Всі" && selectedGroup === "") || group.name === selectedGroup;
              const isExpanded = expandedGroup === group.name;
              
              return (
                <li key={group.name} className={css.filterItemWrapper}>
                  <div
                    className={`${css.filterItem} ${isActive && !selectedSubGroup ? css.activeFilterItem : ''}`}
                    onClick={() => {
                      const newValue = group.name === "Всі" ? "" : group.name;
                      setSelectedGroup(newValue);
                      setSelectedSubGroup(""); // Скидаємо підгрупу при виборі основної групи
                      setIsFilterOpen(false);
                    }}
                  >
                    <span>{group.name}</span>
                    {group.name !== "Всі" && group.subGroups.length > 0 && (
                         <button 
                            className={`${css.expandBtn} ${isExpanded ? css.expanded : ''}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                setExpandedGroup(isExpanded ? null : group.name);
                            }}
                         >
                            <ChevronRight size={18} />
                         </button>
                    )}
                  </div>
                  {isExpanded && group.subGroups.length > 0 && (
                    <div className={css.subGroupsList}>
                        {group.subGroups.map(sub => (
                            <div 
                                key={sub} 
                                className={`${css.subGroupItem} ${selectedSubGroup === sub ? css.activeSubGroup : ''}`}
                                onClick={() => {
                                    setSelectedGroup(group.name);
                                    setSelectedSubGroup(sub);
                                    setIsFilterOpen(false);
                                }}
                            >
                                {sub}
                            </div>
                        ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </BottomSheet>
      </div>
    );
  };

  const renderSearchHeader = () => {
    if (isMobile) {
      return (
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
                className={css.clearSearchBtn}
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
      );
    }

    return <RemainsFiltersDesktop groups={groupsWithParents} />;
  };

  return (
    <RemainsDashboard
      isMobile={isMobile}
      headerContent={<DataSourceSwitch dataSource={dataSourceType} setDataSource={setDataSourceType} />}
      subHeader={renderSearchHeader()}
      productList={renderProductList()}
      detailsRemains={<DetailsRemains selectedProductId={selectedProductId} />}
      detailsOrders={<DetailsOrdersByProduct selectedProductId={selectedProductId} />}
      detailsMoved={<DetailsMovedProducts selectedProductId={selectedProductId} />}
      selectedProductId={selectedProductId}
      onClearSelection={() => {
        setSelectedProductId(null);
        const currentParams = new URLSearchParams(searchParams.toString());
        currentParams.delete('productId');
        router.push(`/remains?${currentParams.toString()}`);
      }}
    />
  );
}

export default function Remains() {
  return (
    <Suspense fallback={<div>Завантаження...</div>}>
        <RemainsContent />
    </Suspense>
  );
}
