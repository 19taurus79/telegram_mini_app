"use client";

import { useState, useEffect, Suspense } from "react";
import { getProductOnWarehouse, getAllProductByGuide } from "@/lib/api";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useFilter } from "@/context/FilterContext";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import css from "./Remains.module.css";
import DetailsRemains from "@/components/DetailsRemains/DetailsRemains";
import DetailsOrdersByProduct from "@/components/DetailsOrdersByProduct/DetailsOrdersByProduct";
import DetailsMovedProducts from "@/components/DetailsMovedProduts/DetailsMovedProducts";
import { useInitData } from "@/store/InitData";
import type { InitData } from "@/store/InitData";
import RemainsDashboard from "@/components/Remains/RemainsDashboard/RemainsDashboard";
import DataSourceSwitch from "@/components/DataSourceSwitch/DataSourceSwitch";

const DESKTOP_BREAKPOINT = 768;

function RemainsContent() {
  const { selectedGroup, searchValue, setSearchValue } = useFilter();
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [dataSourceType, setDataSourceType] = useState<'warehouse' | 'all'>('warehouse');
  const searchParams = useSearchParams();
  const router = useRouter();
  const initData = useInitData((state: InitData) => state.initData);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["products", dataSourceType, selectedGroup, searchValue, initData],
    queryFn: () => {
        const params = {
            group: selectedGroup || null,
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

  const [isMobile, setIsMobile] = useState(false);
  // const [showButtons, setShowButtons] = useState(true);
  // const [lastScrollY, setLastScrollY] = useState(0);


  // Синхронізація URL search параметра з контекстом фільтра
  useEffect(() => {
      const searchParam = searchParams.get('search');
      if (searchParam && searchParam !== searchValue) {
          setSearchValue(searchParam);
      }
  }, [searchParams, setSearchValue]);

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

  const renderProductList = () => {
    if (isLoading) {
      return <p>Завантаження продуктів...</p>;
    }

    if (isError) {
      return <p>Помилка завантаження: {error.message}</p>;
    }

    if (!data || data.length === 0) {
      return <p>Продуктів не знайдено.</p>;
    }

    // Фільтрація списку на мобілці
    const filteredData = selectedProductId && window.innerWidth < DESKTOP_BREAKPOINT
      ? data.filter(item => item.id === selectedProductId)
      : data;

    // Повертаємо повну структуру з класами, як було раніше
    return (
      <div className={css.listContainerUl}>
        {/* Кнопка скидання фільтра на мобілці */}
        {selectedProductId && window.innerWidth < DESKTOP_BREAKPOINT && (
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
          <li className={css.listItemButton} key={item.id}>
            <Link
              href={`/remains/${item.id}`}
              className={css.link}
              onClick={(e) => handleProductClick(e, item.id)}
            >
              {item.product}
            </Link>
          </li>
        ))}
      </ul>
      </div>
    );
  };

  return (
    <RemainsDashboard
      isMobile={isMobile}
      headerContent={<DataSourceSwitch dataSource={dataSourceType} setDataSource={setDataSourceType} />}
      productList={renderProductList()}
      detailsRemains={<DetailsRemains selectedProductId={selectedProductId} />}
      detailsOrders={<DetailsOrdersByProduct selectedProductId={selectedProductId} />}
      detailsMoved={<DetailsMovedProducts selectedProductId={selectedProductId} />}
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
