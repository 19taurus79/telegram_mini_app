"use client";

import { useState, useEffect, Suspense } from "react";
import { getProductOnWarehouse, getAllProductByGuide, getRemainsById, getTotalSumOrderByProduct } from "@/lib/api";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFilter } from "@/context/FilterContext";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import css from "./Remains.module.css";
import DetailsRemains from "@/components/DetailsRemains/DetailsRemains";
import DetailsOrdersByProduct from "@/components/DetailsOrdersByProduct/DetailsOrdersByProduct";
import DetailsMovedProducts from "@/components/DetailsMovedProduts/DetailsMovedProducts";
import RemainsDashboard from "@/components/Remains/RemainsDashboard/RemainsDashboard";
import DataSourceSwitch from "@/components/DataSourceSwitch/DataSourceSwitch";
import { useAuthStore } from "@/store/Auth"; // Импортируем useAuthStore

const DESKTOP_BREAKPOINT = 768;

function RemainsContent() {
  const { selectedGroup, searchValue, setSearchValue } = useFilter();
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [dataSourceType, setDataSourceType] = useState<'warehouse' | 'all'>('warehouse');
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore(); // Получаем статус аутентификации

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["products", dataSourceType, selectedGroup, searchValue],
    queryFn: () => {
        const params = {
            group: selectedGroup || null,
            searchValue: searchValue || null,
        };
        if (dataSourceType === 'warehouse') {
            return getProductOnWarehouse(params);
        } else {
            return getAllProductByGuide(params);
        }
    },
    enabled: isAuthenticated, // Запрос выполняется только если пользователь аутентифицирован
    placeholderData: keepPreviousData,
  });

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
      const searchParam = searchParams.get('search');
      if (searchParam && searchParam !== searchValue) {
          setSearchValue(searchParam);
      }
  }, [searchParams, setSearchValue, searchValue]);

  useEffect(() => {
      const searchParam = searchParams.get('search');
      if (searchParam && data && data.length > 0) {
           const searchLower = searchParam.toLowerCase();
           const match = data.find(item => {
               const productLower = item.product.toLowerCase();
               return productLower.includes(searchLower) || searchLower.includes(productLower);
           });
           
           if (match) {
                if (selectedProductId !== match.id) {
                    setSelectedProductId(match.id);
                }
           } else {
                if (!selectedProductId || !data.find(d => d.id === selectedProductId)) {
                     setSelectedProductId(data[0].id);
                }
           }
      }
  }, [data, searchParams, selectedProductId]);

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
    event.preventDefault();

    if (isAuthenticated && productId) {
      queryClient.prefetchQuery({
        queryKey: ["remainsById", productId],
        queryFn: () => getRemainsById(productId),
      });
      queryClient.prefetchQuery({
        queryKey: ["ordersSumByProduct", productId],
        queryFn: () => getTotalSumOrderByProduct(productId),
      });
    }

    setSelectedProductId(productId);
    
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

    const filteredData = selectedProductId && window.innerWidth < DESKTOP_BREAKPOINT
      ? data.filter(item => item.id === selectedProductId)
      : data;

    return (
      <div className={css.listContainerUl}>
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
